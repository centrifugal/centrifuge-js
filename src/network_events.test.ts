import { Centrifuge } from './centrifuge';
import { DisconnectedContext, Options, State, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';
import { connectingCodes, disconnectedCodes, errorCodes } from './codes';

import WebSocket, { WebSocketServer } from 'ws';
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
    ['getToken', { getToken: async () => 'token' }, 'connectToken', errorCodes.clientConnectToken],
    ['getData', { getData: async () => ({}) }, 'connectData', errorCodes.badConfiguration],
  ])('socket constructor error after %s is reported, and disconnect() still completes', async (_name, options, errorType, errorCode) => {
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
      // The connect timeout still fires for that transport: let it happen within this test.
      timeout: 100,
    });
    const errors = collectErrors(c);
    const error = waitForEvent(c, 'error', 2000);
    c.connect();
    await error;
    expect(errors).toEqual([`${errorType}:${errorCode}`]);
    expect((c as any)._reconnectTimeout).not.toBeNull();

    // That transport has no socket, so closing it throws: the teardown must still complete.
    const ready = c.ready(5000).then(() => 'resolved', (e: any) => `rejected:${e.code}`);
    const disconnected = waitForEvent(c, 'disconnected');
    expect(() => c.disconnect()).not.toThrow();
    await disconnected;
    expect(c.state).toBe(State.Disconnected);
    expect(await ready).toBe(`rejected:${errorCodes.clientDisconnected}`);
    expect(target.counts).toEqual({ offline: 0, online: 0 });
    // Closing that transport from its connect timeout must not throw either.
    await delay(200);
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
});
