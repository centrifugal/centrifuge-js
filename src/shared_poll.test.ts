import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  MapPublicationContext,
  TransportName,
  SharedPollSignatureContext,
  SharedPollSignatureResult,
} from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';
import * as http from 'http';
import * as crypto from 'crypto';

const pollSecret = 'test-poll-secret';
const mockBackendPort = 3010;

// ---- Mock Refresh Backend ----

interface MockItem {
  data: any;
  version: number;
  removed?: boolean;
}

let mockItems: Map<string, MockItem> = new Map();
let mockServer: http.Server;
let mockRequestLog: Array<{ channel: string; items: any[] }> = [];

function startMockBackend(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end();
        return;
      }

      let body = '';
      req.on('data', (chunk: string) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          mockRequestLog.push({ channel: parsed.channel, items: parsed.items || [] });

          const responseItems: any[] = [];
          for (const item of (parsed.items || [])) {
            const stored = mockItems.get(item.key);
            if (stored) {
              const ri: any = {
                key: item.key,
                data: stored.data,
                version: stored.version,
              };
              if (stored.removed) {
                ri.removed = true;
              }
              responseItems.push(ri);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { items: responseItems } }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { message: 'bad request' } }));
        }
      });
    });
    mockServer.listen(mockBackendPort, '127.0.0.1', () => resolve());
  });
}

function stopMockBackend(): Promise<void> {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ---- Helpers ----

function makeTrackSignature(
  secret: string, channel: string, keys: string[], user: string, ttl = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + ttl;
  const sortedKeys = [...keys].sort();
  const keysHash = crypto.createHash('sha256')
    .update(sortedKeys.join('\x00'))
    .digest('hex');
  const payload = `${channel}:${user}:${keysHash}:${now}:${expiry}`;
  const hmac = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `${now}:${expiry}:${hmac}`;
}

function makeGetSignature(
  secret: string, channel: string, user = ''
): (ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult> {
  return async (ctx) => {
    const signature = makeTrackSignature(secret, channel, ctx.keys, user);
    return { keys: ctx.keys, signature };
  };
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

function waitForEvent<T>(emitter: any, event: string, timeout = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for '${event}'`)), timeout);
    emitter.on(event, (ctx: T) => {
      clearTimeout(timer);
      resolve(ctx);
    });
  });
}

function collectEvents<T>(emitter: any, event: string, count: number, timeout = 10000): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout collecting ${count} '${event}' events (got ${collected.length})`)),
      timeout
    );
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
  return `${ns}:test_${Date.now()}_${testCounter}`;
}

// ---- Setup ----

beforeAll(async () => {
  await startMockBackend();
});

afterAll(async () => {
  await stopMockBackend();
});

beforeEach(() => {
  mockItems.clear();
  mockRequestLog = [];
});

// ---- Tests ----

// 1. Subscribe to shared poll channel.
test('subscribe to shared poll channel', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');

  sub.subscribe();
  await sub.ready(10000);

  const ctx = await subscribedP;
  expect(ctx.channel).toBe(ch);

  await disconnectClient(c);
}, 15000);

// 2. Track items and receive updates.
test('track items and receive updates', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  // Set up mock data that will be returned by the backend.
  mockItems.set('k1', { data: { value: 'hello' }, version: 1 });
  mockItems.set('k2', { data: { value: 'world' }, version: 1 });

  const updateP = collectEvents<MapPublicationContext>(sub, 'update', 2);

  const signature = makeTrackSignature(pollSecret, ch, ['k1', 'k2'], '');
  await sub.track([
    { key: 'k1', version: 0 },
    { key: 'k2', version: 0 },
  ], { signature });

  // Wait for Centrifugo to poll and deliver updates.
  const updates = await updateP;

  const keys = updates.map(u => u.key).sort();
  expect(keys).toEqual(['k1', 'k2']);
  expect(updates.every(u => u.version === 1)).toBe(true);

  await disconnectClient(c);
}, 15000);

// 3. Track multiple batches.
test('track multiple batches', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('a1', { data: { v: 1 }, version: 1 });
  mockItems.set('b1', { data: { v: 2 }, version: 1 });

  // Track batch 1.
  const sig1 = makeTrackSignature(pollSecret, ch, ['a1'], '');
  await sub.track([{ key: 'a1', version: 0 }], { signature: sig1 });

  // Track batch 2.
  const sig2 = makeTrackSignature(pollSecret, ch, ['b1'], '');
  await sub.track([{ key: 'b1', version: 0 }], { signature: sig2 });

  // Should get updates for both batches.
  const updates = await collectEvents<MapPublicationContext>(sub, 'update', 2);

  const keys = updates.map(u => u.key).sort();
  expect(keys).toEqual(['a1', 'b1']);

  await disconnectClient(c);
});

// 4. Untrack items.
test('untrack items', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('k1', { data: { v: 1 }, version: 1 });
  mockItems.set('k2', { data: { v: 1 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['k1', 'k2'], '');
  await sub.track([
    { key: 'k1', version: 0 },
    { key: 'k2', version: 0 },
  ], { signature: sig });

  // Wait for initial updates.
  await collectEvents<MapPublicationContext>(sub, 'update', 2);

  // Untrack k1.
  await sub.untrack(['k1']);

  // Update k2 version — should still get update for k2.
  mockItems.set('k2', { data: { v: 2 }, version: 2 });

  const laterUpdates = await collectEvents<MapPublicationContext>(sub, 'update', 1);
  expect(laterUpdates[0].key).toBe('k2');
  expect(laterUpdates[0].version).toBe(2);

  await disconnectClient(c);
});

// 5. Track with invalid signature.
test('track with invalid signature', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  await expect(sub.track(
    [{ key: 'k1', version: 0 }],
    { signature: 'invalid-signature' }
  )).rejects.toBeDefined();

  await disconnectClient(c);
});

// 6. Update event has correct fields.
test('update event has correct fields', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('item1', { data: { score: 42 }, version: 3 });

  const updateP = waitForEvent<MapPublicationContext>(sub, 'update');

  const sig = makeTrackSignature(pollSecret, ch, ['item1'], '');
  await sub.track([{ key: 'item1', version: 0 }], { signature: sig });

  const ctx = await updateP;
  expect(ctx.key).toBe('item1');
  expect(ctx.data).toEqual({ score: 42 });
  expect(ctx.version).toBe(3);
  expect(ctx.channel).toBe(ch);
  expect(ctx.removed).toBeFalsy();

  await disconnectClient(c);
});

// 7. Version-only updates (no stale delivery).
test('no update when version unchanged', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  // Mock returns version=5, track with version=5 (already have it) — should be filtered.
  mockItems.set('k1', { data: { v: 1 }, version: 5 });

  const sig = makeTrackSignature(pollSecret, ch, ['k1'], '');
  await sub.track([{ key: 'k1', version: 5 }], { signature: sig });

  // Immediately bump to version=6 — first delivered update must be 6, proving 5 was filtered.
  mockItems.set('k1', { data: { v: 2 }, version: 6 });

  const update = await waitForEvent<MapPublicationContext>(sub, 'update');
  expect(update.version).toBe(6);
  expect(update.data).toEqual({ v: 2 });

  await disconnectClient(c);
});

// 8. Removal event.
test('removal event', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('k1', { data: { v: 1 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['k1'], '');
  await sub.track([{ key: 'k1', version: 0 }], { signature: sig });

  // Wait for initial update.
  await waitForEvent<MapPublicationContext>(sub, 'update');

  // Mark as removed.
  mockItems.set('k1', { data: null, version: 2, removed: true });

  const removal = await waitForEvent<MapPublicationContext>(sub, 'update');
  expect(removal.key).toBe('k1');
  expect(removal.removed).toBe(true);

  await disconnectClient(c);
});

// 9. Multiple items updated in one cycle.
test('multiple items updated in one cycle', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  // Set up 3 items simultaneously.
  mockItems.set('x1', { data: { n: 1 }, version: 1 });
  mockItems.set('x2', { data: { n: 2 }, version: 1 });
  mockItems.set('x3', { data: { n: 3 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['x1', 'x2', 'x3'], '');
  await sub.track([
    { key: 'x1', version: 0 },
    { key: 'x2', version: 0 },
    { key: 'x3', version: 0 },
  ], { signature: sig });

  const updates = await collectEvents<MapPublicationContext>(sub, 'update', 3);
  const keys = updates.map(u => u.key).sort();
  expect(keys).toEqual(['x1', 'x2', 'x3']);

  await disconnectClient(c);
});

// 10. Two clients see same updates.
test('two clients see same updates', async () => {
  const c1 = createClient();
  const c2 = createClient();
  c1.connect();
  c2.connect();
  await c1.ready(5000);
  await c2.ready(5000);

  const ch = uniqueChannel('poll');

  const sub1 = c1.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });
  const sub2 = c2.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub1.subscribe();
  sub2.subscribe();
  await sub1.ready(5000);
  await sub2.ready(5000);

  mockItems.set('shared', { data: { val: 'test' }, version: 1 });

  const update1P = waitForEvent<MapPublicationContext>(sub1, 'update');
  const update2P = waitForEvent<MapPublicationContext>(sub2, 'update');

  const sig1 = makeTrackSignature(pollSecret, ch, ['shared'], '');
  await sub1.track([{ key: 'shared', version: 0 }], { signature: sig1 });

  const sig2 = makeTrackSignature(pollSecret, ch, ['shared'], '');
  await sub2.track([{ key: 'shared', version: 0 }], { signature: sig2 });

  const [u1, u2] = await Promise.all([update1P, update2P]);
  expect(u1.key).toBe('shared');
  expect(u2.key).toBe('shared');
  expect(u1.version).toBe(1);
  expect(u2.version).toBe(1);

  await disconnectClient(c1);
  await disconnectClient(c2);
});

// 11. Clients track different keys.
test('clients track different keys', async () => {
  const c1 = createClient();
  const c2 = createClient();
  c1.connect();
  c2.connect();
  await c1.ready(5000);
  await c2.ready(5000);

  const ch = uniqueChannel('poll');

  const sub1 = c1.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });
  const sub2 = c2.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub1.subscribe();
  sub2.subscribe();
  await sub1.ready(5000);
  await sub2.ready(5000);

  mockItems.set('only1', { data: { for: 'c1' }, version: 1 });
  mockItems.set('only2', { data: { for: 'c2' }, version: 1 });

  const update1P = waitForEvent<MapPublicationContext>(sub1, 'update');
  const update2P = waitForEvent<MapPublicationContext>(sub2, 'update');

  const sig1 = makeTrackSignature(pollSecret, ch, ['only1'], '');
  await sub1.track([{ key: 'only1', version: 0 }], { signature: sig1 });

  const sig2 = makeTrackSignature(pollSecret, ch, ['only2'], '');
  await sub2.track([{ key: 'only2', version: 0 }], { signature: sig2 });

  const [u1, u2] = await Promise.all([update1P, update2P]);
  expect(u1.key).toBe('only1');
  expect(u2.key).toBe('only2');

  await disconnectClient(c1);
  await disconnectClient(c2);
});

// 12. Unsubscribe cleans up.
test('unsubscribe cleans up', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('k1', { data: { v: 1 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['k1'], '');
  await sub.track([{ key: 'k1', version: 0 }], { signature: sig });

  // Wait for update.
  await waitForEvent<MapPublicationContext>(sub, 'update');

  // Unsubscribe.
  sub.unsubscribe();

  // Record any spurious updates on the old sub.
  let spuriousCount = 0;
  sub.on('update', () => { spuriousCount++; });

  // Bump version and use a second subscription to prove poll cycles ran.
  mockItems.set('k1', { data: { v: 2 }, version: 2 });

  const ch2 = uniqueChannel('poll');
  const sub2 = c.newSharedPollSubscription(ch2, {
    getSignature: makeGetSignature(pollSecret, ch2),
  });
  sub2.subscribe();
  await sub2.ready(5000);

  mockItems.set('probe', { data: { v: 1 }, version: 1 });
  const sig2 = makeTrackSignature(pollSecret, ch2, ['probe'], '');
  await sub2.track([{ key: 'probe', version: 0 }], { signature: sig2 });
  await waitForEvent<MapPublicationContext>(sub2, 'update');

  // Old subscription must not have received anything after unsubscribe.
  expect(spuriousCount).toBe(0);

  await disconnectClient(c);
});

// 13. Reconnect replays track with current versions.
test('reconnect replays track with current versions', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('rk1', { data: { v: 1 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['rk1'], '');
  await sub.track([{ key: 'rk1', version: 0 }], { signature: sig });

  // Wait for initial update (version 1).
  await waitForEvent<MapPublicationContext>(sub, 'update');

  // Simulate disconnect/reconnect.
  c.disconnect();
  await new Promise(resolve => setTimeout(resolve, 200));

  // Bump version while disconnected.
  mockItems.set('rk1', { data: { v: 2 }, version: 2 });

  c.connect();
  await c.ready(5000);
  await sub.ready(5000);

  // After reconnect, getSignature should be called and track replayed.
  // Should get update for version 2.
  const update = await waitForEvent<MapPublicationContext>(sub, 'update');
  expect(update.key).toBe('rk1');
  expect(update.version).toBe(2);

  await disconnectClient(c);
});
