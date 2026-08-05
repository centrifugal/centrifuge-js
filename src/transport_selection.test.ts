import { Centrifuge } from './centrifuge';
import { TransportName, State } from './types';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

// Protection for the transport dependency-resolution and selection logic in
// _initializeTransport(). Those two concerns are about to be extracted into
// helpers, and two of the five transports (sockjs, webtransport) currently have
// zero function coverage, so a mistake in moving their construction or their
// supported() wiring would go undetected.
//
// Everything here passes against unmodified source: this file is the baseline
// the extraction has to preserve, not a specification of new behavior.
//
// Note deliberately absent from this file: nothing may depend on which globals
// the running Node version happens to provide. CI spans Node 18-25 and
// globalThis.WebSocket in particular is not present across that whole range, so
// a dependency that must be present is always passed via config, and one that
// must be absent is deleted and restored explicitly.

const wsEndpoint = 'ws://localhost:8000/connection/websocket';
const sseEndpoint = 'http://localhost:8000/connection/sse';
const httpStreamEndpoint = 'http://localhost:8000/connection/http_stream';
const sockjsEndpoint = 'http://localhost:8000/connection/sockjs';
const wtEndpoint = 'https://localhost:8000/connection/webtransport';

/** Records construction and satisfies the shape SockjsTransport drives. */
class FakeSockJS {
  static instances: FakeSockJS[] = [];
  url: string;
  protocols: any;
  options: any;
  transport = 'fake-websocket';
  onopen: any = null;
  onerror: any = null;
  onclose: any = null;
  onmessage: any = null;
  closed = false;

  constructor(url: string, protocols: any, options: any) {
    this.url = url;
    this.protocols = protocols;
    this.options = options;
    FakeSockJS.instances.push(this);
  }
  close() { this.closed = true; }
  send(_data: any) { /* no-op */ }
}

/** Never resolves ready/closed, so initialize() parks after selection. */
class FakeWebTransport {
  static instances: FakeWebTransport[] = [];
  url: string;
  ready = new Promise<void>(() => { /* never settles */ });
  closed = new Promise<void>(() => { /* never settles */ });

  constructor(url: string) {
    this.url = url;
    FakeWebTransport.instances.push(this);
  }
  close() { /* no-op */ }
  createBidirectionalStream() { return new Promise(() => { /* never settles */ }); }
}

const clients: Centrifuge[] = [];

// Short, so the connect timeout below drains quickly.
const CONNECT_TIMEOUT = 100;

function makeClient(endpoint: any, options: any): Centrifuge {
  const c = new Centrifuge(endpoint, { timeout: CONNECT_TIMEOUT, ...options });
  clients.push(c);
  c.on('error', () => { /* selection tests assert state, not events */ });
  return c;
}

afterEach(async () => {
  // Runs before any global-restoring afterEach registered later in a describe,
  // so a still-cycling client never observes a dependency vanish mid-flight.
  while (clients.length) {
    const c = clients.pop();
    // disconnect() can throw against unmodified source when connect() gave up
    // holding an unsupported transport; that leak is pinned in
    // transport_init_error.test.ts, and must not mask assertions here.
    try { c!.disconnect(); } catch { /* pinned elsewhere */ }
  }
  // disconnect() clears the connect timeout, so this wait is not needed for the
  // current client. It is kept because this file has to pass against the source
  // as it was before that was true - it is the baseline the transport selection
  // rewrite had to preserve, and it must stay meaningful if that rewrite is
  // reverted. Without it, a transport that never opens leaves an armed timer,
  // which CI reports as an open handle: it runs jest --detectOpenHandles with
  // no --forceExit.
  await new Promise(resolve => setTimeout(resolve, CONNECT_TIMEOUT + 50));
});

/** Deletes globals for the duration of fn, restoring them afterwards. */
function withoutGlobals<T>(names: string[], fn: () => T): T {
  const saved: Record<string, any> = {};
  const had: Record<string, boolean> = {};
  for (const n of names) {
    had[n] = n in (globalThis as any);
    saved[n] = (globalThis as any)[n];
    delete (globalThis as any)[n];
  }
  try {
    return fn();
  } finally {
    for (const n of names) {
      if (had[n]) {
        (globalThis as any)[n] = saved[n];
      }
    }
  }
}

function selectedTransportName(c: Centrifuge): string {
  return (c as any)._transport.name();
}

describe('sockjs selection', () => {
  beforeEach(() => { FakeSockJS.instances = []; });

  test('is selected and constructed with the configured endpoint', () => {
    const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {
      sockjs: FakeSockJS,
      sockjsOptions: { some: 'option' },
    });

    c.connect();

    expect(selectedTransportName(c)).toBe('sockjs');
    expect(FakeSockJS.instances).toHaveLength(1);
    expect(FakeSockJS.instances[0].url).toBe(sockjsEndpoint);
    expect(FakeSockJS.instances[0].options).toEqual({ some: 'option' });
  });

  test('initialize() wires all four callbacks onto the instance', () => {
    const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {
      sockjs: FakeSockJS,
    });

    c.connect();

    const fake = FakeSockJS.instances[0];
    expect(typeof fake.onopen).toBe('function');
    expect(typeof fake.onerror).toBe('function');
    expect(typeof fake.onclose).toBe('function');
    expect(typeof fake.onmessage).toBe('function');
  });

  test('subName() reports the underlying sockjs transport once initialized', () => {
    const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {
      sockjs: FakeSockJS,
    });

    c.connect();

    expect((c as any)._transport.subName()).toBe('sockjs-fake-websocket');
  });

  test('is unsupported when no SockJS is available', () => {
    withoutGlobals(['SockJS'], () => {
      const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {});
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });
});

describe('webtransport selection', () => {
  beforeEach(() => { FakeWebTransport.instances = []; });

  test('is selected and constructed from globalThis.WebTransport', () => {
    const saved = (globalThis as any).WebTransport;
    (globalThis as any).WebTransport = FakeWebTransport;
    try {
      const c = makeClient([{ transport: 'webtransport' as TransportName, endpoint: wtEndpoint }], {});

      c.connect();

      expect(selectedTransportName(c)).toBe('webtransport');
      expect(FakeWebTransport.instances).toHaveLength(1);
      expect(FakeWebTransport.instances[0].url).toBe(wtEndpoint);
    } finally {
      if (saved === undefined) {
        delete (globalThis as any).WebTransport;
      } else {
        (globalThis as any).WebTransport = saved;
      }
    }
  });

  test('is unsupported when globalThis.WebTransport is absent', () => {
    withoutGlobals(['WebTransport'], () => {
      const c = makeClient([{ transport: 'webtransport' as TransportName, endpoint: wtEndpoint }], {});
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });
});

describe('dependency source equivalence: config vs globalThis', () => {
  // The resolution at the top of _initializeTransport prefers an explicit config
  // value and otherwise falls back to a global. Both routes must select the same
  // transport — the invariant the extracted resolver has to preserve.

  test('websocket resolves from config', () => {
    const c = makeClient([{ transport: 'websocket' as TransportName, endpoint: wsEndpoint }], {
      websocket: WebSocket,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('websocket');
  });

  test('websocket resolves from globalThis', () => {
    const saved = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = WebSocket;
    try {
      const c = makeClient([{ transport: 'websocket' as TransportName, endpoint: wsEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('websocket');
    } finally {
      if (saved === undefined) {
        delete (globalThis as any).WebSocket;
      } else {
        (globalThis as any).WebSocket = saved;
      }
    }
  });

  test('sockjs resolves from config', () => {
    const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {
      sockjs: FakeSockJS,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('sockjs');
  });

  test('sockjs resolves from globalThis', () => {
    const saved = (globalThis as any).SockJS;
    (globalThis as any).SockJS = FakeSockJS;
    try {
      const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('sockjs');
    } finally {
      if (saved === undefined) {
        delete (globalThis as any).SockJS;
      } else {
        (globalThis as any).SockJS = saved;
      }
    }
  });

  test('sse resolves from config', () => {
    const c = makeClient([{ transport: 'sse' as TransportName, endpoint: sseEndpoint }], {
      eventsource: EventSource,
      fetch: fetch,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('sse');
  });

  test('http_stream resolves from config', () => {
    const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {
      fetch: fetch,
      readableStream: ReadableStream,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('http_stream');
  });
});

describe('unsupported dependencies are reported, not silently accepted', () => {
  // supported() is checked with `!== null` only for sockjs, sse and http_stream,
  // and with `!== undefined && !== null` for websocket and webtransport. The
  // resolver must therefore yield null — not undefined — for an absent
  // dependency, or supported() returns true and construction fails later on an
  // undefined constructor. Each case here drives absence through the real
  // resolution path rather than passing an explicit undefined.

  test('websocket: array config with no WebSocket anywhere', () => {
    withoutGlobals(['WebSocket'], () => {
      const c = makeClient([{ transport: 'websocket' as TransportName, endpoint: wsEndpoint }], {});
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });

  test('websocket: string endpoint with no WebSocket anywhere', () => {
    withoutGlobals(['WebSocket'], () => {
      const c = makeClient(wsEndpoint, {});
      expect(() => c.connect()).toThrow(/WebSocket constructor not found/);
    });
  });

  test('sse: no EventSource anywhere', () => {
    withoutGlobals(['EventSource'], () => {
      const c = makeClient([{ transport: 'sse' as TransportName, endpoint: sseEndpoint }], {
        fetch: fetch,
      });
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });

  test('http_stream: no fetch anywhere', () => {
    withoutGlobals(['fetch'], () => {
      const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {
        readableStream: ReadableStream,
      });
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });

  test('http_stream: no ReadableStream anywhere', () => {
    withoutGlobals(['ReadableStream'], () => {
      const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {
        fetch: fetch,
      });
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });
});

describe('selection order', () => {
  test('skips an unsupported entry and selects the next supported one', () => {
    withoutGlobals(['SockJS'], () => {
      const c = makeClient([
        { transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint },
        { transport: 'websocket' as TransportName, endpoint: wsEndpoint },
      ], {
        websocket: WebSocket,
      });

      c.connect();

      expect(selectedTransportName(c)).toBe('websocket');
    });
  });
});

describe('non-emulation string endpoint', () => {
  test('connects successfully against the server', async () => {
    const c = makeClient(wsEndpoint, { websocket: WebSocket });

    c.connect();
    await c.ready(3000);

    expect(c.state).toBe(State.Connected);
    expect(selectedTransportName(c)).toBe('websocket');
  });
});

describe('dependency source equivalence: emulation transports from globalThis', () => {
  test('sse resolves eventsource from globalThis', () => {
    const saved = (globalThis as any).EventSource;
    (globalThis as any).EventSource = EventSource;
    try {
      const c = makeClient([{ transport: 'sse' as TransportName, endpoint: sseEndpoint }], {
        fetch: fetch,
      });
      c.connect();
      expect(selectedTransportName(c)).toBe('sse');
    } finally {
      if (saved === undefined) {
        delete (globalThis as any).EventSource;
      } else {
        (globalThis as any).EventSource = saved;
      }
    }
  });

  test('http_stream resolves fetch and readableStream from globalThis', () => {
    const savedFetch = (globalThis as any).fetch;
    const savedStream = (globalThis as any).ReadableStream;
    (globalThis as any).fetch = fetch;
    (globalThis as any).ReadableStream = ReadableStream;
    try {
      const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('http_stream');
    } finally {
      (globalThis as any).fetch = savedFetch;
      (globalThis as any).ReadableStream = savedStream;
    }
  });
});
