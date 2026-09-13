import { Centrifuge } from './centrifuge';
import { TransportName, State } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';
import { ReadableStream } from 'node:stream/web';

// Regression tests for https://github.com/centrifugal/centrifuge-js/issues/268,
// beyond a transport throwing in initialize() (see network_events.test.ts):
// - a transport that is created but never opens or reports its close, e.g. a
//   replaced global WebSocket: the connect timeout fails the attempt itself;
// - a configuration no retry can fix: connect() throws, whether or not getToken
//   or getData is set;
// - no usable transport left while reconnecting: reported, not thrown from a timer.

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

/** A constructor that throws, like a browser blocking the connection. */
function throwingConstructor(counter: { calls: number }, message: string) {
  return function () {
    counter.calls++;
    const e = new Error(message);
    e.name = 'SecurityError';
    throw e;
  } as any;
}

/** A WebSocket replacement whose constructor succeeds, but which never opens or
 * reports a close. Its close() does nothing, throws, or is missing. */
function stubWebSocket(counter: { calls: number; closes: number }, closeBehavior: 'noop' | 'throw' | 'absent') {
  return function (this: any) {
    counter.calls++;
    this.onopen = null;
    this.onerror = null;
    this.onclose = null;
    this.onmessage = null;
    this.send = () => { /* no-op */ };
    if (closeBehavior === 'noop') {
      this.close = () => { counter.closes++; };
    } else if (closeBehavior === 'throw') {
      this.close = () => {
        counter.closes++;
        throw new Error('close is not available');
      };
    }
  } as any;
}

describe('transport failures', () => {
  let server: FakeCentrifugoServer;
  let clients: Centrifuge[];
  let rejections: any[];
  const onRejection = (reason: any) => rejections.push(reason);

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    clients = [];
    rejections = [];
    process.on('unhandledRejection', onRejection);
  });

  afterEach(async () => {
    process.off('unhandledRejection', onRejection);
    clients.forEach(c => c.disconnect());
    await server.close();
  });

  const newClient = (endpoint: any, options: any = {}) => {
    const c = new Centrifuge(endpoint, {
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
      networkEventTarget: new EventTarget(),
      ...options,
    });
    clients.push(c);
    const errors: string[] = [];
    c.on('error', (ctx) => errors.push(`${ctx.type}:${ctx.error.message}`));
    return { c, errors };
  };

  describe('connect timeout fails an attempt the transport never reports', () => {
    test.each(['absent', 'noop', 'throw'] as const)('with close() %s, the client keeps reconnecting', async (closeBehavior) => {
      const counter = { calls: 0, closes: 0 };
      const { c, errors } = newClient('ws://blocked.invalid/connection/websocket', {
        websocket: stubWebSocket(counter, closeBehavior),
        timeout: 60,
      });

      c.connect();
      await waitFor(() => counter.calls >= 3);

      expect(c.state).toBe(State.Connecting);
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(new Set(errors)).toEqual(new Set(['transport:connect timeout']));
      if (closeBehavior !== 'absent') {
        expect(counter.closes).toBeGreaterThanOrEqual(2);
      }
      expect(rejections).toEqual([]);
    });

    test('a hanging transport falls through to the next one', async () => {
      const counter = { calls: 0, closes: 0 };
      const hanging = 'ws://hanging.invalid/connection/websocket';
      const stub = stubWebSocket(counter, 'noop');
      const websocket = function (this: any, url: string) {
        return url === hanging ? new stub() : new WebSocket(url);
      } as any;
      const { c, errors } = newClient([
        { transport: 'websocket' as TransportName, endpoint: hanging },
        { transport: 'websocket' as TransportName, endpoint: server.url },
      ], { websocket, timeout: 200 });

      c.connect();
      await c.ready(3000);

      expect(counter.calls).toBe(1);
      expect(errors).toEqual(['transport:connect timeout']);
    });

    test('disconnect() clears the connect timeout', async () => {
      const counter = { calls: 0, closes: 0 };
      const { c, errors } = newClient('ws://hanging.invalid/connection/websocket', {
        websocket: stubWebSocket(counter, 'noop'),
        timeout: 60,
        minReconnectDelay: 10000,
        maxReconnectDelay: 10000,
      });

      c.connect();
      expect((c as any)._connectTimeout).not.toBeNull();
      c.disconnect();
      expect((c as any)._connectTimeout).toBeNull();

      await delay(150);
      expect(c.state).toBe(State.Disconnected);
      expect(errors).toEqual([]);
    });

    test('a close callback of a previous transport does not clear the connect timeout of the next attempt', async () => {
      const counter = { calls: 0, closes: 0 };
      const stub = stubWebSocket(counter, 'noop');
      let sockets = 0;
      const websocket = function (this: any, url: string) {
        return sockets++ === 0 ? new WebSocket(url) : new stub();
      } as any;
      const { c, errors } = newClient(server.url, {
        websocket,
        timeout: 200,
        minReconnectDelay: 10000,
        maxReconnectDelay: 10000,
      });
      c.connect();
      await c.ready(3000);

      // The next attempt hangs, and the first socket reports its close after it started.
      c.disconnect();
      c.connect();
      expect(counter.calls).toBe(1);

      await waitFor(() => errors.length > 0, 1000);
      expect(errors).toEqual(['transport:connect timeout']);
    });
  });

  describe('configuration no retry can fix', () => {
    // Under Node there is no SockJS: this list has no usable transport.
    const unsupported = [{ transport: 'sockjs' as TransportName, endpoint: 'http://localhost:1/connection/sockjs' }];

    test.each(['no callback', 'getToken', 'getData'])('connect() throws with %s, before any attempt', async (callback) => {
      let calls = 0;
      const options: any = {};
      if (callback === 'getToken') {
        options.getToken = () => { calls++; return Promise.resolve('token'); };
      } else if (callback === 'getData') {
        options.getData = () => { calls++; return Promise.resolve({}); };
      }
      const { c, errors } = newClient(unsupported, options);

      expect(() => c.connect()).toThrow(/no supported transport found/);
      expect(c.state).toBe(State.Disconnected);
      expect(() => c.disconnect()).not.toThrow();

      await delay(100);
      expect(calls).toBe(0);
      expect(errors).toEqual([]);
    });

    test('connect() throws for an http endpoint given as a string', () => {
      const { c } = newClient('http://localhost:1/connection/websocket', { websocket: WebSocket });
      expect(() => c.connect()).toThrow(/explicit transport endpoints configuration/);
      expect(c.state).toBe(State.Disconnected);
    });
  });

  describe('no usable transport while reconnecting', () => {
    test('is reported and retried, not thrown from a timer', async () => {
      const had = 'WebTransport' in globalThis;
      const saved = (globalThis as any).WebTransport;
      (globalThis as any).WebTransport = throwingConstructor({ calls: 0 }, 'webtransport blocked');
      try {
        const { c, errors } = newClient([
          { transport: 'webtransport' as TransportName, endpoint: 'https://localhost:1/connection/webtransport' },
        ], { timeout: 100 });

        c.connect();
        await waitFor(() => errors.length > 0);
        expect(errors[0]).toBe('transport:webtransport blocked');

        // The dependency disappears while the client reconnects.
        delete (globalThis as any).WebTransport;
        await waitFor(() => errors.includes('transport:no supported transport found'));
        expect(c.state).toBe(State.Connecting);
        expect((c as any)._transport).toBeNull();
        expect(rejections).toEqual([]);
      } finally {
        if (had) {
          (globalThis as any).WebTransport = saved;
        } else {
          delete (globalThis as any).WebTransport;
        }
      }
    });

    test('an unsupported entry after a failing one does not break the selection', async () => {
      const counter = { calls: 0 };
      const { c, errors } = newClient([
        { transport: 'websocket' as TransportName, endpoint: 'ws://localhost:1/connection/websocket' },
        { transport: 'sockjs' as TransportName, endpoint: 'http://localhost:1/connection/sockjs' },
      ], { websocket: throwingConstructor(counter, 'insecure connection not allowed'), timeout: 100 });

      c.connect();
      await waitFor(() => counter.calls >= 3);

      expect(c.state).toBe(State.Connecting);
      expect(new Set(errors)).toEqual(new Set(['transport:insecure connection not allowed']));
      expect(rejections).toEqual([]);
    });
  });

  describe('initialize errors fall over to the next transport', () => {
    test('sockjs', async () => {
      const counter = { calls: 0 };
      const { c, errors } = newClient([
        { transport: 'sockjs' as TransportName, endpoint: 'http://localhost:1/connection/sockjs' },
        { transport: 'websocket' as TransportName, endpoint: server.url },
      ], { sockjs: throwingConstructor(counter, 'sockjs blocked'), websocket: WebSocket });

      c.connect();
      await c.ready(3000);

      expect(counter.calls).toBe(1);
      expect(errors).toEqual(['transport:sockjs blocked']);
    });

    test('http_stream with a fetch throwing synchronously', async () => {
      let calls = 0;
      const { c, errors } = newClient([
        { transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' },
        { transport: 'websocket' as TransportName, endpoint: server.url },
      ], {
        fetch: () => { calls++; throw new Error('fetch blocked by policy'); },
        readableStream: ReadableStream,
        websocket: WebSocket,
        emulationEndpoint: 'http://localhost:1/emulation',
      });

      c.connect();
      await c.ready(3000);

      expect(calls).toBe(1);
      // The connect command sent with the emulation request is rejected too.
      expect(errors).toEqual(['transport:fetch blocked by policy', 'connect:connection closed']);
    });
  });
});
