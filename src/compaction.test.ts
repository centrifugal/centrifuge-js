import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  PublicationContext,
  JoinContext,
  LeaveContext,
  UnsubscribedContext,
  TransportName,
} from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// Channel compaction is a Centrifugo PRO feature, so it can't be exercised
// against the OSS docker-compose server used by the other test suites. These
// tests use the in-process FakeCentrifugoServer: the subscribe reply negotiates
// a numeric channel ID and subsequent pushes carry the ID instead of the channel
// name, exactly like the real server does when channel compaction is enabled.

function createClient(url: string): Centrifuge {
  return new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: url,
  }], {
    websocket: WebSocket,
    minReconnectDelay: 10,
    maxReconnectDelay: 50,
  });
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

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

describe('channel compaction', () => {
  let server: FakeCentrifugoServer;
  let channelId: number;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    channelId = 42;
    // Negotiate channel compaction: assign a numeric channel id whenever the
    // client offers the channelCompaction flag (bit 1).
    server.onSubscribe = (_channel, req) => ((req.flag & 1) ? { id: channelId } : {});
  });

  afterEach(async () => {
    await server.close();
  });

  test('subscribe offers compaction flag and pushes are routed by numeric id', async () => {
    const c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('compacted');
    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    const pubPromise = waitForEvent<PublicationContext>(sub, 'publication');
    const joinPromise = waitForEvent<JoinContext>(sub, 'join');
    const leavePromise = waitForEvent<LeaveContext>(sub, 'leave');
    sub.subscribe();

    await subscribedPromise;
    expect(server.lastSubscribe.flag & 1).toBe(1);

    server.publish(42, { compacted: true });
    expect((await pubPromise).data).toEqual({ compacted: true });

    server.join(42, { client: 'joiner' });
    expect((await joinPromise).info.client).toBe('joiner');

    server.leave(42, { client: 'leaver' });
    expect((await leavePromise).info.client).toBe('leaver');

    c.disconnect();
  });

  test('push with unknown id is dropped and does not affect known routing', async () => {
    const c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('compacted');
    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    const received: PublicationContext[] = [];
    sub.on('publication', ctx => { received.push(ctx); });
    sub.subscribe();
    await subscribedPromise;

    server.publish(99, { stray: true }); // unknown id — must be dropped (not crash)
    server.publish(42, { ok: true });    // known id

    await waitForEvent<PublicationContext>(sub, 'publication');
    await delay(100); // give a stray delivery a chance to (wrongly) arrive
    expect(received).toHaveLength(1);
    expect(received[0].data).toEqual({ ok: true });

    c.disconnect();
  });

  test('id mapping is dropped on unsubscribe and refreshed on resubscribe', async () => {
    const c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('compacted');
    const received: PublicationContext[] = [];
    sub.on('publication', ctx => { received.push(ctx); });

    let subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise;

    const unsubscribedPromise = waitForEvent<UnsubscribedContext>(sub, 'unsubscribed');
    sub.unsubscribe();
    await unsubscribedPromise;

    // Old ID must no longer route to the unsubscribed subscription.
    server.publish(42, { stale: true });

    // Resubscribe — the server assigns a fresh ID.
    channelId = 43;
    subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise;

    server.publish(43, { fresh: true });
    await waitForEvent<PublicationContext>(sub, 'publication');
    await delay(100);
    expect(received).toHaveLength(1);
    expect(received[0].data).toEqual({ fresh: true });

    c.disconnect();
  });

  test('same id is re-registered after reconnect', async () => {
    // Regression guard (found in the dart port): the client drops the ID
    // registry on teardown (IDs are server-session-scoped), and on reconnect the
    // server commonly assigns the SAME ID again. The subscription must
    // re-register it even though its own remembered ID is unchanged.
    const c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('compacted');
    const received: PublicationContext[] = [];
    sub.on('publication', ctx => { received.push(ctx); });

    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise;

    // Server closes the connection — the client auto-reconnects and the
    // subscription resubscribes, getting the SAME channel id 42 from the fake.
    const resubscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    server.closeConnection();
    await resubscribedPromise;

    server.publish(42, { afterReconnect: true });
    await waitForEvent<PublicationContext>(sub, 'publication');
    expect(received[received.length - 1].data).toEqual({ afterReconnect: true });

    c.disconnect();
  });
});
