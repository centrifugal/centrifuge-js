import { Centrifuge } from './centrifuge';
import { State, TransportName } from './types';
import { connectingCodes } from './codes';

import { ReadableStream } from 'node:stream/web';

// Over emulation (HTTP-streaming, SSE) each batch of commands is a separate HTTP
// request, which the server may handle in any order. The client must keep the
// server's state right whatever the order: e.g. an unsubscribe must not
// overtake the subscribe it undoes.

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

// A fake server behind the http_stream transport. The connect is answered on
// the stream; command requests wait until the test delivers them, in the order
// it chooses. The server keeps the subscribed channels and the tracked shared
// poll keys of the connection, and replies to each command on the stream.
class FakeEmulationServer {
  private stream: any = null;
  // Command requests not handled yet, in the order sent.
  readonly pending: Array<{ commands: any[]; respond: () => void }> = [];
  readonly subscribed = new Set<string>();
  readonly tracked = new Map<string, Set<string>>();
  // Lets a test fail a command: return a reply to send instead of the default one.
  onCommand: ((cmd: any) => any) | null = null;

  readonly options = {
    fetch: (url: string, opts: any) => this.fetch(url, opts),
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:1/emulation',
  };

  private fetch(url: string, opts: any): Promise<any> {
    if (url.endsWith('/emulation')) {
      const req = JSON.parse(opts.body);
      const commands = req.data.trim().split('\n').filter(Boolean).map((line: string) => JSON.parse(line));
      return new Promise(resolve => {
        this.pending.push({ commands, respond: () => resolve({ ok: true, status: 200 }) });
      });
    }
    const connect = JSON.parse(opts.body);
    this.subscribed.clear();
    this.tracked.clear();
    const body = new ReadableStream({
      start: (controller) => {
        this.stream = controller;
        this.reply({ id: connect.id, connect: { client: 'fake', version: '0.0.0' } });
        opts.signal.addEventListener('abort', () => controller.error(new Error('aborted')));
      },
    });
    return Promise.resolve({ ok: true, status: 200, body });
  }

  private reply(reply: any) {
    this.stream.enqueue(new TextEncoder().encode(JSON.stringify(reply) + '\n'));
  }

  // A push on the stream; an unsubscribe push ends the subscription here too.
  push(push: any) {
    if (push.unsubscribe !== undefined) {
      this.subscribed.delete(push.channel);
      this.tracked.delete(push.channel);
    }
    this.reply({ push });
  }

  // Handles the pending request at index i.
  deliver(i: number) {
    const [request] = this.pending.splice(i, 1);
    for (const cmd of request.commands) {
      this.handle(cmd);
    }
    request.respond();
  }

  // Handles every pending request, the last sent first, until none is left.
  async deliverAllReversed() {
    for (let rounds = 0; rounds < 20; rounds++) {
      await delay(20);
      if (this.pending.length === 0) {
        return;
      }
      while (this.pending.length > 0) {
        this.deliver(this.pending.length - 1);
      }
    }
  }

  private handle(cmd: any) {
    const custom = this.onCommand ? this.onCommand(cmd) : null;
    if (custom) {
      this.reply(custom);
      return;
    }
    if (cmd.subscribe !== undefined) {
      const channel = cmd.subscribe.channel;
      if (this.subscribed.has(channel)) {
        this.reply({ id: cmd.id, error: { code: 105, message: 'already subscribed' } });
        return;
      }
      this.subscribed.add(channel);
      this.tracked.set(channel, new Set());
      this.reply({ id: cmd.id, subscribe: {} });
    } else if (cmd.unsubscribe !== undefined) {
      this.subscribed.delete(cmd.unsubscribe.channel);
      this.tracked.delete(cmd.unsubscribe.channel);
      this.reply({ id: cmd.id, unsubscribe: {} });
    } else if (cmd.sub_refresh !== undefined) {
      const req = cmd.sub_refresh;
      const keys = this.tracked.get(req.channel);
      if (!keys) {
        this.reply({ id: cmd.id, error: { code: 103, message: 'permission denied' } });
        return;
      }
      for (const batch of req.track || []) {
        for (const item of batch.items) {
          keys.add(item.key);
        }
      }
      for (const key of req.untrack || []) {
        keys.delete(key);
      }
      this.reply({ id: cmd.id, sub_refresh: {} });
    } else if (cmd.id) {
      this.reply({ id: cmd.id });
    }
  }
}

describe('command order over emulation', () => {
  let server: FakeEmulationServer;
  let c: Centrifuge;

  beforeEach(async () => {
    server = new FakeEmulationServer();
    c = new Centrifuge([{ transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' }], {
      ...server.options,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
    c.connect();
    await waitFor(() => c.state === State.Connected);
  });

  afterEach(() => {
    c.disconnect();
  });

  test('unsubscribe() of a subscribe in flight does not overtake it', async () => {
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await waitFor(() => server.pending.length === 1);
    sub.unsubscribe();

    // The server handles the requests last sent first.
    await server.deliverAllReversed();
    expect([...server.subscribed]).toEqual([]);
  });

  test('a subscribe in flight whose unsubscribe was deferred times out: the client reconnects', async () => {
    c.disconnect();
    c = new Centrifuge([{ transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' }], {
      ...server.options,
      timeout: 100,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
    c.connect();
    await waitFor(() => c.state === State.Connected);
    const connecting: number[] = [];
    c.on('connecting', ctx => connecting.push(ctx.code));
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await waitFor(() => server.pending.length === 1);
    sub.unsubscribe();

    // The subscribe is never handled: whether the server subscribed is unknown.
    await waitFor(() => connecting.length > 0);
    expect(connecting[0]).toBe(connectingCodes.subscribeTimeout);
  });

  test('a subscribe after unsubscribe() of a subscribe in flight is not refused', async () => {
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await waitFor(() => server.pending.length === 1);
    sub.unsubscribe();
    sub.subscribe();

    await server.deliverAllReversed();
    await sub.ready(3000);
    expect([...server.subscribed]).toEqual(['ch']);
  });

  const sharedPoll = async () => {
    const sub: any = c.newSharedPollSubscription('poll');
    sub.subscribe();
    await waitFor(() => server.pending.length === 1);
    server.deliver(0);
    await sub.ready(3000);
    return sub;
  };
  const trackedAtServer = () => [...(server.tracked.get('poll') || [])];

  test('a shared poll untrack does not overtake the track in flight', async () => {
    const sub = await sharedPoll();
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    await waitFor(() => server.pending.length === 1);
    sub.untrack(['k1']);

    await server.deliverAllReversed();
    expect(trackedAtServer()).toEqual([]);
    expect([...sub.trackedKeys()]).toEqual([]);
  });

  test('a shared poll resubscribe waits for the requests of the earlier subscription', async () => {
    const sub = await sharedPoll();
    sub.track([{ key: 'k1', version: 0 }], 'signature');
    await waitFor(() => server.pending.length === 1);
    sub.untrack(['k1']);
    // The server resubscribes the client (insufficient state) meanwhile.
    server.push({ channel: 'poll', unsubscribe: { code: 2500, reason: 'insufficient state' } });
    await waitFor(() => sub.state === 'subscribing');

    await server.deliverAllReversed();
    await sub.ready(3000);
    await server.deliverAllReversed();
    expect([...server.subscribed]).toEqual(['poll']);
    expect(trackedAtServer()).toEqual([]);
  });

  test('a shared poll request timing out reconnects the client', async () => {
    c.disconnect();
    c = new Centrifuge([{ transport: 'http_stream' as TransportName, endpoint: 'http://localhost:1/connection/http_stream' }], {
      ...server.options,
      timeout: 100,
      minReconnectDelay: 10,
      maxReconnectDelay: 50,
      networkEventTarget: new EventTarget(),
    });
    c.connect();
    await waitFor(() => c.state === State.Connected);
    const sub = await sharedPoll();
    const connecting: number[] = [];
    c.on('connecting', ctx => connecting.push(ctx.code));
    sub.track([{ key: 'k1', version: 0 }], 'signature');

    // The track is never handled: whether the server tracks the key is unknown.
    await waitFor(() => connecting.length > 0);
    expect(connecting[0]).toBe(connectingCodes.subscribeTimeout);
  });
});
