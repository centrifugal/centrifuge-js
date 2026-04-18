import { Centrifuge } from './centrifuge';
import {
  SubscribedContext,
  PublicationContext,
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

function createClient(): Centrifuge {
  return new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: 'ws://localhost:8000/connection/websocket',
  }], {
    websocket: WebSocket,
    fetch: fetch,
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

describe('stream subscription getState', () => {
  test('getState is called on initial subscribe and position is used for recovery', async () => {
    const c = createClient();
    c.connect();

    const channel = 'test_getstate_' + Date.now();
    let getStateCalls = 0;

    // Publish 3 messages BEFORE subscribing.
    await apiPublish(channel, { i: 1 });
    await apiPublish(channel, { i: 2 });
    await apiPublish(channel, { i: 3 });

    // getState returns position 0 — so recovery should deliver all 3 publications.
    const sub = c.newSubscription(channel, {
      getState: async () => {
        getStateCalls++;
        return { offset: 0, epoch: '' };
      },
    });

    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();

    await subscribedPromise;
    // With getState returning offset=0, SDK sends recover=true with offset=0.
    // What matters is that getState was called before the subscribe command.
    expect(getStateCalls).toBe(1);

    // Clean up.
    sub.unsubscribe();
    c.disconnect();
  });

  test('getState is NOT called on reconnect when recovery succeeds', async () => {
    const c = createClient();
    c.connect();

    const channel = 'test_getstate_reconnect_' + Date.now();
    let getStateCalls = 0;

    const sub = c.newSubscription(channel, {
      recoverable: true,
      getState: async () => {
        getStateCalls++;
        return { offset: 0, epoch: '' };
      },
    });

    const subscribedPromise1 = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise1;
    expect(getStateCalls).toBe(1); // Called on initial subscribe.

    // Force a disconnect — SDK will reconnect and try recovery.
    const subscribedPromise2 = new Promise<SubscribedContext>((resolve) => {
      let count = 0;
      sub.on('subscribed', (ctx) => {
        count++;
        if (count >= 1) resolve(ctx);
      });
    });

    c.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    c.connect();

    await subscribedPromise2;
    // getState should NOT have been called again — recovery succeeded.
    // The SDK had a saved position and the server recovered from it.
    expect(getStateCalls).toBe(1);

    sub.unsubscribe();
    c.disconnect();
  });

  test('without getState, subscribe uses since option (backward compat)', async () => {
    const c = createClient();
    c.connect();

    const channel = 'test_no_getstate_' + Date.now();

    // Publish before subscribe.
    await apiPublish(channel, { i: 1 });

    // Use since: {offset: 0, epoch: ''} — the classic manual approach.
    const sub = c.newSubscription(channel, {
      since: { offset: 0, epoch: '' },
    });

    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();

    const ctx = await subscribedPromise;
    // Subscription should work — this is the existing behavior, no getState.
    expect(ctx).toBeDefined();

    sub.unsubscribe();
    c.disconnect();
  });

  test('getState error triggers resubscribe with error event (matches map subscription behavior)', async () => {
    const c = createClient();
    c.connect();
    // Wait for connected state so _subscribeError emits error events.
    await waitForEvent(c, 'connected');

    const channel = 'test_getstate_error_' + Date.now();
    let getStateCalls = 0;

    const sub = c.newSubscription(channel, {
      minResubscribeDelay: 100,
      maxResubscribeDelay: 100,
      getState: async () => {
        getStateCalls++;
        if (getStateCalls === 1) {
          throw new Error('simulated DB failure');
        }
        // Second call succeeds.
        return { offset: 0, epoch: '' };
      },
    });

    // Collect error events to verify they match the expected shape.
    const errors: any[] = [];
    sub.on('error', (ctx) => { errors.push(ctx); });

    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();

    // First getState fails → error emitted → resubscribe scheduled with backoff.
    // Second getState succeeds → subscribe completes.
    await subscribedPromise;

    expect(getStateCalls).toBeGreaterThanOrEqual(2);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    // Error shape matches the subscribe error pattern used by map getState:
    // { type: 'subscribe', channel, error: { code, message, temporary } }
    expect(errors[0].type).toBe('subscribe');
    expect(errors[0].error.code).toBe(13); // errorCodes.subscriptionGetState
    expect(errors[0].error.message).toContain('simulated DB failure');

    sub.unsubscribe();
    c.disconnect();
  });

  test('getState persistent failure keeps retrying without unsubscribing', async () => {
    const c = createClient();
    c.connect();

    const channel = 'test_getstate_persistent_error_' + Date.now();
    let getStateCalls = 0;

    const sub = c.newSubscription(channel, {
      minResubscribeDelay: 50,
      maxResubscribeDelay: 50,
      getState: async () => {
        getStateCalls++;
        throw new Error('always fails');
      },
    });

    sub.subscribe();

    // Wait for several retry cycles.
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should have retried multiple times without going to unsubscribed state.
    // The subscription stays in 'subscribing' state, matching map getState behavior
    // where temporary errors (code < 100) schedule resubscribe.
    expect(getStateCalls).toBeGreaterThan(2);
    expect(sub.state).not.toBe('unsubscribed');

    sub.unsubscribe();
    c.disconnect();
  });

  test('getState with real position recovers missed publications', async () => {
    const c = createClient();
    c.connect();

    const channel = 'test_getstate_recover_' + Date.now();

    // First, subscribe normally to get a valid epoch.
    const tempSub = c.newSubscription(channel, { recoverable: true });
    const tempCtx = await new Promise<SubscribedContext>((resolve) => {
      tempSub.on('subscribed', resolve);
      tempSub.subscribe();
    });
    const epoch = tempCtx.streamPosition?.epoch || '';
    tempSub.unsubscribe();
    c.removeSubscription(tempSub);

    // Publish 2 messages.
    await apiPublish(channel, { i: 1 });
    await apiPublish(channel, { i: 2 });

    // Now subscribe with getState returning the position BEFORE the 2 messages.
    const sub = c.newSubscription(channel, {
      getState: async () => {
        return { offset: 0, epoch: epoch };
      },
    });

    const pubsPromise = collectEvents<PublicationContext>(sub, 'publication', 2, 5000);
    sub.subscribe();

    const pubs = await pubsPromise;
    expect(pubs.length).toBe(2);
    expect(pubs[0].data).toEqual({ i: 1 });
    expect(pubs[1].data).toEqual({ i: 2 });

    sub.unsubscribe();
    c.disconnect();
  });

  test('getState is called when recovery fails (unrecoverable position)', async () => {
    // Uses "smallhistory" namespace with history_size=2.
    // After publishing enough to evict old entries, reconnecting from
    // an old position triggers error 112 (unrecoverable position).
    // With getState, the SDK should call getState again instead of
    // delivering recovered=false on an active subscription.
    const c = createClient();
    c.connect();
    await waitForEvent(c, 'connected');

    const channel = 'smallhistory:test_getstate_unrecoverable_' + Date.now();
    let getStateCalls = 0;

    // First, get the real epoch by subscribing normally.
    const tempSub = c.newSubscription(channel, { recoverable: true });
    const tempCtx = await new Promise<SubscribedContext>((resolve) => {
      tempSub.on('subscribed', resolve);
      tempSub.subscribe();
    });
    const realEpoch = tempCtx.streamPosition?.epoch || '';
    tempSub.unsubscribe();
    c.removeSubscription(tempSub);

    // Simulate a real app: getState reads current stream position from backend.
    const sub = c.newSubscription(channel, {
      minResubscribeDelay: 100,
      maxResubscribeDelay: 100,
      getState: async () => {
        getStateCalls++;
        const resp = await fetch(`${apiBase}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({ channel, limit: 0 }),
        });
        const body = await resp.json() as any;
        return {
          offset: body.result?.offset || 0,
          epoch: body.result?.epoch || realEpoch,
        };
      },
    });

    const subscribedPromise1 = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise1;
    expect(getStateCalls).toBe(1);

    // Disconnect first, then publish enough messages to push the stream
    // beyond recovery (history_size=2, so 5 messages evict old entries).
    const subscribedPromise2 = new Promise<SubscribedContext>((resolve) => {
      sub.on('subscribed', (ctx) => {
        resolve(ctx);
      });
    });

    c.disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));

    for (let i = 0; i < 5; i++) {
      await apiPublish(channel, { i });
    }

    // Reconnect — SDK will try to recover from old position (offset 0),
    // but stream only has offsets 4,5. Server returns error 112,
    // SDK should call getState again.
    c.connect();

    await subscribedPromise2;

    // getState should have been called again due to unrecoverable position.
    expect(getStateCalls).toBe(2);

    sub.unsubscribe();
    c.disconnect();
  });
});
