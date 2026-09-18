import { Centrifuge } from './centrifuge';
import { State, TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';

import WebSocket from 'ws';

// A map subscribe pages through state and stream replies, possibly after a token
// fetch. Replies and continuations of an earlier flow must not feed a later one,
// and an interrupted recovery must not move the position past entries the app
// never received.

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

const entry = (n: number) => ({ key: `k${n}`, data: { n }, offset: n });

describe('map subscribe flow', () => {
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

  const subscribeRequests = () => server.received.filter(cmd => cmd.subscribe !== undefined).map(cmd => cmd.subscribe);

  function mapSubscription(options: any = {}) {
    const sub: any = c.newMapSubscription('m', options);
    const events: string[] = [];
    sub.on('subscribed', () => events.push('subscribed'));
    sub.on('sync', (ctx: any) => events.push(`sync:${ctx.entries.map((e: any) => e.key).join(',')}`));
    sub.on('update', (ctx: any) => events.push(`update:${ctx.key}`));
    return { sub, events };
  }

  test('an interrupted recovery keeps the position of what the app received', async () => {
    let streamPages = 0;
    server.onCommand = (cmd, s) => {
      const req = cmd.subscribe;
      if (!req) {
        return null;
      }
      if (req.phase !== 1) {
        return { id: cmd.id, subscribe: { recoverable: true, epoch: 'e', offset: 2, state: [entry(1), entry(2)] } };
      }
      streamPages++;
      if (streamPages === 1) {
        return { id: cmd.id, subscribe: { phase: 1, epoch: 'e', offset: 4, publications: [entry(3), entry(4)] } };
      }
      if (streamPages === 2) {
        // The connection drops before the next page is answered.
        setTimeout(() => s.closeConnection(), 0);
        return {};
      }
      return { id: cmd.id, subscribe: { recoverable: true, recovered: true, epoch: 'e', offset: 4, publications: [entry(3), entry(4)] } };
    };
    const { sub, events } = mapSubscription();
    sub.subscribe();
    c.connect();
    await waitFor(() => events.includes('sync:k1,k2'));

    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => events.includes('update:k4'));

    // Recovering from 2, the second page from 4, and after the reconnect from 2 again:
    // entries 3 and 4 never reached the app before.
    expect(subscribeRequests().filter(req => req.phase === 1).map(req => req.offset)).toEqual([2, 4, 2]);
    expect(events).toEqual(['subscribed', 'sync:k1,k2', 'subscribed', 'update:k3', 'update:k4']);
  });

  test('a page reply of an earlier flow is ignored', async () => {
    const held: any[] = [];
    let hold = true;
    server.onCommand = (cmd) => {
      const req = cmd.subscribe;
      if (!req) {
        return null;
      }
      if (hold) {
        held.push(cmd);
        return {};
      }
      return req.cursor
        ? { id: cmd.id, subscribe: { epoch: 'e', offset: 2, state: [entry(2)] } }
        : { id: cmd.id, subscribe: { phase: 2, epoch: 'e', offset: 2, state: [entry(1)], cursor: 'c' } };
    };
    const { sub, events } = mapSubscription();
    sub.subscribe();
    c.connect();
    await waitFor(() => held.length === 1);

    // E.g. React StrictMode: unsubscribe and subscribe again while the first page is in flight.
    hold = false;
    sub.unsubscribe();
    sub.subscribe();
    // The server answers the first flow's page only now, in command order.
    server.send({ id: held[0].id, subscribe: { phase: 2, epoch: 'e', offset: 2, state: [entry(1)], cursor: 'c' } });

    await waitFor(() => events.some(e => e.startsWith('sync:')));
    await delay(50);
    expect(events).toEqual(['subscribed', 'sync:k1,k2']);
    expect(subscribeRequests().filter(req => req.cursor).length).toBe(1);
  });

  test('a page reply of a cancelled flow does not complete the next one over emulation', async () => {
    let held: any = null;
    server.onCommand = (cmd, s) => {
      if (cmd.subscribe !== undefined && held === null && subscribeRequests().length === 1) {
        held = cmd;
        return {};
      }
      if (cmd.unsubscribe !== undefined && held !== null) {
        // The server answers commands in order: the page reply first.
        s.send({ id: held.id, subscribe: { epoch: 'e', offset: 1, state: [entry(1)] } });
      }
      return null;
    };
    server.onSubscribe = () => ({ epoch: 'e', offset: 1, state: [entry(1)] } as any);
    const { sub, events } = mapSubscription();
    c.connect();
    await waitFor(() => c.state === State.Connected);
    // An emulation transport starts the next flow only after the unsubscribe reply.
    (c as any)._transport.emulation = () => true;
    sub.subscribe();
    await waitFor(() => held !== null);

    sub.unsubscribe();
    sub.subscribe();

    // The server has the first flow unsubscribed: the client must subscribe again.
    await waitFor(() => subscribeRequests().length === 2);
    await waitFor(() => events.some(e => e.startsWith('sync:')));
    await delay(50);
    expect(events).toEqual(['subscribed', 'sync:k1']);
  });

  test('a state invalidation push for a previous subscription keeps the position of a flow in progress', async () => {
    server.onSubscribe = (_ch, req) => (req.phase === 1
      ? { recoverable: true, recovered: true, epoch: 'e', offset: 2, publications: [] }
      : { recoverable: true, epoch: 'e', offset: 2, state: [entry(1), entry(2)] }) as any;
    const { sub, events } = mapSubscription();
    sub.subscribe();
    c.connect();
    await waitFor(() => events.includes('sync:k1,k2'));

    // Sent by the server for the first subscription before it read the unsubscribe
    // command: it arrives while the recovery of the next subscription is in progress.
    server.onCommand = (cmd, s) => {
      if (cmd.unsubscribe !== undefined) {
        s.sendPush({ channel: 'm', unsubscribe: { code: 2502, reason: 'server tags filter changed' } });
      }
      return null;
    };
    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => events.filter(e => e === 'subscribed').length === 2);
    await delay(50);

    server.onCommand = null;
    server.closeConnection();
    await waitFor(() => subscribeRequests().length === 3);
    // The resubscribe recovers from the position of the second subscription.
    expect(subscribeRequests()[2]).toMatchObject({ phase: 1, offset: 2, epoch: 'e' });
  });

  test('a token of an earlier flow does not start another flow', async () => {
    const resolvers: Array<(token: string) => void> = [];
    server.onSubscribe = () => ({ epoch: 'e', offset: 1, state: [entry(1)] } as any);
    const { sub, events } = mapSubscription({ getToken: () => new Promise<string>(resolve => resolvers.push(resolve)) });
    sub.subscribe();
    c.connect();
    await waitFor(() => resolvers.length === 1);

    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => resolvers.length === 2);
    resolvers.forEach(resolve => resolve('token'));

    await waitFor(() => events.some(e => e.startsWith('sync:')));
    await delay(50);
    expect(subscribeRequests()).toHaveLength(1);
    expect(events).toEqual(['subscribed', 'sync:k1']);
  });
});
