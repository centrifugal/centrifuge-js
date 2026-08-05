import { Centrifuge } from './centrifuge';
import { TransportName, State, ErrorContext } from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

import { WebsocketTransport } from './transport_websocket';
import { SockjsTransport } from './transport_sockjs';
import { SseTransport } from './transport_sse';
import { HttpStreamTransport } from './transport_http_stream';

// Regression tests for https://github.com/centrifugal/centrifuge-js/issues/268
//
// A transport's initialize() is not total: browsers throw synchronously from
// `new WebSocket(url)` for a ws:// URL on an https:// page (SecurityError), for
// a URL blocked by the CSP connect-src directive (SecurityError), and for a
// malformed URL (SyntaxError). An extension or userscript replacing
// window.WebSocket can throw for its own reasons. In all those cases the
// wrapper's inner _transport stays null while the connect timeout armed just
// before initialize() is already scheduled.
//
// The client must survive that: report the real reason, keep reconnecting, and
// fall through to the next transport when one is configured.

const SECURITY_ERROR_MESSAGE =
  'An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.';

/** A WebSocket constructor that throws like a browser blocking the connection. */
function throwingWebSocket(counter: { calls: number }) {
  return function () {
    counter.calls++;
    const e = new Error(SECURITY_ERROR_MESSAGE);
    e.name = 'SecurityError';
    throw e;
  } as any;
}

/** An EventSource constructor that throws, for the emulation-transport case. */
function throwingEventSource(counter: { calls: number }) {
  return function () {
    counter.calls++;
    const e = new Error('Refused to connect because it violates the Content Security Policy');
    e.name = 'SecurityError';
    throw e;
  } as any;
}

/**
 * A WebSocket stub whose constructor SUCCEEDS and which then misbehaves: it
 * never fires onopen or onclose, and its close() is configurable. This is the
 * shape that the throwing-constructor fixtures above cannot reach, and the one
 * the original issue report described - a replaced global WebSocket.
 */
function stubWebSocket(
  counter: { calls: number; closes: number },
  closeBehavior: 'noop' | 'throw' | 'absent',
) {
  return function (this: any, url: string) {
    counter.calls++;
    this.url = url;
    this.onopen = null;
    this.onerror = null;
    this.onclose = null;
    this.onmessage = null;
    this.send = () => { /* no-op */ };
    if (closeBehavior === 'noop') {
      // Accepts close() and reports nothing back - no onclose ever arrives.
      this.close = () => { counter.closes++; };
    } else if (closeBehavior === 'throw') {
      this.close = () => { counter.closes++; throw new Error('close is not available'); };
    }
    // 'absent': no close method at all.
  } as any;
}

/**
 * Tears a client down without letting an unrelated teardown bug mask the
 * assertion a test is actually making. The throw itself is pinned by
 * 'disconnect() after connect() gave up does not throw'.
 */
function safeDisconnect(c: Centrifuge) {
  try { c.disconnect(); } catch { /* pinned separately */ }
}

const liveClients: Centrifuge[] = [];

/**
 * Registers the client for teardown. CI runs jest --detectOpenHandles with no
 * --forceExit, so a client still cycling at the end of a test would be reported
 * as an open handle.
 */
function track(c: Centrifuge): Centrifuge {
  liveClients.push(c);
  return c;
}

afterEach(() => {
  while (liveClients.length) {
    safeDisconnect(liveClients.pop()!);
  }
});

function waitFor(predicate: () => boolean, timeout = 4000): Promise<void> {
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

/**
 * Records unhandled rejections for the duration of a test. Uncaught exceptions
 * thrown from timers are already surfaced by jest as test failures, so an
 * orphaned connect timeout firing transport.close() on a null transport fails
 * the test on its own.
 */
function collectUnhandledRejections() {
  const seen: any[] = [];
  const handler = (reason: any) => seen.push(reason);
  process.on('unhandledRejection', handler);
  return {
    seen,
    restore: () => process.off('unhandledRejection', handler),
  };
}

const wsEndpoint = 'ws://localhost:8000/connection/websocket';
const httpStreamEndpoint = 'http://localhost:8000/connection/http_stream';
const sseEndpoint = 'http://localhost:8000/connection/sse';
const emulationEndpoint = 'http://localhost:8000/emulation';

describe('transport initialize() throwing synchronously', () => {
  test('connect() does not throw out of the client', () => {
    const counter = { calls: 0 };
    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
    });
    c.on('error', () => { /* swallow, asserted elsewhere */ });

    expect(() => c.connect()).not.toThrow();
    safeDisconnect(c);
  });

  test('reports the real reason as a transport error, not a token error', async () => {
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => errors.length > 0);

    expect(errors[0].type).toBe('transport');
    expect(errors[0].transport).toBe('websocket');
    // The message is the whole diagnostic payload — a hardcoded 'transport
    // closed' here leaves the developer with nothing to act on.
    expect(errors[0].error.message).toContain('insecure WebSocket');

    safeDisconnect(c);
  });

  test('misclassification guard: getToken path must not report connectToken', async () => {
    // initialize() is called from inside a promise .then() when getToken is
    // configured, so a synchronous throw lands in the getToken .catch() and is
    // reported as a token problem — pointing diagnosis at the wrong subsystem.
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
      getToken: () => Promise.resolve('token'),
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => errors.length > 0);

    expect(errors.map(e => e.type)).not.toContain('connectToken');
    expect(errors[0].type).toBe('transport');

    safeDisconnect(c);
  });

  test('keeps reconnecting instead of wedging forever', async () => {
    // _transportClosed is set false right before initialize(); when initialize()
    // throws there is no socket to ever deliver onClose, so without an explicit
    // reset every later _startReconnecting() bails at the "waiting for transport
    // close" guard and the client is dead for the life of the page.
    const counter = { calls: 0 };
    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
    });
    c.on('error', () => { /* expected on every attempt */ });

    c.connect();
    await waitFor(() => counter.calls >= 3);

    expect(counter.calls).toBeGreaterThanOrEqual(3);
    expect(c.state).toBe(State.Connecting);

    safeDisconnect(c);
  });

  test('emits a transport error on every attempt, not only the first', async () => {
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => errors.filter(e => e.type === 'transport').length >= 3);

    expect(errors.filter(e => e.type === 'transport').length).toBeGreaterThanOrEqual(3);

    safeDisconnect(c);
  });

  test('no orphaned connect timeout fires close() on a null transport', async () => {
    // The connect timeout is armed before initialize(). If initialize() throws
    // and the timeout is not cleared, it fires transport.close() seconds later
    // against a null inner transport — the "null is not an object (evaluating
    // 'this._transport.close')" report in the issue. jest fails this test if
    // that exception escapes from the timer.
    const counter = { calls: 0 };
    const rejections = collectUnhandledRejections();

    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 50,               // fires well within the wait below
      minReconnectDelay: 10000,  // keep a single attempt in flight
      maxReconnectDelay: 10000,
    });
    c.on('error', () => { /* expected */ });

    c.connect();
    await new Promise(r => setTimeout(r, 400));

    expect(rejections.seen).toEqual([]);
    rejections.restore();
    safeDisconnect(c);
  });

  test('disconnect() after a failed initialize does not throw', async () => {
    // _disconnect() nulls this._transport then calls close() on it with no
    // try/catch — a throw there skips _scheduleReconnect() and leaves
    // _transportClosed false, which is a second way to wedge the client.
    const counter = { calls: 0 };
    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
    });
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => counter.calls >= 1);

    expect(() => c.disconnect()).not.toThrow();
    expect(c.state).toBe(State.Disconnected);
  });
});

describe('transport fallback when initialize() throws', () => {
  test('falls over from a blocked websocket to http_stream and connects', async () => {
    // The realistic CSP shape: connect-src 'self' blocks the ws/wss scheme but
    // permits same-origin https, so the emulation transports work. Note the
    // selection loop only advances _currentTransportIndex on !supported(), and
    // WebsocketTransport.supported() is true under a CSP block — the constructor
    // exists, it just throws when invoked. Without an explicit advance the
    // client retries the blocked transport forever and never reaches this one.
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      { transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint },
    ], {
      websocket: throwingWebSocket(counter),
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      timeout: 3000,
      minReconnectDelay: 50,
      maxReconnectDelay: 200,
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await c.ready(5000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.type === 'transport' && e.transport === 'websocket')).toBe(true);

    safeDisconnect(c);
  });

  test('falls over from a blocked sse to websocket and connects', async () => {
    // Emulation transports call _sendConnect(true) before initialize(), which
    // registers an outgoing command. When initialize() then throws, that
    // callback is cleared by _clearOutgoingRequests() and its errback re-enters
    // _disconnect() through _connectError — this asserts the reentrancy stays
    // benign and the client still reaches the next transport.
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge([
      { transport: 'sse' as TransportName, endpoint: sseEndpoint },
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
    ], {
      websocket: WebSocket,
      eventsource: throwingEventSource(counter),
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      timeout: 3000,
      minReconnectDelay: 50,
      maxReconnectDelay: 200,
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await c.ready(5000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.type === 'transport' && e.transport === 'sse')).toBe(true);

    safeDisconnect(c);
  });

  test('all transports blocked: keeps cycling without wedging', async () => {
    const wsCounter = { calls: 0 };
    const sseCounter = { calls: 0 };

    const c = new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      { transport: 'sse' as TransportName, endpoint: sseEndpoint },
    ], {
      websocket: throwingWebSocket(wsCounter),
      eventsource: throwingEventSource(sseCounter),
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      timeout: 500,
      minReconnectDelay: 50,
      maxReconnectDelay: 100,
    });
    c.on('error', () => { /* expected on every attempt */ });

    c.connect();
    // Both must be tried, and the cycle must continue past a full sweep.
    await waitFor(() => wsCounter.calls >= 2 && sseCounter.calls >= 2, 6000);

    expect(c.state).toBe(State.Connecting);

    safeDisconnect(c);
  });
});

// Static transport-configuration errors are a different class from the ones
// above: they depend only on the config object and the presence of globals, are
// decidable before any I/O, and are identical on every attempt. The client
// already throws them out of connect() -- but only when neither getToken nor
// getData is configured. With either one set, _initializeTransport() runs inside
// a promise callback, so `.then(f).catch(h)` hands the throw to the token/data
// handler and it is reported as a token problem instead.
//
// It then degrades: once _token is set, needTokenRefresh is false, so the next
// attempt takes the synchronous branch -- from inside a reconnect setTimeout,
// where the throw has no call site and escapes as an uncaught exception on
// every tick.
//
// Whether connect() should throw here or emit is the one open design choice;
// only 'throws synchronously ... with getToken set' below encodes it. Every
// other test in this block asserts an invariant that holds either way.
describe('static transport configuration errors', () => {
  // No SockJS is available under Node, so the transport list is exhausted and
  // _initializeTransport() throws 'no supported transport found'.
  const unsupportedConfig = [
    { transport: 'sockjs' as TransportName, endpoint: 'http://localhost:8000/connection/sockjs' },
  ];

  test('throws synchronously from connect() with no getToken (unchanged behavior)', () => {
    const c = new Centrifuge(unsupportedConfig, {});
    expect(() => c.connect()).toThrow(/no supported transport found/);
    safeDisconnect(c);
  });

  test('disconnect() after connect() gave up does not throw', () => {
    // The selection loop assigns this._transport before testing supported(), so
    // when it exhausts the list and throws 'no supported transport found' the
    // client is left holding a wrapper whose inner transport was never created.
    // _disconnect() then calls close() on it. This reaches the same null deref
    // as issue #268 without any initialize() throw involved.
    const c = new Centrifuge(unsupportedConfig, {});
    expect(() => c.connect()).toThrow(/no supported transport found/);

    expect(() => c.disconnect()).not.toThrow();
    expect(c.state).toBe(State.Disconnected);
  });

  test('throws synchronously from connect() for an http endpoint given as a string', () => {
    const c = new Centrifuge('http://localhost:8000/connection/websocket', {
      websocket: WebSocket,
    });
    expect(() => c.connect()).toThrow(/explicit transport endpoints configuration/);
    safeDisconnect(c);
  });

  test('throws synchronously from connect() with getToken set', () => {
    // The design choice: a static config fault must surface the same way
    // regardless of whether a token callback is configured.
    const c = new Centrifuge(unsupportedConfig, {
      getToken: () => Promise.resolve('token'),
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    });
    c.on('error', () => { /* must not be the reporting channel for this class */ });

    expect(() => c.connect()).toThrow(/no supported transport found/);
    safeDisconnect(c);
  });

  test('never reported as a token error when getToken is set', async () => {
    const errors: ErrorContext[] = [];
    const c = new Centrifuge(unsupportedConfig, {
      getToken: () => Promise.resolve('token'),
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    });
    c.on('error', (ctx) => errors.push(ctx));

    try { c.connect(); } catch { /* shape-dependent, asserted above */ }
    await new Promise(r => setTimeout(r, 200));

    expect(errors.map(e => e.type)).not.toContain('connectToken');
    safeDisconnect(c);
  });

  test('never reported as a data error when getData is set', async () => {
    const errors: ErrorContext[] = [];
    const c = new Centrifuge(unsupportedConfig, {
      getData: () => Promise.resolve({}),
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    });
    c.on('error', (ctx) => errors.push(ctx));

    try { c.connect(); } catch { /* shape-dependent, asserted above */ }
    await new Promise(r => setTimeout(r, 200));

    expect(errors.map(e => e.type)).not.toContain('connectData');
    safeDisconnect(c);
  });

  test('never escapes as an uncaught exception from a reconnect timer', async () => {
    // Second and later attempts run _startReconnecting() from a setTimeout. A
    // throw there has no call site: it escapes the client entirely and repeats
    // on every tick. jest fails this test if that happens.
    const rejections = collectUnhandledRejections();
    const c = new Centrifuge(unsupportedConfig, {
      getToken: () => Promise.resolve('token'),
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    });
    c.on('error', () => { /* expected channel, if any */ });

    try { c.connect(); } catch { /* shape-dependent, asserted above */ }
    await new Promise(r => setTimeout(r, 400));  // ~20 reconnect ticks

    expect(rejections.seen).toEqual([]);
    rejections.restore();
    safeDisconnect(c);
  });
});

describe('webtransport: initialize() is async', () => {
  const originalWebTransport = (globalThis as any).WebTransport;

  afterEach(() => {
    (globalThis as any).WebTransport = originalWebTransport;
  });

  test('a rejected initialize() falls over to websocket without an unhandled rejection', async () => {
    // WebtransportTransport.initialize() is `async`, so a throw becomes a
    // rejected promise on a return value nobody holds — a try/catch around the
    // initialize() call catches nothing here. The failure must still be routed
    // into the normal reconnect path.
    const counter = { calls: 0 };
    const rejections = collectUnhandledRejections();

    (globalThis as any).WebTransport = function () {
      counter.calls++;
      const e = new Error('WebTransport blocked');
      e.name = 'SecurityError';
      throw e;
    };

    const c = new Centrifuge([
      { transport: 'webtransport' as TransportName, endpoint: 'https://localhost:8000/connection/webtransport' },
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
    ], {
      websocket: WebSocket,
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      timeout: 3000,
      minReconnectDelay: 50,
      maxReconnectDelay: 200,
    });
    c.on('error', () => { /* expected */ });

    c.connect();
    // Deliberately below jest's default test timeout so a missing fallback
    // reports as a failed assertion rather than a suite-level timeout.
    await c.ready(2000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
    expect(rejections.seen).toEqual([]);

    rejections.restore();
    safeDisconnect(c);
  });
});

// The fixtures above all throw from the constructor. This block covers the
// other half of the space: a transport that is constructed successfully and
// then misbehaves. It is the class the connect timeout belongs to, and it is
// what the original issue report described - a replaced global WebSocket that
// accepts close() and reports nothing back.
describe('transport constructed successfully but never usable', () => {
  test('close() missing entirely is contained and the client keeps reconnecting', async () => {
    const counter = { calls: 0, closes: 0 };
    const errors: ErrorContext[] = [];

    const c = track(new Centrifuge(wsEndpoint, {
      websocket: stubWebSocket(counter, 'absent'),
      timeout: 60,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => counter.calls >= 3);

    expect(c.state).toBe(State.Connecting);
    expect(errors.every(e => e.type === 'transport')).toBe(true);
    expect(errors[0].error.message).toBe('connect timeout');
  });

  test('a silent close() still lets the client recover', async () => {
    // The guard on close() stops the TypeError, but on its own it would leave
    // the client waiting forever for an onClose that this transport never
    // sends. The connect timeout has to be the verdict.
    const counter = { calls: 0, closes: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: stubWebSocket(counter, 'noop'),
      timeout: 60,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* expected every attempt */ });

    c.connect();
    await waitFor(() => counter.calls >= 3);

    expect(counter.closes).toBeGreaterThanOrEqual(1);
    expect(c.state).toBe(State.Connecting);
  });

  test('a throwing close() does not stop reconnect scheduling', async () => {
    // Guarded at two levels: the wrapper swallows it, and _disconnect schedules
    // the reconnect from a finally so a throw could not skip it either way.
    const counter = { calls: 0, closes: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: stubWebSocket(counter, 'throw'),
      timeout: 60,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* expected every attempt */ });

    c.connect();
    await waitFor(() => counter.calls >= 3);

    expect(counter.closes).toBeGreaterThanOrEqual(1);
    expect(c.state).toBe(State.Connecting);
  });

  test('a hanging transport still falls through to the next one', async () => {
    // The transport-index advance used to live only in onClose. A transport
    // that hangs rather than closing must still yield to the next entry.
    const counter = { calls: 0, closes: 0 };
    const c = track(new Centrifuge([
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      { transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint },
    ], {
      websocket: stubWebSocket(counter, 'noop'),
      fetch: fetch,
      readableStream: ReadableStream,
      emulationEndpoint: emulationEndpoint,
      timeout: 200,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', () => { /* expected for the hanging websocket */ });

    c.connect();
    await c.ready(4000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
  });

  test('disconnect() stops the attempt without a late error', async () => {
    // disconnect() must also clear the connect timeout. If it did not, the
    // timer would outlive the client, fire against a transport nobody uses, and
    // hold the event loop open - which CI reports via --detectOpenHandles.
    const counter = { calls: 0, closes: 0 };
    const errors: ErrorContext[] = [];

    const c = new Centrifuge(wsEndpoint, {
      websocket: stubWebSocket(counter, 'noop'),
      timeout: 60,
      minReconnectDelay: 10000,
      maxReconnectDelay: 10000,
    });
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    c.disconnect();
    await new Promise(r => setTimeout(r, 200));  // well past the connect timeout

    expect(c.state).toBe(State.Disconnected);
    expect(errors).toEqual([]);
  });
});

describe('remaining transports and selection edge cases', () => {
  test('sockjs: an initialize throw falls over to websocket', async () => {
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = track(new Centrifuge([
      { transport: 'sockjs' as TransportName, endpoint: 'http://localhost:8000/connection/sockjs' },
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
    ], {
      sockjs: throwingWebSocket(counter),
      websocket: WebSocket,
      timeout: 2000,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await c.ready(4000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.type === 'transport' && e.transport === 'sockjs')).toBe(true);
  });

  test('http_stream: a fetch that throws synchronously falls over to websocket', async () => {
    const counter = { calls: 0 };

    const c = track(new Centrifuge([
      { transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint },
      { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
    ], {
      fetch: () => { counter.calls++; throw new Error('fetch blocked by policy'); },
      readableStream: ReadableStream,
      websocket: WebSocket,
      emulationEndpoint: emulationEndpoint,
      timeout: 2000,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', () => { /* expected for http_stream */ });

    c.connect();
    await c.ready(4000);

    expect(c.state).toBe(State.Connected);
    expect(counter.calls).toBeGreaterThanOrEqual(1);
  });

  test('an unsupported entry after a failing one does not crash the selection loop', async () => {
    // The index is advanced by the failed websocket attempt, so the next pass
    // starts at sockjs, finds it unsupported, and advances past the end of the
    // list. The wrap has to happen inside the loop, not only on entry.
    const saved = (globalThis as any).SockJS;
    delete (globalThis as any).SockJS;
    try {
      const counter = { calls: 0 };
      const c = track(new Centrifuge([
        { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
        { transport: 'sockjs' as TransportName, endpoint: 'http://localhost:8000/connection/sockjs' },
      ], {
        websocket: throwingWebSocket(counter),
        timeout: 100,
        minReconnectDelay: 20,
        maxReconnectDelay: 20,
      }));
      c.on('error', () => { /* expected every attempt */ });

      c.connect();
      await waitFor(() => counter.calls >= 3);

      expect(c.state).toBe(State.Connecting);
    } finally {
      if (saved !== undefined) { (globalThis as any).SockJS = saved; }
    }
  });

  test('recovers and connects once the transport stops failing', async () => {
    // Proves the client resumes rather than merely looping.
    let attempts = 0;
    const flaky: any = function (this: any, url: string) {
      attempts++;
      if (attempts <= 2) {
        const e = new Error(SECURITY_ERROR_MESSAGE);
        e.name = 'SecurityError';
        throw e;
      }
      return new (WebSocket as any)(url);
    };

    const c = track(new Centrifuge(wsEndpoint, {
      websocket: flaky,
      timeout: 2000,
      minReconnectDelay: 20,
      maxReconnectDelay: 50,
    }));
    c.on('error', () => { /* expected for the first two attempts */ });

    c.connect();
    await c.ready(4000);

    expect(c.state).toBe(State.Connected);
    expect(attempts).toBeGreaterThanOrEqual(3);
  });
});

describe('reporting contract', () => {
  test('getData path reports a transport error, not a data error', async () => {
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = track(new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 50,
      maxReconnectDelay: 50,
      getData: () => Promise.resolve({ some: 'data' }),
    }));
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => errors.length > 0);

    expect(errors.map(e => e.type)).not.toContain('connectData');
    expect(errors[0].type).toBe('transport');

    });

  test('emulation transports report transport then connect', async () => {
    // An emulation transport registers its connect command before initialize().
    // Clearing that command rejects a promise, so _connectError arrives on a
    // microtask after the transport error rather than nested inside it - an
    // assertion made synchronously would only ever see the first.
    const counter = { calls: 0 };
    const errors: ErrorContext[] = [];

    const c = track(new Centrifuge([
      { transport: 'sse' as TransportName, endpoint: sseEndpoint },
    ], {
      eventsource: throwingEventSource(counter),
      fetch: fetch,
      emulationEndpoint: emulationEndpoint,
      timeout: 100,
      minReconnectDelay: 10000,
      maxReconnectDelay: 10000,
    }));
    c.on('error', (ctx) => errors.push(ctx));

    c.connect();
    await waitFor(() => errors.length >= 2);

    expect(errors.map(e => e.type)).toEqual(['transport', 'connect']);
  });

  test('does not re-emit connecting on every retry', async () => {
    // The client is already Connecting, so a failed attempt must not restate it.
    const counter = { calls: 0 };
    const connecting: any[] = [];

    const c = track(new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* expected */ });
    c.on('connecting', (ctx) => connecting.push(ctx));

    c.connect();
    await waitFor(() => counter.calls >= 4);

    expect(connecting).toHaveLength(1);
  });

  test('disconnect() mid-loop stops the retries', async () => {
    const counter = { calls: 0 };
    const c = new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    });
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => counter.calls >= 2);
    c.disconnect();

    const seen = counter.calls;
    await new Promise(r => setTimeout(r, 200));

    expect(c.state).toBe(State.Disconnected);
    expect(counter.calls).toBe(seen);
  });
});

describe('nothing escapes a reconnect timer', () => {
  // The umbrella invariant. Retries run from setTimeout, where a throw has no
  // call site and escapes the client entirely. jest fails a test if that
  // happens, so each scenario below simply has to survive several rounds.

  test('through an initialize-throw loop', async () => {
    const rejections = collectUnhandledRejections();
    const counter = { calls: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: throwingWebSocket(counter),
      timeout: 100,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => counter.calls >= 5);

    expect(rejections.seen).toEqual([]);
    rejections.restore();
  });

  test('through a connect-timeout loop', async () => {
    const rejections = collectUnhandledRejections();
    const counter = { calls: 0, closes: 0 };
    const c = track(new Centrifuge(wsEndpoint, {
      websocket: stubWebSocket(counter, 'absent'),
      timeout: 40,
      minReconnectDelay: 20,
      maxReconnectDelay: 20,
    }));
    c.on('error', () => { /* expected */ });

    c.connect();
    await waitFor(() => counter.calls >= 4);

    expect(rejections.seen).toEqual([]);
    rejections.restore();
  });

  test('when a dependency disappears under a running client', async () => {
    // connect() validated that a transport was available; losing it afterwards
    // is an environment change, so it must be reported rather than thrown from
    // the timer that noticed it.
    const rejections = collectUnhandledRejections();
    const errors: ErrorContext[] = [];
    const saved = (globalThis as any).WebTransport;
    (globalThis as any).WebTransport = function () {
      throw new Error('webtransport blocked');
    };
    try {
      const c = track(new Centrifuge([
        { transport: 'webtransport' as TransportName, endpoint: 'https://localhost:8000/connection/webtransport' },
      ], {
        timeout: 100,
        minReconnectDelay: 20,
        maxReconnectDelay: 20,
      }));
      c.on('error', (ctx) => errors.push(ctx));

      c.connect();
      await waitFor(() => errors.length >= 1);

      // Now take it away entirely while the client is still cycling.
      delete (globalThis as any).WebTransport;
      await new Promise(r => setTimeout(r, 250));

      expect(c.state).toBe(State.Connecting);
      expect(rejections.seen).toEqual([]);
      expect(errors.some(e => e.error.message === 'no supported transport found')).toBe(true);
    } finally {
      if (saved === undefined) {
        delete (globalThis as any).WebTransport;
      } else {
        (globalThis as any).WebTransport = saved;
      }
      rejections.restore();
    }
  });
});

// Direct wrapper-level checks for the state that exists between constructing a
// transport and initializing it. The client no longer leaves a wrapper stranded
// in that state, but close() is reachable there from a stale reference, and the
// guards are cheap insurance rather than something a caller should have to
// reason about.
describe('transport wrappers before initialize()', () => {
  test('WebsocketTransport.close() does not throw', () => {
    const t = new WebsocketTransport(wsEndpoint, { websocket: WebSocket });
    expect(() => t.close()).not.toThrow();
  });

  test('SockjsTransport.close() does not throw', () => {
    const t = new SockjsTransport('http://localhost:8000/connection/sockjs', { sockjs: function () { /* fake */ } });
    expect(() => t.close()).not.toThrow();
  });

  test('SockjsTransport.subName() does not throw', () => {
    const t = new SockjsTransport('http://localhost:8000/connection/sockjs', { sockjs: function () { /* fake */ } });
    expect(() => t.subName()).not.toThrow();
  });

  test('SseTransport.close() does not throw', () => {
    const t = new SseTransport(sseEndpoint, { eventsource: function () { /* fake */ }, fetch: fetch });
    expect(() => t.close()).not.toThrow();
  });

  test('HttpStreamTransport.close() does not throw', () => {
    const t = new HttpStreamTransport(httpStreamEndpoint, { fetch: fetch, readableStream: ReadableStream });
    expect(() => t.close()).not.toThrow();
  });
});
