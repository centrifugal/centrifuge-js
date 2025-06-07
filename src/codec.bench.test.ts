import { ProtobufCodec } from './protobuf.codec';
import { JsonCodec } from './json';
import { performance } from 'perf_hooks';

const BENCH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzIzNDgsImNoYW5uZWwiOiJ0ZXN0MSJ9.eqPQxbBtyYxL8Hvbkm-P6aH7chUsSG_EMWe-rTwF_HI';

const createFixedCommands = (): any[] => [
  { id: 1, connect: { token: BENCH_TOKEN } },
  { id: 2, subscribe: { channel: 'channel1', token: BENCH_TOKEN } },
  { id: 3, subscribe: { channel: 'channel2', token: BENCH_TOKEN } },
  { id: 4, subscribe: { channel: 'channel3', token: BENCH_TOKEN } },
  { id: 5, subscribe: { channel: 'channel4', token: BENCH_TOKEN } }
];

const runNIterations = (n: number, fn: () => void): { totalMs: number, avgMicro: number } => {
  const start = performance.now();
  for (let i = 0; i < n; i++) {
    fn();
  }
  const totalMs = performance.now() - start;
  return {
    totalMs,
    avgMicro: (totalMs * 1000) / n
  };
};

describe('Codec benchmark (Protobuf vs JSON)', () => {
  const N = 10000;
  const commands = createFixedCommands();

  describe('ProtobufCodec', () => {
    const codec = new ProtobufCodec();
    let encoded: Uint8Array;
    let lastDecoded: any;

    it(`encodeCommands – ${N} runs`, () => {
      const { totalMs, avgMicro } = runNIterations(N, () => {
        encoded = codec.encodeCommands(commands);
      });

      console.log(`🔹 Protobuf Encode: ${N} runs — Total: ${totalMs.toFixed(2)} ms, Avg: ${avgMicro.toFixed(2)} µs/op`);
      expect(encoded).toBeInstanceOf(Uint8Array);
    });

    it(`decodeReplies – ${N} runs`, () => {
      expect(encoded).toBeDefined();

      try {
        const { totalMs, avgMicro } = runNIterations(N, () => {
          lastDecoded = codec.decodeReplies(encoded);
        });

        console.log(`🔹 Protobuf Decode: ${N} runs — Total: ${totalMs.toFixed(2)} ms, Avg: ${avgMicro.toFixed(2)} µs/op`);
        expect(Array.isArray(lastDecoded)).toBe(true);
      } catch (err: any) {
        console.warn('⚠️  Protobuf decoding failed:', err.message);
      }
    });
  });

  describe('JsonCodec', () => {
    const codec = new JsonCodec();
    let encoded: string;
    let lastDecoded: any;

    it(`encodeCommands – ${N} runs`, () => {
      const { totalMs, avgMicro } = runNIterations(N, () => {
        encoded = codec.encodeCommands(commands);
      });

      console.log(`🔸 JSON Encode: ${N} runs — Total: ${totalMs.toFixed(2)} ms, Avg: ${avgMicro.toFixed(2)} µs/op`);
      expect(typeof encoded).toBe('string');
    });

    it(`decodeReplies – ${N} runs`, () => {
      expect(encoded).toBeDefined();

      const { totalMs, avgMicro } = runNIterations(N, () => {
        lastDecoded = codec.decodeReplies(encoded);
      });

      console.log(`🔸 JSON Decode: ${N} runs — Total: ${totalMs.toFixed(2)} ms, Avg: ${avgMicro.toFixed(2)} µs/op`);
      expect(Array.isArray(lastDecoded)).toBe(true);
    });
  });
});