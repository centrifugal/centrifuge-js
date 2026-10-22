import { Centrifuge } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { connectingCodes, disconnectedCodes, errorCodes, unsubscribedCodes } from './codes';
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
    expect(ctx.reason).toBe('exception in event handler: handler failure');
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
    const release = () => {
      if (held !== null) {
        server.send({ id: held.id, subscribe: reply(held, 1) });
        held = null;
      }
    };
    return { held: () => held !== null, release };
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
    // Over emulation the unsubscribe waits for the reply of the subscribe it undoes.
    await delay(50);
    expect(server.received.filter(cmd => cmd.unsubscribe !== undefined)).toHaveLength(0);
    hold.release();

    // The server has the first subscription unsubscribed: the client must subscribe again.
    await waitFor(() => subscribeCommands().length === 2);
    await sub.ready(3000);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
    const kinds = server.received.filter(cmd => cmd.subscribe || cmd.unsubscribe).map(cmd => cmd.subscribe ? 'sub' : 'unsub');
    expect(kinds).toEqual(['sub', 'unsub', 'sub']);
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

  test('subscribe() from an unsubscribed handler of removeSubscription() does not subscribe the removed subscription', async () => {
    const { sub } = await subscribed('ch');
    let thrown: any = null;
    sub.once('unsubscribed', () => {
      try {
        sub.subscribe();
      } catch (e) {
        thrown = e;
      }
    });
    c.removeSubscription(sub);
    await delay(50);
    expect(thrown && thrown.message).toContain('was removed from the client');
    expect(subscribeCommands()).toHaveLength(1);
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  });

  test('a new subscription to the channel can be created from an unsubscribed handler of removeSubscription()', async () => {
    const { sub } = await subscribed('ch');
    let next: any = null;
    sub.once('unsubscribed', () => {
      next = c.newSubscription('ch');
      next.subscribe();
    });
    c.removeSubscription(sub);
    await next.ready(3000);
    expect(c.getSubscription('ch')).toBe(next);
  });

  test('a subscription removed while waiting keeps the next one waiting for an earlier unsubscribe reply over emulation', async () => {
    const first = await subscribedOverEmulation('ch');
    const unsubscribe = holdUnsubscribeReply();
    c.removeSubscription(first);
    // E.g. a component mounted and unmounted again while the unsubscribe is pending:
    // the second subscription sends no unsubscribe.
    const second = c.newSubscription('ch');
    second.subscribe();
    c.removeSubscription(second);
    const third = c.newSubscription('ch');
    third.subscribe();
    await waitFor(() => unsubscribe.held());
    await delay(50);
    expect(subscribeCommands()).toHaveLength(1);

    unsubscribe.release();
    await third.ready(3000);
  });

  test('a getToken of an outdated subscribe flow sends nothing', async () => {
    const resolvers: Array<(t: string) => void> = [];
    const sub: any = c.newSubscription('ch', {
      getToken: () => new Promise<string>(resolve => resolvers.push(resolve)),
    });
    c.connect();
    await waitFor(() => c.state === State.Connected);
    sub.subscribe();
    await waitFor(() => resolvers.length === 1);
    // unsubscribe() and subscribe() while the token loads: a new flow, a new getToken.
    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => resolvers.length === 2);

    resolvers[0]('old');
    resolvers[1]('new');
    await sub.ready(3000);
    await delay(50);
    const subscribes = server.received.filter(cmd => cmd.subscribe !== undefined);
    expect(subscribes.map(cmd => cmd.subscribe.token)).toEqual(['new']);
  });

  test('ready() called from an unsubscribed handler that subscribes again waits for the new subscribe', async () => {
    const { sub } = await subscribed('ch');
    let ready: any = null;
    sub.once('unsubscribed', () => {
      sub.subscribe();
      ready = sub.ready(3000).then(() => 'resolved', (e: any) => `rejected:${e.message}`);
    });
    sub.unsubscribe();
    expect(await ready).toBe('resolved');
  });

  test('shared poll updates skipped by a reconnect from a publication handler are requested again', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);

    const publications: string[] = [];
    let reconnected = false;
    sub.on('publication', (ctx: any) => {
      publications.push(`${ctx.key}:${sub.state}`);
      if (!reconnected) {
        reconnected = true;
        c.disconnect();
        c.connect();
      }
    });
    server.onCommand = (cmd) => {
      if (cmd.sub_refresh !== undefined && !reconnected) {
        return { id: cmd.id, sub_refresh: { items: [{ key: 'k1', version: 3, data: { v: 3 } }, { key: 'k2', version: 5, data: { v: 5 } }] } };
      }
      return null;
    };
    sub.track([{ key: 'k1', version: 1 }, { key: 'k2', version: 1 }], 'signature');
    await waitFor(() => reconnected);
    await sub.ready(3000);
    const refreshes = () => server.received.filter(cmd => cmd.sub_refresh !== undefined);
    await waitFor(() => refreshes().length === 2);

    // Neither update reached the app: the replay asks for both from the versions it had.
    expect(publications).toEqual(['k1:subscribed']);
    expect(refreshes()[1].sub_refresh.track[0].items).toEqual([{ key: 'k1', version: 1 }, { key: 'k2', version: 1 }]);
  });

  test('shared poll updates not newer than the version held are dropped', async () => {
    server.onSubscribe = () => ({});
    server.onCommand = (cmd) => cmd.sub_refresh !== undefined
      ? { id: cmd.id, sub_refresh: { items: [{ key: 'k1', version: 3, data: { v: 3 } }] } }
      : null;
    const sub: any = c.newSharedPollSubscription('poll');
    const updates: string[] = [];
    sub.on('update', (ctx: any) => updates.push(`${ctx.key}:${ctx.version}`));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 1 }], 'signature');
    await waitFor(() => updates.length === 1);

    // The same version again (e.g. a second track reply), an older one, a newer one.
    server.publish('poll', { v: 3 }, { key: 'k1', version: 3 });
    server.publish('poll', { v: 2 }, { key: 'k1', version: 2 });
    server.publish('poll', { v: 4 }, { key: 'k1', version: 4 });
    await waitFor(() => updates.length >= 2);
    await delay(50);
    expect(updates).toEqual(['k1:3', 'k1:4']);
  });

  test('a permanently failed track untracks its keys, also at the server', async () => {
    server.onSubscribe = () => ({});
    server.onCommand = (cmd) => cmd.sub_refresh !== undefined && cmd.sub_refresh.track
      ? { id: cmd.id, error: { code: 106, message: 'limit exceeded' } }
      : null;
    const sub: any = c.newSharedPollSubscription('poll');
    const updates: string[] = [];
    const errors: number[] = [];
    sub.on('update', (ctx: any) => updates.push(`${ctx.key}:${ctx.removed === true}`));
    sub.on('error', (ctx: any) => errors.push(ctx.error.code));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    await waitFor(() => updates.length === 1);

    expect(errors).toEqual([106]);
    expect(updates).toEqual(['k1:true']);
    expect([...sub.trackedKeys()]).toEqual([]);
    await waitFor(() => server.received.some(cmd => cmd.sub_refresh?.untrack !== undefined));
    const untrack = server.received.find(cmd => cmd.sub_refresh?.untrack !== undefined);
    expect(untrack.sub_refresh.untrack).toEqual(['k1']);
  });

  test('a subscribe error is retried after its backoff, also across a reconnect', async () => {
    let subscribes = 0;
    server.onCommand = (cmd) => {
      if (cmd.subscribe !== undefined && ++subscribes === 1) {
        return { id: cmd.id, error: { code: 100, message: 'internal', temporary: true } };
      }
      return null;
    };
    // Long enough that the reconnect below can't outlast it.
    const sub: any = c.newSubscription('ch', { minResubscribeDelay: 2000, maxResubscribeDelay: 2000 });
    sub.subscribe();
    c.connect();
    await waitFor(() => subscribes === 1);
    await waitFor(() => sub._resubscribeTimeout !== null);

    // A reconnect before the backoff ends doesn't retry the subscribe at once.
    server.closeConnection();
    await waitFor(() => c.state === State.Connected && server.received.filter(cmd => cmd.connect).length === 2);
    await delay(100);
    expect(subscribes).toBe(1);
    await sub.ready(5000);
    expect(subscribes).toBe(2);
  }, 10000);

  test('a subscribe in flight when the transport closes is sent again without a backoff', async () => {
    let held = false;
    server.onCommand = (cmd) => {
      if (cmd.subscribe !== undefined && !held) {
        held = true;
        return {};
      }
      return null;
    };
    const sub: any = c.newSubscription('ch', { minResubscribeDelay: 2000, maxResubscribeDelay: 2000 });
    sub.subscribe();
    c.connect();
    await waitFor(() => held);

    // The teardown fails the subscribe in flight: no subscribe error, no backoff.
    c.disconnect();
    await delay(20);
    expect(sub._resubscribeTimeout).toBeNull();
    expect(sub._resubscribeAttempts).toBe(0);
    // Subscribed on the next connection, not after a resubscribe delay.
    c.connect();
    await sub.ready(1000);
  });

  test('a resubscribe timer armed again replaces the earlier one', async () => {
    const sub: any = c.newSubscription('ch', { minResubscribeDelay: 50, maxResubscribeDelay: 50 });
    sub.subscribe();
    sub._scheduleResubscribe();
    sub._scheduleResubscribe();
    let subscribeCalls = 0;
    const subscribe = sub._subscribe.bind(sub);
    sub._subscribe = () => { subscribeCalls++; return subscribe(); };
    await delay(200);
    expect(subscribeCalls).toBe(1);
  });

  test('a temporary map subscribe error keeps the delta bases of the position it keeps', async () => {
    const sub: any = c.newMapSubscription('map', { delta: 'fossil' });
    sub.subscribe();
    sub._offset = 5;
    sub._epoch = 'e';
    sub._recover = true;
    sub._prevValueMap.set('k1', 'base');
    sub._handleMapSubscribeError({ code: 100, message: 'internal', temporary: true });
    expect(sub._offset).toBe(5);
    expect(sub._prevValueMap.get('k1')).toBe('base');

    sub._handleMapSubscribeError({ code: 112, message: 'unrecoverable position' });
    expect(sub._offset).toBeNull();
    expect(sub._prevValueMap.size).toBe(0);
  });

  test('a shared poll key removed while its track was in flight is untracked at the server', async () => {
    server.onSubscribe = () => ({});
    let held: any = null;
    server.onCommand = (cmd) => {
      if (cmd.sub_refresh?.track && held === null) {
        held = cmd;
        return {};
      }
      return null;
    };
    const sub: any = c.newSharedPollSubscription('poll');
    const updates: string[] = [];
    sub.on('update', (ctx: any) => updates.push(`${ctx.key}:${ctx.removed === true}`));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    await waitFor(() => held !== null);

    // The server removes the key (e.g. revoked), then the track lands and tracks it again.
    server.publish('poll', null, { key: 'k1', removed: true });
    await waitFor(() => updates.length === 1);
    server.send({ id: held.id, sub_refresh: {} });

    await waitFor(() => server.received.some(cmd => cmd.sub_refresh?.untrack !== undefined));
    const untrack = server.received.find(cmd => cmd.sub_refresh?.untrack !== undefined);
    expect(untrack.sub_refresh.untrack).toEqual(['k1']);
    expect(updates).toEqual(['k1:true']);
  });

  test('a server-side subscription not announced to the app keeps its position', async () => {
    let connects = 0;
    server.onCommand = (cmd) => {
      if (cmd.connect === undefined) {
        return null;
      }
      connects++;
      const subs = connects === 1
        ? { s1: { recoverable: true, epoch: 'e', offset: 5 }, s2: { recoverable: true, epoch: 'e', offset: 7 } }
        // s2 can't be recovered on the second connect: recovered=false from the top.
        : { s1: { recoverable: true, recovered: true, epoch: 'e', offset: 5 },
            s2: { recoverable: true, epoch: 'e2', offset: 20 } };
      return { id: cmd.id, connect: { client: 'fake-client', version: '0.0.0', subs } };
    };
    c.connect();
    await waitFor(() => connects === 1 && c.state === State.Connected);
    // On the second connect, the subscribed handler of s1 disconnects: s2's
    // subscribed (recovered=false) never reaches the app.
    c.on('subscribed', (ctx: any) => {
      if (connects === 2 && ctx.channel === 's1') {
        c.disconnect();
      }
    });
    server.closeConnection();
    await waitFor(() => connects === 2 && c.state === State.Disconnected);

    c.connect();
    await waitFor(() => connects === 3);
    const connect = server.received.filter(cmd => cmd.connect !== undefined)[2].connect;
    expect(connect.subs.s2).toEqual({ recover: true, offset: 7, epoch: 'e' });
  });

  test('disconnect() fails the calls made while disconnected', async () => {
    const call = c.rpc('method', {}).then(() => 'resolved', (e: any) => e.code);
    c.disconnect();
    expect(await call).toBe(errorCodes.clientDisconnected);
  });

  test('a subscription token expired without getToken unsubscribes as unauthorized', async () => {
    server.onCommand = (cmd) => cmd.subscribe !== undefined
      ? { id: cmd.id, error: { code: 109, message: 'token expired' } }
      : null;
    const sub: any = c.newSubscription('ch', { token: 'static' });
    const unsubscribed = new Promise<any>(resolve => sub.once('unsubscribed', resolve));
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.subscribe();
    c.connect();
    expect((await unsubscribed).code).toBe(unsubscribedCodes.unauthorized);
    expect(errors).toEqual(['configuration']);
    expect(server.received.filter(cmd => cmd.subscribe !== undefined)).toHaveLength(1);
  });

  test('subscribe() on a subscription subscribing keeps its backoff', () => {
    const sub: any = c.newSubscription('ch');
    sub.subscribe();
    sub._resubscribeAttempts = 3;
    sub.subscribe();
    expect(sub._resubscribeAttempts).toBe(3);
  });

  test('a map position reset while the token loads is not recovered from', async () => {
    let resolveToken: any = null;
    const sub: any = c.newMapSubscription('map', {
      getToken: () => new Promise<string>(resolve => { resolveToken = resolve; }),
    });
    sub._offset = 5;
    sub._epoch = 'e';
    sub._recover = true;
    c.connect();
    await waitFor(() => c.state === State.Connected);
    sub.subscribe();
    await waitFor(() => resolveToken !== null);
    // E.g. a state invalidation (3014 / 2502) while the token loads.
    sub._invalidateState();
    resolveToken('token');
    await waitFor(() => server.received.some(cmd => cmd.subscribe !== undefined));
    const req = server.received.find(cmd => cmd.subscribe !== undefined).subscribe;
    expect(req.recover).toBeUndefined();
    expect(req.phase).toBe(2);
  });

  test('a getSignature failing in track() is retried', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => Promise.reject(new Error('backend down')),
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.track(['k1']);
    await waitFor(() => errors.length === 1);
    expect(sub._sharedPollReplayRetryTimeout).not.toBeNull();
    expect([...sub.trackedKeys()]).toEqual(['k1']);
  });

  test('a key revoked after the app untracked it gets no removal update', async () => {
    server.onSubscribe = () => ({});
    let resolveSignature: any = null;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => new Promise(resolve => { resolveSignature = resolve; }),
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    const updates: string[] = [];
    sub.on('update', (ctx: any) => updates.push(ctx.key));
    sub.track(['k1']);
    await waitFor(() => resolveSignature !== null);
    sub.untrack(['k1']);
    resolveSignature({ keys: [], signature: 'sig' });
    await delay(50);
    expect(updates).toEqual([]);
  });

  // A signature covers exactly the keys getSignature returned, and the server
  // verifies it over the keys of the track request: the request must carry all
  // of them - those the app untracked meanwhile, or never tracked, go in its
  // inline untrack - or the whole track fails.
  const signedTrack = () => server.received
    .map(cmd => cmd.sub_refresh)
    .find(r => r?.track?.some((b: any) => b.signature === 'signed'));
  const trackedKeysOf = (r: any) => r.track.flatMap((b: any) => b.items.map((i: any) => i.key));

  test('track(keys): a key untracked while getSignature runs is still sent with its signature', async () => {
    server.onSubscribe = () => ({});
    let resolveSignature: any = null;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => new Promise(resolve => { resolveSignature = resolve; }),
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track(['k1', 'k2']);
    await waitFor(() => resolveSignature !== null);
    sub.untrack(['k2']);
    resolveSignature({ keys: ['k1', 'k2'], signature: 'signed' });
    await waitFor(() => signedTrack() !== undefined);
    expect(trackedKeysOf(signedTrack())).toEqual(['k1', 'k2']);
    expect(signedTrack().untrack).toEqual(['k2']);
    expect([...sub.trackedKeys()]).toEqual(['k1']);
  });

  test('signature refresh: a key untracked while getSignature runs is still sent with its signature', async () => {
    server.onSubscribe = () => ({});
    let resolveSignature: any = null;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => new Promise(resolve => { resolveSignature = resolve; }),
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub._sharedPollTrackedItems.set('k1', 0);
    sub._sharedPollTrackedItems.set('k2', 0);
    sub._sharedPollRefreshSignature();
    await waitFor(() => resolveSignature !== null);
    sub.untrack(['k2']);
    resolveSignature({ keys: ['k1', 'k2'], signature: 'signed' });
    await waitFor(() => signedTrack() !== undefined);
    expect(trackedKeysOf(signedTrack())).toEqual(['k1', 'k2']);
    expect(signedTrack().untrack).toEqual(['k2']);
  });

  test('replay: a key untracked while getSignature runs is still sent with its signature', async () => {
    server.onSubscribe = () => ({});
    let resolveSignature: any = null;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => new Promise(resolve => { resolveSignature = resolve; }),
    });
    // Tracked before subscribing: the replay on subscribe asks for the signature.
    sub.track(['k1', 'k2']);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => resolveSignature !== null);
    sub.untrack(['k2']);
    resolveSignature({ keys: ['k1', 'k2'], signature: 'signed' });
    await waitFor(() => signedTrack() !== undefined);
    expect(trackedKeysOf(signedTrack())).toEqual(['k1', 'k2']);
    expect(signedTrack().untrack).toEqual(['k2']);
  });

  test('a key getSignature returned without being asked for is sent with its signature, and untracked', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => Promise.resolve({ keys: ['k1', 'extra'], signature: 'signed' }),
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track(['k1']);
    await waitFor(() => signedTrack() !== undefined);
    expect(trackedKeysOf(signedTrack())).toEqual(['k1', 'extra']);
    expect(signedTrack().untrack).toEqual(['extra']);
    expect([...sub.trackedKeys()]).toEqual(['k1']);
  });

  // UnauthorizedError from getSignature ends the subscription, as from getToken,
  // on each path which calls it - and is not retried.
  describe('getSignature throwing UnauthorizedError unsubscribes', () => {
    const unauthorized = () => Promise.reject(new Centrifuge.UnauthorizedError('logged out'));
    const expectUnauthorized = async (sub: any, unsubscribed: Promise<any>) => {
      expect((await unsubscribed).code).toBe(unsubscribedCodes.unauthorized);
      expect(sub.state).toBe(SubscriptionState.Unsubscribed);
      expect(sub._sharedPollReplayRetryTimeout).toBeNull();
      expect(sub._sharedPollSignatureRefreshTimeout).toBeNull();
    };
    const unsubscribedEvent = (sub: any) => new Promise<any>(resolve => sub.once('unsubscribed', resolve));

    test('from track(keys)', async () => {
      server.onSubscribe = () => ({});
      const sub: any = c.newSharedPollSubscription('poll', { getSignature: unauthorized });
      sub.subscribe();
      c.connect();
      await sub.ready(3000);
      const unsubscribed = unsubscribedEvent(sub);
      sub.track(['k1']);
      await expectUnauthorized(sub, unsubscribed);
    });

    test('from the signature refresh', async () => {
      server.onSubscribe = () => ({});
      const sub: any = c.newSharedPollSubscription('poll', { getSignature: unauthorized });
      sub.subscribe();
      c.connect();
      await sub.ready(3000);
      const unsubscribed = unsubscribedEvent(sub);
      sub._sharedPollTrackedItems.set('k1', 0);
      sub._sharedPollRefreshSignature();
      await expectUnauthorized(sub, unsubscribed);
    });

    test('from the replay on subscribe', async () => {
      server.onSubscribe = () => ({});
      const sub: any = c.newSharedPollSubscription('poll', { getSignature: unauthorized });
      sub.track(['k1']);
      const unsubscribed = unsubscribedEvent(sub);
      sub.subscribe();
      c.connect();
      await expectUnauthorized(sub, unsubscribed);
    });
  });

  test('a 109 during a signature refresh runs another refresh after it', async () => {
    server.onSubscribe = () => ({});
    const calls: string[][] = [];
    const resolvers: any[] = [];
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: (ctx: any) => {
        calls.push(ctx.keys);
        return new Promise(resolve => resolvers.push(resolve));
      },
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub._sharedPollTrackedItems.set('k1', 0);
    sub._sharedPollRefreshSignature();
    await waitFor(() => calls.length === 1);
    // A 109 for a key the refresh in flight doesn't cover.
    sub._sharedPollTrackedItems.set('k2', 0);
    sub._handleTrackError({ code: 109, message: 'expired' }, ['k2']);
    resolvers[0]({ keys: ['k1'], signature: 's1' });
    await waitFor(() => calls.length === 2);
    expect(calls[1].sort()).toEqual(['k1', 'k2']);
  });

  test('a permanent error on the first frame of a track untracks the keys of the frames after it', async () => {
    server.onSubscribe = () => ({});
    server.onCommand = (cmd) => cmd.sub_refresh?.track
      ? { id: cmd.id, error: { code: 106, message: 'limit exceeded' } }
      : null;
    const sub: any = c.newSharedPollSubscription('poll');
    // Two batches too large for one frame, replayed in one request on subscribe.
    const a = 'a'.repeat(40000);
    const b = 'b'.repeat(40000);
    sub.track([{ key: a, version: 0 }], 'sig1');
    sub.track([{ key: b, version: 0 }], 'sig2');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => sub.trackedKeys().size === 0);
    expect(server.received.filter(cmd => cmd.sub_refresh?.track)).toHaveLength(1);
  });

  test('a server-side subscription gets one subscribing event per subscribed period', async () => {
    server.connectResult = { client: 'fake-client', version: '0.0.0', subs: { s1: {} } };
    const subscribing: string[] = [];
    c.on('subscribing', (ctx: any) => subscribing.push(ctx.channel));
    c.connect();
    await waitFor(() => c.state === State.Connected);
    // On the reconnect a connected handler disconnects before s1 is announced again.
    c.once('connecting', () => {
      c.once('connected', () => c.disconnect());
    });
    server.closeConnection();
    await waitFor(() => c.state === State.Disconnected);
    expect(subscribing).toEqual(['s1']);
  });

  test('a subscription token refresh failing after unsubscribe() leaves no retry', async () => {
    server.onSubscribe = () => ({ expires: true, ttl: 1 } as any);
    let rejectRefresh: any = null;
    let tokenCalls = 0;
    const sub: any = c.newSubscription('ch', {
      getToken: () => (++tokenCalls === 1
        ? Promise.resolve('token')
        : new Promise<string>((_, reject) => { rejectRefresh = reject; })),
    });
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => rejectRefresh !== null);

    sub.unsubscribe();
    rejectRefresh(new Error('token unavailable'));
    await delay(50);
    expect(errors).toEqual([]);
    expect(sub._refreshTimeout).toBeNull();
  }, 10000);

  test('a subscription token refresh failing after a reconnect leaves the refresh of the new subscription alone', async () => {
    server.onSubscribe = () => ({ expires: true, ttl: 1 } as any);
    let rejectRefresh: any = null;
    let tokenCalls = 0;
    const sub: any = c.newSubscription('ch', {
      getToken: () => (++tokenCalls === 1
        ? Promise.resolve('token')
        : new Promise<string>((_, reject) => { rejectRefresh = reject; })),
    });
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => rejectRefresh !== null);

    // The subscription is subscribed again, with its own refresh timer, when the
    // earlier refresh fails.
    const subscribing = new Promise(resolve => sub.once('subscribing', resolve));
    server.closeConnection();
    await subscribing;
    await sub.ready(3000);
    const timer = sub._refreshTimeout;
    expect(timer).not.toBeNull();
    rejectRefresh(new Error('token unavailable'));
    await delay(50);
    expect(errors).toEqual([]);
    expect(sub._refreshTimeout).toBe(timer);
  }, 10000);

  // getSignature calls held until the test resolves them.
  function heldSignatures() {
    const calls: Array<{ keys: string[]; resolve: (result: any) => void }> = [];
    return {
      calls,
      getSignature: (ctx: any) => new Promise(resolve => calls.push({ keys: ctx.keys, resolve })),
    };
  }

  const trackCommands = () => server.received.filter(cmd => cmd.sub_refresh !== undefined && cmd.sub_refresh.track !== undefined);

  async function reconnected(sub: any) {
    const subscribing = new Promise(resolve => sub.once('subscribing', resolve));
    server.closeConnection();
    await subscribing;
    await sub.ready(3000);
  }

  test('a replay signature obtained before a reconnect does not track again after it', async () => {
    server.onSubscribe = () => ({});
    const signatures = heldSignatures();
    const sub: any = c.newSharedPollSubscription('poll', { getSignature: signatures.getSignature } as any);
    sub.track(['k1']);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => signatures.calls.length === 1);

    await reconnected(sub);
    await waitFor(() => signatures.calls.length === 2);
    signatures.calls.forEach(call => call.resolve({ keys: ['k1'], signature: 'sig' }));
    await delay(100);
    expect(trackCommands()).toHaveLength(1);
    expect(sub._sharedPollSignatures).toHaveLength(1);
  });

  test('a replay signature obtained before unsubscribe() and subscribe() does not change the next subscription', async () => {
    server.onSubscribe = () => ({});
    const signatures = heldSignatures();
    const sub: any = c.newSharedPollSubscription('poll', { getSignature: signatures.getSignature } as any);
    const updates: string[] = [];
    sub.on('update', (ctx: any) => updates.push(`${ctx.key}:${ctx.removed ? 'removed' : ctx.version}`));
    sub.track(['b']);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await waitFor(() => signatures.calls.length === 1);

    sub.unsubscribe();
    sub.track(['b']);
    sub.subscribe();
    await sub.ready(3000);
    await waitFor(() => signatures.calls.length === 2);
    // The earlier request's answer no longer authorizes the key.
    signatures.calls[0].resolve({ keys: [], signature: 'old' });
    await delay(50);
    expect(updates).toEqual([]);
    expect(sub._sharedPollTrackedItems.has('b')).toBe(true);
  });

  test('unsubscribe() from a removal handler stops the rest of the revoked keys', async () => {
    server.onSubscribe = () => ({});
    const signatures = heldSignatures();
    const sub: any = c.newSharedPollSubscription('poll', { getSignature: signatures.getSignature } as any);
    const updates: string[] = [];
    sub.on('update', (ctx: any) => {
      updates.push(`${ctx.key}:${ctx.removed ? 'removed' : ctx.version}`);
      sub.unsubscribe();
    });
    sub.track(['k1', 'k2', 'k3']);
    sub.subscribe();
    c.connect();
    await waitFor(() => signatures.calls.length === 1);

    // The backend authorizes none of them: each is revoked, and the handler of the
    // first removal ends the subscription.
    signatures.calls[0].resolve({ keys: [], signature: 'sig' });
    await delay(100);

    expect(updates).toEqual(['k1:removed']);
    // Every revoked key is still untracked locally, only delivery stopped.
    expect(sub._sharedPollTrackedItems.size).toBe(0);
  });

  test('a consolidated signature obtained before a reconnect does not track again after it', async () => {
    server.onSubscribe = () => ({});
    const signatures = heldSignatures();
    const sub: any = c.newSharedPollSubscription('poll', { getSignature: signatures.getSignature } as any);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 0 }], 'sig');
    await waitFor(() => trackCommands().length === 1);

    // E.g. the signature TTL timer fires.
    sub._sharedPollRefreshSignature();
    await waitFor(() => signatures.calls.length === 1);
    await reconnected(sub);
    // The replay of the signature it had.
    await waitFor(() => trackCommands().length === 2);
    signatures.calls[0].resolve({ keys: ['k1'], signature: 'consolidated' });
    await delay(100);
    expect(trackCommands()).toHaveLength(2);
    expect(sub._sharedPollSignatures.map((entry: any) => entry.signature)).toEqual(['sig']);
  });

  test('a track(keys) signature obtained before a reconnect does not track again after it', async () => {
    server.onSubscribe = () => ({});
    const signatures = heldSignatures();
    const sub: any = c.newSharedPollSubscription('poll', { getSignature: signatures.getSignature } as any);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track(['k1']);
    await waitFor(() => signatures.calls.length === 1);

    await reconnected(sub);
    // The replay's own request.
    await waitFor(() => signatures.calls.length === 2);
    signatures.calls.forEach(call => call.resolve({ keys: ['k1'], signature: 'sig' }));
    await delay(100);
    expect(trackCommands()).toHaveLength(1);
  });

  test('track() from a subscribed handler is sent once', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll');
    sub.once('subscribed', () => sub.track([{ key: 'k1', version: 0 }], 'sig'));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await delay(100);
    expect(trackCommands()).toHaveLength(1);
  });

  test('track(keys) from a subscribed handler gets one signature and is sent once', async () => {
    server.onSubscribe = () => ({});
    let calls = 0;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: (ctx: any) => {
        calls++;
        return Promise.resolve({ keys: ctx.keys, signature: 'sig' });
      },
    } as any);
    sub.once('subscribed', () => sub.track(['k1']));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await delay(100);
    expect(calls).toBe(1);
    expect(trackCommands()).toHaveLength(1);
  });

  function recordSubscriptionEvents(sub: any) {
    const events: string[] = [];
    sub.on('state', (ctx: any) => events.push(`state:${ctx.newState}`));
    sub.on('subscribing', () => events.push('subscribing'));
    sub.on('subscribed', () => events.push('subscribed'));
    sub.on('unsubscribed', () => events.push('unsubscribed'));
    return events;
  }

  test('no unsubscribed event after a state handler of unsubscribe() subscribed again', async () => {
    const { sub } = await subscribed('ch');
    const events = recordSubscriptionEvents(sub);
    sub.once('state', () => sub.subscribe());
    sub.unsubscribe();
    await sub.ready(3000);
    expect(events).toEqual(['state:unsubscribed', 'state:subscribing', 'subscribing', 'state:subscribed', 'subscribed']);
  });

  test('no subscribing event after a state handler of subscribe() unsubscribed', async () => {
    const sub = c.newSubscription('ch');
    c.connect();
    await c.ready(3000);
    const events = recordSubscriptionEvents(sub);
    sub.once('state', () => sub.unsubscribe());
    sub.subscribe();
    await delay(50);
    expect(events).toEqual(['state:subscribing', 'state:unsubscribed', 'unsubscribed']);
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
    expect(subscribeCommands()).toHaveLength(0);
  });

  test('a subscription token refresh error handler that disconnects leaves no retry', async () => {
    server.onSubscribe = () => ({ expires: true, ttl: 1 } as any);
    let tokenCalls = 0;
    const sub: any = c.newSubscription('ch', {
      getToken: () => (++tokenCalls === 1 ? Promise.resolve('token') : Promise.reject(new Error('token unavailable'))),
    });
    const refreshError = new Promise<void>(resolve => {
      sub.on('error', (ctx: any) => {
        if (ctx.type === 'refreshToken') {
          c.disconnect();
          resolve();
        }
      });
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await refreshError;
    await delay(20);
    expect(sub._refreshTimeout).toBeNull();
  }, 10000);

  test('a subscription refresh error handler that disconnects leaves no retry', async () => {
    server.onSubscribe = () => ({ expires: true, ttl: 1 } as any);
    server.onCommand = (cmd) => (cmd.sub_refresh !== undefined
      ? { id: cmd.id, error: { code: 100, message: 'internal server error', temporary: true } }
      : null);
    const sub: any = c.newSubscription('ch', { getToken: () => Promise.resolve('token') });
    const refreshError = new Promise<void>(resolve => {
      sub.on('error', (ctx: any) => {
        if (ctx.type === 'refresh') {
          c.disconnect();
          resolve();
        }
      });
    });
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await refreshError;
    await delay(20);
    expect(sub._refreshTimeout).toBeNull();
  }, 10000);

  test('a shared poll signature refresh error handler that disconnects leaves no retry', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => Promise.reject(new Error('backend unavailable')),
    } as any);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 0 }], 'sig');
    const refreshError = new Promise<void>(resolve => {
      sub.on('error', (ctx: any) => {
        if (ctx.type === 'signatureRefresh') {
          c.disconnect();
          resolve();
        }
      });
    });
    // E.g. the signature TTL timer fires.
    sub._sharedPollRefreshSignature();
    await refreshError;
    await delay(20);
    expect(sub._sharedPollSignatureRefreshTimeout).toBeNull();
  });

  test('a subscription getToken throwing synchronously is retried', async () => {
    let calls = 0;
    const sub: any = c.newSubscription('ch', {
      getToken: () => {
        if (++calls === 1) {
          throw new Error('sync getToken failure');
        }
        return Promise.resolve('token');
      },
      minResubscribeDelay: 10,
      maxResubscribeDelay: 50,
    });
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    expect(calls).toBe(2);
    expect(errors).toEqual(['subscribeToken']);
  });

  test('a subscription getState throwing synchronously is retried', async () => {
    let calls = 0;
    const sub: any = c.newSubscription('ch', {
      getState: () => {
        if (++calls === 1) {
          throw new Error('sync getState failure');
        }
        return Promise.resolve({ offset: 0, epoch: 'e' });
      },
      minResubscribeDelay: 10,
      maxResubscribeDelay: 50,
    } as any);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    expect(calls).toBe(2);
  });

  test('a subscription getData throwing synchronously is retried', async () => {
    let calls = 0;
    const sub: any = c.newSubscription('ch', {
      getData: () => {
        if (++calls === 1) {
          throw new Error('sync getData failure');
        }
        return Promise.resolve({});
      },
      minResubscribeDelay: 10,
      maxResubscribeDelay: 50,
    } as any);
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    expect(calls).toBe(2);
    expect(errors).toEqual(['subscribeData']);
  });

  test('a shared poll getSignature throwing synchronously during the replay keeps the client connected', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => {
        throw new Error('sync getSignature failure');
      },
    } as any);
    const errors: string[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.type));
    sub.track(['k1']);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await delay(50);
    expect(c.state).toBe(State.Connected);
    expect(errors).toEqual(['signatureRefresh']);
  });

  test('a track reply for an expired signature schedules a signature refresh', async () => {
    server.onSubscribe = () => ({});
    let signatureCalls = 0;
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: (ctx: any) => {
        signatureCalls++;
        return Promise.resolve({ keys: ctx.keys, signature: 'fresh' });
      },
    } as any);
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    // The server accepts a signature within its grace period after expiry, and replies
    // with expires but no ttl.
    server.onCommand = (cmd) => (cmd.sub_refresh !== undefined && cmd.sub_refresh.track !== undefined
      ? { id: cmd.id, sub_refresh: { expires: true } }
      : null);
    sub.track([{ key: 'k1', version: 0 }], 'old');
    await waitFor(() => signatureCalls === 1, 3000);
  }, 10000);

  test('a signature tracked again from a subscribed handler replaces the one it covers in the replay', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    sub.track([{ key: 'k1', version: 0 }], 'old');
    await waitFor(() => trackCommands().length === 1);

    // After the reconnect the old signature has expired: the app tracks with a new one.
    const errors: number[] = [];
    sub.on('error', (ctx: any) => errors.push(ctx.error.code));
    server.onCommand = (cmd) => {
      const req = cmd.sub_refresh;
      if (req !== undefined && req.track !== undefined && req.track.some((batch: any) => batch.signature === 'old')) {
        return { id: cmd.id, error: { code: 109, message: 'token expired' } };
      }
      return null;
    };
    sub.once('subscribed', () => sub.track([{ key: 'k1', version: 0 }], 'fresh'));
    await reconnected(sub);
    await waitFor(() => trackCommands().length === 2);
    await delay(50);
    expect(trackCommands()[1].sub_refresh.track.map((batch: any) => batch.signature)).toEqual(['fresh']);
    expect(errors).toEqual([]);
  });

  test('a track error handler that disconnects leaves no track retry', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    server.onCommand = (cmd) => (cmd.sub_refresh !== undefined
      ? { id: cmd.id, error: { code: 100, message: 'internal server error', temporary: true } }
      : null);
    const trackError = new Promise<void>(resolve => {
      sub.on('error', (ctx: any) => {
        if (ctx.type === 'track') {
          c.disconnect();
          resolve();
        }
      });
    });
    sub.track([{ key: 'k1', version: 0 }], 'sig');
    await trackError;
    await delay(20);
    expect(sub._sharedPollTrackRetryTimeout).toBeNull();
  });

  test('a replay signature error handler that disconnects leaves no replay retry', async () => {
    server.onSubscribe = () => ({});
    const sub: any = c.newSharedPollSubscription('poll', {
      getSignature: () => Promise.reject(new Error('backend unavailable')),
    } as any);
    const signatureError = new Promise<void>(resolve => {
      sub.on('error', (ctx: any) => {
        if (ctx.type === 'signatureRefresh') {
          c.disconnect();
          resolve();
        }
      });
    });
    sub.track(['k1']);
    sub.subscribe();
    c.connect();
    await signatureError;
    await delay(20);
    expect(sub._sharedPollReplayRetryTimeout).toBeNull();
  });

  test('one subscribing event when a state handler of subscribe() unsubscribes and subscribes again', async () => {
    const sub = c.newSubscription('ch');
    c.connect();
    await c.ready(3000);
    const events = recordSubscriptionEvents(sub);
    sub.once('state', () => {
      sub.unsubscribe();
      sub.subscribe();
    });
    sub.subscribe();
    await sub.ready(3000);
    expect(events).toEqual(['state:subscribing', 'state:unsubscribed', 'unsubscribed', 'state:subscribing', 'subscribing', 'state:subscribed', 'subscribed']);
  });

  test('one unsubscribed event when a state handler of unsubscribe() subscribes and unsubscribes again', async () => {
    const { sub } = await subscribed('ch');
    const events = recordSubscriptionEvents(sub);
    sub.once('state', () => {
      sub.subscribe();
      sub.unsubscribe();
    });
    sub.unsubscribe();
    await delay(50);
    expect(events).toEqual(['state:unsubscribed', 'state:subscribing', 'subscribing', 'state:unsubscribed', 'unsubscribed']);
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

  test('the stored position moves only after a publication handler returned', async () => {
    const { sub } = await subscribed('ch');
    const during: any[] = [];
    sub.on('publication', () => during.push((sub as any)._offset));

    sendFrame(publication('ch', 1), publication('ch', 2));
    await waitFor(() => during.length === 2);

    // The position the app can observe never runs ahead of what it received.
    expect(during).toEqual([0, 1]);
    expect((sub as any)._offset).toBe(2);
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
