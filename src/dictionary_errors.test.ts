import { Centrifuge } from './centrifuge';
import { TransportName } from './types';
import { FakeCentrifugoServer } from './fakeServer';
import { FrameCodecCompressed } from './frame_codec';
import { deflateRawSync } from 'zlib';

import WebSocket from 'ws';

// A dictionary the client can not use leaves it reconnecting with code 2 (bad
// protocol). These tests check the reason says what went wrong, since that is
// all an application gets to see of it.

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
    emitter.once(event, (ctx: T) => {
      clearTimeout(timer);
      resolve(ctx);
    });
  });
}

const baseConnectResult = { client: 'fake-client', version: '0.0.0', ping: 25 };

describe('dictionary compression errors', () => {
  let server: FakeCentrifugoServer;

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
  });

  afterEach(async () => {
    await server.close();
  });

  test('a dictionary that does not inflate is reported as a connect error', async () => {
    server.connectResult = {
      ...baseConnectResult,
      flag: 1,
      dict: { id: 'abc', data_b64: Buffer.from([1, 2, 3, 4]).toString('base64') },
    };
    const c = createClient(server.url);
    const error = waitForEvent<any>(c, 'error');
    c.connect();

    const ctx = await error;
    expect(ctx.type).toBe('connect');
    expect(ctx.error.message).toMatch(/^dictionary compression: dictionary abc does not inflate/);

    server.connectResult = baseConnectResult;
    await waitForEvent(c, 'connected');
    c.disconnect();
  });

  test('a frame that does not decode reconnects with bad protocol and says why', async () => {
    const dict = Buffer.from('{"push":{"channel":"demo","pub":{"data":{"symbol":"'.repeat(20));
    server.connectResult = {
      ...baseConnectResult,
      flag: 1,
      dict: { id: 'abc', data_b64: deflateRawSync(dict).toString('base64') },
    };
    const c = createClient(server.url);
    c.connect();
    await waitForEvent(c, 'connected');

    const connecting = waitForEvent<any>(c, 'connecting');
    // A compressed marker followed by bytes that are not DEFLATE.
    (server as any).current.send(Buffer.from([FrameCodecCompressed, 0xff, 0xff, 0xff, 0xff]));

    const ctx = await connecting;
    expect(ctx.code).toBe(2);
    expect(ctx.reason).toMatch(/^dictionary compression: frame does not decode with dictionary abc: /);
    c.disconnect();
  });
});
