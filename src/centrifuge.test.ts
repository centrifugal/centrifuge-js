import { Centrifuge } from './centrifuge'
import {
  DisconnectedContext,
  Error as CentrifugeError,
  PublicationContext,
  TransportName,
  UnsubscribedContext,
  State,
  SubscriptionState,
  SubscribedContext
} from './types';
import { disconnectedCodes, unsubscribedCodes, connectingCodes } from './codes';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

test('invalid endpoint', () => {
  expect(() => { new Centrifuge('') }).toThrowError();
});

test('no websocket constructor', async () => {
  const c = new Centrifuge('ws://localhost:8000/connection/websocket');
  expect(() => { c.connect() }).toThrowError();
});

const transportCases = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
  ['http_stream', 'http://localhost:8000/connection/http_stream'],
  ['sse', 'http://localhost:8000/connection/sse'],
]

const websocketOnly = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
]

test.each(transportCases)("%s: connects and disconnects", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
  });

  let disconnectCalled: any;
  const p = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })

  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  c.disconnect();
  const ctx = await p;
  expect(c.state).toBe(State.Disconnected);
  expect(ctx.code).toBe(disconnectedCodes.disconnectCalled);
});

test.each(transportCases)("%s: subscribe and unsubscribe", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let unsubscribeCalled: any;
  const p = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubscribeCalled = resolve;
  })

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');
  sub.on('unsubscribed', (ctx: UnsubscribedContext) => {
    unsubscribeCalled(ctx);
  });

  sub.subscribe()
  await sub.ready(5000);
  expect(sub.state).toBe(SubscriptionState.Subscribed);
  expect(c.state).toBe(State.Connected);

  sub.unsubscribe();
  c.disconnect();

  const ctx = await p;

  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  expect(c.state).toBe(State.Disconnected);
  expect(ctx.code).toBe(unsubscribedCodes.unsubscribeCalled)
});

test.each(transportCases)("%s: publish and receive message", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);

  let publicationReceived: any;
  const p = new Promise<PublicationContext>((resolve, _) => {
    publicationReceived = resolve;
  })

  const sub = c.newSubscription('test');
  sub.on('publication', (ctx: PublicationContext) => {
    publicationReceived(ctx);
  });
  sub.subscribe()
  await sub.ready(5000);

  await sub.publish({ "my": "data" });

  const ctx = await p;
  c.disconnect();
  expect(ctx.data).toStrictEqual({ "my": "data" });
});


test.each(transportCases)("%s: rpc buffered till connected", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let errorReceived: any;
  const p = new Promise<CentrifugeError>((resolve, _) => {
    errorReceived = resolve;
  })

  c.rpc('method', { "my": "data" }).then(function () {
    // we are not expecting data in this test, we expect Not Available error.
  }, function (err: CentrifugeError) {
    errorReceived(err);
  });

  // note: connect called after issuing rpc.
  c.connect();

  const rpcErr = await p;
  c.disconnect();
  expect(rpcErr.code).toStrictEqual(108);
});

test.each(transportCases)("%s: handles offline/online events", async (transport, endpoint) => {
  const networkEventTarget = new EventTarget();

  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    networkEventTarget: networkEventTarget,
  });

  let connectingCalled: any;
  const p = new Promise<DisconnectedContext>((resolve, _) => {
    connectingCalled = resolve;
  })

  c.on('connecting', (ctx) => {
    if (ctx.code == connectingCodes.transportClosed) {
      connectingCalled(ctx);
    }
  })

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  const offlineEvent = new Event('offline', { bubbles: true });
  networkEventTarget.dispatchEvent(offlineEvent);

  const ctx = await p;
  expect(c.state).toBe(State.Connecting);
  expect(ctx.code).toBe(connectingCodes.transportClosed);

  const onlineEvent = new Event('online', { bubbles: true });
  networkEventTarget.dispatchEvent(onlineEvent);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases.slice(0, 1))("%s: not connecting on online in disconnected state", async (transport, endpoint) => {
  const networkEventTarget = new EventTarget();

  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    networkEventTarget: networkEventTarget,
  });

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);

  const onlineEvent = new Event('online', { bubbles: true });
  networkEventTarget.dispatchEvent(onlineEvent);
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: subscribe and presence", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');

  sub.subscribe()
  await sub.ready(5000);
  expect(sub.state).toBe(SubscriptionState.Subscribed);
  expect(c.state).toBe(State.Connected);

  const presence = await sub.presence();
  expect(Object.keys(presence.clients).length).toBeGreaterThan(0);

  const presenceStats = await sub.presenceStats();
  expect(presenceStats.numClients).toBeGreaterThan(0)
  expect(presenceStats.numUsers).toBeGreaterThan(0);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: connect disconnect loop", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  for (let index = 0; index < 10; index++) {
    c.connect();
    c.disconnect();
  }
  expect(c.state).toBe(State.Disconnected);
  await disconnectedPromise;
});

test.each(transportCases)("%s: subscribe and unsubscribe loop", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  for (let index = 0; index < 10; index++) {
    sub.subscribe();
    sub.unsubscribe();
  }
  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  await unsubscribedPromise;

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

// Make sure we can unsubscribe right after connect called and connect/subscribe
// frames not sent yet.
test.each(transportCases)("%s: unsubscribe right after connect", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);

  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  let subcribeCalled: any;
  const subscribedPromise = new Promise<SubscribedContext>((resolve, _) => {
    subcribeCalled = resolve;
  })

  sub.on('subscribed', (ctx) => {
    subcribeCalled(ctx);
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  sub.subscribe();
  c.disconnect();
  c.connect();
  sub.unsubscribe();

  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  await unsubscribedPromise;

  sub.subscribe();
  await subscribedPromise;

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(websocketOnly)("%s: unsubscribe in between connect command and reply", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  let subcribeCalled: any;
  const subscribedPromise = new Promise<SubscribedContext>((resolve, _) => {
    subcribeCalled = resolve;
  })

  // @ts-ignore this is only for test purposes.
  c.on('__centrifuge_debug:connect_frame_sent', () => {
    sub.unsubscribe();
    unsubcribeCalled()
  })

  sub.on('subscribed', (ctx) => {
    subcribeCalled(ctx);
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  sub.subscribe();
  c.connect();

  await unsubscribedPromise;
  await c.ready()

  await new Promise(r => setTimeout(r, 2000));
  sub.subscribe();

  await subscribedPromise;

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});