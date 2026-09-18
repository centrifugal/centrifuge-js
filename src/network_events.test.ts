import { Centrifuge } from './centrifuge';
import { DisconnectedContext, Options, State, SubscriptionState, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';
import { connectingCodes, disconnectedCodes, errorCodes, unsubscribedCodes } from './codes';

import WebSocket, { WebSocketServer } from 'ws';
import http from 'node:http';
import { ReadableStream } from 'node:stream/web';

// Regression guard for #389: online/offline listeners must be removed once the
// client becomes disconnected. Otherwise every disconnected client stays
// reachable from the network event target (window by default in browsers).

class CountingEventTarget extends EventTarget {
  readonly counts: Record<string, number> = { offline: 0, online: 0 };

  addEventListener(type: string, callback: any, options?: any): void {
    this.counts[type] = (this.counts[type] || 0) + 1;
    super.addEventListener(type, callback, options);
  }

  removeEventListener(type: string, callback: any, options?: any): void {
    this.counts[type] = (this.counts[type] || 0) - 1;
    super.removeEventListener(type, callback, options);
  }
}

function waitForEvent<T>(emitter: any, event: string, timeout = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for '${event}'`)), timeout);
    emitter.on(event, (ctx: T) => {
      clearTimeout(timer);
      resolve(ctx);
    });
  });
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Counts transports the client initializes from now on.
function countTransportInits(c: Centrifuge): { n: number } {
  const counter = { n: 0 };
  (c as any).on('__centrifuge_debug:transport_initialized', () => counter.n++);
  return counter;
}

// WebSocket constructor for the client that counts how many of its sockets were closed.
function trackWebSockets(): { WebSocket: typeof WebSocket; closed: () => number } {
  const closedSockets = new Set<WebSocket>();
  class TrackingWebSocket extends WebSocket {
    close(code?: number, data?: string | Buffer): void {
      // Sockets, not calls: ws calls close() again itself when the close frame arrives.
      closedSockets.add(this);
      super.close(code, data);
    }
  }
  return { WebSocket: TrackingWebSocket, closed: () => closedSockets.size };
}

// A server that accepts connections and never replies. onMessage is called with
// the socket on its first message (the connect command).
async function startSilentServer(onMessage: (ws: WebSocket) => void = () => {}) {
  const wss = new WebSocketServer({ port: 0 });
  await new Promise<void>(r => wss.on('listening', () => r()));
  const addr = wss.address();
  const port = typeof addr === 'string' ? 0 : addr.port;
  const connectSent = new Promise<void>(r => wss.on('connection', ws => ws.once('message', () => {
    onMessage(ws);
    r();
  })));
  return {
    url: `ws://localhost:${port}/connection/websocket`,
    connectSent,
    close: () => {
      wss.clients.forEach(ws => ws.terminate());
      return new Promise<void>(r => wss.close(() => r()));
    },
  };
}

// Fake SSE and http_stream transports. Each connect is answered with the replies
// onConnect returns for the connect command; emulation requests get onEmulation().
function fakeEmulation(onConnect: (cmd: any) => any, onEmulation: () => any = () => ({ ok: true, status: 200 })) {
  let connects = 0;
  const encode = (cmd: any) => {
    connects++;
    const replies = onConnect(cmd);
    return (Array.isArray(replies) ? replies : [replies]).map(r => JSON.stringify(r));
  };
  class FakeEventSource {
    onopen: any = null;
    onmessage: any = null;
    onerror: any = null;
    constructor(url: string) {
      const lines = encode(JSON.parse(new URL(url).searchParams.get('cf_connect')!));
      setTimeout(() => {
        this.onopen?.();
        lines.forEach(data => this.onmessage?.({ data }));
      }, 0);
    }
    close() { /* no-op */ }
  }
  const fetch = (url: string, opts: any) => {
    if (url.endsWith('/emulation')) {
      return Promise.resolve(onEmulation());
    }
    const lines = encode(JSON.parse(opts.body));
    const body = new ReadableStream({
      start(controller) {
        lines.forEach(line => controller.enqueue(new TextEncoder().encode(line + '\n')));
        opts.signal.addEventListener('abort', () => controller.error(new Error('aborted')));
      },
    });
    return Promise.resolve({ ok: true, status: 200, body });
  };
  return {
    options: { eventsource: FakeEventSource, fetch, readableStream: ReadableStream, emulationEndpoint: 'http://localhost:1/emulation' },
    connects: () => connects,
  };
}

describe('network event listeners', () => {
  let server: FakeCentrifugoServer;
  let target: CountingEventTarget;
  let clients: Centrifuge[];

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    target = new CountingEventTarget();
    clients = [];
  });

  afterEach(async () => {
    clients.forEach(c => c.disconnect());
    await server.close();
  });

  const newClient = (options: Partial<Options> = {}, endpoint: string = server.url) => {
    const c = new Centrifuge([{
      transport: 'websocket' as TransportName,
      endpoint: endpoint,
    }], {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: target,
      ...options,
    });
    clients.push(c);
    return c;
  };

  const collectErrors = (c: Centrifuge) => {
    const errors: string[] = [];
    c.on('error', (ctx) => errors.push(`${ctx.type}:${ctx.error.code}`));
    return errors;
  };

  const newEmulationClient = (transport: string, emulation: ReturnType<typeof fakeEmulation>, options: Partial<Options> = {}) => {
    const c = new Centrifuge([
      { transport: transport as TransportName, endpoint: `http://localhost:1/connection/${transport}` },
    ], {
      ...emulation.options,
      networkEventTarget: target,
      ...options,
    });
    clients.push(c);
    return c;
  };

  test('removed on disconnect() and added again on connect()', async () => {
    const c = newClient();
    expect(target.counts).toEqual({ offline: 0, online: 0 });

    c.connect();
    await c.ready(5000);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    c.disconnect();
    expect(target.counts).toEqual({ offline: 0, online: 0 });

    c.connect();
    await c.ready(5000);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    c.disconnect();
    expect(target.counts).toEqual({ offline: 0, online: 0 });
  });

  test('discarded clients do not accumulate listeners on a shared target', async () => {
    for (let i = 0; i < 5; i++) {
      const c = newClient();
      c.connect();
      c.disconnect();
    }
    for (let i = 0; i < 3; i++) {
      const c = newClient();
      c.connect();
      await c.ready(5000);
      c.disconnect();
    }
    expect(target.counts).toEqual({ offline: 0, online: 0 });
  });

  test('kept while reconnecting after offline, so online still reconnects', async () => {
    const c = newClient();
    c.connect();
    await c.ready(5000);

    target.dispatchEvent(new Event('offline'));
    expect(c.state).toBe(State.Connecting);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    target.dispatchEvent(new Event('online'));
    await c.ready(5000);
    expect(c.state).toBe(State.Connected);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    c.disconnect();
    expect(target.counts).toEqual({ offline: 0, online: 0 });
  });

  test('removed when server disconnects the client without reconnect', async () => {
    const c = newClient();
    c.connect();
    await c.ready(5000);

    const disconnectedPromise = waitForEvent<DisconnectedContext>(c, 'disconnected');
    server.disconnect(3501, 'terminal');
    const ctx = await disconnectedPromise;

    expect(ctx.code).toBe(3501);
    expect(c.state).toBe(State.Disconnected);
    expect(target.counts).toEqual({ offline: 0, online: 0 });
  });

  test('added on connect() before token is loaded, so online skips token retry backoff', async () => {
    let tokenCalls = 0;
    const c = newClient({
      minReconnectDelay: 60000,
      maxReconnectDelay: 60000,
      getToken: () => {
        tokenCalls++;
        return tokenCalls === 1 ? Promise.reject(new Error('token unavailable')) : Promise.resolve('token');
      },
    });

    const errorPromise = waitForEvent(c, 'error');
    c.connect();
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    // First token request fails, next attempt is scheduled after a 60s backoff.
    await errorPromise;
    expect(c.state).toBe(State.Connecting);

    target.dispatchEvent(new Event('online'));
    await c.ready(2000);
    expect(tokenCalls).toBe(2);
  });

  test('online aborts a transport opened while offline and starts over', async () => {
    const sockets = trackWebSockets();
    const c = newClient({ websocket: sockets.WebSocket });
    c.connect();
    await c.ready(5000);

    const inits = countTransportInits(c);
    const initialized = waitForEvent(c, '__centrifuge_debug:transport_initialized');
    target.dispatchEvent(new Event('offline'));
    // The reconnect timer opens a new transport while the device is still offline.
    await initialized;
    expect(sockets.closed()).toBe(1);

    // Mobile Safari may never issue the close callback for that transport, so
    // online must not wait for it: it is closed and a new attempt starts at once.
    target.dispatchEvent(new Event('online'));
    expect(sockets.closed()).toBe(2);
    expect(inits.n).toBe(2);
    await c.ready(5000);
    expect(c.state).toBe(State.Connected);
  });

  test('connect command of a transport aborted by online is not reported as error', async () => {
    const c = newClient();
    const errors = collectErrors(c);
    c.connect();
    await c.ready(5000);

    // The server stops answering connect commands (the reply goes to an unknown
    // command id), so the next connect command stays pending.
    const connectPending = new Promise<void>(resolve => {
      server.onCommand = (cmd) => {
        if (cmd.connect !== undefined) {
          resolve();
          return { id: 999999 };
        }
        return null;
      };
    });
    target.dispatchEvent(new Event('offline'));
    // The reconnect timer opens a transport while offline and sends connect on it.
    await connectPending;

    // online aborts that transport: the rejection of its connect command is not an error.
    target.dispatchEvent(new Event('online'));
    await delay(50);
    expect(errors).toEqual([]);
    expect(c.state).toBe(State.Connecting);
  });

  test('offline flag is reset by a disconnect() made during the offline teardown', async () => {
    const c = newClient();
    c.connect();
    await c.ready(5000);

    c.once('connecting', () => c.disconnect());
    target.dispatchEvent(new Event('offline'));
    expect(c.state).toBe(State.Disconnected);

    const inits = countTransportInits(c);
    c.connect();
    expect(inits.n).toBe(1);
    // The new attempt was not opened while offline, so online must not abort it.
    target.dispatchEvent(new Event('online'));
    expect(inits.n).toBe(1);
    await c.ready(5000);
  });

  test('ready() after connect() in a disconnected handler waits for the new connection', async () => {
    const c = newClient();
    c.connect();
    await c.ready(5000);

    const readies: Promise<void>[] = [];
    c.once('disconnected', () => {
      c.connect();
      readies.push(c.ready(5000));
    });
    c.disconnect();
    expect(c.state).toBe(State.Connecting);
    expect(readies.length).toBe(1);
    await readies[0];
    expect(c.state).toBe(State.Connected);
  });

  test('connect() in a disconnected handler is not undone by the rest of the teardown', async () => {
    const c = newClient({ minReconnectDelay: 1000, maxReconnectDelay: 1000 });
    c.connect();
    await c.ready(5000);

    // Server closes the connection: client is connecting, no transport, reconnect timer pending.
    const connecting = waitForEvent(c, 'connecting');
    server.closeConnection();
    await connecting;

    const inits = countTransportInits(c);
    let disconnectCode = -1;
    c.once('disconnected', (ctx) => {
      disconnectCode = ctx.code;
      c.connect();
    });

    c.disconnect();
    expect(disconnectCode).toBe(disconnectedCodes.disconnectCalled);
    // The handler's connect() opened a transport at once (no token to load).
    expect(c.state).toBe(State.Connecting);
    expect(inits.n).toBe(1);
    // The teardown neither closed that transport nor scheduled a delayed attempt.
    await c.ready(500);
    expect(inits.n).toBe(1);
  });

  test('connect rejection from the teardown is reported but does not close the new attempt', async () => {
    const silent = await startSilentServer();
    const sockets = trackWebSockets();
    const c = newClient({ minReconnectDelay: 1000, maxReconnectDelay: 1000, websocket: sockets.WebSocket }, silent.url);
    const errors = collectErrors(c);
    c.connect();
    await silent.connectSent;

    const inits = countTransportInits(c);
    c.once('disconnected', () => c.connect());
    c.disconnect();
    expect(inits.n).toBe(1);
    expect(sockets.closed()).toBe(1);

    // The old connect command is rejected after the new attempt started: the
    // error is reported as before, but the new transport stays open.
    await delay(50);
    expect(errors).toEqual([`connect:${errorCodes.connectionClosed}`]);
    expect(sockets.closed()).toBe(1);
    expect(c.state).toBe(State.Connecting);

    c.disconnect();
    await silent.close();
  });

  test('unsubscribe rejection from the teardown does not close the new attempt', async () => {
    const c = newClient({ minReconnectDelay: 1000, maxReconnectDelay: 1000 });
    const sub = c.newSubscription('ch');
    sub.subscribe();
    c.connect();
    await sub.ready(5000);

    const inits = countTransportInits(c);
    // The unsubscribe command is still pending: disconnect() rejects it, and the
    // rejection is processed after connect() started a new attempt.
    sub.unsubscribe();
    c.disconnect();
    c.connect();
    expect(inits.n).toBe(1);

    // Closing the new transport would delay the connection by the reconnect delay.
    await c.ready(500);
    await delay(50);
    expect(inits.n).toBe(1);
    expect(c.state).toBe(State.Connected);
  });

  test('transport throwing on initialize is reported and retried', async () => {
    let sockets = 0;
    // E.g. a malformed URL, or an insecure one from a secure page.
    class ThrowingOnceWebSocket extends WebSocket {
      constructor(address: string, protocols?: string) {
        if (sockets++ === 0) {
          throw new SyntaxError('invalid url');
        }
        super(address, protocols);
      }
    }
    const c = newClient({ websocket: ThrowingOnceWebSocket });
    const errors = collectErrors(c);

    c.connect();
    expect(c.state).toBe(State.Connecting);
    await c.ready(1000);
    expect(sockets).toBe(2);
    expect(errors).toEqual([`transport:${errorCodes.transportClosed}`]);
  });

  test('connection dropped before the connect reply is reported as connect error', async () => {
    const dropping = await startSilentServer(ws => ws.terminate());
    const c = newClient({ minReconnectDelay: 5000, maxReconnectDelay: 5000 }, dropping.url);
    const errors = collectErrors(c);
    c.connect();
    await dropping.connectSent;

    await delay(100);
    expect(errors).toEqual([`connect:${errorCodes.connectionClosed}`]);
    expect(c.state).toBe(State.Connecting);

    c.disconnect();
    await dropping.close();
  });

  test('offline/online while getToken is pending does not open a second transport', async () => {
    const resolvers: Array<(token: string) => void> = [];
    const c = newClient({
      getToken: () => new Promise<string>(resolve => { resolvers.push(resolve); }),
    });
    const inits = countTransportInits(c);

    c.connect();
    target.dispatchEvent(new Event('offline'));
    target.dispatchEvent(new Event('online'));
    await delay(0);
    // The aborted first attempt's token resolves first, then the current one.
    expect(resolvers.length).toBe(2);
    resolvers.forEach(resolve => resolve('token'));

    await c.ready(5000);
    await delay(100);
    expect(c.state).toBe(State.Connected);
    expect(inits.n).toBe(1);
  });

  test('kept when connect() is called from the state handler of the disconnect', async () => {
    const c = newClient();
    let reconnectOnce = true;
    const readies: Promise<void>[] = [];
    c.on('state', (ctx) => {
      if (ctx.newState === State.Disconnected && reconnectOnce) {
        reconnectOnce = false;
        c.connect();
        readies.push(c.ready(5000));
      }
    });
    c.connect();
    await c.ready(5000);

    c.disconnect();
    expect(c.state).toBe(State.Connecting);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    expect(readies.length).toBe(1);
    await readies[0];
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    c.disconnect();
    expect(target.counts).toEqual({ offline: 0, online: 0 });
  });

  test('target without removeEventListener keeps listeners and disconnect still works', async () => {
    const addOnly = { addEventListener: jest.fn() };
    const c = newClient({ networkEventTarget: addOnly as any });

    c.connect();
    await c.ready(5000);
    c.disconnect();
    expect(c.state).toBe(State.Disconnected);

    c.connect();
    await c.ready(5000);
    c.disconnect();
    expect(c.state).toBe(State.Disconnected);
    // Listeners stayed registered, so the second connect did not add them again.
    expect(addOnly.addEventListener).toHaveBeenCalledTimes(2);
  });

  test('disconnect() from a state handler of connect() is not followed by a connecting event', async () => {
    const c = newClient();
    const events: string[] = [];
    c.on('connecting', () => events.push('connecting'));
    c.on('disconnected', () => events.push('disconnected'));
    c.once('state', (ctx) => {
      if (ctx.newState === State.Connecting) {
        c.disconnect();
      }
    });

    c.connect();
    expect(c.state).toBe(State.Disconnected);
    expect(events).toEqual(['disconnected']);
  });

  test.each(['state', 'connected'])('disconnect() from a %s handler on connect stops the rest of the connect handling', async (event) => {
    const unhandled: any[] = [];
    const onUnhandled = (reason: any) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      // A server-side subscription, so the connect reply has more to process.
      server.connectResult = { ...server.connectResult, subs: { news: {} } };
      const c = newClient();
      const events: string[] = [];
      c.on('connected', () => events.push('connected'));
      c.on('disconnected', () => events.push('disconnected'));
      c.on('subscribed', () => events.push('subscribed'));
      (c as any).on(event, (ctx: any) => {
        if (event === 'connected' || ctx.newState === State.Connected) {
          c.disconnect();
        }
      });

      const disconnected = waitForEvent(c, 'disconnected');
      c.connect();
      const readyResult = c.ready(5000).then(() => 'resolved', () => 'rejected');
      await disconnected;
      await delay(50);

      expect(unhandled).toEqual([]);
      expect(await readyResult).toBe('rejected');
      expect(c.state).toBe(State.Disconnected);
      // Nothing of the connection that is gone is processed after the disconnect,
      // such as its server-side subscriptions.
      expect(events).toEqual(event === 'state' ? ['disconnected'] : ['connected', 'disconnected']);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  test('refresh command rejected by disconnect() is not retried', async () => {
    let tokenCalls = 0;
    server.connectResult = { client: 'fake-client', version: '0.0.0', expires: true, ttl: 1 };
    const c = newClient({
      getToken: async () => {
        tokenCalls++;
        return 'token';
      },
    });
    const errors = collectErrors(c);
    server.onCommand = (cmd) => {
      if (cmd.refresh !== undefined) {
        // Disconnect while the refresh command is pending: the client rejects it.
        c.disconnect();
      }
      return null;
    };

    c.connect();
    await c.ready(5000);
    // The token expires after 1s, so the client refreshes it.
    await waitForEvent(c, 'disconnected');
    await delay(50);

    expect(tokenCalls).toBe(2);
    expect(errors).toEqual([]);
    expect((c as any)._refreshTimeout).toBeNull();
  });

  test('client method called from a state handler during disconnect() fails at once', async () => {
    const c = newClient({ timeout: 1000 });
    c.connect();
    await c.ready(5000);

    const results: Promise<string>[] = [];
    c.once('state', (ctx) => {
      if (ctx.newState === State.Disconnected) {
        results.push(c.publish('channel', {}).then(() => 'resolved', (e: any) => `rejected:${e.code}`));
      }
    });
    const started = Date.now();
    c.disconnect();

    expect(results.length).toBe(1);
    expect(await results[0]).toBe(`rejected:${errorCodes.clientDisconnected}`);
    expect(Date.now() - started).toBeLessThan(500);
  });

  test('no outdated event when a state handler disconnects and connects again during a reconnect', async () => {
    const c = newClient({ minReconnectDelay: 1000, maxReconnectDelay: 1000 });
    c.connect();
    await c.ready(5000);

    const events: string[] = [];
    c.on('connecting', (ctx) => events.push(`connecting:${ctx.code}`));
    c.on('disconnected', (ctx) => events.push(`disconnected:${ctx.code}`));
    let restartOnce = true;
    c.on('state', (ctx) => {
      if (ctx.newState === State.Connecting && restartOnce) {
        restartOnce = false;
        c.disconnect();
        c.connect();
      }
    });

    const disconnected = waitForEvent(c, 'disconnected');
    server.closeConnection();
    await disconnected;

    // The reconnect after the server closed the connection was superseded by the
    // handler: its 'connecting' event must not follow the handler's own events.
    expect(events).toEqual([
      `disconnected:${disconnectedCodes.disconnectCalled}`,
      `connecting:${connectingCodes.connectCalled}`,
    ]);
    await c.ready(5000);
  });

  test.each([
    ['getToken', { getToken: async () => 'token' }],
    ['getData', { getData: async () => ({}) }],
  ])('socket constructor error after %s is reported as transport error, and disconnect() still completes', async (_name, options) => {
    // E.g. new WebSocket('ws://...') on an https page throws SecurityError.
    class ThrowingWebSocket {
      constructor() {
        throw new Error('insecure connection not allowed');
      }
    }
    const c = newClient({
      ...(options as Partial<Options>),
      websocket: ThrowingWebSocket,
      minReconnectDelay: 1000,
      maxReconnectDelay: 1000,
      // Short, so a connect timeout left for that transport would fire within this test.
      timeout: 100,
    });
    const errors = collectErrors(c);
    const error = waitForEvent(c, 'error', 2000);
    c.connect();
    await error;
    // Handled as a transport closed at once: reported, and a reconnect is scheduled.
    expect(errors).toEqual([`transport:${errorCodes.transportClosed}`]);
    expect((c as any)._reconnectTimeout).not.toBeNull();

    const ready = c.ready(5000).then(() => 'resolved', (e: any) => `rejected:${e.code}`);
    const disconnected = waitForEvent(c, 'disconnected');
    expect(() => c.disconnect()).not.toThrow();
    await disconnected;
    expect(c.state).toBe(State.Disconnected);
    expect(await ready).toBe(`rejected:${errorCodes.clientDisconnected}`);
    expect(target.counts).toEqual({ offline: 0, online: 0 });
    // Nothing of that transport fires later.
    await delay(200);
    expect(errors).toEqual([`transport:${errorCodes.transportClosed}`]);
  });

  test.each(['sse', 'http_stream'])('hanging %s handshake falls back to the next transport', async (transport) => {
    // Like a proxy buffering the stream: the emulation transport never opens or fails.
    class HangingEventSource {
      close() {}
    }
    const hangingFetch = (_url: string, opts: any) => new Promise((_resolve, reject) => {
      opts?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    const c = new Centrifuge([
      { transport: transport as TransportName, endpoint: `http://localhost:1/connection/${transport}` },
      { transport: 'websocket' as TransportName, endpoint: server.url },
    ], {
      websocket: WebSocket,
      eventsource: HangingEventSource,
      fetch: hangingFetch,
      readableStream: ReadableStream,
      emulationEndpoint: 'http://localhost:1/emulation',
      timeout: 200,
      networkEventTarget: target,
    });
    clients.push(c);

    const connected = waitForEvent<any>(c, 'connected', 3000);
    c.connect();
    expect((await connected).transport).toBe('websocket');
  });

  test.each(['sse', 'http_stream'])('connect error returned over %s is retried after the reconnect delay', async (transport) => {
    // E.g. a failing connect proxy: the transport reaches the server, which rejects the connect.
    const emulation = fakeEmulation(cmd => ({ id: cmd.id, error: { code: 100, message: 'internal server error', temporary: true } }));
    const c = newEmulationClient(transport, emulation, { minReconnectDelay: 300, maxReconnectDelay: 300 });
    const errors = collectErrors(c);

    c.connect();
    await delay(500);
    // The first attempt, and one more after the reconnect delay.
    expect(emulation.connects()).toBeGreaterThanOrEqual(1);
    expect(emulation.connects()).toBeLessThanOrEqual(2);
    expect(errors[0]).toBe('connect:100');
    expect(c.state).toBe(State.Connecting);
  });

  test.each(['sse', 'http_stream'])('disconnect pushed during a connect over %s is retried after the reconnect delay', async (transport) => {
    // E.g. a connect proxy returning a disconnect, or a server shutting down: the
    // server pushes a disconnect with a reconnect code instead of a connect reply.
    const emulation = fakeEmulation(() => ({ push: { disconnect: { code: 3001, reason: 'shutdown' } } }));
    const c = newEmulationClient(transport, emulation, { minReconnectDelay: 300, maxReconnectDelay: 300 });

    c.connect();
    await delay(500);
    // The first attempt, and one more after the reconnect delay.
    expect(emulation.connects()).toBeGreaterThanOrEqual(1);
    expect(emulation.connects()).toBeLessThanOrEqual(2);
    expect(c.state).toBe(State.Connecting);
  });

  test('lines read with undecodable data over http_stream are not dispatched', async () => {
    // E.g. a captive portal answering in the middle of the stream: the chunk read
    // with its page holds more lines, which decode.
    let streams = 0;
    const fetch = (url: string, opts: any) => {
      if (url.endsWith('/emulation')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      streams++;
      const cmd = JSON.parse(opts.body);
      const data = [
        JSON.stringify({ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }),
        '<html>',
        JSON.stringify({ push: { message: { data: { after: true } } } }),
      ].join('\n') + '\n';
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(data));
          opts.signal.addEventListener('abort', () => controller.error(new Error('aborted')));
        },
      });
      return Promise.resolve({ ok: true, status: 200, body });
    };
    const c = newEmulationClient('http_stream', {
      options: { fetch, readableStream: ReadableStream, emulationEndpoint: 'http://localhost:1/emulation' },
      connects: () => streams,
    } as any, { minReconnectDelay: 50, maxReconnectDelay: 50 });
    const messages: any[] = [];
    c.on('message', ctx => messages.push(ctx.data));

    c.connect();
    for (let i = 0; i < 100 && streams < 2; i++) {
      await delay(10);
    }
    await delay(50);
    // Nothing after the page reached the app, and the client reconnected.
    expect(messages).toEqual([]);
    expect(streams).toBeGreaterThanOrEqual(2);
  });

  test('disconnect() and connect() from a publication handler of a server-side subscription recover after that publication', async () => {
    // Over emulation the connect command is built within connect(), in the handler.
    const connects: any[] = [];
    const emulation = fakeEmulation(cmd => {
      connects.push(cmd.connect);
      const reply = { id: cmd.id, connect: { client: 'fake-client', version: '0.0.0', subs: { ch: { recoverable: true, epoch: 'e', offset: 0 } } } };
      return connects.length === 1 ? [reply, { push: { channel: 'ch', pub: { data: { n: 1 }, offset: 1 } } }] : reply;
    });
    const c = newEmulationClient('http_stream', emulation);
    let reconnected = false;
    c.on('publication', () => {
      if (!reconnected) {
        reconnected = true;
        c.disconnect();
        c.connect();
      }
    });

    c.connect();
    for (let i = 0; i < 100 && connects.length < 2; i++) {
      await delay(10);
    }
    expect(connects).toHaveLength(2);
    expect(connects[1].subs.ch).toMatchObject({ recover: true, offset: 1, epoch: 'e' });
  });

  test.each(['sse', 'http_stream'])('emulation endpoint failing after every connect over %s keeps the backoff growing', async (transport) => {
    // E.g. a wrong emulation endpoint path: the stream connects, and every command
    // sent through the emulation endpoint gets a 404, which closes the transport.
    const emulation = fakeEmulation(
      cmd => ({ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }),
      () => ({ ok: false, status: 404 }),
    );
    const c = newEmulationClient(transport, emulation, { minReconnectDelay: 10, maxReconnectDelay: 1000 });
    c.newSubscription('ch').subscribe();

    c.connect();
    for (let i = 0; i < 500 && emulation.connects() < 4; i++) {
      await delay(10);
    }
    expect(emulation.connects()).toBeGreaterThanOrEqual(4);
    // Connecting didn't reset the backoff: the connection never proved usable.
    expect((c as any)._reconnectAttempts).toBeGreaterThanOrEqual(3);
  });

  test.each(['sse', 'http_stream'])('server ping over %s resets the backoff', async (transport) => {
    let connects = 0;
    const emulation = fakeEmulation(cmd => {
      connects++;
      if (connects <= 2) {
        return { push: { disconnect: { code: 3001, reason: 'shutdown' } } };
      }
      // Connected, then a server ping: the connection works.
      return [{ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }, {}];
    });
    const c = newEmulationClient(transport, emulation, { minReconnectDelay: 10, maxReconnectDelay: 100 });

    c.connect();
    await c.ready(3000);
    await delay(20);
    expect((c as any)._reconnectAttempts).toBe(0);
  });

  // A WebSocket constructor whose first socket goes nowhere: it only gets a close
  // callback, called by the test. The next ones reach the server.
  const firstSocketStub = () => {
    const stubs: any[] = [];
    let sockets = 0;
    const websocket = function (this: any, url: string, protocols?: string) {
      if (sockets++ === 0) {
        this.send = () => { /* no-op */ };
        this.close = () => { /* no-op */ };
        stubs.push(this);
        return;
      }
      return new WebSocket(url, protocols);
    } as any;
    return { websocket, stub: () => stubs[0], sockets: () => sockets };
  };

  test('disconnect() and connect() in an error handler of a connect error keep the new attempt', async () => {
    let connects = 0;
    server.onCommand = (cmd) => {
      if (cmd.connect !== undefined && ++connects === 1) {
        return { id: cmd.id, error: { code: 100, message: 'internal server error', temporary: true } };
      }
      return null;
    };
    const c = newClient({ minReconnectDelay: 1500, maxReconnectDelay: 1500 });
    c.once('error', () => {
      c.disconnect();
      c.connect();
    });
    const error = waitForEvent(c, 'error');
    c.connect();
    await error;

    // Tearing down the new attempt would delay the connection by the reconnect delay.
    await c.ready(1000);
    expect(connects).toBe(2);
  });

  test('disconnect() and connect() in an error handler of a transport close keep the new attempt', async () => {
    const sockets = firstSocketStub();
    const c = newClient({ websocket: sockets.websocket, minReconnectDelay: 1500, maxReconnectDelay: 1500 });
    c.once('error', () => {
      c.disconnect();
      c.connect();
    });
    c.connect();
    sockets.stub().onclose({ code: 1006, reason: '' });

    await c.ready(1000);
    expect(sockets.sockets()).toBe(2);
  });

  test('disconnect() and connect() in an error handler of a token error leave no stray retry', async () => {
    let tokenCalls = 0;
    let resolveToken: (token: string) => void = () => { /* set below */ };
    const c = newClient({
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
      getToken: () => {
        tokenCalls++;
        if (tokenCalls === 1) {
          return Promise.reject(new Error('token unavailable'));
        }
        // The token of the new attempt takes longer than the retry delay.
        return new Promise<string>(resolve => { resolveToken = resolve; });
      },
    });
    c.once('error', () => {
      c.disconnect();
      c.connect();
    });
    const error = waitForEvent(c, 'error');
    c.connect();
    await error;

    await delay(200);
    expect(tokenCalls).toBe(2);
    resolveToken('token');
    await c.ready(3000);
  });

  test('an exception in a state handler during a disconnect still moves subscriptions and reconnects', async () => {
    const c = newClient();
    const sub = c.newSubscription('ch');
    sub.subscribe();
    c.connect();
    await sub.ready(5000);

    c.once('state', () => {
      throw new Error('handler failure');
    });
    // As the close callback of the socket does.
    let thrown: any = null;
    try {
      (c as any)._disconnect(connectingCodes.transportClosed, 'transport closed', true);
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.message).toBe('handler failure');
    expect(sub.state).toBe(SubscriptionState.Subscribing);
    expect((c as any)._reconnectTimeout).not.toBeNull();

    await c.ready(3000);
    await sub.ready(3000);
  });

  test('an exception in an error handler of a transport close still reconnects', async () => {
    const sockets = firstSocketStub();
    const c = newClient({ websocket: sockets.websocket });
    c.once('error', () => {
      throw new Error('handler failure');
    });
    c.connect();
    let thrown: any = null;
    try {
      sockets.stub().onclose({ code: 1006, reason: '' });
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.message).toBe('handler failure');

    await c.ready(3000);
    expect(sockets.sockets()).toBe(2);
  });

  // Applications see these exceptions as unhandled rejections; captured here instead.
  const captureReported = (c: Centrifuge) => {
    const reported: string[] = [];
    (c as any)._reportDispatchError = (err: any) => reported.push(err && err.message);
    return reported;
  };

  const throwOnce = (emitter: any, event: string) => new Promise<void>(resolve => {
    emitter.once(event, () => {
      resolve();
      throw new Error('handler failure');
    });
  });

  test('an exception in an error handler of a connect timeout still reconnects', async () => {
    let connects = 0;
    // The first connect command is never answered.
    server.onCommand = (cmd) => (cmd.connect !== undefined && ++connects === 1 ? {} : null);
    const c = newClient({ timeout: 200 });
    const reported = captureReported(c);
    const disconnected: any[] = [];
    c.on('disconnected', ctx => disconnected.push(ctx));
    const failed = throwOnce(c, 'error');
    c.connect();
    await failed;

    await c.ready(3000);
    expect(disconnected).toEqual([]);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in an error handler of a refresh timeout keeps the connection', async () => {
    // The connection token expires in a second, and the refresh command is never answered.
    server.connectResult = { ...server.connectResult, expires: true, ttl: 1 };
    server.onCommand = (cmd) => (cmd.refresh !== undefined ? {} : null);
    const c = newClient({ timeout: 200, getToken: () => Promise.resolve('token') });
    const reported = captureReported(c);
    const failed = throwOnce(c, 'error');
    c.connect();
    await c.ready(3000);
    await failed;
    await delay(50);

    expect(c.state).toBe(State.Connected);
    expect((c as any)._refreshTimeout).not.toBeNull();
    expect(reported).toEqual(['handler failure']);
  }, 10000);

  test('an exception in a connecting handler of an unsubscribe timeout still reconnects', async () => {
    const c = newClient({ timeout: 200 });
    const sub = c.newSubscription('ch');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    const reported = captureReported(c);
    const disconnected: any[] = [];
    c.on('disconnected', ctx => disconnected.push(ctx));
    let unsubscribes = 0;
    server.onCommand = (cmd) => (cmd.unsubscribe !== undefined && ++unsubscribes === 1 ? {} : null);
    const failed = throwOnce(c, 'connecting');
    sub.unsubscribe();
    await failed;

    await c.ready(3000);
    expect(disconnected).toEqual([]);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in a connecting handler of a subscribe timeout still reconnects', async () => {
    let subscribes = 0;
    server.onCommand = (cmd) => (cmd.subscribe !== undefined && ++subscribes === 1 ? {} : null);
    const c = newClient({ timeout: 200 });
    c.connect();
    await c.ready(3000);
    const reported = captureReported(c);
    const disconnected: any[] = [];
    c.on('disconnected', ctx => disconnected.push(ctx));
    const failed = throwOnce(c, 'connecting');
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await failed;

    await c.ready(3000);
    await sub.ready(3000);
    expect(disconnected).toEqual([]);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in a connecting handler of a map page timeout still reconnects', async () => {
    let subscribes = 0;
    server.onCommand = (cmd) => (cmd.subscribe !== undefined && ++subscribes === 1 ? {} : null);
    const c = newClient({ timeout: 200 });
    c.connect();
    await c.ready(3000);
    const reported = captureReported(c);
    const disconnected: any[] = [];
    c.on('disconnected', ctx => disconnected.push(ctx));
    const failed = throwOnce(c, 'connecting');
    const sub = c.newMapSubscription('m');
    sub.subscribe();
    await failed;

    await c.ready(3000);
    await sub.ready(3000);
    expect(disconnected).toEqual([]);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in an error handler of a subscription token error still resubscribes', async () => {
    let tokenCalls = 0;
    const c = newClient();
    const sub: any = c.newSubscription('ch', {
      getToken: () => (++tokenCalls === 1 ? Promise.reject(new Error('token unavailable')) : Promise.resolve('token')),
      minResubscribeDelay: 10,
      maxResubscribeDelay: 50,
    });
    // The exception propagates from the token continuation, an unhandled rejection
    // for applications: captured here instead.
    const thrown: string[] = [];
    const handleTokenError = sub._handleTokenError.bind(sub);
    sub._handleTokenError = (e: any) => {
      try {
        handleTokenError(e);
      } catch (err: any) {
        thrown.push(err.message);
      }
    };
    const failed = throwOnce(sub, 'error');
    sub.subscribe();
    c.connect();
    await failed;

    await sub.ready(3000);
    expect(tokenCalls).toBe(2);
    expect(thrown).toEqual(['handler failure']);
  });

  test('an exception in an error handler of a connection token configuration error still fails the attempt', async () => {
    // The connection token expired, and there is no getToken to get a new one.
    let connects = 0;
    server.onCommand = (cmd) => (cmd.connect !== undefined && ++connects === 1
      ? { id: cmd.id, error: { code: 109, message: 'token expired' } }
      : null);
    const c = newClient({ token: 'token' });
    const reported = captureReported(c);
    const disconnected = new Promise<any>(resolve => c.once('disconnected', resolve));
    c.on('error', (ctx) => {
      if (ctx.type === 'configuration') {
        throw new Error('handler failure');
      }
    });
    c.connect();

    const ctx = await disconnected;
    expect(ctx.code).toBe(disconnectedCodes.unauthorized);
    expect(reported).toEqual(['handler failure']);
  });

  test('setToken() after a token expired connect error lets a client without getToken connect', async () => {
    // The connection token expired, and there is no getToken to get a new one.
    let connects = 0;
    server.onCommand = (cmd) => (cmd.connect !== undefined && ++connects === 1
      ? { id: cmd.id, error: { code: 109, message: 'token expired' } }
      : null);
    const c = newClient({ token: 'expired' });
    const errors: string[] = [];
    c.on('error', ctx => errors.push(`${ctx.type}:${ctx.error.code}`));
    const disconnected = new Promise<any>(resolve => c.once('disconnected', resolve));
    c.connect();
    expect((await disconnected).code).toBe(disconnectedCodes.unauthorized);
    expect(errors).toEqual(['connect:109', `configuration:${errorCodes.badConfiguration}`]);

    c.setToken('fresh');
    c.connect();
    await c.ready(3000);
    const tokens = server.received.filter(cmd => cmd.connect !== undefined).map(cmd => cmd.connect.token);
    expect(tokens).toEqual(['expired', 'fresh']);
  });

  test('setToken() keeps a token refresh required with getToken', async () => {
    // A connect error 109 requires a new token: with getToken, a token set meanwhile
    // may be the expired one.
    let connects = 0;
    server.onCommand = (cmd) => (cmd.connect !== undefined && ++connects === 1
      ? { id: cmd.id, error: { code: 109, message: 'token expired' } }
      : null);
    let tokenCalls = 0;
    const c = newClient({ getToken: () => Promise.resolve(`token-${++tokenCalls}`) });
    c.on('error', ctx => {
      if (ctx.type === 'connect') {
        // Before the reconnect: the app sets a token meanwhile.
        c.setToken('set-by-app');
      }
    });
    c.connect();
    await c.ready(3000);
    const tokens = server.received.filter(cmd => cmd.connect !== undefined).map(cmd => cmd.connect.token);
    expect(tokens).toEqual(['token-1', 'token-2']);
    expect(tokenCalls).toBe(2);
  });

  test('a websocket opened while the process was blocked past the connect timeout keeps the attempt', async () => {
    (server as any).wss.on('connection', () => {
      // The upgrade completed: the client's open event waits while the process is
      // blocked past the connect timeout.
      const until = Date.now() + 600;
      while (Date.now() < until) { /* busy wait */ }
    });
    const c = newClient({ timeout: 300 });
    const errors: string[] = [];
    c.on('error', ctx => errors.push(`${ctx.type}:${ctx.error.message}`));
    c.connect();
    await c.ready(3000);
    expect(errors).toEqual([]);
    expect(server.received.filter(cmd => cmd.connect !== undefined)).toHaveLength(1);
  });

  test('a websocket opened shortly after a far overdue connect timeout keeps the attempt', async () => {
    // Blocks the event loop far past the connect timeout while the upgrade request
    // waits, then completes the upgrade a moment after it resumes, once the overdue
    // timer has run.
    const httpServer = http.createServer();
    const wss = new WebSocketServer({ noServer: true });
    let connects = 0;
    httpServer.on('upgrade', (req, socket, head) => {
      const until = Date.now() + 1600;
      while (Date.now() < until) { /* busy wait */ }
      setTimeout(() => wss.handleUpgrade(req, socket, head, ws => {
        ws.on('message', (data: Buffer) => {
          for (const line of data.toString().split('\n').filter(Boolean)) {
            const cmd = JSON.parse(line);
            if (cmd.connect !== undefined) {
              connects++;
              ws.send(JSON.stringify({ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }));
            }
          }
        });
      }), 50);
    });
    await new Promise<void>(r => httpServer.listen(0, () => r()));
    const port = (httpServer.address() as any).port;
    const c = newClient({ timeout: 300 }, `ws://localhost:${port}/connection/websocket`);
    const errors: string[] = [];
    c.on('error', ctx => errors.push(`${ctx.type}:${ctx.error.message}`));
    try {
      c.connect();
      await c.ready(5000);
      expect(errors).toEqual([]);
      expect(connects).toBe(1);
    } finally {
      c.disconnect();
      wss.clients.forEach(ws => ws.terminate());
      httpServer.closeAllConnections();
      await new Promise<void>(r => httpServer.close(() => r()));
    }
  }, 10000);

  test('a first connect reply slower than the timeout keeps the websocket of a transport list', async () => {
    // As in 5.7.4: a socket that opened keeps its transport. The first connect is
    // never answered, e.g. by an overloaded node; the next one is.
    let connects = 0;
    server.onCommand = (cmd) => (cmd.connect !== undefined && ++connects === 1 ? {} : null);
    const emulation = fakeEmulation(cmd => ({ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }));
    const c = new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: server.url },
      { transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' },
    ], {
      websocket: WebSocket,
      ...emulation.options,
      timeout: 200,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: target,
    } as any);
    clients.push(c);
    c.connect();
    await c.ready(3000);
    expect(connects).toBe(2);
    expect(emulation.connects()).toBe(0);
    expect((c as any)._transport.name()).toBe('websocket');
  });

  test('connect data that cannot be encoded over an emulation transport fails the attempt', async () => {
    let streams = 0;
    const emulation = fakeEmulation(cmd => {
      streams++;
      return { id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } };
    });
    const c = newEmulationClient('http_stream', emulation, {
      data: { n: (globalThis as any).BigInt(1) },
      minReconnectDelay: 200,
      maxReconnectDelay: 200,
    } as any);
    const errors: string[] = [];
    c.on('error', ctx => errors.push(ctx.type));
    const inits = countTransportInits(c);
    expect(() => c.connect()).not.toThrow();
    await delay(500);
    expect(streams).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(new Set(errors)).toEqual(new Set(['transport']));
    expect(inits.n).toBe(0);
    expect(c.state).toBe(State.Connecting);
  });

  test('a refused emulation handshake before a websocket is reported once', async () => {
    const c = new Centrifuge([
      { transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' },
      { transport: 'websocket' as TransportName, endpoint: server.url },
    ], {
      websocket: WebSocket,
      fetch: () => Promise.reject(new Error('connection refused')),
      readableStream: ReadableStream,
      emulationEndpoint: 'http://localhost:1/emulation',
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: target,
    } as any);
    clients.push(c);
    const errors: string[] = [];
    c.on('error', ctx => errors.push(ctx.type));
    c.connect();
    await c.ready(3000);
    // Not also a connect error for the connect command the teardown rejected.
    expect(errors).toEqual(['transport']);
  });

  test('the first round over a transport list does not count towards the backoff', async () => {
    const endpoint = { transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' };
    let streams = 0;
    const c = new Centrifuge([endpoint, endpoint, endpoint], {
      fetch: () => {
        streams++;
        return Promise.reject(new Error('connection refused'));
      },
      readableStream: ReadableStream,
      emulationEndpoint: 'http://localhost:1/emulation',
      minReconnectDelay: 1000,
      maxReconnectDelay: 10000,
      networkEventTarget: target,
    } as any);
    clients.push(c);
    c.connect();
    for (let i = 0; i < 100 && streams < 3; i++) {
      await delay(5);
    }
    await delay(50);
    // The delay after the round is the first backoff step, not the fourth.
    expect(streams).toBe(3);
    expect((c as any)._reconnectAttempts).toBe(1);
  });

  test('setToken() while a connect with an expired token is in flight lets a client without getToken connect', async () => {
    let held: any = null;
    server.onCommand = (cmd) => {
      if (cmd.connect !== undefined && held === null) {
        held = cmd;
        return {};
      }
      return null;
    };
    const c = newClient({ token: 'expired' });
    const errors: string[] = [];
    c.on('error', ctx => errors.push(`${ctx.type}:${ctx.error.code}`));
    c.connect();
    for (let i = 0; i < 100 && held === null; i++) {
      await delay(10);
    }

    // The app renews the token, then the server rejects the one it got.
    c.setToken('fresh');
    server.send({ id: held.id, error: { code: 109, message: 'token expired' } });
    await c.ready(3000);
    const tokens = server.received.filter(cmd => cmd.connect !== undefined).map(cmd => cmd.connect.token);
    expect(tokens).toEqual(['expired', 'fresh']);
    expect(errors).toEqual(['connect:109']);
  });

  test.each(['state', 'connecting'])('an exception in a %s handler of connect() still starts the attempt', async (event) => {
    const c = newClient();
    c.once(event as any, () => {
      throw new Error('handler failure');
    });
    expect(() => c.connect()).toThrow('handler failure');
    await c.ready(3000);
  });

  test('an exception in a handler of a teardown started by a connection token continuation is reported', async () => {
    const c = newClient({ getToken: () => Promise.resolve(null as any) });
    const reported = captureReported(c);
    const failed = throwOnce(c, 'disconnected');
    c.connect();
    await failed;
    await delay(20);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in a handler of a teardown started by a connection data continuation is reported', async () => {
    class ThrowingWebSocket {
      constructor() {
        throw new Error('constructor failure');
      }
    }
    const c = newClient({ getData: () => Promise.resolve({}), websocket: ThrowingWebSocket as any });
    const reported = captureReported(c);
    const failed = throwOnce(c, 'error');
    c.connect();
    await failed;
    await delay(20);
    expect(reported).toEqual(['handler failure']);
  });

  test('an exception in a handler of a teardown started by a connection token refresh continuation is reported', async () => {
    // The connection token expires in a second, and the refresh gets no token.
    server.connectResult = { ...server.connectResult, expires: true, ttl: 1 };
    let tokenCalls = 0;
    const c = newClient({ getToken: () => Promise.resolve(++tokenCalls === 1 ? 'token' : (null as any)) });
    const reported = captureReported(c);
    c.connect();
    await c.ready(3000);
    await throwOnce(c, 'disconnected');
    await delay(20);
    expect(reported).toEqual(['handler failure']);
  }, 10000);

  test('a subscription callback throwing on open does not hold back the connect command', async () => {
    const c = newClient({ timeout: 500 });
    const reported = captureReported(c);
    const sub = c.newSubscription('ch', {
      getToken: () => {
        throw new Error('sync getToken failure');
      },
    });
    sub.subscribe();
    c.connect();
    await c.ready(3000);
    await delay(700);
    // Sent on the first socket, not left for the next one next to a second connect.
    expect(server.received.filter(cmd => cmd.connect !== undefined)).toHaveLength(1);
    expect(c.state).toBe(State.Connected);
    expect(reported.length).toBeLessThanOrEqual(1);
  });

  test('commands batched for a closed connection are not sent on the next one', async () => {
    const c = newClient();
    c.connect();
    await c.ready(3000);
    c.startBatching();
    const published = c.publish('ch', { n: 1 }).then(() => 'published', (e: any) => `rejected:${e.code}`);
    await delay(20);

    c.disconnect();
    c.connect();
    await c.ready(3000);
    c.stopBatching();
    await delay(100);
    expect(await published).toMatch(/^rejected:/);
    expect(server.received.filter(cmd => cmd.publish !== undefined)).toHaveLength(0);
  });

  test('a disconnect push read with the end of an http_stream is applied', async () => {
    let controller: any = null;
    let streams = 0;
    const encoder = new TextEncoder();
    const fetch = (url: string, opts: any) => {
      if (url.endsWith('/emulation')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      streams++;
      const cmd = JSON.parse(opts.body);
      const body = new ReadableStream({
        start(ctrl) {
          controller = ctrl;
          ctrl.enqueue(encoder.encode(JSON.stringify({ id: cmd.id, connect: { client: 'fake-client', version: '0.0.0' } }) + '\n'));
        },
      });
      return Promise.resolve({ ok: true, status: 200, body });
    };
    const c = newEmulationClient('http_stream', {
      options: { fetch, readableStream: ReadableStream, emulationEndpoint: 'http://localhost:1/emulation' },
      connects: () => streams,
    } as any, { minReconnectDelay: 10, maxReconnectDelay: 50 });
    const disconnected: any[] = [];
    c.on('disconnected', ctx => disconnected.push(ctx));
    c.connect();
    await c.ready(3000);

    // The server writes a disconnect push, then ends the stream.
    controller.enqueue(encoder.encode(JSON.stringify({ push: { disconnect: { code: 3501, reason: 'bad request' } } }) + '\n'));
    controller.close();
    for (let i = 0; i < 100 && disconnected.length === 0; i++) {
      await delay(10);
    }
    await delay(100);
    expect(disconnected.map(ctx => ctx.code)).toEqual([3501]);
    expect(streams).toBe(1);
  });

  test('a connect command that cannot be written over a transport list backs off', async () => {
    // E.g. connect data the codec can't encode.
    const c = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint: server.url }], {
      websocket: WebSocket,
      data: { n: (globalThis as any).BigInt(1) },
      minReconnectDelay: 200,
      maxReconnectDelay: 200,
      networkEventTarget: target,
    } as any);
    clients.push(c);
    const inits = countTransportInits(c);
    c.connect();
    await delay(500);
    expect(inits.n).toBeLessThanOrEqual(4);
  });

  test('a connection getToken throwing synchronously is retried', async () => {
    let calls = 0;
    const c = newClient({
      getToken: () => {
        if (++calls === 1) {
          throw new Error('sync getToken failure');
        }
        return Promise.resolve('token');
      },
    });
    const errors: string[] = [];
    c.on('error', ctx => errors.push(ctx.type));
    expect(() => c.connect()).not.toThrow();
    await c.ready(3000);
    expect(calls).toBe(2);
    expect(errors).toEqual(['connectToken']);
  });

  test('a connection getData throwing synchronously is retried', async () => {
    let calls = 0;
    const c = newClient({
      getData: () => {
        if (++calls === 1) {
          throw new Error('sync getData failure');
        }
        return Promise.resolve({});
      },
    });
    const errors: string[] = [];
    c.on('error', ctx => errors.push(ctx.type));
    expect(() => c.connect()).not.toThrow();
    await c.ready(3000);
    expect(calls).toBe(2);
    expect(errors).toEqual(['connectData']);
  });

  test('a connection token refresh with getToken throwing synchronously is retried', async () => {
    // The connection token expires in a second.
    server.connectResult = { ...server.connectResult, expires: true, ttl: 1 };
    let calls = 0;
    const c = newClient({
      getToken: () => {
        if (++calls === 2) {
          throw new Error('sync getToken failure');
        }
        return Promise.resolve('token');
      },
    });
    const refreshError = new Promise<void>(resolve => {
      c.on('error', ctx => {
        if (ctx.type === 'refreshToken') {
          resolve();
        }
      });
    });
    c.connect();
    await c.ready(3000);
    await refreshError;
    expect(c.state).toBe(State.Connected);
    expect((c as any)._refreshTimeout).not.toBeNull();
  }, 10000);

  test('an exception in an error handler of a subscription token configuration error still fails the refresh', async () => {
    // The subscription token expires in a second, and there is no getToken to refresh it.
    server.onSubscribe = () => ({ expires: true, ttl: 1 });
    const c = newClient();
    const reported = captureReported(c);
    const sub = c.newSubscription('ch', { token: 'token' });
    const unsubscribed = new Promise<any>(resolve => sub.once('unsubscribed', resolve));
    sub.on('error', (ctx) => {
      if (ctx.type === 'configuration') {
        throw new Error('handler failure');
      }
    });
    sub.subscribe();
    c.connect();

    const ctx = await unsubscribed;
    expect(ctx.code).toBe(unsubscribedCodes.unauthorized);
    expect(reported).toEqual(['handler failure']);
  }, 10000);

  test('an exception in an error handler of a subscription refresh timeout keeps retrying', async () => {
    // The subscription token expires in a second, and the refresh command is never answered.
    server.onSubscribe = () => ({ expires: true, ttl: 1 });
    server.onCommand = (cmd) => (cmd.sub_refresh !== undefined ? {} : null);
    const c = newClient({ timeout: 200 });
    const reported = captureReported(c);
    const sub = c.newSubscription('ch', { getToken: () => Promise.resolve('token') });
    const failed = throwOnce(sub, 'error');
    sub.subscribe();
    c.connect();
    await sub.ready(3000);
    await failed;
    await delay(50);

    expect(c.state).toBe(State.Connected);
    expect(sub.state).toBe(SubscriptionState.Subscribed);
    expect((sub as any)._refreshTimeout).not.toBeNull();
    expect(reported).toEqual(['handler failure']);
  }, 10000);

  test('disconnect() in an error handler of a token refresh error leaves no refresh retry', async () => {
    // The connection token expires in a second.
    server.connectResult = { ...server.connectResult, expires: true, ttl: 1 };
    let tokenCalls = 0;
    const c = newClient({
      getToken: () => {
        tokenCalls++;
        return tokenCalls === 1 ? Promise.resolve('token') : Promise.reject(new Error('token unavailable'));
      },
    });
    const refreshError = new Promise<void>(resolve => {
      c.on('error', (ctx) => {
        if (ctx.type === 'refreshToken') {
          c.disconnect();
          resolve();
        }
      });
    });
    c.connect();
    await c.ready(5000);
    await refreshError;

    expect(c.state).toBe(State.Disconnected);
    expect((c as any)._refreshTimeout).toBeNull();
  }, 10000);

  test('online long after reconnecting from offline does not abort a transport opening', async () => {
    const c = newClient();
    c.connect();
    await c.ready(5000);

    // Reconnected while the device is reported offline, with no online event yet.
    target.dispatchEvent(new Event('offline'));
    await c.ready(5000);

    const inits = countTransportInits(c);
    const initialized = waitForEvent(c, '__centrifuge_debug:transport_initialized');
    server.closeConnection();
    await initialized;
    // The online event arrives while the next attempt opens its transport.
    target.dispatchEvent(new Event('online'));

    await c.ready(5000);
    expect(inits.n).toBe(1);
  });

  // A WebSocket constructor whose first socket is a stub, driven by the test, with a
  // throwing close(). The next ones reach the server.
  const throwingCloseStub = () => {
    const stubs: any[] = [];
    let sockets = 0;
    const websocket = function (this: any, url: string, protocols?: string) {
      if (sockets++ === 0) {
        this.send = () => { /* no-op */ };
        this.close = () => {
          throw new Error('close is not available');
        };
        stubs.push(this);
        return;
      }
      return new WebSocket(url, protocols);
    } as any;
    return { websocket, stub: () => stubs[0], sockets: () => sockets };
  };

  test('open callback of a replaced transport whose close() throws does not throw', async () => {
    const sockets = throwingCloseStub();
    const c = newClient({ websocket: sockets.websocket });
    c.connect();
    c.disconnect();
    c.connect();
    await c.ready(3000);

    // The replaced socket opens late.
    expect(() => sockets.stub().onopen()).not.toThrow();
    expect(c.state).toBe(State.Connected);
  });

  test('undecodable data on a transport whose close() throws still reconnects', async () => {
    const sockets = throwingCloseStub();
    const c = newClient({ websocket: sockets.websocket, minReconnectDelay: 10, maxReconnectDelay: 10 });
    c.connect();
    sockets.stub().onopen();

    // E.g. a captive portal answering with an HTML page.
    expect(() => sockets.stub().onmessage({ data: '<!doctype html>' })).not.toThrow();
    await c.ready(3000);
    expect(sockets.sockets()).toBe(2);
  });
});
