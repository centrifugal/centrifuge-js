import { Centrifuge } from './protobuf';
import {
  MapSyncContext,
  MapUpdateContext,
  TransportName,
  DeltaStats,
} from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';

const apiBase = 'http://localhost:8000/api';
const apiKey = 'test-api-key';

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
  return `${ns}:pb_test_${Date.now()}_${testCounter}`;
}

function printDeltaStats(label: string, stats: DeltaStats) {
  const pct = (stats.compressionRatio * 100).toFixed(1);
  const saved = stats.bytesDecoded - stats.bytesReceived;
  console.log(`    ${label} — ${stats.numFullPayloads} full + ${stats.numDeltaPayloads} delta | wire ${stats.bytesReceived}B / decoded ${stats.bytesDecoded}B | saved ${saved}B (${pct}%)`);
}

// Helper: decode Uint8Array to parsed JSON for assertions.
function decodeData(data: any): any {
  if (data instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(data));
  }
  return data;
}

// ─── Protobuf map subscription tests ─────────────────────────────────────────

test('protobuf map: subscribe, publish, receive update', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');
  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');
  const updateP = waitForEvent<MapUpdateContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(0);

  // Publish via API — data arrives as binary in protobuf mode.
  await apiMapPublish(ch, 'pb_key', { greeting: 'hello protobuf' });

  const updateCtx = await updateP;
  expect(updateCtx.key).toBe('pb_key');
  expect(updateCtx.removed).toBeFalsy();
  expect(decodeData(updateCtx.data)).toEqual({ greeting: 'hello protobuf' });

  await disconnectClient(c);
});

test('protobuf map: pre-seeded state arrives in sync', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');

  await apiMapPublish(ch, 'k1', { v: 1 });
  await apiMapPublish(ch, 'k2', { v: 2 });

  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');

  sub.subscribe();
  await sub.ready(5000);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(2);

  const keys = syncCtx.entries.map(e => e.key).sort();
  expect(keys).toEqual(['k1', 'k2']);

  // Verify data is decodable.
  for (const entry of syncCtx.entries) {
    const parsed = decodeData(entry.data);
    expect(parsed).toHaveProperty('v');
  }

  await disconnectClient(c);
});

// ─── Protobuf map delta test ─────────────────────────────────────────────────

test('protobuf map delta: updates to same key decoded correctly', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('mapdelta');
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });

  const updates = collectEvents<MapUpdateContext>(sub, 'update', 3);

  sub.subscribe();
  await sub.ready(5000);

  // Publish 3 updates to the same key — large payloads so delta kicks in.
  const padding = 'x'.repeat(500);
  await apiMapPublish(ch, 'player1', { score: 100, name: 'Alice', padding });
  await apiMapPublish(ch, 'player1', { score: 200, name: 'Alice', padding });
  await apiMapPublish(ch, 'player1', { score: 300, name: 'Alice', padding });

  const received = await updates;
  expect(decodeData(received[0].data)).toEqual({ score: 100, name: 'Alice', padding });
  expect(decodeData(received[1].data)).toEqual({ score: 200, name: 'Alice', padding });
  expect(decodeData(received[2].data)).toEqual({ score: 300, name: 'Alice', padding });

  // Same key — 1 full + 2 delta.
  const stats = sub.deltaStats();
  printDeltaStats('protobuf map: 3 updates to same key', stats);
  expect(stats.numPublications).toBe(3);
  expect(stats.numFullPayloads).toBe(1);
  expect(stats.numDeltaPayloads).toBe(2);
  expect(stats.bytesReceived).toBeLessThan(stats.bytesDecoded);
  expect(stats.compressionRatio).toBeGreaterThan(0);

  await disconnectClient(c);
});
