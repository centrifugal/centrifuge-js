import { Centrifuge } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { disconnectedCodes } from './codes';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// An exception escaping an application event handler, wherever the event comes
// from, disconnects the client with badProtocol and is re-raised as an unhandled
// rejection. The SDK's own work completes as if the handler had returned.

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

describe('exceptions in event handlers', () => {
  let server: FakeCentrifugoServer;
  let c: Centrifuge;
  let top: number;
  let reported: any[];
  let connections: number;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    top = 0;
    server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: top } as any);
    connections = 0;
    (server as any).wss.on('connection', () => connections++);
    c = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint: server.url }], {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
    // Applications see the exception as an unhandled rejection; captured here instead.
    reported = [];
    (c as any)._reportDispatchError = (err: any) => reported.push(err);
  });

  afterEach(async () => {
    c.disconnect();
    await server.close();
  });

  const subscribeCommands = () => server.received.filter(cmd => cmd.subscribe !== undefined);
  const disconnected = () => new Promise<any>(resolve => c.once('disconnected', resolve));

  test('a connecting handler throwing inside connect() disconnects the client', async () => {
    c.once('connecting', () => {
      throw new Error('boom');
    });
    const done = disconnected();
    c.connect();
    const ctx = await done;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(ctx.reason).toBe('exception in event handler: boom');
    expect(reported.map(e => e.message)).toEqual(['boom']);
    expect(c.state).toBe(State.Disconnected);

    // No reconnect, until the app connects again.
    await delay(100);
    expect(connections).toBe(0);
    c.connect();
    await c.ready(3000);
  });

  test('a subscribing handler throwing inside subscribe() while connected disconnects the client', async () => {
    c.connect();
    await c.ready(3000);
    const sub = c.newSubscription('ch');
    sub.once('subscribing', () => {
      throw new Error('boom');
    });
    const done = disconnected();
    sub.subscribe();
    const ctx = await done;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(reported.map(e => e.message)).toEqual(['boom']);
    // The subscribe completed as far as it could: the subscription waits for the
    // connection, and subscribes after connect().
    expect(sub.state).toBe(SubscriptionState.Subscribing);
    c.connect();
    await sub.ready(3000);
    expect(subscribeCommands().length).toBe(1);
  });

  test('a connecting handler throwing on a reconnect disconnects the client without reconnecting', async () => {
    c.connect();
    await c.ready(3000);
    c.once('connecting', () => {
      throw new Error('boom');
    });
    const done = disconnected();
    server.closeConnection();
    const ctx = await done;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(reported.map(e => e.message)).toEqual(['boom']);
    await delay(100);
    expect(connections).toBe(1);
    expect(c.state).toBe(State.Disconnected);
  });

  test('a disconnected handler throwing inside disconnect() keeps the disconnect', async () => {
    c.connect();
    await c.ready(3000);
    const codes: number[] = [];
    c.on('disconnected', ctx => codes.push(ctx.code));
    c.once('disconnected', () => {
      throw new Error('boom');
    });
    c.disconnect();
    expect(c.state).toBe(State.Disconnected);
    expect(codes).toEqual([disconnectedCodes.disconnectCalled]);
    expect(reported.map(e => e.message)).toEqual(['boom']);
    await delay(100);
    expect(connections).toBe(1);
  });

  test('a handler throwing in a handler of the teardown it caused reports both', async () => {
    c.connect();
    await c.ready(3000);
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await sub.ready(3000);
    sub.once('subscribing', () => {
      throw new Error('second');
    });
    sub.once('publication', () => {
      throw new Error('first');
    });
    const done = disconnected();
    server.publish('ch', {}, { offset: 1 });
    const ctx = await done;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(ctx.reason).toBe('exception in event handler: first');
    expect(reported.map(e => e.message)).toEqual(['first', 'second']);
    expect(c.state).toBe(State.Disconnected);
    expect(sub.state).toBe(SubscriptionState.Subscribing);
  });

  test('a publication whose handler threw is delivered again after connect()', async () => {
    const sub = c.newSubscription('ch');
    const received: number[] = [];
    sub.on('publication', ctx => received.push(ctx.data.n));
    sub.subscribe();
    c.connect();
    await sub.ready(3000);

    let failOnce = true;
    sub.on('publication', () => {
      if (failOnce) {
        failOnce = false;
        throw new Error('boom');
      }
    });
    const done = disconnected();
    top = 1;
    server.publish('ch', { n: 1 }, { offset: 1 });
    await done;
    expect((sub as any)._offset).toBe(0);

    c.connect();
    await sub.ready(3000);
    const last = subscribeCommands()[subscribeCommands().length - 1].subscribe;
    expect(last).toMatchObject({ recover: true, epoch: 'e' });
    expect(last.offset).toBeUndefined();
    expect(received).toEqual([1]);
  });

  test('a server-side publication whose handler threw is recovered from before it', async () => {
    server.connectResult = {
      client: 'fake-client', version: '0.0.0',
      subs: { ss: { recoverable: true, epoch: 'e', offset: 0 } },
    };
    c.connect();
    await c.ready(3000);
    c.once('publication', () => {
      throw new Error('boom');
    });
    const done = disconnected();
    server.publish('ss', { n: 1 }, { offset: 1 });
    await done;

    c.connect();
    await c.ready(3000);
    const connects = server.received.filter(cmd => cmd.connect !== undefined);
    const subs = connects[connects.length - 1].connect.subs;
    expect(subs.ss).toEqual({ recover: true, epoch: 'e' });
  });

  test('an error handler throwing disconnects the client', async () => {
    c.connect();
    await c.ready(3000);
    const sub = c.newSubscription('ch');
    server.onCommand = cmd => cmd.subscribe !== undefined
      ? { id: cmd.id, error: { code: 100, message: 'temporary', temporary: true } }
      : undefined;
    sub.once('error', () => {
      throw new Error('boom');
    });
    const done = disconnected();
    sub.subscribe();
    const ctx = await done;
    expect(ctx.code).toBe(disconnectedCodes.badProtocol);
    expect(reported.map(e => e.message)).toEqual(['boom']);
    // No resubscribe is left running while the client is disconnected.
    const sent = subscribeCommands().length;
    await delay(200);
    expect(subscribeCommands().length).toBe(sent);
  });
});
