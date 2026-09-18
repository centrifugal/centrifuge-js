import { Centrifuge } from './protobuf'
import {
  DisconnectedContext, UnsubscribedContext, TransportName,
  PublicationContext, State, SubscriptionState
} from './types';
import { disconnectedCodes, unsubscribedCodes } from './codes';
import WebSocket from 'ws';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';
import { centrifugal } from './client_proto';

const transportCases = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
  ['http_stream', 'http://localhost:8000/connection/http_stream'],
]

test('http_stream (Protobuf): a publication larger than one stream read is delivered', async () => {
  const c = new Centrifuge([{
    transport: 'http_stream' as TransportName,
    endpoint: 'http://localhost:8000/connection/http_stream',
  }], {
    fetch: fetch,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
  });
  const connectingCodes: number[] = [];
  c.on('connecting', ctx => connectingCodes.push(ctx.code));

  const channel = 'protobuf_large_' + Date.now();
  const sub = c.newSubscription(channel);
  const received: Uint8Array[] = [];
  sub.on('publication', (ctx: PublicationContext) => received.push(ctx.data));
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  // Arrives in several reads of the response stream, split inside the reply.
  const payload = 'z'.repeat(256000);
  const resp = await fetch('http://localhost:8000/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-api-key' },
    body: JSON.stringify({ channel, data: { payload } }),
  });
  expect(resp.ok).toBe(true);

  const deadline = Date.now() + 5000;
  while (received.length === 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  expect(received).toHaveLength(1);
  expect(JSON.parse(new TextDecoder().decode(received[0])).payload).toHaveLength(payload.length);
  // Delivered on the first connection, without reconnecting.
  expect(connectingCodes).toEqual([0]);
  c.disconnect();
});

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

// Protobuf decodes a publication without an offset (e.g. published without
// history) with offset 0, a Long where long.js is available. It must not replace
// the stored position, or a later recovery starts from offset 0.
test('Protobuf: a publication without an offset keeps the stored position', () => {
  const Publication = centrifugal.centrifuge.protocol.Publication;
  const withoutOffset = Publication.decode(Publication.encode({ data: new Uint8Array([1]) }).finish());
  const withOffset = Publication.decode(Publication.encode({ data: new Uint8Array([1]), offset: 7 }).finish());

  const c = new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
  });

  const sub = c.newSubscription('positioned');
  (sub as any)._offset = 42;
  (sub as any)._setPublicationPosition(withoutOffset);
  expect(Number((sub as any)._offset)).toBe(42);
  (sub as any)._setPublicationPosition(withOffset);
  expect(Number((sub as any)._offset)).toBe(7);

  (c as any)._serverSubs['server-side'] = { offset: 5, epoch: 'e', recoverable: true };
  (c as any)._handlePublication('server-side', withoutOffset);
  expect(Number((c as any)._serverSubs['server-side'].offset)).toBe(5);
  (c as any)._handlePublication('server-side', withOffset);
  expect(Number((c as any)._serverSubs['server-side'].offset)).toBe(7);
});

// Protobuf decodes the uint64 version of a shared poll item into a Long, as it does an
// offset. The public types declare a number, and the version the app is given is what
// it stores and passes back to track().
test('Protobuf: the version of a shared poll update is a number', () => {
  const Publication = centrifugal.centrifuge.protocol.Publication;
  const pub = Publication.decode(Publication.encode({ key: 'k1', data: new Uint8Array([123, 125]), version: 7 }).finish());

  const c = new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
  });

  const sub: any = c.newSharedPollSubscription('poll');
  sub.state = SubscriptionState.Subscribed;
  sub._sharedPollTrackedItems.set('k1', 0);
  const updates: any[] = [];
  sub.on('update', (ctx: any) => updates.push(ctx));

  sub._handlePublication(pub);

  expect(updates).toHaveLength(1);
  expect(typeof updates[0].version).toBe('number');
  expect(updates[0].version).toBe(7);
  // And the version the next track request asks from.
  expect(typeof sub._sharedPollTrackedItems.get('k1')).toBe('number');
  expect(sub._sharedPollTrackedItems.get('k1')).toBe(7);
});

// Protobuf decodes a uint64 offset into a Long where long.js is available (it comes
// with protobufjs). The public types declare a number, and an app that stores the
// position it was given gets `{low, high, unsigned}` back, which compares and adds
// as NaN.
test('Protobuf: the position of a subscribe reply is a number', () => {
  const SubscribeResult = centrifugal.centrifuge.protocol.SubscribeResult;
  const result = SubscribeResult.decode(SubscribeResult.encode({
    recoverable: true, positioned: true, offset: 7, epoch: 'e',
  }).finish());

  const c = new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
  });

  // The position the library keeps for a client-side subscription.
  const sub = c.newSubscription('positioned');
  (sub as any).state = SubscriptionState.Subscribing;
  (sub as any)._setSubscribed(result);
  expect(typeof (sub as any)._offset).toBe('number');
  expect((sub as any)._offset).toBe(7);

  // The position handed to the app, which it may store and pass back via `since`.
  const ctx = (c as any)._getSubscribeContext('positioned', result);
  expect(typeof ctx.streamPosition.offset).toBe('number');
  expect(JSON.parse(JSON.stringify(ctx.streamPosition))).toEqual({ offset: 7, epoch: 'e' });

  // And the position of a server-side subscription.
  (c as any)._handleSubscribe('server-side', result);
  expect(typeof (c as any)._serverSubs['server-side'].offset).toBe('number');
  expect((c as any)._serverSubs['server-side'].offset).toBe(7);
});
