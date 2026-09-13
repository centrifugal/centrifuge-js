import { Centrifuge } from './centrifuge';
import { TransportName, State } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

// Transport dependency resolution and selection: a dependency comes from the
// config or else from a global, an entry whose dependency is missing is skipped,
// and a configuration without any usable transport fails in connect().
//
// Nothing here may depend on which globals the running Node version provides: a
// dependency that must be present is passed via config, and one that must be
// absent is deleted and restored explicitly.

// Nothing listens there: attempts started by these tests just fail, only the
// selected transport is checked.
const wsEndpoint = 'ws://localhost:1/connection/websocket';
const sseEndpoint = 'http://localhost:1/connection/sse';
const httpStreamEndpoint = 'http://localhost:1/connection/http_stream';
const sockjsEndpoint = 'http://localhost:1/connection/sockjs';
const wtEndpoint = 'https://localhost:1/connection/webtransport';

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

function makeClient(endpoint: any, options: any): Centrifuge {
  const c = new Centrifuge(endpoint, {
    timeout: 100,
    minReconnectDelay: 10000,
    maxReconnectDelay: 10000,
    emulationEndpoint: 'http://localhost:1/emulation',
    networkEventTarget: new EventTarget(),
    ...options,
  });
  clients.push(c);
  c.on('error', () => { /* selection tests assert state, not events */ });
  return c;
}

afterEach(() => {
  while (clients.length) {
    clients.pop()!.disconnect();
  }
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

/** Sets a global for the duration of fn, restoring it afterwards. */
function withGlobal<T>(name: string, value: any, fn: () => T): T {
  const had = name in (globalThis as any);
  const saved = (globalThis as any)[name];
  (globalThis as any)[name] = value;
  try {
    return fn();
  } finally {
    if (had) {
      (globalThis as any)[name] = saved;
    } else {
      delete (globalThis as any)[name];
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
    withGlobal('WebTransport', FakeWebTransport, () => {
      const c = makeClient([{ transport: 'webtransport' as TransportName, endpoint: wtEndpoint }], {});

      c.connect();

      expect(selectedTransportName(c)).toBe('webtransport');
      expect(FakeWebTransport.instances).toHaveLength(1);
      expect(FakeWebTransport.instances[0].url).toBe(wtEndpoint);
    });
  });

  test('is unsupported when globalThis.WebTransport is absent', () => {
    withoutGlobals(['WebTransport'], () => {
      const c = makeClient([{ transport: 'webtransport' as TransportName, endpoint: wtEndpoint }], {});
      expect(() => c.connect()).toThrow(/no supported transport found/);
    });
  });
});

describe('dependency source: config or globalThis', () => {
  // An explicit config value is preferred, a global is the fallback. Both must
  // select the same transport.

  test('websocket resolves from config', () => {
    const c = makeClient([{ transport: 'websocket' as TransportName, endpoint: wsEndpoint }], {
      websocket: WebSocket,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('websocket');
  });

  test('websocket resolves from globalThis', () => {
    withGlobal('WebSocket', WebSocket, () => {
      const c = makeClient([{ transport: 'websocket' as TransportName, endpoint: wsEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('websocket');
    });
  });

  test('sockjs resolves from config', () => {
    const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {
      sockjs: FakeSockJS,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('sockjs');
  });

  test('sockjs resolves from globalThis', () => {
    withGlobal('SockJS', FakeSockJS, () => {
      const c = makeClient([{ transport: 'sockjs' as TransportName, endpoint: sockjsEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('sockjs');
    });
  });

  test('sse resolves from config', () => {
    const c = makeClient([{ transport: 'sse' as TransportName, endpoint: sseEndpoint }], {
      eventsource: EventSource,
      fetch: fetch,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('sse');
  });

  test('sse resolves eventsource from globalThis', () => {
    withGlobal('EventSource', EventSource, () => {
      const c = makeClient([{ transport: 'sse' as TransportName, endpoint: sseEndpoint }], {
        fetch: fetch,
      });
      c.connect();
      expect(selectedTransportName(c)).toBe('sse');
    });
  });

  test('http_stream resolves from config', () => {
    const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {
      fetch: fetch,
      readableStream: ReadableStream,
    });
    c.connect();
    expect(selectedTransportName(c)).toBe('http_stream');
  });

  test('http_stream resolves fetch and readableStream from globalThis', () => {
    withGlobal('fetch', fetch, () => withGlobal('ReadableStream', ReadableStream, () => {
      const c = makeClient([{ transport: 'http_stream' as TransportName, endpoint: httpStreamEndpoint }], {});
      c.connect();
      expect(selectedTransportName(c)).toBe('http_stream');
    }));
  });
});

describe('missing dependencies make a transport unsupported', () => {
  // Resolution must yield null, not undefined, for an absent dependency:
  // supported() of sockjs, sse and http_stream only checks `!== null`.

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
  test('connects', async () => {
    const server = await FakeCentrifugoServer.start();
    try {
      const c = makeClient(server.url, { websocket: WebSocket, timeout: 5000 });

      c.connect();
      await c.ready(3000);

      expect(c.state).toBe(State.Connected);
      expect(selectedTransportName(c)).toBe('websocket');
      c.disconnect();
    } finally {
      await server.close();
    }
  });
});
