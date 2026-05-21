import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  PublicationContext,
  MapSyncContext,
  MapUpdateContext,
  TransportName,
  DeltaStats,
} from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';

const apiBase = 'http://localhost:8000/api';
const apiKey = 'test-api-key';

async function apiPublish(channel: string, data: any): Promise<void> {
  const resp = await fetch(`${apiBase}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ channel, data }),
  });
  if (!resp.ok) {
    throw new Error(`publish failed: ${resp.status} ${await resp.text()}`);
  }
}

async function apiMapPublish(channel: string, key: string, data: any): Promise<void> {
  const resp = await fetch(`${apiBase}/map_publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ channel, key, data }),
  });
  if (!resp.ok) {
    throw new Error(`map_publish failed: ${resp.status} ${await resp.text()}`);
  }
}

function createClient(): Centrifuge {
  return new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
    fetch: fetch,
  });
}

async function disconnectClient(c: Centrifuge): Promise<void> {
  c.disconnect();
  await new Promise(resolve => setTimeout(resolve, 100));
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

function collectEvents<T>(emitter: any, event: string, count: number, timeout = 5000): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout collecting ${count} '${event}' events (got ${collected.length})`)), timeout);
    const collected: T[] = [];
    emitter.on(event, (ctx: T) => {
      collected.push(ctx);
      if (collected.length >= count) {
        clearTimeout(timer);
        resolve(collected);
      }
    });
  });
}

let testCounter = 0;
function uniqueChannel(ns: string): string {
  testCounter++;
  return `${ns}:delta_test_${Date.now()}_${testCounter}`;
}

function printDeltaStats(label: string, stats: DeltaStats) {
  const pct = (stats.compressionRatio * 100).toFixed(1);
  const saved = stats.bytesDecoded - stats.bytesReceived;
  console.log(`    ${label} — ${stats.numFullPayloads} full + ${stats.numDeltaPayloads} delta | wire ${stats.bytesReceived}B / decoded ${stats.bytesDecoded}B | saved ${saved}B (${pct}%)`);
}

// ─── Stream subscription delta tests ───────────────────────────────────────

// 1. Stream delta: successive publications are decoded correctly.
test('stream delta: successive publications decoded correctly', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('delta');
  const sub = c.newSubscription(ch, { delta: 'fossil' });

  const pubs = collectEvents<PublicationContext>(sub, 'publication', 3);

  sub.subscribe();
  await sub.ready(5000);

  // Publish 3 messages with similar structure — delta should kick in after first.
  const payload = 'a'.repeat(500);
  await apiPublish(ch, { counter: 1, payload });
  await apiPublish(ch, { counter: 2, payload });
  await apiPublish(ch, { counter: 3, payload: payload.slice(0, -1) + 'b' });

  const received = await pubs;
  // SDK decodes deltas transparently — data should be full objects.
  expect(received[0].data).toEqual({ counter: 1, payload });
  expect(received[1].data).toEqual({ counter: 2, payload });
  expect(received[2].data).toEqual({ counter: 3, payload: payload.slice(0, -1) + 'b' });

  // Delta stats: first pub is full, subsequent should be delta-encoded.
  const stats = sub.deltaStats();
  printDeltaStats('stream: 3 similar publications', stats);
  expect(stats.numPublications).toBe(3);
  expect(stats.numFullPayloads).toBe(1);
  expect(stats.numDeltaPayloads).toBe(2);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);
  expect(stats.compressionRatio).toBeGreaterThan(0);

  await disconnectClient(c);
});

// 2. Stream delta: recovery after disconnect delivers correct data.
test('stream delta: recovery after disconnect', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('delta');
  const sub = c.newSubscription(ch, { delta: 'fossil' });

  const firstPubP = waitForEvent<PublicationContext>(sub, 'publication');

  sub.subscribe();
  await sub.ready(5000);

  // Publish first message and wait to confirm live.
  await apiPublish(ch, { step: 1, value: 'hello world' });
  const first = await firstPubP;
  expect(first.data).toEqual({ step: 1, value: 'hello world' });

  // Disconnect.
  c.disconnect();

  // Publish while disconnected — these will be recovered.
  await apiPublish(ch, { step: 2, value: 'hello world!' });
  await apiPublish(ch, { step: 3, value: 'hello earth!' });

  // Reconnect with recovery.
  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const recoveredPubs = collectEvents<PublicationContext>(sub, 'publication', 2);

  c.connect();
  await c.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);

  const pubs = await recoveredPubs;
  // Recovered publications should have full correct data (delta decoded).
  expect(pubs[0].data).toEqual({ step: 2, value: 'hello world!' });
  expect(pubs[1].data).toEqual({ step: 3, value: 'hello earth!' });

  await disconnectClient(c);
});

// 3. Stream delta: recovery after unsubscribe/resubscribe.
test('stream delta: recovery after unsubscribe/resubscribe', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('delta');
  const sub = c.newSubscription(ch, { delta: 'fossil' });

  const firstPubP = waitForEvent<PublicationContext>(sub, 'publication');

  sub.subscribe();
  await sub.ready(5000);

  await apiPublish(ch, { n: 1, text: 'base message content' });
  await firstPubP;

  sub.unsubscribe();

  // Publish while unsubscribed.
  await apiPublish(ch, { n: 2, text: 'base message content updated' });
  await apiPublish(ch, { n: 3, text: 'base message content updated again' });

  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const recoveredPubs = collectEvents<PublicationContext>(sub, 'publication', 2);

  sub.subscribe();
  await sub.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);

  const pubs = await recoveredPubs;
  expect(pubs[0].data).toEqual({ n: 2, text: 'base message content updated' });
  expect(pubs[1].data).toEqual({ n: 3, text: 'base message content updated again' });

  await disconnectClient(c);
});

// 4. Stream delta: many successive publications with small diffs.
test('stream delta: many publications with small diffs', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('delta');
  const sub = c.newSubscription(ch, { delta: 'fossil' });

  const count = 10;
  const allPubs = collectEvents<PublicationContext>(sub, 'publication', count);

  sub.subscribe();
  await sub.ready(5000);

  for (let i = 0; i < count; i++) {
    await apiPublish(ch, { index: i, padding: 'x'.repeat(500) });
  }

  const received = await allPubs;
  for (let i = 0; i < count; i++) {
    expect(received[i].data).toEqual({ index: i, padding: 'x'.repeat(500) });
  }

  // With 10 publications, 1 full + 9 delta. The payload is ~120 bytes each,
  // but deltas for small index changes should be much smaller.
  const stats = sub.deltaStats();
  printDeltaStats('stream: 10 pubs with small diffs', stats);
  expect(stats.numPublications).toBe(10);
  expect(stats.numFullPayloads).toBe(1);
  expect(stats.numDeltaPayloads).toBe(9);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);
  expect(stats.compressionRatio).toBeGreaterThan(0);

  await disconnectClient(c);
}, 15000);

// ─── Map subscription delta tests ──────────────────────────────────────────

// 5. Map delta: updates to same key are decoded correctly.
test('map delta: updates to same key decoded correctly', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const updates = collectEvents<MapUpdateContext>(sub, 'update', 3);

  sub.subscribe();
  await sub.ready(5000);

  // Publish 3 updates to the same key — delta applies per-key.
  const padding = 'x'.repeat(500);
  await apiMapPublish(ch, 'player1', { score: 100, name: 'Alice', padding });
  await apiMapPublish(ch, 'player1', { score: 200, name: 'Alice', padding });
  await apiMapPublish(ch, 'player1', { score: 300, name: 'Alice', padding });

  const received = await updates;
  expect(received[0].data).toEqual({ score: 100, name: 'Alice', padding });
  expect(received[1].data).toEqual({ score: 200, name: 'Alice', padding });
  expect(received[2].data).toEqual({ score: 300, name: 'Alice', padding });

  // Same key — 1 full + 2 delta.
  const stats = sub.deltaStats();
  printDeltaStats('map: 3 updates to same key', stats);
  expect(stats.numPublications).toBe(3);
  expect(stats.numFullPayloads).toBe(1);
  expect(stats.numDeltaPayloads).toBe(2);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);
  expect(stats.compressionRatio).toBeGreaterThan(0);

  await disconnectClient(c);
});

// 6. Map delta: updates to different keys work independently.
test('map delta: different keys have independent delta chains', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const updates = collectEvents<MapUpdateContext>(sub, 'update', 4);

  sub.subscribe();
  await sub.ready(5000);

  // Interleave updates to two keys — large payloads so delta kicks in.
  const filler1 = 'a'.repeat(500);
  const filler2 = 'b'.repeat(500);
  await apiMapPublish(ch, 'k1', { v: 1, shared: filler1 });
  await apiMapPublish(ch, 'k2', { v: 1, shared: filler2 });
  await apiMapPublish(ch, 'k1', { v: 2, shared: filler1 });
  await apiMapPublish(ch, 'k2', { v: 2, shared: filler2 });

  const received = await updates;
  expect(received[0].data).toEqual({ v: 1, shared: filler1 });
  expect(received[1].data).toEqual({ v: 1, shared: filler2 });
  expect(received[2].data).toEqual({ v: 2, shared: filler1 });
  expect(received[3].data).toEqual({ v: 2, shared: filler2 });

  // Two keys, each with 1 full + 1 delta = 2 full + 2 delta total.
  const stats = sub.deltaStats();
  printDeltaStats('map: 2 keys interleaved', stats);
  expect(stats.numPublications).toBe(4);
  expect(stats.numFullPayloads).toBe(2);
  expect(stats.numDeltaPayloads).toBe(2);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);
  expect(stats.compressionRatio).toBeGreaterThan(0);

  await disconnectClient(c);
});

// 7. Map delta: recovery after disconnect delivers correct data.
test('map delta: recovery after disconnect', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const firstUpdateP = waitForEvent<MapUpdateContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Establish delta chain.
  await apiMapPublish(ch, 'k1', { counter: 1, blob: 'aaaaaa' });
  await firstUpdateP;

  // Disconnect and publish while disconnected.
  c.disconnect();

  await apiMapPublish(ch, 'k1', { counter: 2, blob: 'aaaaab' });
  await apiMapPublish(ch, 'k1', { counter: 3, blob: 'aaaaac' });

  // Reconnect — should recover.
  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  c.connect();
  await c.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);

  // After recovery, the state should contain the latest value.
  // Verify by publishing one more and checking the update event.
  const nextUpdateP = waitForEvent<MapUpdateContext>(sub, 'update');
  await apiMapPublish(ch, 'k1', { counter: 4, blob: 'aaaaad' });

  const updateCtx = await nextUpdateP;
  expect(updateCtx.key).toBe('k1');
  expect(updateCtx.data).toEqual({ counter: 4, blob: 'aaaaad' });

  await disconnectClient(c);
});

// 8. Map delta: recovery after unsubscribe/resubscribe.
test('map delta: recovery after unsubscribe/resubscribe', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const firstUpdateP = waitForEvent<MapUpdateContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  await apiMapPublish(ch, 'item', { state: 'v1', detail: 'long string here' });
  await firstUpdateP;

  sub.unsubscribe();

  // Publish while unsubscribed.
  await apiMapPublish(ch, 'item', { state: 'v2', detail: 'long string here' });
  await apiMapPublish(ch, 'item', { state: 'v3', detail: 'long string here!' });

  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');

  sub.subscribe();
  await sub.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);

  // Verify live delta still works after recovery.
  const liveUpdateP = waitForEvent<MapUpdateContext>(sub, 'update');
  await apiMapPublish(ch, 'item', { state: 'v4', detail: 'long string here!!' });

  const liveCtx = await liveUpdateP;
  expect(liveCtx.data).toEqual({ state: 'v4', detail: 'long string here!!' });

  await disconnectClient(c);
});

// 9. Map delta: pre-seeded state + live delta updates.
test('map delta: pre-seeded state then live delta updates', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');

  // Seed entries before subscribing — large payloads so delta is beneficial.
  const fillerZ = 'z'.repeat(500);
  const fillerY = 'y'.repeat(500);
  await apiMapPublish(ch, 'a', { x: 1, filler: fillerZ });
  await apiMapPublish(ch, 'b', { x: 1, filler: fillerY });

  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');

  sub.subscribe();
  await sub.ready(5000);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(2);

  // Now publish live updates — delta should work from the seeded state.
  const updates = collectEvents<MapUpdateContext>(sub, 'update', 2);

  await apiMapPublish(ch, 'a', { x: 2, filler: fillerZ });
  await apiMapPublish(ch, 'b', { x: 2, filler: fillerY });

  const received = await updates;
  expect(received[0].data).toEqual({ x: 2, filler: fillerZ });
  expect(received[1].data).toEqual({ x: 2, filler: fillerY });

  // 2 state entries (full) from sync + 2 live updates (delta).
  const stats = sub.deltaStats();
  printDeltaStats('map: pre-seeded + live updates', stats);
  expect(stats.numPublications).toBe(4);
  expect(stats.numFullPayloads).toBe(2);
  expect(stats.numDeltaPayloads).toBe(2);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);

  await disconnectClient(c);
});
