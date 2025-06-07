import { Centrifuge } from './protobuf'
import {
  DisconnectedContext, UnsubscribedContext, TransportName,
  PublicationContext, State, SubscriptionState
} from './types';
import { disconnectedCodes, unsubscribedCodes } from './codes';
import WebSocket from 'ws';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

const transportCases = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
  ['http_stream', 'http://localhost:8000/connection/http_stream'],
]

test.each(transportCases)("%s (Protobuf): connects and disconnects", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
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

test.each(transportCases)("%s (Protobuf): subscribe and unsubscribe", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
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
  expect(ctx.code).toBe(unsubscribedCodes.unsubscribeCalled);
});

test.each(transportCases)("%s (Protobuf): publish and receive message", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
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

  const binary = new TextEncoder().encode(JSON.stringify({ "my": "data" }));
  await sub.publish(binary);

  const ctx = await p;
  c.disconnect();
  expect(ctx.data).toStrictEqual(binary);
});

test.each(transportCases)("%s (Protobuf): subscribe and presence", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);

  const sub = c.newSubscription('test');
  sub.subscribe()
  await sub.ready(5000);

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
