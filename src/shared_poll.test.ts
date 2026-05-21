import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  SharedPollUpdateContext,
  TransportName,
  SharedPollSignatureContext,
  SharedPollSignatureResult,
} from './types';
import { errorCodes } from './codes';

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

const mockItems: Map<string, MockItem> = new Map();
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
    // Bind to all interfaces so Centrifugo running inside Docker can reach
    // this mock backend via host.docker.internal (which routes through the
    // docker0 bridge on Linux, not loopback).
    mockServer.listen(mockBackendPort, () => resolve());
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
  const keysHash = crypto.createHash('sha256')
    .update(keys.join('\x00'))
    .digest('hex');
  // Payload fields are NUL-separated (matches the inner keys join) so colons
  // inside user or channel can't shift between fields. The outer signature
  // string itself stays ':'-separated — its fields are colon-free.
  const payload = `${now}\x00${expiry}\x00${user}\x00${channel}\x00${keysHash}`;
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
    emitter.once(event, (ctx: T) => {
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

  const updateP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);

  const signature = makeTrackSignature(pollSecret, ch, ['k1', 'k2'], '');
  await sub.track([
    { key: 'k1', version: 0 },
    { key: 'k2', version: 0 },
  ], signature);

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
  await sub.track([{ key: 'a1', version: 0 }], sig1);

  // Track batch 2.
  const sig2 = makeTrackSignature(pollSecret, ch, ['b1'], '');
  await sub.track([{ key: 'b1', version: 0 }], sig2);

  // Should get updates for both batches.
  const updates = await collectEvents<SharedPollUpdateContext>(sub, 'update', 2);

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
  ], sig);

  // Wait for initial updates.
  await collectEvents<SharedPollUpdateContext>(sub, 'update', 2);

  // Untrack k1.
  await sub.untrack(['k1']);

  // Update k2 version — should still get update for k2.
  mockItems.set('k2', { data: { v: 2 }, version: 2 });

  const laterUpdates = await collectEvents<SharedPollUpdateContext>(sub, 'update', 1);
  expect(laterUpdates[0].key).toBe('k2');
  expect(laterUpdates[0].version).toBe(2);

  await disconnectClient(c);
});

// 5. Track with invalid signature emits error event.
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

  const errorP = new Promise<any>((resolve) => {
    sub.on('error', (ctx) => {
      if (ctx.type === 'track') resolve(ctx);
    });
  });

  sub.track(
    [{ key: 'k1', version: 0 }],
    'invalid-signature'
  );

  const errCtx = await errorP;
  expect(errCtx.error).toBeDefined();

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

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');

  const sig = makeTrackSignature(pollSecret, ch, ['item1'], '');
  await sub.track([{ key: 'item1', version: 0 }], sig);

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
  await sub.track([{ key: 'k1', version: 5 }], sig);

  // Immediately bump to version=6 — first delivered update must be 6, proving 5 was filtered.
  mockItems.set('k1', { data: { v: 2 }, version: 6 });

  const update = await waitForEvent<SharedPollUpdateContext>(sub, 'update');
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
  await sub.track([{ key: 'k1', version: 0 }], sig);

  // Wait for initial update.
  await waitForEvent<SharedPollUpdateContext>(sub, 'update');

  // Mark as removed.
  mockItems.set('k1', { data: null, version: 2, removed: true });

  const removal = await waitForEvent<SharedPollUpdateContext>(sub, 'update');
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
  ], sig);

  const updates = await collectEvents<SharedPollUpdateContext>(sub, 'update', 3);
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

  const update1P = waitForEvent<SharedPollUpdateContext>(sub1, 'update');
  const update2P = waitForEvent<SharedPollUpdateContext>(sub2, 'update');

  const sig1 = makeTrackSignature(pollSecret, ch, ['shared'], '');
  await sub1.track([{ key: 'shared', version: 0 }], sig1);

  const sig2 = makeTrackSignature(pollSecret, ch, ['shared'], '');
  await sub2.track([{ key: 'shared', version: 0 }], sig2);

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

  const update1P = waitForEvent<SharedPollUpdateContext>(sub1, 'update');
  const update2P = waitForEvent<SharedPollUpdateContext>(sub2, 'update');

  const sig1 = makeTrackSignature(pollSecret, ch, ['only1'], '');
  await sub1.track([{ key: 'only1', version: 0 }], sig1);

  const sig2 = makeTrackSignature(pollSecret, ch, ['only2'], '');
  await sub2.track([{ key: 'only2', version: 0 }], sig2);

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
  await sub.track([{ key: 'k1', version: 0 }], sig);

  // Wait for update.
  await waitForEvent<SharedPollUpdateContext>(sub, 'update');

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
  await sub2.track([{ key: 'probe', version: 0 }], sig2);
  await waitForEvent<SharedPollUpdateContext>(sub2, 'update');

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
  await sub.track([{ key: 'rk1', version: 0 }], sig);

  // Wait for initial update (version 1).
  await waitForEvent<SharedPollUpdateContext>(sub, 'update');

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
  const update = await waitForEvent<SharedPollUpdateContext>(sub, 'update');
  expect(update.key).toBe('rk1');
  expect(update.version).toBe(2);

  await disconnectClient(c);
});

// 14. trackedKeys returns current tracked keys.
test('trackedKeys returns tracked and untracked keys', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  // Initially empty.
  expect(sub.trackedKeys().size).toBe(0);

  // Track some keys.
  mockItems.set('tk1', { data: { v: 1 }, version: 1 });
  mockItems.set('tk2', { data: { v: 2 }, version: 1 });
  const sig = makeTrackSignature(pollSecret, ch, ['tk1', 'tk2'], '');
  await sub.track([
    { key: 'tk1', version: 0 },
    { key: 'tk2', version: 0 },
  ], sig);

  const keys1 = sub.trackedKeys();
  expect(keys1.size).toBe(2);
  expect(keys1.has('tk1')).toBe(true);
  expect(keys1.has('tk2')).toBe(true);

  // Untrack one key.
  await sub.untrack(['tk1']);
  const keys2 = sub.trackedKeys();
  expect(keys2.size).toBe(1);
  expect(keys2.has('tk2')).toBe(true);
  expect(keys2.has('tk1')).toBe(false);

  await disconnectClient(c);
}, 15000);

// 15. track() before subscribe — items replayed after connect using buffered signature.
test('track before subscribe replays items using buffered signature', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '');
      return { keys: ctx.keys, signature };
    },
  });

  // Track with explicit signature before subscribe/connect.
  const sig = makeTrackSignature(pollSecret, ch, ['early1'], '');
  mockItems.set('early1', { data: { v: 1 }, version: 1 });
  sub.track([{ key: 'early1', version: 0 }], sig);
  expect(sub.trackedKeys().has('early1')).toBe(true);

  // Subscribe and connect — replay should use the buffered signature,
  // NOT call getSignature.
  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const ctx = await updateP;
  expect(ctx.key).toBe('early1');
  expect(ctx.data).toEqual({ v: 1 });
  expect(getSignatureCalls).toBe(0);

  await disconnectClient(c);
});

// 16. track() + untrack() before subscribe — untracked key not sent.
test('track then untrack before subscribe skips untracked key', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  mockItems.set('keep', { data: { v: 1 }, version: 1 });
  mockItems.set('drop', { data: { v: 2 }, version: 1 });

  // Track two keys, then untrack one — all before subscribe.
  const sig = makeTrackSignature(pollSecret, ch, ['keep', 'drop'], '');
  sub.track([{ key: 'keep', version: 0 }, { key: 'drop', version: 0 }], sig);
  sub.untrack(['drop']);
  expect(sub.trackedKeys().has('keep')).toBe(true);
  expect(sub.trackedKeys().has('drop')).toBe(false);

  // Subscribe and connect — only 'keep' should be replayed.
  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const ctx = await updateP;
  expect(ctx.key).toBe('keep');

  // Wait a bit — 'drop' should never arrive.
  await new Promise(resolve => setTimeout(resolve, 500));
  expect(sub.trackedKeys().has('drop')).toBe(false);

  await disconnectClient(c);
});

// 17. track with string keys (simplified API) — auto-obtains signature.
test('track with string keys (simplified API)', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('sk1', { data: { v: 1 }, version: 1 });
  mockItems.set('sk2', { data: { v: 2 }, version: 1 });

  const updateP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);

  // Simplified API — pass string array, no explicit signature.
  sub.track(['sk1', 'sk2']);

  const updates = await updateP;
  expect(updates.map(u => u.key).sort()).toEqual(['sk1', 'sk2']);

  await disconnectClient(c);
}, 15000);

// 18. track with string keys without getSignature emits error.
test('track with string keys without getSignature emits error', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  // Create subscription WITHOUT getSignature callback.
  const sub = c.newSharedPollSubscription(ch, {});

  sub.subscribe();
  await sub.ready(5000);

  const errorP = new Promise<any>((resolve) => {
    sub.on('error', (ctx) => {
      if (ctx.type === 'track') resolve(ctx);
    });
  });

  // Call track(keys) without getSignature — should emit error.
  sub.track(['key1']);

  const errCtx = await errorP;
  expect(errCtx.error).toBeDefined();
  expect(errCtx.error.message).toContain('getSignature');

  await disconnectClient(c);
}, 15000);

// 19. track string keys — revoked key emits removal update.
test('track string keys - revoked key emits removal update', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    // getSignature that only authorizes 'allowed', not 'revoked'.
    getSignature: async (ctx: SharedPollSignatureContext) => {
      const authorizedKeys = ctx.keys.filter(k => k !== 'revoked');
      const signature = makeTrackSignature(pollSecret, ch, authorizedKeys, '');
      return { keys: authorizedKeys, signature };
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('allowed', { data: { v: 1 }, version: 1 });

  // Collect both: removal for 'revoked' and data update for 'allowed'.
  const allUpdates = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);

  sub.track(['allowed', 'revoked']);

  const updates = await allUpdates;
  const removal = updates.find(u => u.key === 'revoked');
  const dataUpdate = updates.find(u => u.key === 'allowed');

  expect(removal).toBeDefined();
  expect(removal!.removed).toBe(true);
  expect(removal!.data).toBeNull();

  expect(dataUpdate).toBeDefined();
  expect(dataUpdate!.version).toBe(1);
  expect(dataUpdate!.removed).toBeFalsy();

  // Verify 'revoked' is NOT in tracked items.
  expect(sub.trackedKeys().has('revoked')).toBe(false);
  expect(sub.trackedKeys().has('allowed')).toBe(true);

  await disconnectClient(c);
}, 15000);

// 20. track string keys before subscribe replays on connect.
test('track string keys before subscribe replays on connect', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  mockItems.set('earlyStr', { data: { v: 1 }, version: 1 });

  // Track string keys before subscribe/connect — stored locally.
  sub.track(['earlyStr']);
  expect(sub.trackedKeys().has('earlyStr')).toBe(true);

  // Now subscribe and connect — replay should send track via getSignature.
  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const ctx = await updateP;
  expect(ctx.key).toBe('earlyStr');
  expect(ctx.data).toEqual({ v: 1 });

  await disconnectClient(c);
}, 15000);

// 21. track items with signature still works (backwards compat).
test('track items with signature still works (backwards compat)', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('compat1', { data: { v: 1 }, version: 1 });

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');

  // Existing path: explicit items + signature.
  const sig = makeTrackSignature(pollSecret, ch, ['compat1'], '');
  sub.track([{ key: 'compat1', version: 0 }], sig);

  const ctx = await updateP;
  expect(ctx.key).toBe('compat1');
  expect(ctx.version).toBe(1);

  await disconnectClient(c);
}, 15000);

// 22. Multiple track() calls before subscribe — each batch's signature is
// cached in the library and replayed independently. getSignature is not
// called.
test('multiple track calls before subscribe replay all cached signatures', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '');
      return { keys: ctx.keys, signature };
    },
  });

  mockItems.set('batch1', { data: { v: 1 }, version: 1 });
  mockItems.set('batch2', { data: { v: 2 }, version: 1 });

  // Two track() calls with different key sets and different explicit
  // signatures before subscribe. Both go into the signature library and
  // both get replayed after subscribe completes.
  const sig1 = makeTrackSignature(pollSecret, ch, ['batch1'], '');
  sub.track([{ key: 'batch1', version: 0 }], sig1);

  const sig2 = makeTrackSignature(pollSecret, ch, ['batch2'], '');
  sub.track([{ key: 'batch2', version: 0 }], sig2);

  expect(sub.trackedKeys().size).toBe(2);

  const updateP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const updates = await updateP;
  const keys = updates.map(u => u.key).sort();
  expect(keys).toEqual(['batch1', 'batch2']);
  // Both batches had explicit signatures in the library — no getSignature.
  expect(getSignatureCalls).toBe(0);

  await disconnectClient(c);
}, 15000);

// 23. track() + untrack() before subscribe — replay sends the original batch
// (HMAC valid for the full key set) then chains an untrack for keys the user
// removed locally. No getSignature call required.
test('track then untrack before subscribe replays via chained untrack', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '');
      return { keys: ctx.keys, signature };
    },
  });

  mockItems.set('stay', { data: { v: 1 }, version: 1 });

  // Track two keys with signature, then untrack one.
  const sig = makeTrackSignature(pollSecret, ch, ['stay', 'gone'], '');
  sub.track([{ key: 'stay', version: 0 }, { key: 'gone', version: 0 }], sig);
  sub.untrack(['gone']);

  expect(sub.trackedKeys().size).toBe(1);
  expect(sub.trackedKeys().has('stay')).toBe(true);

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const ctx = await updateP;
  expect(ctx.key).toBe('stay');
  // SDK replayed the original signature batch with the full key set, then
  // chained untrack(['gone']) — no getSignature needed.
  expect(getSignatureCalls).toBe(0);

  await disconnectClient(c);
}, 15000);

// 24. Reconnect reuses cached signature without calling getSignature.
// Cached signatures are preserved across disconnects (cleared only on
// explicit unsubscribe) so mass-reconnect storms don't trigger mass
// getSignature calls on the application backend.
test('reconnect reuses cached signature without calling getSignature', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '');
      return { keys: ctx.keys, signature };
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('rk1', { data: { v: 1 }, version: 1 });

  const sig = makeTrackSignature(pollSecret, ch, ['rk1'], '');
  sub.track([{ key: 'rk1', version: 0 }], sig);

  // Wait for initial update.
  await waitForEvent<SharedPollUpdateContext>(sub, 'update');

  // getSignature should not have been called for the initial track
  // (explicit signature was provided while already subscribed).
  expect(getSignatureCalls).toBe(0);

  // Disconnect and reconnect.
  c.disconnect();
  await new Promise(resolve => setTimeout(resolve, 200));

  mockItems.set('rk1', { data: { v: 2 }, version: 2 });

  c.connect();
  await c.ready(5000);
  await sub.ready(5000);

  // After reconnect, replay must reuse the cached signature — no getSignature.
  const update = await waitForEvent<SharedPollUpdateContext>(sub, 'update');
  expect(update.key).toBe('rk1');
  expect(update.version).toBe(2);
  expect(getSignatureCalls).toBe(0);

  await disconnectClient(c);
}, 15000);

// 25. track(keys) without signature before subscribe — getSignature used on replay.
test('track without signature before subscribe uses getSignature', async () => {
  const c = createClient();
  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '');
      return { keys: ctx.keys, signature };
    },
  });

  mockItems.set('noSig1', { data: { v: 1 }, version: 1 });

  // Track with string keys (no explicit signature) before subscribe.
  sub.track(['noSig1']);

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.subscribe();
  c.connect();
  await sub.ready(5000);

  const ctx = await updateP;
  expect(ctx.key).toBe('noSig1');
  // No buffered signature → must call getSignature.
  expect(getSignatureCalls).toBe(1);

  await disconnectClient(c);
}, 15000);

// 26. Second client tracking same key gets initial data.
// Regression: when Client A already tracked the key (server has data),
// Client B tracking with version=0 must still receive the current state.
test('second client tracking same key gets initial data', async () => {
  const c1 = createClient();
  const c2 = createClient();
  c1.connect();
  await c1.ready(5000);

  const ch = uniqueChannel('poll');

  const sub1 = c1.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub1.subscribe();
  await sub1.ready(5000);

  mockItems.set('shared_key', { data: { flag: true }, version: 1 });

  // Client A tracks first — server creates entry.
  const sig1 = makeTrackSignature(pollSecret, ch, ['shared_key'], '');
  const update1P = waitForEvent<SharedPollUpdateContext>(sub1, 'update');
  sub1.track([{ key: 'shared_key', version: 0 }], sig1);
  const u1 = await update1P;
  expect(u1.key).toBe('shared_key');
  expect(u1.data).toEqual({ flag: true });

  // Client B connects and tracks the same key with version=0.
  // Key already exists on server (isNew=false) — Client B must still get data.
  c2.connect();
  await c2.ready(5000);

  const sub2 = c2.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub2.subscribe();
  await sub2.ready(5000);

  const update2P = waitForEvent<SharedPollUpdateContext>(sub2, 'update');
  const sig2 = makeTrackSignature(pollSecret, ch, ['shared_key'], '');
  sub2.track([{ key: 'shared_key', version: 0 }], sig2);

  const u2 = await update2P;
  expect(u2.key).toBe('shared_key');
  expect(u2.data).toEqual({ flag: true });

  await disconnectClient(c1);
  await disconnectClient(c2);
}, 15000);

// 27. Multiple clients tracking same keys — all get initial data.
// Three clients track the same two keys sequentially. Each must receive data
// even though the keys already exist on the server after the first client.
test('multiple clients all get initial data for same keys', async () => {
  const clients = [createClient(), createClient(), createClient()];
  for (const c of clients) { c.connect(); }
  for (const c of clients) { await c.ready(5000); }

  const ch = uniqueChannel('poll');

  mockItems.set('mk1', { data: { n: 1 }, version: 1 });
  mockItems.set('mk2', { data: { n: 2 }, version: 1 });

  const subs = clients.map(c => c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  }));
  for (const s of subs) { s.subscribe(); }
  for (const s of subs) { await s.ready(5000); }

  // Track sequentially with delays to ensure each client tracks after
  // the previous one already received data (key is not new).
  for (const sub of subs) {
    const updateP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);
    const sig = makeTrackSignature(pollSecret, ch, ['mk1', 'mk2'], '');
    sub.track([{ key: 'mk1', version: 0 }, { key: 'mk2', version: 0 }], sig);
    const updates = await updateP;
    const keys = updates.map(u => u.key).sort();
    expect(keys).toEqual(['mk1', 'mk2']);
    // Wait to ensure server has fully processed before next client tracks.
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  for (const c of clients) { await disconnectClient(c); }
}, 25000);

// 28. Versionless: synthetic version on wire.
test('versionless: synthetic version on wire', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('pollvl');
  mockItems.set('vl_key1', { data: { val: 'hello' }, version: 0 });

  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  sub.subscribe();
  await sub.ready(10000);
  await subscribedP;

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  const sig = makeTrackSignature(pollSecret, ch, ['vl_key1'], '');
  sub.track([{ key: 'vl_key1', version: 0 }], sig);

  const u = await updateP;
  expect(u.key).toBe('vl_key1');
  expect(u.data).toEqual({ val: 'hello' });
  // Synthetic version should be > 0, not 0.
  expect(u.version).toBeGreaterThan(0);

  await disconnectClient(c);
}, 15000);

// 29. Versionless: epoch stored internally on subscribe.
test('versionless: epoch stored internally on subscribe', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('pollvl');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(10000);

  // @ts-ignore – accessing private field for testing.
  const epoch = sub._sharedPollEpoch;
  expect(epoch).toBeDefined();
  expect(epoch).not.toBe('');
  expect(epoch.length).toBe(8);

  await disconnectClient(c);
}, 15000);

// 30. Versioned mode: empty epoch stored internally on subscribe.
test('versioned mode: empty epoch stored internally', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(10000);

  // @ts-ignore – accessing private field for testing.
  const epoch = sub._sharedPollEpoch;
  expect(epoch).toBe('');

  await disconnectClient(c);
}, 15000);

// 31. Versionless: version stored from publication.
test('versionless: version stored from publication', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('pollvl');
  mockItems.set('store_key', { data: { x: 1 }, version: 0 });

  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(10000);

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  const sig = makeTrackSignature(pollSecret, ch, ['store_key'], '');
  sub.track([{ key: 'store_key', version: 0 }], sig);

  const u = await updateP;
  expect(u.version).toBeGreaterThan(0);

  // The tracked items map should have the synthetic version stored.
  // @ts-ignore – accessing private field for testing.
  const storedVersion = sub._sharedPollTrackedItems.get('store_key');
  expect(storedVersion).toBe(u.version);

  await disconnectClient(c);
}, 15000);

// 32. getSignature rejection emits error with correct code.
test('getSignature rejection emits error with sharedPollGetSignature code', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async () => {
      throw new Error('signature service unavailable');
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  const errorP = new Promise<any>((resolve) => {
    sub.on('error', (ctx) => {
      if (ctx.type === 'track') resolve(ctx);
    });
  });

  // Track with string keys — triggers getSignature which rejects.
  sub.track(['fail_key']);

  const errCtx = await errorP;
  expect(errCtx.error).toBeDefined();
  expect(errCtx.error.code).toBe(errorCodes.sharedPollGetSignature);
  expect(errCtx.error.message).toContain('signature service unavailable');

  // Key should still be in tracked items (local state was set before getSignature).
  expect(sub.trackedKeys().has('fail_key')).toBe(true);

  await disconnectClient(c);
}, 15000);

// 33. signatureRefresh error on deferred-track replay carries sharedPollGetSignature code.
// Reconnects reuse cached signatures (no getSignature call), so this exercises
// the other path that calls getSignature inside _sharedPollReplayTrack: a
// track() issued before subscribe with no cached sig, where Phase 2 of the
// replay must obtain a signature for the deferred keys after subscribe.
test('signatureRefresh error on deferred-track replay uses sharedPollGetSignature code', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async () => {
      throw new Error('signature service unavailable on replay');
    },
  });

  // Track BEFORE subscribe with string keys — auto path, no cached signature.
  // The deferred getSignature call happens inside _sharedPollReplayTrack
  // after subscribe and emits a signatureRefresh error when it rejects.
  sub.track(['sr_key']);

  const errorP = new Promise<any>((resolve) => {
    sub.on('error', (ctx) => {
      if (ctx.type === 'signatureRefresh') resolve(ctx);
    });
  });

  sub.subscribe();

  const errCtx = await errorP;
  expect(errCtx.error.code).toBe(errorCodes.sharedPollGetSignature);
  expect(errCtx.error.message).toContain('signature service unavailable on replay');

  await disconnectClient(c);
}, 15000);

// ============ Signature Refresh Tests ============

// 34. TTL-driven refresh: a short-TTL signature triggers _sharedPollRefreshSignature
// after the TTL elapses, and getSignature is invoked with ALL tracked keys
// (consolidating refresh).
test('refresh: short TTL triggers consolidating getSignature call', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');

  // Capture the SECOND getSignature call (refresh) via a deferred promise.
  let captureRefreshCall!: (v: { keys: string[] }) => void;
  const refreshCallP = new Promise<{ keys: string[] }>(resolve => {
    captureRefreshCall = resolve;
  });

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      // First call: 6s TTL → refresh fires ~6s after track. Subsequent: long TTL.
      const ttl = getSignatureCalls === 1 ? 6 : 3600;
      const signature = makeTrackSignature(pollSecret, ch, ctx.keys, '', ttl);
      if (getSignatureCalls === 2) captureRefreshCall({ keys: ctx.keys });
      return { keys: ctx.keys, signature };
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('rk', { data: { v: 1 }, version: 1 });
  sub.track(['rk']);
  await waitForEvent<SharedPollUpdateContext>(sub, 'update');
  expect(getSignatureCalls).toBe(1);

  // Wait up to 10s for the refresh to fire.
  const refreshCtx = await Promise.race([
    refreshCallP,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('refresh did not fire in 10s')), 10000)
    ),
  ]);
  expect(refreshCtx.keys).toEqual(['rk']);
  expect(getSignatureCalls).toBe(2);

  await disconnectClient(c);
}, 20000);

// 35. 109 on a track command triggers a consolidating refresh.
// Use an expired explicit signature so the server rejects with ErrorTokenExpired.
test('refresh: 109 on track triggers consolidating getSignature call', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');

  // getSignature: returns a valid (long-TTL) sig when SDK refreshes after 109.
  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      return { keys: ctx.keys, signature: makeTrackSignature(pollSecret, ch, ctx.keys, '') };
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  // Inject an explicit signature whose expiry is past the server's 5s grace.
  mockItems.set('109_key', { data: { v: 1 }, version: 1 });
  const expiredSig = makeTrackSignature(pollSecret, ch, ['109_key'], '', -60);
  // Listen for the eventual update after refresh.
  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: '109_key', version: 0 }], expiredSig);

  // After server returns 109, SDK calls getSignature for a fresh consolidated
  // signature covering all tracked keys, then re-sends the track command.
  const ctx = await updateP;
  expect(ctx.key).toBe('109_key');
  expect(getSignatureCalls).toBe(1); // one consolidating refresh call

  await disconnectClient(c);
}, 15000);

// 36. Multiple concurrent 109 errors (e.g. multi-batch replay with all sigs expired)
// collapse into a SINGLE refresh — the in-flight guard prevents duplicate
// getSignature calls.
test('refresh: in-flight guard collapses concurrent 109s into one refresh', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');

  let getSignatureCalls = 0;
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => {
      getSignatureCalls++;
      // Slow getSignature so the in-flight window is large enough to see
      // duplicate-call attempts if the guard were broken.
      await new Promise(resolve => setTimeout(resolve, 100));
      return { keys: ctx.keys, signature: makeTrackSignature(pollSecret, ch, ctx.keys, '') };
    },
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('m1', { data: { v: 1 }, version: 1 });
  mockItems.set('m2', { data: { v: 2 }, version: 1 });
  mockItems.set('m3', { data: { v: 3 }, version: 1 });

  // Three separate track() calls each with an expired explicit signature.
  // Each will fail 109 server-side, and each failure routes to
  // _sharedPollRefreshSignature — but the in-flight guard collapses them.
  const updatesP = collectEvents<SharedPollUpdateContext>(sub, 'update', 3);
  sub.track([{ key: 'm1', version: 0 }], makeTrackSignature(pollSecret, ch, ['m1'], '', -60));
  sub.track([{ key: 'm2', version: 0 }], makeTrackSignature(pollSecret, ch, ['m2'], '', -60));
  sub.track([{ key: 'm3', version: 0 }], makeTrackSignature(pollSecret, ch, ['m3'], '', -60));

  await updatesP;
  // Exactly one consolidating getSignature call covered all three.
  expect(getSignatureCalls).toBe(1);

  await disconnectClient(c);
}, 15000);

// 37. Refresh consolidates the signature library into ONE entry covering all
// currently tracked keys (expired entries get replaced; the new sig covers
// everything).
test('refresh: consolidates library into a single entry', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => ({
      keys: ctx.keys,
      signature: makeTrackSignature(pollSecret, ch, ctx.keys, ''),
    }),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('lc1', { data: { v: 1 }, version: 1 });
  mockItems.set('lc2', { data: { v: 2 }, version: 1 });

  // Two explicit-sig track() calls → library has two entries.
  const u1 = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: 'lc1', version: 0 }], makeTrackSignature(pollSecret, ch, ['lc1'], ''));
  await u1;
  const u2 = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: 'lc2', version: 0 }], makeTrackSignature(pollSecret, ch, ['lc2'], ''));
  await u2;

  // @ts-ignore – private field access for assertion only.
  expect(sub._sharedPollSignatures.length).toBe(2);

  // Force a refresh by sending an expired sig — server returns 109,
  // _sharedPollRefreshSignature consolidates 'lc1' + 'lc2' into one entry.
  mockItems.set('lc3', { data: { v: 3 }, version: 1 });
  const u3 = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: 'lc3', version: 0 }], makeTrackSignature(pollSecret, ch, ['lc3'], '', -60));
  await u3;

  // After refresh: a single consolidated entry covers all three keys.
  // @ts-ignore – private field access for assertion only.
  expect(sub._sharedPollSignatures.length).toBe(1);
  // @ts-ignore – private field access for assertion only.
  expect(new Set(sub._sharedPollSignatures[0].keys))
    .toEqual(new Set(['lc1', 'lc2', 'lc3']));

  await disconnectClient(c);
}, 15000);

// 38. Refresh target tracks MIN ttl across multiple track responses.
// SDK schedules its refresh at the EARLIEST deadline received across all
// responses — refreshing slightly too early is harmless, too late risks 109.
test('refresh: target tracks MIN ttl across responses', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: makeGetSignature(pollSecret, ch),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('t1', { data: { v: 1 }, version: 1 });
  mockItems.set('t2', { data: { v: 2 }, version: 1 });

  // First track: long TTL.
  const u1 = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: 't1', version: 0 }], makeTrackSignature(pollSecret, ch, ['t1'], '', 3600));
  await u1;

  // @ts-ignore – private field access for assertion only.
  const targetAfterLong = sub._sharedPollSignatureRefreshTargetMs;
  expect(targetAfterLong).toBeGreaterThan(Date.now() + 3000 * 1000);

  // Second track: shorter TTL (~30s). Target should move EARLIER.
  const u2 = waitForEvent<SharedPollUpdateContext>(sub, 'update');
  sub.track([{ key: 't2', version: 0 }], makeTrackSignature(pollSecret, ch, ['t2'], '', 30));
  await u2;

  // @ts-ignore – private field access for assertion only.
  const targetAfterShort = sub._sharedPollSignatureRefreshTargetMs;
  expect(targetAfterShort).toBeLessThan(targetAfterLong);
  expect(targetAfterShort).toBeLessThan(Date.now() + 60 * 1000);

  await disconnectClient(c);
}, 15000);

// 39. Revoked keys trigger an explicit untrack to the server. Without it the
// server keeps broadcasting for revoked keys and the SDK silently drops them.
test('revoked keys send explicit untrack to server', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  // getSignature authorizes only "allowed" and revokes "revoked".
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx: SharedPollSignatureContext) => {
      const authorized = ctx.keys.filter(k => k !== 'revoked');
      return {
        keys: authorized,
        signature: makeTrackSignature(pollSecret, ch, authorized, ''),
      };
    },
  });

  // Spy on the wire-level untrack helper so we can observe which keys the
  // SDK sends to Centrifugo (versus only emitting a local removal update).
  const untrackCalls: string[][] = [];
  // @ts-ignore – overriding the internal helper for inspection.
  const originalSendUntrack = sub._sendUntrackRequest.bind(sub);
  // @ts-ignore – method shadow.
  sub._sendUntrackRequest = (keys: string[]) => {
    untrackCalls.push([...keys]);
    return originalSendUntrack(keys);
  };

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('allowed', { data: { v: 1 }, version: 1 });

  const updatesP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);
  sub.track(['allowed', 'revoked']);
  await updatesP;

  // SDK must have sent an untrack for "revoked" so the server stops tracking it.
  // Wait briefly for the async untrack to dispatch.
  await new Promise(resolve => setTimeout(resolve, 100));
  const allRevokedSent = untrackCalls.flat();
  expect(allRevokedSent).toContain('revoked');
  // And "allowed" must NOT have been untracked.
  expect(allRevokedSent).not.toContain('allowed');

  await disconnectClient(c);
}, 15000);

// 40. On reconnect, stale keys (locally untracked since the signature was
// obtained) are sent inline in the track replay frame instead of as a
// separate untrack round-trip.
test('inline untrack sent in replay frame on reconnect', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('poll');
  const sub = c.newSharedPollSubscription(ch, {});
  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('keyA', { data: { v: 1 }, version: 1 });
  mockItems.set('keyB', { data: { v: 2 }, version: 1 });

  // Track both keys with an explicit signature so they land in _sharedPollSignatures.
  const sig = makeTrackSignature(pollSecret, ch, ['keyA', 'keyB'], '', 3600);
  const updatesP = collectEvents<SharedPollUpdateContext>(sub, 'update', 2);
  sub.track([{ key: 'keyA', version: 0 }, { key: 'keyB', version: 0 }], sig);
  await updatesP;

  // Untrack keyB — removes from _sharedPollTrackedItems but the signature
  // entry in _sharedPollSignatures still carries both keys.
  sub.untrack(['keyB']);
  // Wait for the initial untrack RPC to dispatch before installing spies.
  await new Promise(resolve => setTimeout(resolve, 150));

  // Install spies AFTER the initial untrack has been dispatched so only
  // reconnect-replay calls are captured.
  const trackReqArgs: Array<{ untrackKeys: string[] | undefined }> = [];
  // @ts-ignore – private method override for inspection.
  const origSendTrack = sub._sendTrackRequest.bind(sub);
  // @ts-ignore – private method override for inspection.
  sub._sendTrackRequest = (batches: any[], untrackKeys?: string[]) => {
    trackReqArgs.push({ untrackKeys });
    return origSendTrack(batches, untrackKeys);
  };

  const sendUntrackCalls: string[][] = [];
  // @ts-ignore – access private method for spying.
  const origSendUntrack = sub._sendUntrackRequest.bind(sub);
  // @ts-ignore – private method override for inspection.
  sub._sendUntrackRequest = (keys: string[]) => {
    sendUntrackCalls.push([...keys]);
    return origSendUntrack(keys);
  };

  // Reconnect and wait for subscription to be ready again.
  c.disconnect();
  await new Promise(resolve => setTimeout(resolve, 200));
  c.connect();
  await c.ready(5000);
  await sub.ready(5000);
  // Give the replay RPC a moment to complete.
  await new Promise(resolve => setTimeout(resolve, 200));

  // The replay must have included keyB as an inline untrack — not as a
  // separate second frame.
  expect(trackReqArgs.length).toBeGreaterThanOrEqual(1);
  expect(trackReqArgs[0].untrackKeys).toEqual(['keyB']);
  // No standalone untrack for keyB must have been issued during replay.
  expect(sendUntrackCalls.flat()).not.toContain('keyB');

  await disconnectClient(c);
}, 15000);
