import { Centrifuge } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { disconnectedCodes } from './codes';
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
});
