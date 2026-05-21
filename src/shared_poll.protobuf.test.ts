import { Centrifuge } from './protobuf';
import {
  SharedPollUpdateContext,
  TransportName,
} from './types';

import WebSocket from 'ws';
import { fetch } from 'undici';
import * as http from 'http';
import * as crypto from 'crypto';

const pollSecret = 'test-poll-secret';
const mockBackendPort = 3011; // Distinct from the JSON shared_poll test (3010).

// ---- Mock refresh backend (mirrors shared_poll.test.ts, separate port) ----

interface MockItem {
  data: any;
  version: number;
  removed?: boolean;
}

const mockItems: Map<string, MockItem> = new Map();
let mockServer: http.Server;

function startMockBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
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
          const responseItems: any[] = [];
          for (const item of (parsed.items || [])) {
            const stored = mockItems.get(item.key);
            if (stored) {
              const ri: any = {
                key: item.key,
                data: stored.data,
                version: stored.version,
              };
              if (stored.removed) ri.removed = true;
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
    mockServer.on('error', reject);
    mockServer.listen(mockBackendPort, () => resolve());
  });
}

function stopMockBackend(): Promise<void> {
  return new Promise((resolve) => {
    if (mockServer) mockServer.close(() => resolve());
    else resolve();
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
  // Payload fields are NUL-separated to match the server-side verifier.
  const payload = `${now}\x00${expiry}\x00${user}\x00${channel}\x00${keysHash}`;
  const hmac = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `${now}:${expiry}:${hmac}`;
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

let testCounter = 0;
function uniqueChannel(ns: string): string {
  testCounter++;
  return `${ns}:pb_test_${Date.now()}_${testCounter}`;
}

// Helper: decode Uint8Array to parsed JSON for assertions (data arrives as
// binary under the Protobuf codec when the namespace's publication format
// is the default `json_payload` — same as the existing map.protobuf tests).
function decodeData(data: any): any {
  if (data instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(data));
  }
  return data;
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
});

// ─── Protobuf shared poll tests ──────────────────────────────────────────────

test('protobuf shared poll: subscribe, track, receive update', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('pollpb');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => ({
      keys: ctx.keys,
      signature: makeTrackSignature(pollSecret, ch, ctx.keys, ''),
    }),
  });

  const updateP = waitForEvent<SharedPollUpdateContext>(sub, 'update');

  sub.subscribe();
  await sub.ready(5000);

  // Seed mock backend with an item that the next poll cycle will return.
  mockItems.set('pb_key', { data: { greeting: 'hello protobuf' }, version: 1 });
  sub.track(['pb_key']);

  const updateCtx = await updateP;
  expect(updateCtx.key).toBe('pb_key');
  expect(updateCtx.removed).toBeFalsy();
  // Protobuf encodes uint64 as a Long object under protobufjs; coerce to number
  // for comparison. The JSON test (`shared_poll.test.ts`) uses `.toBe(N)` directly
  // because JSON gives plain numbers.
  expect(Number(updateCtx.version)).toBe(1);
  expect(decodeData(updateCtx.data)).toEqual({ greeting: 'hello protobuf' });

  await disconnectClient(c);
}, 15000);

test('protobuf shared poll: removed item delivered as removed update', async () => {
  const c = createClient();
  c.connect();
  await c.ready(5000);

  const ch = uniqueChannel('pollpb');
  const sub = c.newSharedPollSubscription(ch, {
    getSignature: async (ctx) => ({
      keys: ctx.keys,
      signature: makeTrackSignature(pollSecret, ch, ctx.keys, ''),
    }),
  });

  sub.subscribe();
  await sub.ready(5000);

  mockItems.set('rm_key', { data: { v: 1 }, version: 1 });
  sub.track(['rm_key']);

  // Wait for the initial update so the client knows version=1.
  const firstUpdate = await waitForEvent<SharedPollUpdateContext>(sub, 'update');
  expect(firstUpdate.removed).toBeFalsy();

  // Flip to removed on the backend; next poll cycle should deliver the removal.
  const removalP = new Promise<SharedPollUpdateContext>((resolve) => {
    sub.on('update', (ctx) => {
      if (ctx.removed) resolve(ctx);
    });
  });
  mockItems.set('rm_key', { data: { v: 1 }, version: 2, removed: true });

  const rmCtx = await removalP;
  expect(rmCtx.key).toBe('rm_key');
  expect(rmCtx.removed).toBe(true);

  await disconnectClient(c);
}, 15000);
