import { WebtransportTransport } from './transport_webtransport';

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
