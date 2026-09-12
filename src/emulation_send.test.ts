import { HttpStreamTransport } from './transport_http_stream';
import { SseTransport } from './transport_sse';

// A command sent through the emulation endpoint that fails at the network level
// must close the transport (so the client reconnects), not leave an unhandled
// rejection behind.

const EMULATION_ENDPOINT = 'http://example.com/emulation';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function callbacks(closes: any[]) {
  return {
    onOpen() { /* no-op */ },
    onError() { /* no-op */ },
    onClose: (e: any) => closes.push(e),
    onMessage() { /* no-op */ },
  };
}

describe('emulation request failure', () => {
  let emulationFails: boolean;

  const emulationRequest = () => emulationFails
    ? Promise.reject(new TypeError('fetch failed'))
    : Promise.resolve({ ok: true });

  beforeEach(() => {
    emulationFails = false;
  });

  test('closes http_stream transport', async () => {
    const fetch = (url: string, options: any) => {
      if (url === EMULATION_ENDPOINT) {
        return emulationRequest();
      }
      // The stream stays open until the transport aborts it.
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    };
    const transport = new HttpStreamTransport('http://example.com/connection/http_stream', {
      fetch,
      readableStream: class { },
      emulationEndpoint: EMULATION_ENDPOINT,
    });
    const closes: any[] = [];
    transport.initialize('json', callbacks(closes), '');

    transport.send('{}', 'session', 'node');
    await delay(10);
    expect(closes).toEqual([]);

    emulationFails = true;
    transport.send('{}', 'session', 'node');
    await delay(10);
    expect(closes).toHaveLength(1);
  });

  test('closes sse transport', async () => {
    class FakeEventSource {
      constructor(_url: string) { /* no-op */ }
      close() { /* no-op */ }
    }
    const transport = new SseTransport('http://example.com/connection/sse', {
      eventsource: FakeEventSource,
      fetch: emulationRequest,
      emulationEndpoint: EMULATION_ENDPOINT,
    });
    const closes: any[] = [];
    transport.initialize('json', callbacks(closes), '');

    transport.send('{}', 'session', 'node');
    await delay(10);
    expect(closes).toEqual([]);

    emulationFails = true;
    transport.send('{}', 'session', 'node');
    await delay(10);
    expect(closes).toHaveLength(1);
  });
});
