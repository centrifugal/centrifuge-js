import { Centrifuge } from './centrifuge'
import { DisconnectedContext, Error as CentrifugeError, PublicationContext, TransportName, UnsubscribedContext } from './types';
import { disconnectedCodes, unsubscribedCodes, connectingCodes } from './codes';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

test('invalid endpoint', () => {
  expect(() => { new Centrifuge('') }).toThrowError();
});

test('no websocket constructor', async () => {
  const c = new Centrifuge('ws://localhost:8000/connection/websocket?cf_protocol_version=v2');
  expect(() => { c.connect() }).toThrowError();
});

const transportCases = [
  ['websocket', 'ws://localhost:8000/connection/websocket?cf_protocol_version=v2'],
  ['http_stream', 'http://localhost:8000/connection/http_stream?cf_protocol_version=v2'],
  ['sse', 'http://localhost:8000/connection/sse?cf_protocol_version=v2'],
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
  expect(c.state).toBe(Centrifuge.State.Connected);

  c.disconnect();
  const ctx = await p;
  expect(c.state).toBe(Centrifuge.State.Disconnected);
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
  expect(sub.state).toBe(Centrifuge.SubscriptionState.Subscribed);
  expect(c.state).toBe(Centrifuge.State.Connected);

  sub.unsubscribe();
  c.disconnect();

  const ctx = await p;

  expect(sub.state).toBe(Centrifuge.SubscriptionState.Unsubscribed);
  expect(c.state).toBe(Centrifuge.State.Disconnected);
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
  expect(c.state).toBe(Centrifuge.State.Connected);

  const offlineEvent = new Event('offline', { bubbles: true });
  networkEventTarget.dispatchEvent(offlineEvent);

  const ctx = await p;
  expect(c.state).toBe(Centrifuge.State.Connecting);
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
  expect(c.state).toBe(Centrifuge.State.Connected);

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(Centrifuge.State.Disconnected);
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
  expect(c.state).toBe(Centrifuge.State.Connected);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(Centrifuge.State.Disconnected);

  const onlineEvent = new Event('online', { bubbles: true });
  networkEventTarget.dispatchEvent(onlineEvent);
  expect(c.state).toBe(Centrifuge.State.Disconnected);
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
  expect(sub.state).toBe(Centrifuge.SubscriptionState.Subscribed);
  expect(c.state).toBe(Centrifuge.State.Connected);

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
  expect(c.state).toBe(Centrifuge.State.Disconnected);
});
