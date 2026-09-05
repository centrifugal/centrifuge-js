import { HttpStreamTransport } from './transport_http_stream';

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
