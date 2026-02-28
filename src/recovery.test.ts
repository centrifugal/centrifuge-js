import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  PublicationContext,
  MapPublicationContext,
  TransportName,
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
  return `${ns}:recovery_test_${Date.now()}_${testCounter}`;
}

// ─── Stream subscription recovery tests ───────────────────────────────────

test('stream: recovery after disconnect delivers missed publications', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('recovery');
  const sub = c.newSubscription(ch);

  const firstPubP = waitForEvent<PublicationContext>(sub, 'publication');

  sub.subscribe();
  await sub.ready(5000);

  // Publish first message and confirm live delivery.
  await apiPublish(ch, { seq: 1, msg: 'before disconnect' });
  const first = await firstPubP;
  expect(first.data).toEqual({ seq: 1, msg: 'before disconnect' });

  // Disconnect.
  c.disconnect();

  // Publish while disconnected — these should be recovered.
  await apiPublish(ch, { seq: 2, msg: 'missed one' });
  await apiPublish(ch, { seq: 3, msg: 'missed two' });
  await apiPublish(ch, { seq: 4, msg: 'missed three' });

  // Set up listeners before reconnect.
  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const recoveredPubs = collectEvents<PublicationContext>(sub, 'publication', 3);

  c.connect();
  await c.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);
  expect(resubCtx.wasRecovering).toBe(true);

  const pubs = await recoveredPubs;
  expect(pubs[0].data).toEqual({ seq: 2, msg: 'missed one' });
  expect(pubs[1].data).toEqual({ seq: 3, msg: 'missed two' });
  expect(pubs[2].data).toEqual({ seq: 4, msg: 'missed three' });

  // Verify live delivery still works after recovery.
  const livePubP = waitForEvent<PublicationContext>(sub, 'publication');
  await apiPublish(ch, { seq: 5, msg: 'after recovery' });
  const live = await livePubP;
  expect(live.data).toEqual({ seq: 5, msg: 'after recovery' });

  await disconnectClient(c);
});

test('stream: recovery after unsubscribe/resubscribe', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('recovery');
  const sub = c.newSubscription(ch);

  const firstPubP = waitForEvent<PublicationContext>(sub, 'publication');

  sub.subscribe();
  await sub.ready(5000);

  await apiPublish(ch, { seq: 1, msg: 'initial' });
  await firstPubP;

  // Unsubscribe — position is saved internally.
  sub.unsubscribe();

  // Publish while unsubscribed.
  await apiPublish(ch, { seq: 2, msg: 'while away' });
  await apiPublish(ch, { seq: 3, msg: 'still away' });

  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');
  const recoveredPubs = collectEvents<PublicationContext>(sub, 'publication', 2);

  sub.subscribe();
  await sub.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.recovered).toBe(true);

  const pubs = await recoveredPubs;
  expect(pubs[0].data).toEqual({ seq: 2, msg: 'while away' });
  expect(pubs[1].data).toEqual({ seq: 3, msg: 'still away' });

  await disconnectClient(c);
});

// ─── Unrecoverable position for streams ───────────────────────────────────

test('stream: unrecoverable position resubscribes without recovery', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('smallhistory');
  const sub = c.newSubscription(ch);

  const firstPubP = waitForEvent<PublicationContext>(sub, 'publication');

  sub.subscribe();
  await sub.ready(5000);

  // Publish first message to establish position.
  await apiPublish(ch, { seq: 1 });
  await firstPubP;

  // Unsubscribe.
  sub.unsubscribe();

  // Publish enough to overflow history (size=2).
  await apiPublish(ch, { seq: 2 });
  await apiPublish(ch, { seq: 3 });
  await apiPublish(ch, { seq: 4 });
  await apiPublish(ch, { seq: 5 });

  // Resubscribe — recovery should fail because position is lost.
  const resubP = waitForEvent<SubscribedContext>(sub, 'subscribed');

  sub.subscribe();
  await sub.ready(5000);

  const resubCtx = await resubP;
  expect(resubCtx.wasRecovering).toBe(true);
  expect(resubCtx.recovered).toBe(false);

  // Verify live delivery still works after failed recovery.
  const livePubP = waitForEvent<PublicationContext>(sub, 'publication');
  await apiPublish(ch, { seq: 6 });
  const live = await livePubP;
  expect(live.data).toEqual({ seq: 6 });

  await disconnectClient(c);
});

// ─── Map key TTL automatic removal ───────────────────────────────────────

test('map: key removed automatically after TTL expires', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('shortttl');
  const sub = c.newMapSubscription(ch);

  const addP = waitForEvent<MapPublicationContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Publish a key — TTL starts (3 seconds).
  await apiMapPublish(ch, 'ephemeral', { value: 'will expire' });

  const addCtx = await addP;
  expect(addCtx.key).toBe('ephemeral');
  expect(addCtx.removed).toBeFalsy();
  expect(addCtx.data).toEqual({ value: 'will expire' });

  // Wait for TTL to expire + cleanup worker to run.
  const removalP = waitForEvent<MapPublicationContext>(sub, 'update', 10000);
  const removalCtx = await removalP;
  expect(removalCtx.key).toBe('ephemeral');
  expect(removalCtx.removed).toBe(true);

  await disconnectClient(c);
}, 15000);
