import WebSocket, { WebSocketServer } from 'ws';

// In-process Centrifugo fake server for tests, speaking the JSON protocol
// (newline-delimited JSON commands/replies). It is intentionally protocol-level
// and generic: it provides sensible defaults for the connect/subscribe/
// unsubscribe handshake, captures received commands for assertions, and exposes
// hooks + raw push senders so new scenarios can be added WITHOUT touching the
// client under test or this helper.
//
// This exists because some features (channel compaction, and in future others)
// are Centrifugo PRO only and can't be exercised against the OSS docker-compose
// server the other suites use; and because a fake makes deterministic control
// of timing, errors and reconnects much easier than a real server.
//
// How to extend (most→least common):
//   - Customize a subscribe reply:           server.onSubscribe = (ch, req) => ({ recoverable: true, epoch: 'e1' })
//   - Negotiate channel compaction:          server.onSubscribe = (ch, req) => (req.flag & 1 ? { id: 42 } : {})
//   - Push to a subscription:                server.publish(42, { foo: 1 })   // by numeric id (compaction)
//                                            server.publish('news', { foo: 1 }) // by channel name
//   - Fully control any command reply:       server.onCommand = (cmd) => cmd.rpc ? { id: cmd.id, error: { code: 1, message: 'x' } } : undefined
//   - Send anything the protocol allows:     server.sendPush({ disconnect: { code: 3000, reason: 'bye' } })
//   - Drive a reconnect:                     server.closeConnection()
//   - Assert on what the client sent:        server.received / server.lastSubscribe
//   - Take the connect frame from handshakes: server.handshakeConnect = true
//   - Reject handshakes (e.g. as a proxy):   server.rejectHandshake = (protocols) => protocols.some(p => p.startsWith('cf-connect.'))
//   - Assert on offered subprotocols:        server.handshakes

/** Options for a subscribe reply. Extend with more fields as scenarios need them. */
export interface SubscribeReplyOptions {
  // Numeric channel id for channel compaction (omit/0 = not negotiated).
  id?: number;
  recoverable?: boolean;
  positioned?: boolean;
  epoch?: string;
  offset?: number;
  recovered?: boolean;
  wasRecovering?: boolean;
  expires?: boolean;
  ttl?: number;
  data?: any;
  publications?: any[];
}

/** Push target: a numeric channel id (channel compaction) or a channel name. */
export type PushTarget = number | string;

export type CommandHandler = (cmd: any, server: FakeCentrifugoServer) => any | null | undefined;
export type SubscribeHandler = (channel: string, req: any) => SubscribeReplyOptions;

export class FakeCentrifugoServer {
  private wss: WebSocketServer;
  private current: WebSocket | null = null;

  /** All commands received from the client, in order. */
  readonly received: any[] = [];

  /** connect reply fields. Override to set expires/ttl/data/etc. */
  connectResult: any = { client: 'fake-client', version: '0.0.0', ping: 25 };

  /** Full override for any command — return a reply object to send, or
   *  null/undefined to fall through to default handling. */
  onCommand: CommandHandler | null = null;

  /** Customize the subscribe result per channel (default: empty result). */
  onSubscribe: SubscribeHandler | null = null;

  /** Take the connect frame sent inside the handshake (cf-connect.<base64url>),
   *  confirming with cf-json-hc, like a server with handshake connect enabled. */
  handshakeConnect = false;

  /** Subprotocols offered in each handshake, in order, including rejected ones. */
  readonly handshakes: string[][] = [];

  /** Commands taken from handshakes, in order (they are in received too). */
  readonly handshakeCommands: any[] = [];

  /** Return true to reject a handshake with HTTP 400 before upgrading. */
  rejectHandshake: ((protocols: string[]) => boolean) | null = null;

  private constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.current = ws;
      if (ws.protocol === 'cf-json-hc') {
        const data = FakeCentrifugoServer.handshakeData(FakeCentrifugoServer.offered(req.headers['sec-websocket-protocol']));
        for (const line of (data || '').split('\n')) {
          if (line) {
            const cmd = JSON.parse(line);
            this.handshakeCommands.push(cmd);
            this.dispatch(cmd);
          }
        }
      }
      ws.on('message', (data: Buffer) => {
        // JSON protocol frames commands as newline-delimited JSON.
        for (const line of data.toString().trim().split('\n')) {
          if (line) this.dispatch(JSON.parse(line));
        }
      });
    });
  }

  static async start(): Promise<FakeCentrifugoServer> {
    let server: FakeCentrifugoServer | null = null;
    const wss = new WebSocketServer({
      port: 0,
      verifyClient: (info: any, done: (ok: boolean, code?: number) => void) => {
        const protocols = FakeCentrifugoServer.offered(info.req.headers['sec-websocket-protocol']);
        server!.handshakes.push(protocols);
        const reject = server!.rejectHandshake !== null && server!.rejectHandshake(protocols);
        done(!reject, 400);
      },
      // Like the real server: cf-json-hc only with valid data when enabled, never
      // the data itself; otherwise the first other offered subprotocol.
      handleProtocols: (protocols: Set<string>) => {
        const list = Array.from(protocols);
        if (server!.handshakeConnect && list.includes('cf-json-hc') && FakeCentrifugoServer.handshakeData(list)) {
          return 'cf-json-hc';
        }
        const other = list.find(p => !p.endsWith('-hc') && !p.startsWith('cf-connect.'));
        return other === undefined ? false : other;
      },
    });
    server = new FakeCentrifugoServer(wss);
    await new Promise<void>(resolve => wss.on('listening', () => resolve()));
    return server;
  }

  private static offered(header: string | undefined): string[] {
    return header ? header.split(',').map(p => p.trim()).filter(p => p !== '') : [];
  }

  // The connect frame from a cf-connect.<base64url> subprotocol, or null.
  private static handshakeData(protocols: string[]): string | null {
    const p = protocols.find(p => p.startsWith('cf-connect.'));
    if (!p) {
      return null;
    }
    const data = Buffer.from(p.slice('cf-connect.'.length), 'base64url').toString();
    return data === '' ? null : data;
  }

  get url(): string {
    const addr = this.wss.address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    return `ws://localhost:${port}/connection/websocket`;
  }

  /** The most recent subscribe request the client sent (or undefined). */
  get lastSubscribe(): any {
    for (let i = this.received.length - 1; i >= 0; i--) {
      if (this.received[i].subscribe !== undefined) return this.received[i].subscribe;
    }
    return undefined;
  }

  /** Stop the server. */
  close(): Promise<void> {
    return new Promise<void>(resolve => this.wss.close(() => resolve()));
  }

  /** Close the active connection from the server side, triggering the client's
   *  automatic reconnect. */
  closeConnection(): void {
    this.current?.close();
  }

  private dispatch(cmd: any) {
    this.received.push(cmd);

    if (this.onCommand) {
      const reply = this.onCommand(cmd, this);
      if (reply !== null && reply !== undefined) {
        this.send(reply);
        return;
      }
    }

    if (cmd.connect !== undefined) {
      this.send({ id: cmd.id, connect: this.connectResult });
    } else if (cmd.subscribe !== undefined) {
      const result = this.onSubscribe ? { ...this.onSubscribe(cmd.subscribe.channel, cmd.subscribe) } : {};
      this.send({ id: cmd.id, subscribe: result });
    } else if (cmd.unsubscribe !== undefined) {
      this.send({ id: cmd.id, unsubscribe: {} });
    } else if (cmd.id) {
      // Reply to any other command with an empty result to avoid client timeouts.
      this.send({ id: cmd.id });
    }
  }

  // --- raw escape hatches -------------------------------------------------

  /** Send a raw reply object. */
  send(reply: any): void {
    this.current?.send(JSON.stringify(reply));
  }

  /** Send a raw push (wrapped in a reply). */
  sendPush(push: any): void {
    this.send({ push });
  }

  // --- typed push senders -------------------------------------------------

  private targetFields(target: PushTarget): any {
    // Channel compaction pushes carry a numeric id and no channel; otherwise the
    // channel name is used.
    return typeof target === 'number' ? { id: target } : { channel: target };
  }

  publish(target: PushTarget, data: any, extra: any = {}): void {
    this.sendPush({ ...this.targetFields(target), pub: { data, ...extra } });
  }

  join(target: PushTarget, info: any): void {
    this.sendPush({ ...this.targetFields(target), join: { info } });
  }

  leave(target: PushTarget, info: any): void {
    this.sendPush({ ...this.targetFields(target), leave: { info } });
  }

  unsubscribe(channel: string, code: number, reason: string): void {
    this.sendPush({ channel, unsubscribe: { code, reason } });
  }

  disconnect(code: number, reason: string): void {
    this.sendPush({ disconnect: { code, reason } });
  }

  message(data: any): void {
    this.sendPush({ message: { data } });
  }
}
