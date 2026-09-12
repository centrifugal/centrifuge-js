import { Centrifuge } from './centrifuge';
import { DisconnectedContext, Options, State, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';
import { errorCodes } from './codes';

import WebSocket from 'ws';

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

  const newClient = (options: Partial<Options> = {}) => {
    const c = new Centrifuge([{
      transport: 'websocket' as TransportName,
      endpoint: server.url,
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

  test('offline/online while getToken is pending does not open a second transport', async () => {
    const resolvers: Array<(token: string) => void> = [];
    const c = newClient({
      getToken: () => new Promise<string>(resolve => { resolvers.push(resolve); }),
    });
    let transportsInitialized = 0;
    (c as any).on('__centrifuge_debug:transport_initialized', () => transportsInitialized++);

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
    expect(transportsInitialized).toBe(1);
  });

  test('kept when connect() is called from the state handler of the disconnect', async () => {
    const c = newClient();
    let reconnectOnce = true;
    c.on('state', (ctx) => {
      if (ctx.newState === State.Disconnected && reconnectOnce) {
        reconnectOnce = false;
        c.connect();
      }
    });
    c.connect();
    await c.ready(5000);

    c.disconnect();
    expect(c.state).toBe(State.Connecting);
    expect(target.counts).toEqual({ offline: 1, online: 1 });

    await c.ready(5000);
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

  test.each([
    ['getToken', { getToken: async () => 'token' }, 'connectToken', errorCodes.clientConnectToken],
    ['getData', { getData: async () => ({}) }, 'connectData', errorCodes.badConfiguration],
  ])('socket constructor error after %s is reported and retried, closing that transport does not throw', async (_name, options, errorType, errorCode) => {
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
    const errors: string[] = [];
    c.on('error', (ctx) => errors.push(`${ctx.type}:${ctx.error.code}`));
    const error = waitForEvent(c, 'error', 2000);
    c.connect();
    await error;
    expect(errors).toEqual([`${errorType}:${errorCode}`]);
    expect((c as any)._reconnectTimeout).not.toBeNull();

    // That transport has no socket: neither disconnect() nor its connect timeout
    // may throw when closing it.
    expect(() => c.disconnect()).not.toThrow();
    expect(c.state).toBe(State.Disconnected);
    await delay(200);
  });
});
