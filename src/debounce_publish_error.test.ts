import { Centrifuge } from './centrifuge';
import { SubscribedContext, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// Regression guard: publishes sent by the debounce timer itself have no caller
// awaiting them, so a server-side publish error must not surface as an
// unhandled promise rejection (which crashes Node under the default
// --unhandled-rejections=throw).

function createClient(url: string): Centrifuge {
  return new Centrifuge([{
    transport: 'websocket' as TransportName,
    endpoint: url,
  }], {
    websocket: WebSocket,
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

describe('publish debounce with failing publishes', () => {
  let server: FakeCentrifugoServer;
  let c: Centrifuge;
  let rejections: any[];
  let onUnhandled: (reason: any) => void;

  beforeEach(async () => {
    rejections = [];
    onUnhandled = (reason: any) => { rejections.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    server = await FakeCentrifugoServer.start();
    server.onSubscribe = () => ({ publish_debounce: 30 } as any);
    // Every publish fails with a permission error.
    server.onCommand = (cmd: any) => cmd.publish !== undefined
      ? { id: cmd.id, error: { code: 103, message: 'permission denied' } }
      : undefined;
  });

  afterEach(async () => {
    process.off('unhandledRejection', onUnhandled);
    c?.disconnect();
    await server.close();
  });

  test('publish errors from debounce timers do not become unhandled rejections', async () => {
    c = createClient(server.url);
    c.connect();

    const sub = c.newSubscription('debounced');
    const subscribedPromise = waitForEvent<SubscribedContext>(sub, 'subscribed');
    sub.subscribe();
    await subscribedPromise;

    // First publish is sent immediately and returned to the caller, who handles it.
    await sub.publish({ x: 1 }).catch(() => { });
    // Coalesced into the first debounce window — flushed by the timer at ~30ms.
    sub.publish({ x: 2 });
    await delay(50);
    // Coalesced into the second debounce window — flushed by the nested timer,
    // which re-enters _debouncedPublish and sends immediately.
    sub.publish({ x: 3 });
    await delay(80);

    const publishCommands = server.received.filter(cmd => cmd.publish !== undefined);
    expect(publishCommands).toHaveLength(3);
    expect(rejections).toEqual([]);
  });
});
