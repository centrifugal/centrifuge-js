/**
 * Publish debounce tests — requires Centrifugo PRO with client_publish_debounce_interval configured.
 *
 * Not included in default test runs. Run explicitly:
 *   DEBOUNCE=1 npx jest --testPathPattern=debounce
 */

import { Centrifuge } from './centrifuge';
import {
  TransportName,
  MapSyncContext,
} from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';

const runDebounceTests = process.env.DEBOUNCE === '1';
const testFn = runDebounceTests ? test : test.skip;

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

let testCounter = 0;
function uniqueChannel(ns: string): string {
  testCounter++;
  return `${ns}:debounce_test_${Date.now()}_${testCounter}`;
}

testFn('map publish debounce — first publish immediate, subsequent coalesced', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('debounced');
  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');
  sub.subscribe();
  await sub.ready(5000);
  await syncP;

  // First publish — should go through immediately.
  await sub.publish('cursor', { x: 1, y: 1 });

  // Rapid subsequent publishes — should be held locally by SDK.
  const p2 = sub.publish('cursor', { x: 2, y: 2 });
  const p3 = sub.publish('cursor', { x: 3, y: 3 });
  const p4 = sub.publish('cursor', { x: 4, y: 4 });

  // These resolve immediately (debounced locally).
  await p2;
  await p3;
  await p4;

  // Wait for debounce timer to fire + delivery.
  await new Promise(resolve => setTimeout(resolve, 200));

  // Subscribe a second client to see what actually arrived at the server.
  const c2 = createClient();
  c2.connect();
  await c2.ready(5000);

  const sub2 = c2.newMapSubscription(ch);
  const sync2P = waitForEvent<MapSyncContext>(sub2, 'sync');
  sub2.subscribe();
  await sub2.ready(5000);
  const sync2 = await sync2P;

  // State should have the cursor key with the LATEST value (x:4, y:4),
  // not intermediate values.
  const cursorEntry = sync2.entries.find(e => e.key === 'cursor');
  expect(cursorEntry).toBeDefined();
  expect(cursorEntry!.data).toEqual({ x: 4, y: 4 });

  await disconnectClient(c);
  await disconnectClient(c2);
}, 15000);

testFn('debounce — multiple rapid publishes coalesce to latest value', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('debounced');
  const sub = c.newMapSubscription(ch);

  const syncP = waitForEvent<MapSyncContext>(sub, 'sync');
  sub.subscribe();
  await sub.ready(5000);
  await syncP;

  // First publish — goes through immediately.
  await sub.publish('cursor', { x: 0 });

  // Rapid publishes — should be coalesced by SDK debounce.
  // Use a loop to simulate high-frequency updates (e.g., mousemove).
  for (let i = 1; i <= 20; i++) {
    sub.publish('cursor', { x: i });
  }

  // Wait for debounce to flush.
  await new Promise(resolve => setTimeout(resolve, 200));

  // Check state — should have the latest value, not intermediate ones.
  const c2 = createClient();
  c2.connect();
  await c2.ready(5000);

  const sub2 = c2.newMapSubscription(ch);
  const sync2P = waitForEvent<MapSyncContext>(sub2, 'sync');
  sub2.subscribe();
  await sub2.ready(5000);
  const sync2 = await sync2P;

  const entry = sync2.entries.find(e => e.key === 'cursor');
  expect(entry).toBeDefined();
  // Should be the latest value (x: 20), not any intermediate.
  expect(entry!.data.x).toBe(20);

  await disconnectClient(c);
  await disconnectClient(c2);
}, 15000);
