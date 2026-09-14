import { Centrifuge } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { connectingCodes, disconnectedCodes } from './codes';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// Pushes must reach the app only from the current transport, and only while
// their subscription is subscribed. An exception while handling one reply must
// not stop the client from processing later ones.

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function waitFor(check: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (check()) {
        resolve();
      } else if (Date.now() - started > timeout) {
        reject(new Error('timeout'));
      } else {
        setTimeout(tick, 5);
      }
    };
    tick();
  });
}

describe('dispatch and subscription state', () => {
  let server: FakeCentrifugoServer;
  let c: Centrifuge;
  let top: number;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    top = 0;
    server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: top } as any);
    c = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint: server.url }], {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
  });

  afterEach(async () => {
    c.disconnect();
    await server.close();
  });

  const publication = (channel: string, n: number) => {
    top = Math.max(top, n);
    return { push: { channel, pub: { data: { n }, offset: n } } };
  };

  // Several replies in one websocket frame, as the server batches them.
  const sendFrame = (...replies: any[]) => {
    (server as any).current.send(replies.map(r => JSON.stringify(r)).join('\n'));
  };

  async function subscribed(channel: string) {
    const sub = c.newSubscription(channel);
    const received: number[] = [];
    sub.on('publication', ctx => received.push(ctx.data.n));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    return { sub, received };
  }

  test('rest of a frame is not delivered after disconnect() from a publication handler', async () => {
    const { sub, received } = await subscribed('ch');
    sub.on('publication', () => {
      if (c.state === State.Connected) {
        c.disconnect();
      }
    });

    sendFrame(publication('ch', 1), publication('ch', 2), publication('ch', 3));
    await waitFor(() => c.state === State.Disconnected);
    await delay(50);
    expect(received).toEqual([1]);
  });

  test('rest of a frame is not delivered after unsubscribe() from a publication handler', async () => {
    const { sub, received } = await subscribed('ch');
    sub.on('publication', () => {
      if (sub.state === SubscriptionState.Subscribed) {
        sub.unsubscribe();
      }
    });

    sendFrame(publication('ch', 1), publication('ch', 2), publication('ch', 3));
    await waitFor(() => sub.state === SubscriptionState.Unsubscribed);
    await delay(50);
    expect(received).toEqual([1]);
  });

  test('pushes arriving after unsubscribe() are not delivered', async () => {
    const { sub, received } = await subscribed('ch');
    const joins: any[] = [];
    sub.on('join', ctx => joins.push(ctx));

    // Already on their way when the app unsubscribed.
    sub.unsubscribe();
    sendFrame(publication('ch', 1));
    sendFrame({ push: { channel: 'ch', join: { info: { client: 'other', user: 'u' } } } });
    await delay(100);
    expect(received).toEqual([]);
    expect(joins).toEqual([]);
  });

  test('a frame delivered on a closed transport is not dispatched', async () => {
    const { sub, received } = await subscribed('ch');
    sendFrame(publication('ch', 1), publication('ch', 2));
    await waitFor(() => received.length === 2);

    const oldSocket = (c as any)._transport._transport;
    const resubscribed = new Promise<void>(resolve => sub.once('subscribed', () => resolve()));
    server.closeConnection();
    await resubscribed;

    // The old socket delivers data it had buffered.
    oldSocket.onmessage({ data: JSON.stringify(publication('ch', 1)) });
    await delay(50);
    expect(received).toEqual([1, 2]);
    // The recovery position did not move backwards.
    expect((sub as any)._offset).toBe(2);
  });

  // The exception may have left the application state inconsistent: the client
  // stops in a state the application can see, and works again after connect().
  test('an exception while handling a push disconnects the client', async () => {
    const { sub, received } = await subscribed('ch');
    const handle = (sub as any)._handlePublication.bind(sub);
    let failOnce = true;
    (sub as any)._handlePublication = (pub: any) => {
      if (failOnce) {
        failOnce = false;
        throw new Error('handling failure');
      }
      handle(pub);
    };
    // Applications see the exception as an unhandled rejection; captured here instead.
    const reported: any[] = [];
    (c as any)._reportDispatchError = (err: any) => reported.push(err);
    const disconnected = new Promise<any>(resolve => c.once('disconnected', resolve));

    sendFrame(publication('ch', 1), publication('ch', 2));
    const ctx = await disconnected;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(ctx.reason).toBe('exception during message handling: handling failure');
    expect(reported.map(e => e && e.message)).toEqual(['handling failure']);
    await delay(50);
    // Nothing after the failing publication was processed.
    expect(received).toEqual([]);

    c.connect();
    await sub.ready(3000);
    sendFrame(publication('ch', 3));
    await waitFor(() => received.length === 1);
    expect(received).toEqual([3]);
    await c.publish('ch', {});
  });

  test('an exception while handling a command reply disconnects the client', async () => {
    const reported: any[] = [];
    (c as any)._reportDispatchError = (err: any) => reported.push(err);
    const sub = c.newSubscription('ch');
    let failOnce = true;
    sub.on('subscribed', () => {
      if (failOnce) {
        failOnce = false;
        throw new Error('handler failure');
      }
    });
    const disconnected = new Promise<any>(resolve => c.once('disconnected', resolve));

    sub.subscribe();
    c.connect();
    const ctx = await disconnected;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(ctx.reason).toBe('exception during message handling: handler failure');
    expect(reported.map(e => e && e.message)).toEqual(['handler failure']);

    c.connect();
    await sub.ready(3000);
    await c.publish('ch', {});
  });

  test('data that cannot be decoded closes the transport, and the client reconnects', async () => {
    const { sub } = await subscribed('ch');
    const resubscribed = new Promise<void>(resolve => sub.once('subscribed', () => resolve()));

    // E.g. a captive portal answering with an HTML page.
    (server as any).current.send('<!doctype html>');
    await resubscribed;
    expect(c.state).toBe(State.Connected);
    await c.publish('ch', {});
  });

  // E.g. a suspended process resumes: the call's timer is overdue while its reply
  // already waits in the socket.
  test('a reply waiting in the socket when the call timeout is overdue is not lost', async () => {
    const timeout = 200;
    (c as any)._config.timeout = timeout;
    c.connect();
    await c.ready(3000);

    server.onCommand = (cmd, s) => {
      if (cmd.publish !== undefined) {
        s.send({ id: cmd.id, publish: {} });
        // Blocks the event loop past the timeout: when it resumes, the timer is
        // overdue and the reply is waiting to be read.
        const until = Date.now() + timeout + 100;
        while (Date.now() < until) { /* busy wait */ }
      }
      return null;
    };
    await expect(c.publish('ch', {})).resolves.toEqual({});
  });

  test('server unsubscribe of a previous subscription does not end a subscribe in progress', async () => {
    const { sub } = await subscribed('ch');
    // The server unsubscribes the client (e.g. through its API) while the app calls
    // unsubscribe() and subscribe(): the push goes out before the unsubscribe reply.
    server.onCommand = (cmd, s) => {
      if (cmd.unsubscribe !== undefined) {
        s.sendPush({ channel: 'ch', unsubscribe: { code: 2000, reason: 'server unsubscribe' } });
      }
      return null;
    };
    sub.unsubscribe();
    sub.subscribe();

    const result = await sub.ready(3000).then(() => 'subscribed', (e: any) => `rejected:${e.code}`);
    expect(result).toBe('subscribed');
    await delay(50);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
  });

  // The server answers commands in order: a subscribe reply held here is sent when the
  // unsubscribe command that follows it arrives.
  function holdFirstSubscribeReply(reply: (cmd: any, n: number) => any) {
    let subscribes = 0;
    let held: any = null;
    server.onCommand = (cmd, s) => {
      if (cmd.subscribe !== undefined) {
        subscribes++;
        if (subscribes === 1) {
          held = cmd;
          return {};
        }
        return { id: cmd.id, subscribe: reply(cmd, subscribes) };
      }
      if (cmd.unsubscribe !== undefined && held !== null) {
        s.send({ id: held.id, subscribe: reply(held, 1) });
        held = null;
      }
      return null;
    };
    return { held: () => held !== null };
  }

  const subscribeCommands = () => server.received.filter(cmd => cmd.subscribe !== undefined);

  test('a subscribe reply of a cancelled subscribe does not complete the next one over emulation', async () => {
    const hold = holdFirstSubscribeReply(() => ({}));
    const sub = c.newSubscription('ch');
    c.connect();
    await waitFor(() => c.state === State.Connected);
    // An emulation transport sends a subscribe only after the unsubscribe reply.
    (c as any)._transport.emulation = () => true;
    sub.subscribe();
    await waitFor(() => hold.held());

    sub.unsubscribe();
    sub.subscribe();

    // The server has the first subscription unsubscribed: the client must subscribe again.
    await waitFor(() => subscribeCommands().length === 2);
    await sub.ready(3000);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
  });

  test('a subscribe reply of a cancelled subscribe does not set the channel id', async () => {
    holdFirstSubscribeReply((_cmd, n) => ({ id: n }));
    const sub = c.newSubscription('ch');
    const received: number[] = [];
    sub.on('publication', ctx => received.push(ctx.data.n));
    sub.subscribe();
    c.connect();
    await waitFor(() => subscribeCommands().length === 1);

    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => subscribeCommands().length === 2);
    await sub.ready(3000);
    await delay(50);

    // Channel id 1 was dropped by the server with the first subscription.
    server.publish(2, { n: 1 });
    await waitFor(() => received.length === 1);
    expect(received).toEqual([1]);
  });

  test('a resubscribe push arriving after unsubscribe() does not subscribe again', async () => {
    const { sub } = await subscribed('ch');
    const events: string[] = [];
    sub.on('subscribing', () => events.push('subscribing'));
    sub.on('subscribed', () => events.push('subscribed'));
    sub.unsubscribe();
    // Sent by the server before it read the unsubscribe command, e.g. on an
    // insufficient state.
    server.unsubscribe('ch', 2500, 'insufficient state');

    await delay(100);
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
    expect(events).toEqual([]);
    expect(subscribeCommands()).toHaveLength(1);
  });

  // The server handles emulation requests concurrently: a subscribe sent before the
  // unsubscribe reply may be handled first, rejected as already subscribed, and then
  // removed by the unsubscribe. The unsubscribe reply is held here until released.
  function holdUnsubscribeReply() {
    let held: any = null;
    server.onCommand = (cmd) => {
      if (cmd.unsubscribe !== undefined && held === null) {
        held = cmd;
        return {};
      }
      return null;
    };
    return {
      held: () => held !== null,
      release: () => server.send({ id: held.id, unsubscribe: {} }),
    };
  }

  async function subscribedOverEmulation(channel: string) {
    const sub = c.newSubscription(channel);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    // An emulation transport sends a subscribe only after the unsubscribe reply.
    (c as any)._transport.emulation = () => true;
    return sub;
  }

  test('subscribe() from an unsubscribed handler waits for the unsubscribe reply over emulation', async () => {
    const sub = await subscribedOverEmulation('ch');
    const unsubscribe = holdUnsubscribeReply();
    sub.once('unsubscribed', () => sub.subscribe());
    sub.unsubscribe();
    await waitFor(() => unsubscribe.held());
    await delay(50);
    expect(subscribeCommands()).toHaveLength(1);

    unsubscribe.release();
    await sub.ready(3000);
    expect(subscribeCommands()).toHaveLength(2);
  });

  test('a second unsubscribe() keeps the next subscribe waiting for the unsubscribe reply over emulation', async () => {
    const sub = await subscribedOverEmulation('ch');
    const unsubscribe = holdUnsubscribeReply();
    sub.unsubscribe();
    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => unsubscribe.held());
    await delay(50);
    expect(subscribeCommands()).toHaveLength(1);

    unsubscribe.release();
    await sub.ready(3000);
  });

  test('a new subscription to the channel of a removed one waits for its unsubscribe reply over emulation', async () => {
    const sub = await subscribedOverEmulation('ch');
    const unsubscribe = holdUnsubscribeReply();
    c.removeSubscription(sub);
    const next = c.newSubscription('ch');
    next.subscribe();
    await waitFor(() => unsubscribe.held());
    await delay(50);
    expect(subscribeCommands()).toHaveLength(1);

    unsubscribe.release();
    await next.ready(3000);
  });

  test('removing an already removed subscription keeps the newer one of its channel', async () => {
    const { sub: old } = await subscribed('ch');
    c.removeSubscription(old);
    const next = c.newSubscription('ch');
    const received: number[] = [];
    next.on('publication', ctx => received.push(ctx.data.n));
    next.subscribe();
    await next.ready(3000);

    c.removeSubscription(old);
    expect(c.getSubscription('ch')).toBe(next);
    server.publish('ch', { n: 1 });
    await waitFor(() => received.length === 1);
    expect(next.state).toBe(SubscriptionState.Subscribed);
  });

  test('subscribe() on a removed subscription throws instead of subscribing on the server', async () => {
    const { sub } = await subscribed('ch');
    c.removeSubscription(sub);
    expect(() => sub.subscribe()).toThrow('was removed from the client');
    await delay(50);
    expect(subscribeCommands()).toHaveLength(1);
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  });

  test('unsubscribe() and subscribe() from a publication handler recover after that publication', async () => {
    const { sub } = await subscribed('ch');
    sub.once('publication', () => {
      sub.unsubscribe();
      sub.subscribe();
    });
    sendFrame(publication('ch', 1));
    await waitFor(() => subscribeCommands().length === 2);
    expect(subscribeCommands()[1].subscribe).toMatchObject({ recover: true, offset: 1, epoch: 'e' });
  });

  test('a getState subscription created before a state invalidation still loads its state', async () => {
    let getStateCalls = 0;
    const sub = c.newSubscription('ch', {
      getState: async () => {
        getStateCalls++;
        return { offset: 5, epoch: 'e' };
      },
    } as any);
    c.connect();
    await c.ready(3000);
    server.disconnect(3014, 'state invalidated');
    await waitFor(() => server.received.filter(cmd => cmd.connect !== undefined).length === 2);
    await c.ready(3000);

    sub.subscribe();
    await waitFor(() => subscribeCommands().length === 1);
    expect(getStateCalls).toBe(1);
    expect(subscribeCommands()[0].subscribe).toMatchObject({ recover: true, offset: 5, epoch: 'e' });
  });

  test('calls that timed out waiting for a connection or a subscription leave no waiters behind', async () => {
    const never = new Promise<string>(() => { /* never resolves */ });
    const client = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint: server.url }], {
      websocket: WebSocket,
      timeout: 20,
      getToken: () => never,
      networkEventTarget: new EventTarget(),
    });
    const sub = client.newSubscription('ch', { getToken: () => never });
    sub.subscribe();
    client.connect();
    try {
      for (let i = 0; i < 3; i++) {
        await expect(client.ready(10)).rejects.toMatchObject({ message: 'timeout' });
        await expect(client.publish('ch', {})).rejects.toMatchObject({ message: 'timeout' });
        await expect(sub.ready(10)).rejects.toMatchObject({ message: 'timeout' });
        await expect(sub.publish({})).rejects.toMatchObject({ message: 'timeout' });
      }
      expect(Object.keys((client as any)._promises)).toHaveLength(0);
      expect(Object.keys((sub as any)._promises)).toHaveLength(0);
    } finally {
      client.disconnect();
    }
  });

  test('pushes of a server-side subscription reach the app while a client-side subscription of its channel is unsubscribed', async () => {
    // The app kept an unsubscribed subscription object for the channel.
    server.connectResult = { ...server.connectResult, subs: { ch: {} } };
    c.newSubscription('ch');
    const events: string[] = [];
    c.on('publication', ctx => events.push(`publication:${ctx.data.n}`));
    c.on('join', () => events.push('join'));
    c.on('leave', () => events.push('leave'));
    c.on('unsubscribed', ctx => events.push(`unsubscribed:${ctx.channel}`));
    c.connect();
    await c.ready(3000);

    server.publish('ch', { n: 1 });
    server.join('ch', { client: 'x', user: 'u' });
    server.leave('ch', { client: 'x', user: 'u' });
    server.unsubscribe('ch', 2000, 'server unsubscribe');
    await waitFor(() => events.length === 4);
    expect(events).toEqual(['publication:1', 'join', 'leave', 'unsubscribed:ch']);
  });

  test('unsubscribe push without a channel or subscription is ignored', async () => {
    await subscribed('ch');
    server.sendPush({ id: 99, unsubscribe: { code: 2000, reason: 'server unsubscribe' } });
    await delay(50);
    expect(c.state).toBe(State.Connected);
  });

  test('a track reply of a previous shared poll subscription is not applied', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll');
    const updates: string[] = [];
    sub.on('update', (ctx: any) => updates.push(`${ctx.key}:${ctx.version}`));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);

    // From the track on, replies are held, to be sent later in command order.
    const held: any[] = [];
    server.onCommand = (cmd) => {
      if (held.length > 0 || cmd.sub_refresh !== undefined) {
        held.push(cmd);
        return {};
      }
      return null;
    };
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    // The track command reaches the server before unsubscribe().
    await waitFor(() => held.length === 1);
    sub.unsubscribe();
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    sub.subscribe();
    await waitFor(() => held.some(cmd => cmd.subscribe !== undefined));

    server.onCommand = null;
    for (const cmd of held) {
      if (cmd.sub_refresh !== undefined) {
        server.send({ id: cmd.id, sub_refresh: { items: [{ key: 'k1', version: 5, data: { v: 5 } }] } });
      } else if (cmd.subscribe !== undefined) {
        server.send({ id: cmd.id, subscribe: {} });
      } else {
        server.send({ id: cmd.id, unsubscribe: {} });
      }
    }
    await sub.ready(3000);
    await delay(50);
    expect(updates).toEqual([]);
    expect(sub._sharedPollTrackedItems.get('k1')).toBe(0);
  });

  test('an empty frame does not close the transport', async () => {
    // E.g. an empty line on a JSON http_stream, which is dispatched the same way.
    await subscribed('ch');
    const transport = (c as any)._transport;
    (server as any).current.send('');
    await delay(50);
    expect((c as any)._transport).toBe(transport);
    expect(c.state).toBe(State.Connected);
  });

  test('a thrown value without a string form still disconnects the client', async () => {
    await subscribed('ch');
    // Applications see the exception as an unhandled rejection; not the point here.
    (c as any)._reportDispatchError = () => { /* ignored */ };
    c.on('message', () => {
      throw Object.create(null);
    });
    const disconnected = new Promise<any>(resolve => c.once('disconnected', resolve));
    server.message({ hello: true });

    const ctx = await Promise.race([disconnected, delay(1000).then(() => null)]);
    expect(ctx && ctx.code).toBe(disconnectedCodes.badProtocol);
  });

  // E.g. a suspended process resumes, and the reply is read only after the far
  // overdue call timer ran: browsers don't promise to run socket events first.
  test('a reply read shortly after a far overdue call timeout is not lost', async () => {
    const timeout = 200;
    (c as any)._config.timeout = timeout;
    c.connect();
    await c.ready(3000);

    server.onCommand = (cmd, s) => {
      if (cmd.publish !== undefined) {
        // Blocks the event loop far past the timeout, then replies a moment after
        // it resumes, once the overdue timer has run.
        const until = Date.now() + timeout + 1500;
        while (Date.now() < until) { /* busy wait */ }
        setTimeout(() => s.send({ id: cmd.id, publish: {} }), 50);
        return {};
      }
      return null;
    };
    await expect(c.publish('ch', {})).resolves.toEqual({});
  }, 10000);

  // The server pings every second, and the client allows a ping to be 200ms late.
  function pingEverySecond() {
    server.connectResult = { ...server.connectResult, ping: 1 };
    (c as any)._config.maxServerPingDelay = 200;
    const connecting: number[] = [];
    c.on('connecting', ctx => connecting.push(ctx.code));
    return connecting;
  }

  test('a ping waiting in the socket when the no-ping timer is overdue keeps the connection', async () => {
    const connecting = pingEverySecond();
    let resumed = false;
    server.onCommand = (cmd, s) => {
      if (cmd.send !== undefined) {
        s.send({});
        // Blocks the event loop past the no-ping deadline: when it resumes, the timer
        // is overdue and the ping is waiting to be read.
        const until = Date.now() + 700;
        while (Date.now() < until) { /* busy wait */ }
        resumed = true;
      }
      return null;
    };
    c.connect();
    await c.ready(3000);
    connecting.length = 0;
    await delay(800);
    await c.send({});
    // Timers set before the block are due before the no-ping timer: wait from the resume.
    await waitFor(() => resumed);
    await delay(200);
    expect(connecting).toEqual([]);
    expect(c.state).toBe(State.Connected);
  });

  test('a ping read shortly after a far overdue no-ping timer keeps the connection', async () => {
    const connecting = pingEverySecond();
    let resumed = false;
    server.onCommand = (cmd, s) => {
      if (cmd.send !== undefined) {
        // Blocks the event loop far past the no-ping deadline, then pings a moment
        // after it resumes, once the overdue timer has run.
        const until = Date.now() + 2500;
        while (Date.now() < until) { /* busy wait */ }
        resumed = true;
        setTimeout(() => s.send({}), 50);
      }
      return null;
    };
    c.connect();
    await c.ready(3000);
    connecting.length = 0;
    await delay(200);
    await c.send({});
    // Timers set before the block are due before the no-ping timer: wait from the resume.
    await waitFor(() => resumed);
    await delay(300);
    expect(connecting).toEqual([]);
    expect(c.state).toBe(State.Connected);
  }, 10000);

  test('blank lines do not keep a connection without pings alive', async () => {
    const connecting = pingEverySecond();
    c.connect();
    await c.ready(3000);
    connecting.length = 0;
    // E.g. keep-alive newlines written by an intermediary.
    const keepAlive = setInterval(() => (server as any).current?.send('\n'), 200);
    try {
      await waitFor(() => connecting.length > 0, 3000);
    } finally {
      clearInterval(keepAlive);
    }
    expect(connecting[0]).toBe(connectingCodes.noPing);
  });

  test('a connection without pings is still closed with no ping', async () => {
    const connecting = pingEverySecond();
    c.connect();
    await c.ready(3000);
    connecting.length = 0;
    await waitFor(() => connecting.length > 0, 3000);
    expect(connecting[0]).toBe(connectingCodes.noPing);
  });
});
