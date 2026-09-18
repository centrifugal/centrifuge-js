import { Writer } from 'protobufjs/minimal';
import { WebtransportTransport } from './transport_webtransport';
import { centrifugal } from './client_proto';
import { ProtobufCodec } from './protobuf.codec';

function fakeReadableStream(chunks: (Uint8Array | undefined)[]) {
  let i = 0;
  return {
    getReader() {
      return {
        read: async () => {
          if (i < chunks.length) {
            const value = chunks[i++];
            return { done: false, value };
          }
          return { done: true, value: undefined };
        }
      };
    }
  };
}

describe('WebtransportTransport._startReading', () => {
  it('does not crash on the final done chunk with no value', async () => {
    const transport = new WebtransportTransport('https://example.com/connection/webtransport', {});
    (transport as any)._protocol = 'json';
    const encoder = new TextEncoder();
    (transport as any)._stream = {
      readable: fakeReadableStream([encoder.encode('{"id":1}\n')])
    };

    const events: string[] = [];
    const messages: any[] = [];
    const eventTarget = new EventTarget();
    eventTarget.addEventListener('message', (e: any) => { events.push('message'); messages.push(e.data); });
    eventTarget.addEventListener('close', () => { events.push('close'); });

    await (transport as any)._startReading(eventTarget);

    // Before the fix, `value.length` on the final {done: true, value: undefined}
    // chunk threw, which was swallowed by the outer catch and turned into a
    // spurious 'close' event even though the stream ended cleanly.
    expect(messages).toEqual(['{"id":1}']);
    expect(events).toEqual(['message']);
  });
});

describe('WebtransportTransport._startReading UTF-8 handling', () => {
  it('decodes a multi-byte character split across two chunks', async () => {
    const transport = new WebtransportTransport('https://example.com/connection/webtransport', {});
    (transport as any)._protocol = 'json';
    const payload = JSON.stringify({ data: 'привет 🎉' });
    const full = new TextEncoder().encode(payload + '\n');
    // Split in the middle of the first Cyrillic character (2-byte sequence).
    const splitAt = payload.indexOf('привет') + 1;
    (transport as any)._stream = {
      readable: fakeReadableStream([full.slice(0, splitAt), full.slice(splitAt)])
    };

    const messages: any[] = [];
    const eventTarget = new EventTarget();
    eventTarget.addEventListener('message', (e: any) => { messages.push(e.data); });

    await (transport as any)._startReading(eventTarget);

    // Without {stream: true} the decoder would emit U+FFFD for the bytes of the
    // character straddling the chunk boundary.
    expect(messages).toEqual([payload]);
  });

  it('reads a large reply arriving in many small chunks without copying the buffered text for each', async () => {
    const line = JSON.stringify({ push: { channel: 'ch', pub: { data: 'z'.repeat(8 * 1024 * 1024), offset: 1 } } });
    const data = new TextEncoder().encode(line + '\n');
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += 1024) {
      chunks.push(data.slice(i, i + 1024));
    }

    const transport = new WebtransportTransport('https://example.com/connection/webtransport', {});
    (transport as any)._protocol = 'json';
    (transport as any)._stream = { readable: fakeReadableStream(chunks) };

    const messages: any[] = [];
    const eventTarget = new EventTarget();
    eventTarget.addEventListener('message', (e: any) => { messages.push(e.data); });
    const started = Date.now();
    await (transport as any)._startReading(eventTarget);

    expect(messages).toHaveLength(1);
    expect(messages[0] === line).toBe(true);
    // Copying the whole buffered text again for each of the 8193 chunks takes seconds.
    expect(Date.now() - started).toBeLessThan(1000);
  }, 60000);
});

describe('WebtransportTransport._startReading protobuf', () => {
  it('reads a large reply arriving in many small chunks without copying the buffer for each', async () => {
    const writer = Writer.create();
    centrifugal.centrifuge.protocol.Reply.encodeDelimited(
      { push: { channel: 'ch', pub: { data: new Uint8Array(4 * 1024 * 1024).fill(122), offset: 1 } } }, writer);
    const reply = writer.finish();
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < reply.length; i += 1024) {
      chunks.push(reply.slice(i, i + 1024));
    }

    const transport = new WebtransportTransport('https://example.com/connection/webtransport', { decoder: new ProtobufCodec() });
    (transport as any)._protocol = 'protobuf';
    (transport as any)._stream = { readable: fakeReadableStream(chunks) };

    const messages: any[] = [];
    const eventTarget = new EventTarget();
    eventTarget.addEventListener('message', (e: any) => { messages.push(e.data); });
    const started = Date.now();
    await (transport as any)._startReading(eventTarget);

    expect(messages).toHaveLength(1);
    expect(Buffer.from(messages[0]).equals(Buffer.from(reply))).toBe(true);
    // Copying the whole buffer again for each of the 4097 chunks takes seconds.
    expect(Date.now() - started).toBeLessThan(1000);
  }, 60000);
});
