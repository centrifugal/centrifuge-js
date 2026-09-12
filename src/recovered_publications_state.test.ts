import { Centrifuge } from './centrifuge';
import { State, SubscriptionState, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// Publications recovered in a subscribe or connect reply must not reach the app
// after a handler unsubscribed or disconnected, and must not move the stored
// position past publications that were not delivered.

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function waitFor(check: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (check()) {
        resolve();
      } else if (Date.now() - started > timeout) {
        reject(new Error('timeout'));
      } else {
        setTimeout(tick, 5);
      }
    };
    tick();
  });
}

const publications = (n: number) => Array.from({ length: n }, (_, i) => ({ data: { n: i + 1 }, offset: i + 1 }));

describe('recovered publications and state', () => {
  let server: FakeCentrifugoServer;
  let c: Centrifuge;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    c = new Centrifuge([{ transport: 'websocket' as TransportName, endpoint: server.url }], {
      websocket: WebSocket,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
  });

  afterEach(async () => {
    c.disconnect();
    await server.close();
  });

  describe('client-side subscription', () => {
    beforeEach(() => {
      server.onSubscribe = () => ({
        recoverable: true, epoch: 'e', offset: 0, wasRecovering: true, recovered: true, publications: publications(3),
      });
    });

    function subscription(options: any = {}) {
      const sub = c.newSubscription('ch', options);
      const received: number[] = [];
      sub.on('publication', ctx => received.push(ctx.data.n));
      return { sub, received };
    }

    test('not delivered after unsubscribe() from a subscribed handler', async () => {
      const { sub, received } = subscription();
      sub.on('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();

      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));
      await delay(50);
      expect(sub.state).toBe(SubscriptionState.Unsubscribed);
      expect(received).toEqual([]);
      expect((sub as any)._offset).toBe(0);
    });

    test('rest not delivered after unsubscribe() from a publication handler', async () => {
      const { sub, received } = subscription();
      sub.on('publication', () => {
        if (sub.state === SubscriptionState.Subscribed) {
          sub.unsubscribe();
        }
      });
      sub.subscribe();
      c.connect();

      await waitFor(() => sub.state === SubscriptionState.Unsubscribed && received.length > 0);
      await delay(50);
      expect(received).toEqual([1]);
      expect((sub as any)._offset).toBe(1);
    });

    test('no token refresh scheduled after unsubscribe() from a subscribed handler', async () => {
      server.onSubscribe = () => ({ expires: true, ttl: 60 });
      const { sub } = subscription({ getToken: async () => 'token' });
      sub.on('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();

      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));
      expect((sub as any)._refreshTimeout).toBeNull();
    });
  });

  describe('server-side subscriptions', () => {
    beforeEach(() => {
      const sub = { recoverable: true, epoch: 'e', offset: 0, was_recovering: true, recovered: true, publications: publications(3) };
      server.connectResult = { ...server.connectResult, subs: { ss1: sub, ss2: sub } };
    });

    function track() {
      const subscribed: string[] = [];
      const received: string[] = [];
      c.on('subscribed', ctx => subscribed.push(ctx.channel));
      c.on('publication', ctx => received.push(`${ctx.channel}#${ctx.data.n}`));
      return { subscribed, received };
    }

    test('no events after disconnect() from a subscribed handler', async () => {
      const { subscribed, received } = track();
      c.on('subscribed', () => {
        if (c.state === State.Connected) {
          c.disconnect();
        }
      });
      c.connect();

      await waitFor(() => subscribed.length > 0 && c.state === State.Disconnected);
      await delay(50);
      expect(subscribed).toEqual(['ss1']);
      expect(received).toEqual([]);
      // Positions are kept for recovery on the next connect.
      expect((c as any)._serverSubs.ss1.offset).toBe(0);
      expect((c as any)._serverSubs.ss2.offset).toBe(0);
    });

    test('rest not delivered after disconnect() from a publication handler', async () => {
      const { received } = track();
      c.on('publication', () => {
        if (c.state === State.Connected) {
          c.disconnect();
        }
      });
      c.connect();

      await waitFor(() => received.length > 0 && c.state === State.Disconnected);
      await delay(50);
      expect(received).toEqual(['ss1#1']);
      expect((c as any)._serverSubs.ss1.offset).toBe(1);
      expect((c as any)._serverSubs.ss2.offset).toBe(0);
    });
  });
});
