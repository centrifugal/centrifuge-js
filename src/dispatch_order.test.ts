import { Centrifuge } from './centrifuge';

// Frames received in the same tick must be dispatched in order. ws emits several
// 'message' events from one TCP read, e.g. right after a reconnect: a subscribe
// reply with recovered publications followed by a live publication.

class StubWebSocket {
  send() {}
  close() {}
}

function publication(n: number): string {
  return JSON.stringify({ push: { channel: 'ch', pub: { data: { n }, offset: n } } });
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

async function deliver(frames: string[]): Promise<number[]> {
  const c = new Centrifuge('ws://localhost/connection/websocket', { websocket: StubWebSocket });
  const sub = c.newSubscription('ch');
  const received: number[] = [];
  sub.on('publication', (ctx) => received.push(ctx.data.n));
  for (const frame of frames) {
    (c as any)._dataReceived(frame);
  }
  await new Promise(resolve => setTimeout(resolve, 20));
  return received;
}

describe('dispatch order', () => {
  test('a frame is not overtaken by the next frame received in the same tick', async () => {
    const received = await deliver([range(1, 3).map(publication).join('\n'), publication(4)]);
    expect(received).toEqual(range(1, 4));
  });

  test('recovered publications are not overtaken by a live publication', async () => {
    const received = await deliver([range(1, 13).map(publication).join('\n'), publication(14)]);
    expect(received).toEqual(range(1, 14));
  });

  test('several frames with several replies each keep their order', async () => {
    const received = await deliver([
      range(1, 2).map(publication).join('\n'),
      range(3, 4).map(publication).join('\n'),
      publication(5),
    ]);
    expect(received).toEqual(range(1, 5));
  });
});
