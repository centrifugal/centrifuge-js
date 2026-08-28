import { JsonCodec } from './json';

describe('JsonCodec.applyDeltaIfNeeded', () => {
  const codec = new JsonCodec();

  it('reports the UTF-8 wire byte length for a full payload, not the JS string length', () => {
    // Contains multi-byte UTF-8 characters (accents, Greek, emoji), so the
    // UTF-16 string length differs from the actual UTF-8 byte length.
    const data = JSON.stringify({ text: 'café 😀 δelta ünïcode' });
    const trueByteLength = new TextEncoder().encode(data).length;
    expect(trueByteLength).not.toBe(data.length);

    const result = codec.applyDeltaIfNeeded({ delta: false, data }, null);

    expect(result.wireBytes).toBe(trueByteLength);
    expect(result.wireBytes).not.toBe(data.length);
    expect(result.fullBytes).toBe(trueByteLength);
    expect(result.newData).toEqual({ text: 'café 😀 δelta ünïcode' });
  });

  it('reports the UTF-8 wire byte length for a delta payload, not the JS string length', () => {
    // A hand-built fossil delta (no copy commands, pure insert) that decodes
    // to '{"text":"café 😀 δelta ünïcode"}'. As a raw byte array it is valid
    // UTF-8, so the server can carry it over the wire as a JSON string —
    // but that string's UTF-16 length is shorter than the delta's real byte size.
    const deltaBytes = new Uint8Array([
      98, 10, 98, 58, 123, 34, 116, 101, 120, 116, 34, 58, 34, 99, 97, 102,
      195, 169, 32, 240, 159, 152, 128, 32, 206, 180, 101, 108, 116, 97, 32,
      195, 188, 110, 195, 175, 99, 111, 100, 101, 34, 125, 51, 122, 103, 52,
      84, 79, 59,
    ]);
    const data = new TextDecoder().decode(deltaBytes);
    expect(deltaBytes.length).not.toBe(data.length);

    const result = codec.applyDeltaIfNeeded({ delta: true, data }, new Uint8Array());

    expect(result.wireBytes).toBe(deltaBytes.length);
    expect(result.wireBytes).not.toBe(data.length);
    expect(result.newData).toEqual({ text: 'café 😀 δelta ünïcode' });
  });
});
