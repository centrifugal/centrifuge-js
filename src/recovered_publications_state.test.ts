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

  describe('position of a channel the server does not recover', () => {
    test('a subscription given a position stops asking to recover', async () => {
      // Positioning without recovery: the reply carries a position, but never
      // `recoverable`, so there is nothing to recover from.
      server.onSubscribe = () => ({ positioned: true, epoch: 'e', offset: 1 } as any);
      const sub: any = c.newSubscription('ch', { since: { offset: 1, epoch: 'e' } });
      const subscribes: string[] = [];
      sub.on('subscribed', () => subscribes.push('subscribed'));
      sub.subscribe();
      c.connect();
      await waitFor(() => subscribes.length === 1);

      server.closeConnection();
      await waitFor(() => subscribes.length === 2);

      const requests = server.received.filter(cmd => cmd.subscribe !== undefined).map(cmd => cmd.subscribe);
      expect(requests[0].recover).toBe(true);
      expect(requests[1].recover).toBeUndefined();
      expect(sub._recover).toBe(false);
    });
  });

  describe('client-side subscription', () => {
    beforeEach(() => {
      // After a recovery the server replies with the position recovered from, here 0,
      // not the top of the stream (see subscribeCmd in centrifuge).
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

    test('no subscribed event after unsubscribe() from a state handler', async () => {
      const { sub, received } = subscription();
      const events: string[] = [];
      sub.on('state', ctx => {
        events.push(`state:${ctx.newState}`);
        if (ctx.newState === SubscriptionState.Subscribed) {
          sub.unsubscribe();
        }
      });
      sub.on('subscribed', () => events.push('subscribed'));
      sub.subscribe();
      c.connect();

      await waitFor(() => events.includes('state:unsubscribed'));
      await delay(50);
      expect(events).toEqual(['state:subscribing', 'state:subscribed', 'state:unsubscribed']);
      expect(received).toEqual([]);
    });

    test('ready() after unsubscribe() and subscribe() in a subscribed handler waits for that subscribe', async () => {
      const { sub } = subscription();
      let readyState: string | null = null;
      sub.once('subscribed', () => {
        sub.unsubscribe();
        sub.subscribe();
        sub.ready().then(() => { readyState = sub.state; });
      });
      sub.subscribe();
      c.connect();

      await waitFor(() => readyState !== null);
      expect(readyState).toBe(SubscriptionState.Subscribed);
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
      // As for a client-side subscription, the offset is the position recovered from.
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

    test('the stored position moves only after a publication handler returned', async () => {
      const during: number[] = [];
      c.on('publication', ctx => {
        if (ctx.channel === 'ss1') {
          during.push((c as any)._serverSubs.ss1.offset);
        }
      });
      c.connect();
      await waitFor(() => during.length === 3);

      // The position the app can observe never runs ahead of what it received.
      expect(during).toEqual([0, 1, 2]);
      expect((c as any)._serverSubs.ss1.offset).toBe(3);
    });

    test('connect() from a publication handler recovers after that publication', async () => {
      let reconnected = false;
      c.on('publication', ctx => {
        if (ctx.channel === 'ss1' && !reconnected) {
          reconnected = true;
          c.disconnect();
          c.connect();
        }
      });
      c.connect();

      const connects = () => server.received.filter(cmd => cmd.connect !== undefined).map(cmd => cmd.connect);
      await waitFor(() => connects().length === 2);
      expect(connects()[1].subs.ss1).toMatchObject({ recover: true, offset: 1, epoch: 'e' });
    });

  });

  describe('map subscription', () => {
    const entry = (n: number) => ({ key: `k${n}`, data: { n }, offset: n });

    function mapSubscription(options: any = {}) {
      const sub: any = c.newMapSubscription('m', options);
      const events: string[] = [];
      sub.on('subscribed', () => events.push('subscribed'));
      sub.on('sync', (ctx: any) => events.push(`sync:${ctx.entries.length}`));
      sub.on('publication', (ctx: any) => events.push(`publication:${ctx.data.n}`));
      sub.on('update', (ctx: any) => events.push(`update:${ctx.data.n}`));
      return { sub, events };
    }

    test('no sync after unsubscribe() from a subscribed handler', async () => {
      server.onSubscribe = () => ({ epoch: 'e', offset: 1, state: [entry(1)] } as any);
      const { sub, events } = mapSubscription();
      sub.on('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();

      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));
      await delay(50);
      expect(sub.state).toBe(SubscriptionState.Unsubscribed);
      expect(events).toEqual(['subscribed']);
    });

    test('rest of catch-up not delivered after unsubscribe() from a publication handler', async () => {
      server.onSubscribe = () => ({ epoch: 'e', offset: 3, recovered: true, publications: [entry(1), entry(2), entry(3)] } as any);
      const { sub, events } = mapSubscription();
      sub.on('publication', () => {
        if (sub.state === SubscriptionState.Subscribed) {
          sub.unsubscribe();
        }
      });
      sub.subscribe();
      c.connect();

      await waitFor(() => sub.state === SubscriptionState.Unsubscribed);
      await delay(50);
      expect(events).toEqual(['subscribed', 'publication:1']);
    });

    test('no token refresh scheduled after unsubscribe() from a subscribed handler', async () => {
      server.onSubscribe = () => ({ epoch: 'e', offset: 1, state: [entry(1)], expires: true, ttl: 60 } as any);
      const { sub } = mapSubscription({ getToken: async () => 'token' });
      sub.on('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();

      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));
      expect(sub._refreshTimeout).toBeNull();
    });

    // The new subscribe starts a new flow before the outdated one returns: the
    // outdated one must not emit its sync (with the new flow's empty buffer).
    test('unsubscribe() and subscribe() from a subscribed handler do not emit an outdated sync', async () => {
      server.onSubscribe = () => ({ epoch: 'e', offset: 1, state: [entry(1)] } as any);
      const { sub, events } = mapSubscription();
      let resubscribed = false;
      sub.on('subscribed', () => {
        if (!resubscribed) {
          resubscribed = true;
          sub.unsubscribe();
          sub.subscribe();
        }
      });
      sub.subscribe();
      c.connect();

      await waitFor(() => events.includes('sync:1'));
      await delay(50);
      expect(events).toEqual(['subscribed', 'subscribed', 'sync:1']);
      expect(sub.state).toBe(SubscriptionState.Subscribed);
    });

    const subscribeRequests = () => server.received.filter(cmd => cmd.subscribe !== undefined).map(cmd => cmd.subscribe);

    test('resubscribe after unsubscribe() from an update handler recovers the rest of the catch-up', async () => {
      server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: 3, recovered: true, publications: [entry(1), entry(2), entry(3)] } as any);
      const { sub } = mapSubscription();
      sub.once('update', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();
      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));

      sub.subscribe();
      await sub.ready(3000);
      const req = subscribeRequests()[1];
      // A stream phase recovering after the delivered entry.
      expect(req.phase).toBe(1);
      expect(req.recover).toBe(true);
      expect(req.offset).toBe(1);
      expect(req.epoch).toBe('e');
    });

    test('unsubscribe() from a subscribed handler keeps the position before the catch-up', async () => {
      server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: 3, recovered: true, publications: [entry(2), entry(3)] } as any);
      const { sub, events } = mapSubscription();
      sub.once('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();
      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));

      expect(events).toEqual(['subscribed']);
      expect(sub._offset).toBe(1);
    });

    test('unsubscribe() from a subscribed handler before sync makes the next subscribe start from scratch', async () => {
      server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: 5, state: [entry(1)], publications: [entry(5)] } as any);
      const { sub } = mapSubscription();
      sub.once('subscribed', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();
      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));

      sub.subscribe();
      await sub.ready(3000);
      const req = subscribeRequests()[1];
      // A state page, not a recovery from the position: the app never got sync.
      expect(req.phase).toBe(2);
      expect(req.recover).toBeUndefined();
      expect(req.offset).toBeUndefined();
    });

    test.each([
      ['a sync', { recoverable: true, epoch: 'e', offset: 5, state: [entry(1)], publications: [entry(5)] }],
      ['a recovered catch-up', { recoverable: true, epoch: 'e', offset: 5, recovered: true, publications: [entry(4), entry(5)] }],
    ])('position moves to the top once %s is delivered', async (_, reply) => {
      server.onSubscribe = () => reply as any;
      const { sub } = mapSubscription();
      sub.subscribe();
      c.connect();
      await sub.ready(3000);
      await delay(50);
      expect(sub._offset).toBe(5);
      expect(sub._epoch).toBe('e');
      expect(sub._recover).toBe(true);
    });

    test('an entry whose update was not emitted is recovered again', async () => {
      server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: 3, recovered: true, publications: [entry(1), entry(2), entry(3)] } as any);
      const { sub, events } = mapSubscription();
      sub.once('publication', () => sub.unsubscribe());
      sub.subscribe();
      c.connect();
      await waitFor(() => server.received.some(cmd => cmd.unsubscribe !== undefined));

      expect(events).toEqual(['subscribed', 'publication:1']);
      // Before entry 1: the app didn't get its update.
      expect(sub._offset).toBe(0);
    });

    test('unsubscribe() and subscribe() from a state handler before sync start the next subscribe from scratch', async () => {
      server.onSubscribe = () => ({ recoverable: true, epoch: 'e', offset: 5, state: [entry(1)] } as any);
      const { sub, events } = mapSubscription();
      let again = true;
      sub.on('state', (ctx: any) => {
        if (ctx.newState === SubscriptionState.Subscribed && again) {
          again = false;
          sub.unsubscribe();
          sub.subscribe();
        }
      });
      sub.subscribe();
      c.connect();

      await waitFor(() => events.includes('sync:1'));
      await delay(50);
      const req = subscribeRequests()[1];
      // A state page, not a recovery from the top of the stream.
      expect(req.phase).toBe(2);
      expect(req.recover).toBeUndefined();
      // No subscribed event from the outdated flow.
      expect(events).toEqual(['subscribed', 'sync:1']);
    });

    test.each([
      ['not a recovery, from a subscribed handler', 'subscribed', { recoverable: true, epoch: 'e', offset: 5, state: [entry(1)] }],
      ['a recovery, from an update handler', 'update', { recoverable: true, epoch: 'e', offset: 2, recovered: true, publications: [entry(1), entry(2)] }],
    ])('setTagsFilter() during the subscribe events, %s, makes the next subscribe re-sync the state', async (_, event, reply) => {
      server.onSubscribe = () => reply as any;
      const { sub } = mapSubscription();
      sub.once(event, () => sub.setTagsFilter({ key: 't', cmp: 'eq', val: 'x' }));
      sub.subscribe();
      c.connect();
      await sub.ready(3000);
      await delay(50);
      expect({ recover: sub._recover, offset: sub._offset, epoch: sub._epoch }).toEqual({ recover: false, offset: null, epoch: null });
    });
  });
});
