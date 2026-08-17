import { Centrifuge, UnauthorizedError } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { disconnectedCodes } from './codes';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

// Recovering from a transport failure has to leave a connection that actually
// works, not merely one that reports Connected. These exercise the paths a real
// application takes across a failure - subscriptions, publishes, history,
// network events, token callbacks - against a live server.

const wsEndpoint = 'ws://localhost:8000/connection/websocket';
const httpStreamEndpoint = 'http://localhost:8000/connection/http_stream';
const sseEndpoint = 'http://localhost:8000/connection/sse';
const emulationEndpoint = 'http://localhost:8000/emulation';

const clients: Centrifuge[] = [];

function track(c: Centrifuge): Centrifuge {
  clients.push(c);
  return c;
}

afterEach(() => {
  while (clients.length) {
    try { clients.pop()!.disconnect(); } catch { /* teardown must not mask assertions */ }
  }
});

function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error('timeout waiting for condition'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

/** Throws for the first `failFor` attempts, then hands back a real socket. */
function flakyWebSocket(state: { attempts: number }, failFor: number) {
  return function (this: any, url: string) {
    state.attempts++;
    if (state.attempts <= failFor) {
      throw new Error('blocked attempt ' + state.attempts);
    }
    return new (WebSocket as any)(url);
  } as any;
}

function alwaysThrowingWebSocket(state: { attempts: number }) {
  return function () {
    state.attempts++;
    throw new Error('blocked');
  } as any;
}

describe('subscriptions across a transport failure', () => {
  test('a subscription made before connect still subscribes once the transport works', async () => {
    const st = { attempts: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: flakyWebSocket(st, 3),
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
    }));
    c.on('error', () => { /* expected for the failing attempts */ });

    const sub = c.newSubscription('test');
    const subscribed: any[] = [];
    sub.on('subscribed', (ctx) => subscribed.push(ctx));
    sub.on('error', () => { /* not expected, but must not throw as unhandled */ });
    sub.subscribe();

    c.connect();
    await waitFor(() => subscribed.length > 0, 8000);

    expect(c.state).toBe(State.Connected);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
    expect(st.attempts).toBeGreaterThanOrEqual(4);
  }, 15000);

  test('a subscription resubscribes after the socket is dropped mid-session', async () => {
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
    }));
    c.on('error', () => { /* ignore */ });

    const sub = c.newSubscription('test');
    let subscribedCount = 0;
    sub.on('subscribed', () => { subscribedCount++; });
    sub.on('error', () => { /* ignore */ });
    sub.subscribe();

    c.connect();
    await waitFor(() => subscribedCount === 1, 8000);

    // Kill the underlying socket without telling the client.
    (c as any)._transport._transport.close();

    await waitFor(() => subscribedCount === 2, 8000);
    expect(c.state).toBe(State.Connected);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
  }, 15000);

  test('publish, receive and history all work after recovering', async () => {
    const st = { attempts: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: flakyWebSocket(st, 2),
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
    }));
    c.on('error', () => { /* expected */ });

    const sub = c.newSubscription('test');
    const received: any[] = [];
    sub.on('publication', (ctx) => received.push(ctx.data));
    sub.on('error', () => { /* ignore */ });
    sub.subscribe();

    c.connect();
    await c.ready(8000);
    await waitFor(() => sub.state === SubscriptionState.Subscribed, 8000);

    await sub.publish({ hello: 'after recovery' });
    await waitFor(() => received.length > 0, 5000);
    expect(received[0]).toEqual({ hello: 'after recovery' });

    const history = await sub.history({ limit: 10 });
    expect(history.publications.length).toBeGreaterThanOrEqual(1);

    const stats = await sub.presenceStats();
    expect(stats.numClients).toBeGreaterThanOrEqual(1);
  }, 20000);

  test('a map subscription works after transport failures', async () => {
    const st = { attempts: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: flakyWebSocket(st, 3),
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
    }));
    c.on('error', () => { /* expected */ });

    const sub = c.newMapSubscription('streamless:recovery');
    sub.on('error', () => { /* ignore */ });
    sub.subscribe();

    c.connect();
    await c.ready(8000);
    await waitFor(() => sub.state === SubscriptionState.Subscribed, 8000);

    const entries: any[] = [];
    sub.on('publication', (ctx: any) => entries.push(ctx));
    await sub.publish('k1', { v: 1 });
    await waitFor(() => entries.length > 0, 5000);

    expect(st.attempts).toBeGreaterThanOrEqual(4);
  }, 25000);
});

describe('falling back to an emulation transport yields a usable connection', () => {
  test.each([
    ['http_stream', httpStreamEndpoint],
    ['sse', sseEndpoint],
  ])('%s', async (transport, endpoint) => {
    const st = { attempts: 0 };
    const c = track(new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      { transport: transport as TransportName, endpoint: endpoint },
    ], {
      websocket: alwaysThrowingWebSocket(st),
      eventsource: EventSource,
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', () => { /* expected for the blocked websocket */ });

    const sub = c.newSubscription('test');
    const received: any[] = [];
    sub.on('publication', (ctx) => received.push(ctx.data));
    sub.on('error', () => { /* ignore */ });
    sub.subscribe();

    c.connect();
    await c.ready(8000);
    await waitFor(() => sub.state === SubscriptionState.Subscribed, 8000);

    await sub.publish({ via: transport });
    await waitFor(() => received.length > 0, 5000);

    expect(received[0]).toEqual({ via: transport });
    expect((c as any)._transport.name()).toBe(transport);
    expect(st.attempts).toBeGreaterThanOrEqual(1);
  }, 20000);

  test('rotates through a three transport list until one works', async () => {
    const st = { attempts: 0 };
    const c = track(new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      { transport: 'sse' as TransportName, endpoint: sseEndpoint },
      { transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint },
    ], {
      websocket: alwaysThrowingWebSocket(st),
      eventsource: function () { throw new Error('sse blocked'); } as any,
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', () => { /* expected for the first two */ });

    c.connect();
    await c.ready(8000);

    expect(c.state).toBe(State.Connected);
    expect((c as any)._transport.name()).toBe('http_stream');
  }, 20000);
});

describe('token callbacks are unaffected by transport error reporting', () => {
  test('UnauthorizedError from getToken still terminates the client', async () => {
    const disconnects: any[] = [];
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
      getToken: () => Promise.reject(new UnauthorizedError('nope')),
    }));
    c.on('error', () => { /* ignore */ });
    c.on('disconnected', (ctx) => disconnects.push(ctx));

    c.connect();
    await waitFor(() => disconnects.length > 0, 5000);

    expect(c.state).toBe(State.Disconnected);
    expect(disconnects[0].code).toBe(disconnectedCodes.unauthorized);
  }, 15000);

  test('a failing getToken still reports connectToken and keeps retrying', async () => {
    // Transport faults were moved off this reporting path; genuine token faults
    // must still arrive on it.
    const errors: any[] = [];
    let calls = 0;
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
      getToken: () => { calls++; return Promise.reject(new Error('token backend down')); },
    }));
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => calls >= 3, 5000);

    expect(errors.some(e => e.type === 'connectToken')).toBe(true);
    expect(c.state).toBe(State.Connecting);
  }, 15000);

  test('disconnect during an in-flight getToken leaves no transport behind', async () => {
    let release: (v: string) => void = () => { /* assigned below */ };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
      getToken: () => new Promise<string>((res) => { release = res; }),
    }));
    c.on('error', () => { /* ignore */ });

    c.connect();
    expect(c.state).toBe(State.Connecting);
    c.disconnect();
    expect(c.state).toBe(State.Disconnected);

    release('a-token');                       // token arrives after disconnect
    await new Promise(r => setTimeout(r, 300));

    expect(c.state).toBe(State.Disconnected);
    expect((c as any)._transport).toBeNull();
  }, 15000);
});

describe('network events', () => {
  test('offline then online reconnects', async () => {
    const net = new EventTarget();
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      networkEventTarget: net as any,
      minReconnectDelay: 20,
      maxReconnectDelay: 40,
    }));
    c.on('error', () => { /* ignore */ });

    c.connect();
    await c.ready(6000);
    expect(c.state).toBe(State.Connected);

    net.dispatchEvent(new Event('offline'));
    expect(c.state).toBe(State.Connecting);

    net.dispatchEvent(new Event('online'));
    await waitFor(() => c.state === State.Connected, 6000);
  }, 20000);

  test('offline arriving during a failing attempt still recovers', async () => {
    const net = new EventTarget();
    const st = { attempts: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: flakyWebSocket(st, 2),
      networkEventTarget: net as any,
      minReconnectDelay: 30,
      maxReconnectDelay: 60,
    }));
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => st.attempts >= 1, 4000);
    net.dispatchEvent(new Event('offline'));
    net.dispatchEvent(new Event('online'));

    await waitFor(() => c.state === State.Connected, 8000);
  }, 20000);
});

// The SDK deliberately does no error handling for application callbacks - see
// "Errors in callbacks" in the README - so nothing here relies on a listener
// being allowed to throw.
describe('reacting to errors from a listener', () => {
  test('disconnect() called from an error listener stops cleanly', async () => {
    // The documented way to opt out of retrying an unrecoverable fault, so it
    // has to survive being called re-entrantly from inside the error emit.
    const st = { attempts: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: alwaysThrowingWebSocket(st),
      timeout: 100,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', (ctx) => {
      if (ctx.type === 'transport') { c.disconnect(); }
    });

    expect(() => c.connect()).not.toThrow();
    await waitFor(() => c.state === State.Disconnected, 4000);

    const seen = st.attempts;
    await new Promise(r => setTimeout(r, 200));

    expect(c.state).toBe(State.Disconnected);
    expect(st.attempts).toBe(seen);
    expect((c as any)._transport).toBeNull();
  }, 15000);
});

describe('client lifecycle', () => {
  test('rapid connect and disconnect cycles leave a working client', async () => {
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* ignore */ });

    for (let i = 0; i < 10; i++) {
      c.connect();
      c.disconnect();
    }

    c.connect();
    await c.ready(6000);
    expect(c.state).toBe(State.Connected);
  }, 15000);

  test('connect() called synchronously after disconnect() reconnects', async () => {
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* ignore */ });

    c.connect();
    await c.ready(6000);

    c.disconnect();
    c.connect();
    await c.ready(6000);

    expect(c.state).toBe(State.Connected);
  }, 15000);

  test('repeated failures leave no timers behind after disconnect', async () => {
    const st = { attempts: 0 };
    const c = new Centrifuge(wsEndpoint, {
      websocket: alwaysThrowingWebSocket(st),
      timeout: 50,
      minReconnectDelay: 10,
      maxReconnectDelay: 10,
    });
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => st.attempts >= 15, 8000);

    c.disconnect();
    expect((c as any)._connectTimeout).toBeNull();
    expect((c as any)._reconnectTimeout).toBeNull();
    expect((c as any)._transport).toBeNull();

    const seen = st.attempts;
    await new Promise(r => setTimeout(r, 200));
    expect(st.attempts).toBe(seen);
  }, 20000);
});
