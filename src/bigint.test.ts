import { Centrifuge } from './centrifuge';
import { FakeCentrifugoServer } from './fakeServer';
import { JsonCodec } from './json';
import WebSocket from 'ws';

const BigIntFn = (globalThis as any).BigInt;
const rawJSON = (JSON as any).rawJSON;
const big = '12345678901234567890';

describe('JsonCodec: bigint', () => {
  test('a bigint is encoded as a JSON number, exactly', () => {
    const codec = new JsonCodec();
    expect(codec.encodeCommands([{ publish: { data: { id: BigIntFn(big), n: 1 } } }]))
      .toBe(`{"publish":{"data":{"id":${big},"n":1}}}`);
  });

  test('without bigIntegers, integers past 2^53 are rounded, as before', () => {
    const codec = new JsonCodec();
    expect(codec.parse(`{"id":${big}}`).id).toBe(12345678901234567000);
  });

  test('with bigIntegers, only integers a number cannot hold exactly become bigint', () => {
    const codec = new JsonCodec(true);
    const v = codec.parse(
      `{"maxSafe":9007199254740991,"over":9007199254740993,"neg":-${big},"big":${big},` +
      `"exp":1e20,"frac":${big}.0,"str":"${big}","arr":[1,${big}],"f":1.5}`);
    expect(v.maxSafe).toBe(9007199254740991);
    expect(v.over).toBe(BigIntFn('9007199254740993'));
    expect(v.neg).toBe(BigIntFn('-' + big));
    expect(v.big).toBe(BigIntFn(big));
    expect(v.exp).toBe(1e20);
    expect(typeof v.frac).toBe('number');
    expect(v.str).toBe(big);
    expect(v.arr).toEqual([1, BigIntFn(big)]);
    expect(v.f).toBe(1.5);
  });

  test('a payload decoded with bigIntegers is encoded back as the same JSON', () => {
    const codec = new JsonCodec(true);
    const text = `{"id":${big},"n":9007199254740993,"safe":42,"f":1.5}`;
    expect(codec.encodeCommands([codec.parse(text)])).toBe(text);
  });

  test('bigIntegers applies to publication data a delta subscription receives', () => {
    const codec = new JsonCodec(true);
    expect(codec.applyDeltaIfNeeded({ delta: false, data: `{"id":${big}}` }, null).newData.id).toBe(BigIntFn(big));
  });

  test('data JSON cannot hold still fails to encode', () => {
    const cyclic: any = {};
    cyclic.self = cyclic;
    expect(() => new JsonCodec().encodeCommands([{ publish: { data: cyclic } }])).toThrow(TypeError);
  });
});

describe('Centrifuge: bigint', () => {
  let server: FakeCentrifugoServer;
  const clients: Centrifuge[] = [];

  beforeEach(async () => {
    server = await FakeCentrifugoServer.start();
  });

  afterEach(async () => {
    for (const c of clients.splice(0)) {
      c.disconnect();
    }
    await server.close();
  });

  async function connected(opts: any = {}): Promise<{ c: Centrifuge; frames: string[] }> {
    const c = new Centrifuge(server.url, { websocket: WebSocket, ...opts });
    clients.push(c);
    c.connect();
    await c.ready(5000);
    // The frames the client writes, as sent.
    const frames: string[] = [];
    const transport = (c as any)._transport;
    const send = transport.send.bind(transport);
    transport.send = (data: any, session: any, node: any) => {
      frames.push(data);
      return send(data, session, node);
    };
    return { c, frames };
  }

  test('a bigint is published exactly', async () => {
    const { c, frames } = await connected();
    await c.publish('ch', { id: BigIntFn(big) });
    expect(frames.join('\n')).toContain(`"data":{"id":${big}}`);
  });

  test('with bigIntegers, a big integer in a publication arrives as bigint', async () => {
    const { c } = await connected({ bigIntegers: true });
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await sub.ready(5000);
    const received = new Promise<any>(resolve => sub.on('publication', ctx => resolve(ctx.data)));
    server.publish('ch', { id: rawJSON(big), n: 1 });
    const data = await received;
    expect(data.id).toBe(BigIntFn(big));
    expect(data.n).toBe(1);
  });

  test('without bigIntegers, a big integer in a publication is rounded, as before', async () => {
    const { c } = await connected();
    const sub = c.newSubscription('ch');
    sub.subscribe();
    await sub.ready(5000);
    const received = new Promise<any>(resolve => sub.on('publication', ctx => resolve(ctx.data)));
    server.publish('ch', { id: rawJSON(big) });
    expect((await received).id).toBe(12345678901234567000);
  });

  test('a command whose data cannot be encoded fails alone, with the encoder\'s TypeError', async () => {
    const { c } = await connected();
    const cyclic: any = {};
    cyclic.self = cyclic;
    c.startBatching();
    const bad = c.publish('ch', cyclic);
    const good = c.publish('ch', { ok: true });
    c.stopBatching();
    await expect(bad).rejects.toBeInstanceOf(TypeError);
    await expect(good).resolves.toBeDefined();
    expect(server.received.some(cmd => cmd.publish && cmd.publish.data && cmd.publish.data.ok === true)).toBe(true);
  });

  test('send with data which cannot be encoded fails with the encoder\'s TypeError', async () => {
    const { c } = await connected();
    const cyclic: any = {};
    cyclic.self = cyclic;
    await expect(c.send(cyclic)).rejects.toBeInstanceOf(TypeError);
  });
});
