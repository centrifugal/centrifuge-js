import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  MapSyncContext,
  MapPublicationContext,
  PublicationContext,
  TransportName,
  ConnectedContext,
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

async function apiMapRemove(channel: string, key: string): Promise<void> {
  const resp = await fetch(`${apiBase}/map_remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ channel, key }),
  });
  if (!resp.ok) {
    throw new Error(`map_remove failed: ${resp.status} ${await resp.text()}`);
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
  // Give transport time to close cleanly.
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
  return `${ns}:test_${Date.now()}_${testCounter}`;
}

// 1. Subscribe to empty streamless map.
test('subscribe to empty streamless map', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');
  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');
  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');

  sub.subscribe();
  await sub.ready(5000);

  const subscribedCtx = await subscribedP;
  expect(subscribedCtx.channel).toBe(ch);
  // Empty map — no state entries.
  expect(subscribedCtx.state ?? []).toHaveLength(0);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(0);

  await disconnectClient(c);
});

// 2. Subscribe with pre-seeded state.
test('subscribe with pre-seeded state', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');

  // Seed 3 entries via API before subscribing.
  await apiMapPublish(ch, 'k1', { v: 1 });
  await apiMapPublish(ch, 'k2', { v: 2 });
  await apiMapPublish(ch, 'k3', { v: 3 });

  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');
  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');

  sub.subscribe();
  await sub.ready(5000);

  const subscribedCtx = await subscribedP;
  expect(subscribedCtx.state).toHaveLength(3);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(3);

  const keys = syncCtx.entries.map(e => e.key).sort();
  expect(keys).toEqual(['k1', 'k2', 'k3']);

  await disconnectClient(c);
});

// 3. Real-time publication after subscribe.
test('real-time publication after subscribe', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');
  const sub = c.newMapSubscription(ch);

  const updateP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish via API after subscribed.
  await apiMapPublish(ch, 'live_key', { hello: 'world' });

  const updateCtx = await updateP;
  expect(updateCtx.key).toBe('live_key');
  expect(updateCtx.data).toEqual({ hello: 'world' });
  expect(updateCtx.removed).toBeFalsy();

  await disconnectClient(c);
});

// 4. Real-time removal.
test('real-time removal', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');
  const sub = c.newMapSubscription(ch);

  const updates = collectEvents<MapPublicationContext>(sub, 'update', 2);

  sub.subscribe();
  await sub.ready(5000);

  await apiMapPublish(ch, 'rm_key', { temp: true });
  await apiMapRemove(ch, 'rm_key');

  const [addCtx, rmCtx] = await updates;
  expect(addCtx.key).toBe('rm_key');
  expect(addCtx.removed).toBeFalsy();
  expect(rmCtx.key).toBe('rm_key');
  expect(rmCtx.removed).toBe(true);

  await disconnectClient(c);
});

// 5. Client mapPublish and mapRemove.
test('client mapPublish and mapRemove', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');
  const sub = c.newMapSubscription(ch);

  const updates = collectEvents<MapPublicationContext>(sub, 'update', 2);

  sub.subscribe();
  await sub.ready(5000);

  await sub.mapPublish('ck1', { from: 'client' });
  await sub.mapRemove('ck1');

  const [addCtx, rmCtx] = await updates;
  expect(addCtx.key).toBe('ck1');
  expect(addCtx.data).toEqual({ from: 'client' });
  expect(rmCtx.key).toBe('ck1');
  expect(rmCtx.removed).toBe(true);

  await disconnectClient(c);
});

// 6. Subscribe to positioned (converging) map.
test('subscribe to positioned map', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('positioned');

  await apiMapPublish(ch, 'p1', { x: 1 });
  await apiMapPublish(ch, 'p2', { x: 2 });

  const sub = c.newMapSubscription(ch);

  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');

  sub.subscribe();
  await sub.ready(5000);

  const subscribedCtx = await subscribedP;
  expect(subscribedCtx.recoverable).toBe(true);
  expect(subscribedCtx.state).toHaveLength(2);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(2);

  await disconnectClient(c);
});

// 7. Pagination with small limit — all entries arrive in sync.
test('pagination with small limit', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');

  // Seed 5 entries.
  for (let i = 1; i <= 5; i++) {
    await apiMapPublish(ch, `page_${i}`, { i });
  }

  // Use limit=2 — server's map_pagination_min_limit is 1 so this is honoured.
  const sub = c.newMapSubscription(ch, { limit: 2 });

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');

  sub.subscribe();
  await sub.ready(5000);

  const syncCtx = await syncP;
  // SDK handles multi-page internally — all 5 entries should arrive.
  expect(syncCtx.entries).toHaveLength(5);

  const keys = syncCtx.entries.map(e => e.key).sort();
  expect(keys).toEqual(['page_1', 'page_2', 'page_3', 'page_4', 'page_5']);

  await disconnectClient(c);
});

// 8. Real-time updates arrive after pagination.
test('real-time updates arrive after pagination', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');

  // Seed entries so pagination actually happens.
  for (let i = 1; i <= 3; i++) {
    await apiMapPublish(ch, `pre_${i}`, { i });
  }

  const sub = c.newMapSubscription(ch, { limit: 2 });

  sub.subscribe();
  await sub.ready(5000);

  // Now publish a new entry — should arrive as update event.
  const updateP = waitForEvent<MapPublicationContext>(sub, 'update');
  await apiMapPublish(ch, 'late_key', { late: true });

  const updateCtx = await updateP;
  expect(updateCtx.key).toBe('late_key');
  expect(updateCtx.data).toEqual({ late: true });

  await disconnectClient(c);
});

// 9. Recovery after disconnect (positioned).
test('recovery after disconnect (positioned)', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('positioned');
  const sub = c.newMapSubscription(ch);

  // Register update listener BEFORE subscribing so we don't miss the event.
  const firstUpdateP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish an entry so the stream has data.
  await apiMapPublish(ch, 'before_disconnect', { v: 1 });

  // Wait for the update to confirm we're live.
  await firstUpdateP;

  // Now disconnect transport and seed more data.
  c.disconnect();

  await apiMapPublish(ch, 'during_disconnect', { v: 2 });

  // Reconnect — should recover.
  const resubscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  c.connect();
  await c.ready(5000);

  const resubCtx = await resubscribedP;
  expect(resubCtx.recovered).toBe(true);

  await disconnectClient(c);
});

// 10. Streamless resubscribe is full resync.
test('streamless resubscribe is full resync', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('streamless');

  // Seed data.
  await apiMapPublish(ch, 'persist', { v: 1 });

  const sub = c.newMapSubscription(ch);

  const subscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  sub.subscribe();
  await sub.ready(5000);

  const firstCtx = await subscribedP;
  expect(firstCtx.recoverable).toBe(false);

  // Disconnect and reconnect.
  c.disconnect();

  const resyncP = waitForEvent<MapSyncContext>(sub, 'sync');
  c.connect();
  await c.ready(5000);
  await sub.ready(5000);

  // Full resync — sync fires again.
  const syncCtx = await resyncP;
  expect(syncCtx.entries).toHaveLength(1);
  expect(syncCtx.entries[0].key).toBe('persist');

  await disconnectClient(c);
});

// 11. Two clients see same state.
test('two clients see same state', async () => {
  const cA = createClient();
  const cB = createClient();
  cA.connect();
  cB.connect();
  await cA.ready(5000);
  await cB.ready(5000);

  const ch = uniqueChannel('streamless');

  // ClientA subscribes and publishes.
  const subA = cA.newMapSubscription(ch);

  // Register update collector BEFORE subscribing so we don't miss events.
  const updatesAP = collectEvents<MapPublicationContext>(subA, 'update', 2);

  subA.subscribe();
  await subA.ready(5000);

  await subA.mapPublish('shared_1', { from: 'A' });
  await subA.mapPublish('shared_2', { from: 'A' });

  // Wait for clientA to see both entries.
  await updatesAP;

  // ClientB subscribes — should see the same entries.
  const subB = cB.newMapSubscription(ch);
  const syncBP = waitForEvent<MapSyncContext>(subB, 'sync');

  subB.subscribe();
  await subB.ready(5000);

  const syncBCtx = await syncBP;
  expect(syncBCtx.entries).toHaveLength(2);

  const keys = syncBCtx.entries.map(e => e.key).sort();
  expect(keys).toEqual(['shared_1', 'shared_2']);

  // ClientA publishes more — both see it.
  const updateAP = waitForEvent<MapPublicationContext>(subA, 'update');
  const updateBP = waitForEvent<MapPublicationContext>(subB, 'update');

  await subA.mapPublish('shared_3', { from: 'A_more' });

  const [uA, uB] = await Promise.all([updateAP, updateBP]);
  expect(uA.key).toBe('shared_3');
  expect(uB.key).toBe('shared_3');

  await disconnectClient(cA);
  await disconnectClient(cB);
});

// 12. map_client_key override.
test('map_client_key override', async () => {
  const c = createClient();

  // Capture connected event before connecting to get client ID.
  const connP = waitForEvent<ConnectedContext>(c, 'connected');
  c.connect();
  const connCtx = await connP;
  const clientId = connCtx.client;

  const ch = uniqueChannel('clientkey');
  const sub = c.newMapSubscription(ch);

  const updateP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish with arbitrary key — server should override to client ID.
  await sub.mapPublish('arbitrary_key', { test: true });

  const updateCtx = await updateP;
  expect(updateCtx.key).toBe(clientId);

  await disconnectClient(c);
});

// 13. Subscription-level recovery (unsubscribe/subscribe).
test('recovery after unsubscribe and resubscribe (positioned)', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('positioned');
  const sub = c.newMapSubscription(ch);

  const firstUpdateP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish an entry and confirm we're live.
  await apiMapPublish(ch, 'before', { v: 1 });
  await firstUpdateP;

  // Unsubscribe (keeps stream position in SDK).
  sub.unsubscribe();

  // Publish more while unsubscribed.
  await apiMapPublish(ch, 'missed_1', { v: 2 });
  await apiMapPublish(ch, 'missed_2', { v: 3 });

  // Resubscribe — SDK should attempt recovery from last known position.
  const resubscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const pubsP = collectEvents<PublicationContext>(sub, 'publication', 2);

  sub.subscribe();
  await sub.ready(5000);

  const resubCtx = await resubscribedP;
  expect(resubCtx.recovered).toBe(true);

  // Missed publications should arrive.
  const pubs = await pubsP;
  expect(pubs).toHaveLength(2);

  await disconnectClient(c);
}, 10000);

// 14. Unrecoverable position triggers from-scratch recovery.
test('unrecoverable position recovers from scratch (smallstream)', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('smallstream');
  const sub = c.newMapSubscription(ch);

  const firstUpdateP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish initial entry and wait for it.
  await apiMapPublish(ch, 'initial', { v: 0 });
  await firstUpdateP;

  // Unsubscribe, then overflow the stream (stream size is 2).
  sub.unsubscribe();

  // Publish enough entries to push the stream beyond recovery.
  for (let i = 1; i <= 5; i++) {
    await apiMapPublish(ch, `overflow_${i}`, { v: i });
  }

  // Resubscribe — server returns code 112 (unrecoverable position),
  // SDK restarts from state phase with from_scratch strategy (default).
  const resubscribedP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');

  sub.subscribe();
  await sub.ready(10000);

  const resubCtx = await resubscribedP;
  // Recovery was attempted but failed — recovered should be false.
  expect(resubCtx.recovered).toBe(false);

  // But we should have proper state from the state phase.
  const syncCtx = await syncP;
  // All 6 entries should be present (initial + 5 overflow).
  expect(syncCtx.entries).toHaveLength(6);

  const keys = syncCtx.entries.map(e => e.key).sort();
  expect(keys).toEqual(['initial', 'overflow_1', 'overflow_2', 'overflow_3', 'overflow_4', 'overflow_5']);

  await disconnectClient(c);
}, 15000);

// 15. Map client presence: add/remove tracked via presence channel.
test('map client presence: add and remove events', async () => {
  const cA = createClient();
  const cB = createClient();

  const connAP = waitForEvent<ConnectedContext>(cA, 'connected');
  const connBP = waitForEvent<ConnectedContext>(cB, 'connected');
  cA.connect();
  cB.connect();
  const connACtx = await connAP;
  const connBCtx = await connBP;
  const clientIdA = connACtx.client;
  const clientIdB = connBCtx.client;

  const ch = uniqueChannel('prestest');
  // Presence channel: prescli:{channel_rest} where channel_rest = full original channel.
  const presenceCh = 'prescli:' + ch;

  // cA subscribes to presence channel first — should see empty state.
  const presSub = cA.newMapClientsSubscription(presenceCh);
  const syncP = waitForEvent<MapSyncContext>(presSub, 'sync');
  presSub.subscribe();
  await presSub.ready(5000);

  const syncCtx = await syncP;
  expect(syncCtx.entries).toHaveLength(0);

  // cA subscribes to main channel → presence add for cA.
  const addAP = waitForEvent<MapPublicationContext>(presSub, 'update');
  const mainSubA = cA.newMapSubscription(ch);
  mainSubA.subscribe();
  await mainSubA.ready(5000);

  const addACtx = await addAP;
  expect(addACtx.key).toBe(clientIdA);
  expect(addACtx.removed).toBeFalsy();

  // cB subscribes to main channel → presence add for cB.
  const addBP = waitForEvent<MapPublicationContext>(presSub, 'update');
  const mainSubB = cB.newMapSubscription(ch);
  mainSubB.subscribe();
  await mainSubB.ready(5000);

  const addBCtx = await addBP;
  expect(addBCtx.key).toBe(clientIdB);
  expect(addBCtx.removed).toBeFalsy();

  // cB unsubscribes from main channel → presence removal for cB.
  const removeBP = waitForEvent<MapPublicationContext>(presSub, 'update');
  mainSubB.unsubscribe();

  const removeBCtx = await removeBP;
  expect(removeBCtx.key).toBe(clientIdB);
  expect(removeBCtx.removed).toBe(true);

  // cA unsubscribes from main channel → presence removal for cA.
  const removeAP = waitForEvent<MapPublicationContext>(presSub, 'update');
  mainSubA.unsubscribe();

  const removeACtx = await removeAP;
  expect(removeACtx.key).toBe(clientIdA);
  expect(removeACtx.removed).toBe(true);

  // Verify final state is empty — new client subscribes to presence channel.
  const cC = createClient();
  cC.connect();
  await cC.ready(5000);

  const finalPresSub = cC.newMapClientsSubscription(presenceCh);
  const finalSyncP = waitForEvent<MapSyncContext>(finalPresSub, 'sync');
  finalPresSub.subscribe();
  await finalPresSub.ready(5000);

  const finalSyncCtx = await finalSyncP;
  expect(finalSyncCtx.entries).toHaveLength(0);

  await disconnectClient(cA);
  await disconnectClient(cB);
  await disconnectClient(cC);
});
