import { Centrifuge } from './centrifuge';
import { Centrifuge as CentrifugeProtobuf } from './protobuf';
import { ProtobufCodec } from './protobuf.codec';
import { FakeCentrifugoServer } from './fakeServer';
import { WebsocketTransport } from './transport_websocket';
import { base64UrlEncode } from './utils';
import { State, SubscriptionState, TransportName } from './types';

import WebSocket from 'ws';

// Connect frame sent inside the WebSocket handshake (maxHandshakeConnectSize).

// Transport errors of clients created by createClient, a failed attempt in tests
// which don't expect one means the handshake wasn't accepted as it should.
let transportErrors = 0;

function createClient(endpoint: any, options: any = {}): Centrifuge {
  const c = new Centrifuge(endpoint, {
    websocket: WebSocket,
    minReconnectDelay: 10,
    maxReconnectDelay: 50,
    ...options,
  });
  c.on('error', ctx => {
    if (ctx.type === 'transport') {
      transportErrors++;
    }
  });
  return c;
}

function waitFor(check: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (check()) {
        resolve();
      } else if (Date.now() - started > timeout) {
        reject(new Error('timeout'));
      } else {
        setTimeout(poll, 5);
      }
    };
    poll();
  });
}

const kinds = (cmds: any[]) => cmds.map(cmd => Object.keys(cmd).find(k => k !== 'id'));
const connects = (cmds: any[]) => cmds.filter(cmd => cmd.connect !== undefined).length;
const isData = (p: string) => p.startsWith('cf-connect.');

describe('handshake connect', () => {
  let server: FakeCentrifugoServer;
  let client: Centrifuge | null;
  let allowTransportErrors: boolean;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
    client = null;
    transportErrors = 0;
    allowTransportErrors = false;
  });

  afterEach(async () => {
    client?.disconnect();
    await server.close();
    if (!allowTransportErrors) {
      expect(transportErrors).toBe(0);
    }
  });

  test('sends connect and subscriptions inside the handshake', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    const pubs: any[] = [];
    sub.on('publication', ctx => pubs.push(ctx.data));
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(client.state).toBe(State.Connected);

    expect(server.handshakes).toHaveLength(1);
    expect(server.handshakes[0].slice(0, 2)).toEqual(['cf-json-hc', 'centrifuge-json']);
    expect(server.handshakes[0]).toHaveLength(3);
    expect(isData(server.handshakes[0][2])).toBe(true);
    expect(kinds(server.handshakeCommands)).toEqual(['connect', 'subscribe']);
    expect(server.handshakeCommands[1].subscribe.channel).toBe('news');
    // Nothing is sent again after the transport opens.
    expect(server.received).toHaveLength(2);

    server.publish('news', { n: 1 });
    await waitFor(() => pubs.length === 1);
    expect(pubs[0]).toEqual({ n: 1 });

    // Later commands go over the connection as usual.
    await client.publish('news', { from: 'client' });
    expect(server.received).toHaveLength(3);
  });

  test('server without handshake connect gets the commands after open', async () => {
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    // One attempt: the server selects centrifuge-json, offered for that.
    expect(server.handshakes).toHaveLength(1);
    expect(server.handshakes[0].some(isData)).toBe(true);
    expect(server.handshakeCommands).toHaveLength(0);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
  });

  test('disabled by default', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url);
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(server.handshakes).toEqual([[]]);
    expect(server.handshakeCommands).toHaveLength(0);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
  });

  test('connect not fitting the limit goes after open', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 10 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(server.handshakes).toEqual([[]]);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
  });

  test('subscriptions not fitting the limit go after open', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 1000 });
    const small = client.newSubscription('small');
    const large = client.newSubscription('l'.repeat(2000));
    const after = client.newSubscription('after');
    small.subscribe();
    large.subscribe();
    after.subscribe();
    client.connect();
    await waitFor(() => [small, large, after].every(s => s.state === SubscriptionState.Subscribed));
    // In order while they fit: the one after the large subscription goes after
    // open too.
    expect(kinds(server.handshakeCommands)).toEqual(['connect', 'subscribe']);
    expect(server.handshakeCommands[1].subscribe.channel).toBe('small');
    const afterOpen = server.received.slice(server.handshakeCommands.length);
    expect(afterOpen.map(cmd => cmd.subscribe.channel)).toEqual(['l'.repeat(2000), 'after']);
    expect(connects(server.received)).toBe(1);
    for (const p of server.handshakes[0]) {
      expect(p.length).toBeLessThanOrEqual(1000 + 'cf-connect.'.length);
    }
  });

  test('subscription getting a token subscribes after open', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const getToken = jest.fn(() => Promise.resolve('sub-token'));
    const sub = client.newSubscription('news', { getToken });
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(kinds(server.handshakeCommands)).toEqual(['connect']);
    expect(server.received[1].subscribe.token).toBe('sub-token');
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  test('subscription with a token already known goes inside the handshake', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news', { token: 'sub-token' });
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(kinds(server.handshakeCommands)).toEqual(['connect', 'subscribe']);
    expect(server.handshakeCommands[1].subscribe.token).toBe('sub-token');
  });

  test('connection token and data go inside the handshake', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096, token: 'conn-token', data: { a: 1 } });
    client.connect();
    await waitFor(() => client!.state === State.Connected);
    expect(server.handshakeCommands[0].connect.token).toBe('conn-token');
    expect(server.handshakeCommands[0].connect.data).toEqual({ a: 1 });
  });

  test('reconnect sends the connect frame inside the handshake again, with recovery', async () => {
    server.handshakeConnect = true;
    server.onSubscribe = () => ({ recoverable: true, epoch: 'e1', offset: 5 });
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news', { recoverable: true });
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    server.onSubscribe = () => ({ recoverable: true, epoch: 'e1', offset: 5, recovered: true, wasRecovering: true });
    server.closeConnection();
    await waitFor(() => server.handshakeCommands.length === 4 && sub.state === SubscriptionState.Subscribed);
    expect(kinds(server.handshakeCommands)).toEqual(['connect', 'subscribe', 'connect', 'subscribe']);
    expect(server.handshakeCommands[3].subscribe.recover).toBe(true);
    expect(server.handshakeCommands[3].subscribe.epoch).toBe('e1');
    expect(server.received).toHaveLength(4);
  });

  test('falls back when a handshake with the data fails, and stops sending it', async () => {
    allowTransportErrors = true;
    server.handshakeConnect = true;
    // Like a proxy rejecting large headers.
    server.rejectHandshake = protocols => protocols.some(isData);
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const errors: any[] = [];
    client.on('error', ctx => errors.push(ctx));
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(server.handshakes).toHaveLength(2);
    expect(server.handshakes[0].some(isData)).toBe(true);
    expect(server.handshakes[1]).toEqual([]);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
    expect(errors.length).toBeGreaterThan(0);

    // Reconnects go without it from now on.
    server.closeConnection();
    await waitFor(() => server.received.length === 4 && sub.state === SubscriptionState.Subscribed);
    expect(server.handshakes).toHaveLength(3);
    expect(server.handshakes[2]).toEqual([]);
  });

  test('tries the data again when the attempt without it fails too', async () => {
    allowTransportErrors = true;
    server.handshakeConnect = true;
    // Like a server being unavailable for two attempts.
    let rejected = 0;
    server.rejectHandshake = () => rejected++ < 2;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    client.connect();
    await waitFor(() => client!.state === State.Connected);
    expect(server.handshakes).toHaveLength(3);
    expect(server.handshakes[0].some(isData)).toBe(true);
    expect(server.handshakes[1]).toEqual([]);
    expect(server.handshakes[2].some(isData)).toBe(true);
    expect(kinds(server.handshakeCommands)).toEqual(['connect']);
    expect(server.received).toHaveLength(1);
  });

  test('a handshake failing with the data in a transport list is retried without it on websocket', async () => {
    allowTransportErrors = true;
    server.handshakeConnect = true;
    server.rejectHandshake = protocols => protocols.some(isData);
    client = createClient([
      { transport: 'websocket' as TransportName, endpoint: server.url },
      // Not listening: the client must not move on to it.
      { transport: 'http_stream' as TransportName, endpoint: 'http://127.0.0.1:1/connection/http_stream' },
    ], { maxHandshakeConnectSize: 4096 });
    client.connect();
    await waitFor(() => client!.state === State.Connected);
    expect(server.handshakes).toHaveLength(2);
    expect(server.handshakes[0].some(isData)).toBe(true);
    expect(server.handshakes[1]).toEqual([]);
    // @ts-ignore – internal.
    expect(client._transport.name()).toBe('websocket');
  });

  test('falls back when a handshake with the data is left unanswered', async () => {
    allowTransportErrors = true;
    server.handshakeConnect = true;
    // Like a proxy dropping requests with large headers.
    server.holdHandshake = protocols => protocols.some(isData);
    client = createClient(server.url, { maxHandshakeConnectSize: 4096, timeout: 300 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(server.handshakes).toHaveLength(2);
    expect(server.handshakes[0].some(isData)).toBe(true);
    expect(server.handshakes[1]).toEqual([]);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
  });

  test('a handshake failing with the data leaves subscriptions as without it', async () => {
    allowTransportErrors = true;
    server.handshakeConnect = true;
    server.rejectHandshake = protocols => protocols.some(isData);
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    const subErrors: any[] = [];
    sub.on('error', ctx => subErrors.push(ctx));
    // @ts-ignore – internal.
    const resubscribes = jest.spyOn(sub, '_scheduleResubscribe');
    sub.subscribe();
    client.connect();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(resubscribes).not.toHaveBeenCalled();
    expect(subErrors).toEqual([]);
    // @ts-ignore – internal.
    expect(Object.keys(client._callbacks)).toEqual([]);
  });

  test('connect data that cannot be encoded fails as without the option', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096, data: { n: (globalThis as any).BigInt(1) } });
    const errors: string[] = [];
    client.on('error', ctx => errors.push(ctx.type));
    expect(() => client!.connect()).not.toThrow();
    await waitFor(() => errors.length > 0);
    // Nothing went inside the handshake, the connect failed to be written after open.
    expect(server.handshakes[0]).toEqual([]);
    expect(server.received).toEqual([]);
    expect(new Set(errors)).toEqual(new Set(['connect']));
    expect(client.state).toBe(State.Connecting);
  });

  test('works with websocket in a transport list', async () => {
    server.handshakeConnect = true;
    client = createClient([{ transport: 'websocket' as TransportName, endpoint: server.url }], { maxHandshakeConnectSize: 4096 });
    client.connect();
    await waitFor(() => client!.state === State.Connected);
    expect(kinds(server.handshakeCommands)).toEqual(['connect']);
    expect(server.received).toHaveLength(1);
  });

  test('unsubscribe before open undoes a subscribe the server took', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    sub.unsubscribe();
    await waitFor(() => server.received.length === 3);
    expect(kinds(server.handshakeCommands)).toEqual(['connect', 'subscribe']);
    expect(server.received[2].unsubscribe.channel).toBe('news');
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
    // Subscribing again works.
    sub.subscribe();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    expect(kinds(server.received)).toEqual(['connect', 'subscribe', 'unsubscribe', 'subscribe']);
  });

  test('unsubscribe and subscribe again before open', async () => {
    server.handshakeConnect = true;
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    sub.unsubscribe();
    sub.subscribe();
    await waitFor(() => sub.state === SubscriptionState.Subscribed);
    // The server took the first subscribe: it's undone before the new one.
    expect(kinds(server.received)).toEqual(['connect', 'subscribe', 'unsubscribe', 'subscribe']);
    expect(server.received.slice(2).map(cmd => (cmd.subscribe || cmd.unsubscribe).channel)).toEqual(['news', 'news']);
  });

  test('unsubscribe before open drops a subscribe not sent yet', async () => {
    server.handshakeConnect = true;
    // Only connect fits.
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const other = client.newSubscription('o'.repeat(4000));
    other.subscribe();
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    sub.unsubscribe();
    await waitFor(() => other.state === SubscriptionState.Subscribed);
    expect(kinds(server.handshakeCommands)).toEqual(['connect']);
    // Only the other subscription's subscribe went after open.
    expect(kinds(server.received)).toEqual(['connect', 'subscribe']);
    expect(server.received[1].subscribe.channel).toBe('o'.repeat(4000));
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
    // No call is left registered for the dropped command.
    expect(Object.keys((client as any)._callbacks)).toHaveLength(0);
  });

  test('unsubscribe before open when the server does not take the data', async () => {
    client = createClient(server.url, { maxHandshakeConnectSize: 4096 });
    const sub = client.newSubscription('news');
    sub.subscribe();
    client.connect();
    sub.unsubscribe();
    await waitFor(() => client!.state === State.Connected);
    await new Promise(r => setTimeout(r, 50));
    expect(server.handshakes).toHaveLength(1);
    expect(kinds(server.received)).toEqual(['connect']);
    expect(Object.keys((client as any)._callbacks)).toHaveLength(0);
  });
});

describe('websocket transport handshake connect', () => {
  class StubWebSocket {
    static calls: any[][] = [];
    protocol = '';
    binaryType = '';
    constructor(...args: any[]) {
      StubWebSocket.calls.push(args);
    }
    close() {}
    send() {}
  }

  beforeEach(() => {
    StubWebSocket.calls = [];
  });

  const callbacks = { onOpen() {}, onError() {}, onClose() {}, onMessage() {} };

  test('without data the constructor is called as before', () => {
    new WebsocketTransport('ws://x', { websocket: StubWebSocket }).initialize('json', callbacks, '', '');
    new WebsocketTransport('ws://x', { websocket: StubWebSocket }).initialize('protobuf', callbacks, '', '');
    new WebsocketTransport('ws://x', { websocket: StubWebSocket }).initialize('json', callbacks);
    expect(StubWebSocket.calls).toEqual([['ws://x'], ['ws://x', 'centrifuge-protobuf'], ['ws://x']]);
  });

  test('offers the data with the -hc subprotocol first', () => {
    new WebsocketTransport('ws://x', { websocket: StubWebSocket }).initialize('json', callbacks, '', 'abc');
    new WebsocketTransport('ws://x', { websocket: StubWebSocket }).initialize('protobuf', callbacks, '', 'abc');
    expect(StubWebSocket.calls).toEqual([
      ['ws://x', ['cf-json-hc', 'centrifuge-json', 'cf-connect.abc']],
      ['ws://x', ['cf-proto-hc', 'centrifuge-protobuf', 'cf-connect.abc']],
    ]);
  });

  test('accepted only with the -hc subprotocol selected', () => {
    const t = new WebsocketTransport('ws://x', { websocket: StubWebSocket });
    expect(t.handshakeConnectAccepted()).toBe(false);
    t.initialize('json', callbacks, '', 'abc');
    const ws = (t as any)._transport;
    for (const [protocol, accepted] of [['cf-json-hc', true], ['cf-proto-hc', true], ['', false], ['cf-json', false], ['centrifuge-protobuf', false]]) {
      ws.protocol = protocol;
      expect(t.handshakeConnectAccepted()).toBe(accepted);
    }
  });

  test('protobuf client sends a protobuf connect frame', async () => {
    class CapturingWebSocket extends StubWebSocket {}
    const client = new CentrifugeProtobuf('ws://localhost/connection/websocket', {
      websocket: CapturingWebSocket,
      maxHandshakeConnectSize: 4096,
      token: 'conn-token',
    });
    client.newSubscription('news').subscribe();
    client.connect();
    await waitFor(() => StubWebSocket.calls.length === 1);
    client.disconnect();
    const protocols = StubWebSocket.calls[0][1];
    expect(protocols.slice(0, 2)).toEqual(['cf-proto-hc', 'centrifuge-protobuf']);
    const data = Buffer.from(protocols[2].slice('cf-connect.'.length), 'base64url');
    const commands = new ProtobufCodec().decodeCommands(new Uint8Array(data));
    expect(commands).toHaveLength(2);
    expect(commands[0].connect!.token).toBe('conn-token');
    expect(commands[1].subscribe!.channel).toBe('news');
  });
});

describe('base64UrlEncode', () => {
  test('matches Buffer base64url', () => {
    for (let n = 0; n < 64; n++) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        bytes[i] = (i * 37 + n * 11 + 250) & 255;
      }
      expect(base64UrlEncode(bytes)).toBe(Buffer.from(bytes).toString('base64url'));
    }
  });
});
