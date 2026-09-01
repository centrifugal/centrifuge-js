import { Centrifuge } from './centrifuge';
import { SubscribedContext, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// Regression guard: a pending publish-debounce timer must not survive a
// disconnect/reconnect. Otherwise a stray publish for stale data fires after
// the subscription has already left the Subscribed state.

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

describe('publish debounce across reconnect', () => {
  let server: FakeCentrifugoServer;
  let c: Centrifuge;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    // Negotiate a short publish debounce on every subscribe reply.
    server.onSubscribe = () => ({ publish_debounce: 30 } as any);
  });

  afterEach(async () => {
    c?.disconnect();
    await server.close();
  });

  test('pending debounced publish is cancelled on reconnect, not sent later', async () => {
    c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('debounced');
    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise;

    // First publish goes through immediately and starts the debounce timer.
    await sub.publish({ x: 1 });
    // Second publish while the timer is pending — coalesced, not sent yet.
    sub.publish({ x: 2 });

    // Reconnect before the debounce timer fires — this must cancel the
    // pending timer, not just let it fire later against a stale state.
    const resubscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    server.closeConnection();
    await resubscribedPromise;

    // Give the original debounce timer (30ms) plenty of time to have fired
    // if it survived the reconnect.
    await delay(150);

    const publishCommands = server.received.filter(cmd => cmd.publish !== undefined);
    expect(publishCommands).toHaveLength(1);
    expect(publishCommands[0].publish.data).toEqual({ x: 1 });
  });
});
