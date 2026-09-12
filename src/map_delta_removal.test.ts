import { Centrifuge } from './centrifuge';
import { MapSyncContext, MapUpdateContext, TransportName } from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';

// A key removal on a map subscription with delta must not break the client: the
// JSON codec used to parse the removal's empty payload and throw, after which the
// client processed no further messages at all.

const apiBase = 'http://localhost:8000/api';

async function api(method: string, params: any): Promise<void> {
  const resp = await fetch(`${apiBase}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-api-key' },
    body: JSON.stringify(params),
  });
  const body = await resp.json() as any;
  if (!resp.ok || body.error) {
    throw new Error(`${method} failed: ${resp.status} ${JSON.stringify(body)}`);
  }
}

const mapPublish = (channel: string, key: string, data: any) => api('map_publish', { channel, key, data });
const mapRemove = (channel: string, key: string) => api('map_remove', { channel, key });

function createClient(): Centrifuge {
  return new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
  });
}

function waitFor(check: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (check()) {
        resolve();
      } else if (Date.now() - started > timeout) {
        reject(new Error('timeout'));
      } else {
        setTimeout(tick, 10);
      }
    };
    tick();
  });
}

let counter = 0;
const uniqueChannel = () => `mapdelta:removal_${Date.now()}_${++counter}`;
const padding = 'x'.repeat(300);

// Local map state kept from sync and update events, as an app would.
function trackState(sub: any) {
  const state = new Map<string, any>();
  sub.on('sync', (ctx: MapSyncContext) => {
    state.clear();
    for (const entry of ctx.entries) {
      state.set(entry.key, entry.data);
    }
  });
  sub.on('update', (ctx: MapUpdateContext) => {
    if (ctx.removed) {
      state.delete(ctx.key);
    } else {
      state.set(ctx.key, ctx.data);
    }
  });
  return state;
}

test('json map delta: a live key removal keeps the subscription working', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel();
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });
  const updates: MapUpdateContext[] = [];
  sub.on('update', ctx => updates.push(ctx));
  sub.subscribe();
  await sub.ready(5000);

  await mapPublish(ch, 'k1', { v: 1, padding });
  await mapPublish(ch, 'k1', { v: 2, padding });
  await mapRemove(ch, 'k1');
  await mapPublish(ch, 'k2', { v: 1, padding });

  await waitFor(() => updates.length === 4);
  expect(updates.map(u => [u.key, !!u.removed])).toEqual([['k1', false], ['k1', false], ['k1', true], ['k2', false]]);
  expect(updates[1].data).toEqual({ v: 2, padding });
  expect(updates[3].data).toEqual({ v: 1, padding });

  c.disconnect();
});

test('json map delta: a removal received after reconnecting keeps the subscription working', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel();
  const sub = c.newMapSubscription(ch, { delta: 'fossil' });
  const state = trackState(sub);
  sub.subscribe();
  await sub.ready(5000);

  await mapPublish(ch, 'k1', { v: 1, padding });
  await waitFor(() => state.has('k1'));

  // Changes made while the client is away, including a removal.
  c.disconnect();
  await mapPublish(ch, 'k1', { v: 2, padding });
  await mapRemove(ch, 'k1');
  await mapPublish(ch, 'k2', { v: 1, padding });

  c.connect();
  await sub.ready(5000);
  await waitFor(() => !state.has('k1') && state.has('k2'));

  // The client still processes new messages.
  await mapPublish(ch, 'k3', { v: 1, padding });
  await waitFor(() => state.has('k3'));
  expect(state.get('k2')).toEqual({ v: 1, padding });
  expect(state.get('k3')).toEqual({ v: 1, padding });

  c.disconnect();
});
