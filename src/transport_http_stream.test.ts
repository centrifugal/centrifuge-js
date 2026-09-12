import { Writer } from 'protobufjs/minimal';
import { HttpStreamTransport } from './transport_http_stream';
import { centrifugal } from './client_proto';
import { ProtobufCodec } from './protobuf.codec';

function fakeBody(chunks: Uint8Array[]) {
  let i = 0;
  return {
    getReader() {
      return {
        read: async () => {
          if (i < chunks.length) {
            return { done: false, value: chunks[i++] };
          }
          return { done: true, value: undefined };
        }
      };
    }
  };
}

// Minimal stand-in for ReadableStream: just runs the underlying source's start().
class FakeReadableStream {
  constructor(source: any) {
    source.start({ close() { /* no-op */ } });
  }
}

describe('HttpStreamTransport JSON stream parsing', () => {
  it('decodes a multi-byte character split across two chunks', async () => {
    const payload = JSON.stringify({ data: 'привет 🎉' });
    const full = new TextEncoder().encode(payload + '\n');
    // Split in the middle of the first Cyrillic character (2-byte sequence).
    const splitAt = payload.indexOf('привет') + 1;

    const transport = new HttpStreamTransport('https://example.com/connection/http_stream', {
      fetch: async () => ({ ok: true, body: fakeBody([full.slice(0, splitAt), full.slice(splitAt)]) }),
      readableStream: FakeReadableStream
    });

    const messages: any[] = [];
    const eventTarget = (transport as any)._fetchEventTarget(transport, 'https://example.com', {});
    eventTarget.addEventListener('message', (e: any) => { messages.push(e.data); });
    const closed = new Promise<void>(resolve => eventTarget.addEventListener('close', () => resolve()));
    await closed;

    // Without {stream: true} the decoder would emit U+FFFD for the bytes of the
    // character straddling the chunk boundary.
    expect(messages).toEqual([payload]);
  });
});

describe('HttpStreamTransport protobuf stream parsing', () => {
  it('decodes a reply split across chunks', async () => {
    const writer = Writer.create();
    centrifugal.centrifuge.protocol.Reply.encodeDelimited(
      { push: { channel: 'ch', pub: { data: new Uint8Array(70000).fill(122), offset: 1 } } }, writer);
    const reply = writer.finish();

    // The first chunk ends inside the length prefix, the second inside the data.
    const transport = new HttpStreamTransport('https://example.com/connection/http_stream', {
      fetch: async () => ({ ok: true, body: fakeBody([reply.slice(0, 1), reply.slice(1, 1000), reply.slice(1000)]) }),
      readableStream: FakeReadableStream,
      decoder: new ProtobufCodec(),
    });
    (transport as any)._protocol = 'protobuf';

    const messages: any[] = [];
    const errors: any[] = [];
    const eventTarget = (transport as any)._fetchEventTarget(transport, 'https://example.com', {});
    eventTarget.addEventListener('message', (e: any) => { messages.push(e.data); });
    eventTarget.addEventListener('error', (e: any) => { errors.push(e); });
    await new Promise<void>(resolve => eventTarget.addEventListener('close', () => resolve()));

    expect(errors).toEqual([]);
    expect(messages).toHaveLength(1);
    expect(Buffer.from(messages[0]).equals(Buffer.from(reply))).toBe(true);
  });
});
