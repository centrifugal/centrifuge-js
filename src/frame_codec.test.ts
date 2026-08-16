import { deflateRawSync } from 'node:zlib';
import { FrameCodec, frameCodecFromDictionary, FrameCodecRaw, FrameCodecCompressed } from './frame_codec';
import { DictionaryCache } from './dictionary_cache';

// frame_codec is what every compressed frame passes through, so these cover the
// two things a wrong answer costs: a frame decoded against the wrong bytes is
// not an error, it is silently different content, and a frame trusted for its
// size can be a small input that expands into a large allocation.
describe('frame codec', () => {
  const dict = new TextEncoder().encode('{"push":{"channel":"demo","pub":{"data":{"event":"price.changed"');
  const payload = '{"push":{"channel":"demo","pub":{"data":{"event":"price.changed","v":1}}}}';

  // What a server puts on the wire: a marker byte, then raw DEFLATE against the
  // shared dictionary.
  const compressedFrame = (text: string, against: Uint8Array = dict) =>
    new Uint8Array([FrameCodecCompressed, ...deflateRawSync(Buffer.from(text), { dictionary: Buffer.from(against) })]);
  const rawFrame = (text: string) =>
    new Uint8Array([FrameCodecRaw, ...new TextEncoder().encode(text)]);

  it('decodes a frame compressed against its dictionary', () => {
    const c = new FrameCodec('id', dict);
    expect(c.decode(compressedFrame(payload), true)).toEqual(payload);
  });

  it('passes a raw frame through untouched', () => {
    // The server declines to compress whatever would not shrink, so every
    // client has to read this marker even on a compressed connection.
    const c = new FrameCodec('id', dict);
    expect(c.decode(rawFrame(payload), true)).toEqual(payload);
  });

  it('returns bytes rather than text on a binary connection', () => {
    const c = new FrameCodec('id', dict);
    const out = c.decode(compressedFrame(payload), false);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(out)).toEqual(payload);
  });

  it('refuses a marker it does not know', () => {
    const c = new FrameCodec('id', dict);
    expect(() => c.decode(new Uint8Array([0x7f, 1, 2, 3]), true)).toThrow(/unknown frame codec/);
  });

  it('refuses an empty frame', () => {
    const c = new FrameCodec('id', dict);
    expect(() => c.decode(new Uint8Array([]), true)).toThrow(/empty frame/);
  });

  it('does not reproduce the payload when the dictionary differs', () => {
    // Compressed against the real dictionary, decoded against other bytes. The
    // frame has to reference the dictionary for this to diverge at all - a
    // payload with nothing in common with it compresses to literals alone and
    // decodes identically whatever dictionary is installed, which is the same
    // property that makes a substituted dictionary able to rewrite content:
    // what changes is whatever the back references point at.
    const other = new TextEncoder().encode('unrelated bytes entirely, nothing in common at all');
    const c = new FrameCodec('id', other);
    let out: any;
    try {
      out = c.decode(compressedFrame(payload, dict), true);
    } catch (e) {
      return; // rejected outright, which is the good case
    }
    expect(out).not.toEqual(payload);
  });

  it('refuses a frame that expands past the limit', () => {
    // A few kilobytes of zeros expand to more than the ceiling. Nothing legitimate
    // reaches it, so the only sender that gets here is one trying to make the
    // client allocate on command.
    const bomb = new Uint8Array([FrameCodecCompressed,
      ...deflateRawSync(Buffer.alloc(17 * 1024 * 1024), { dictionary: Buffer.from(dict) })]);
    const c = new FrameCodec('id', dict);
    expect(() => c.decode(bomb, true)).toThrow(/too large/);
  });

  it('counts what it received and what it expanded to', () => {
    const c = new FrameCodec('id', dict);
    const frame = compressedFrame(payload);
    c.decode(frame, true);
    const s = c.getStats();
    expect(s.frames).toEqual(1);
    expect(s.bytesReceived).toEqual(frame.length);
    expect(s.bytesDecompressed).toEqual(payload.length);
    expect(s.bytesDecompressed).toBeGreaterThan(s.bytesReceived); // it did compress
  });
});

describe('building a codec from a connect reply dictionary', () => {
  // Repetitive, like a real dictionary built from sampled traffic - a few dozen
  // bytes would not compress, which would make the size assertions vacuous.
  const dict = new TextEncoder().encode(
    '{"push":{"channel":"demo","pub":{"data":{"event":"price.changed","symbol":"","venue":"NASDAQ"'.repeat(20));
  const packed = new Uint8Array(deflateRawSync(Buffer.from(dict)));

  it('takes raw bytes, as a Protobuf connection carries them', () => {
    const c = frameCodecFromDictionary({ id: 'abc', data: packed });
    expect(c).not.toBeNull();
    expect(c!.id).toEqual('abc');
    expect(c!.dictionary).toEqual(dict);
  });

  it('takes base64, as a JSON connection carries them', () => {
    // A bytes field holds raw JSON on a JSON connection, so it cannot hold
    // binary - the same dictionary arrives base64 encoded instead.
    const b64 = Buffer.from(packed).toString('base64');
    const c = frameCodecFromDictionary({ id: 'abc', data_b64: b64 });
    expect(c).not.toBeNull();
    expect(c!.dictionary).toEqual(dict);
  });

  it('charges the dictionary at its encoded size, not its inflated one', () => {
    const b64 = Buffer.from(packed).toString('base64');
    const c = frameCodecFromDictionary({ id: 'abc', data_b64: b64 });
    expect(c!.getStats().dictionaryBytes).toEqual(b64.length);
    expect(c!.getStats().dictionaryBytes).toBeLessThan(dict.length);
  });

  it('resolves an id with no content from the cache', () => {
    // The warm path: the server recognised the id this client advertised, so it
    // sent nothing and the bytes come from here.
    const cache = new DictionaryCache();
    cache.put('abc', dict);
    const c = frameCodecFromDictionary({ id: 'abc' }, cache);
    expect(c).not.toBeNull();
    expect(c!.dictionary).toEqual(dict);
    // Nothing crossed the wire, so nothing is charged for it.
    expect(c!.getStats().dictionaryBytes).toEqual(0);
  });

  it('returns null for an id the client does not hold', () => {
    // Nothing after this frame could be decoded, so the caller has to notice
    // rather than install a codec built on nothing.
    expect(frameCodecFromDictionary({ id: 'unknown' }, new DictionaryCache())).toBeNull();
    expect(frameCodecFromDictionary({ id: 'unknown' })).toBeNull();
  });

  it('returns null for content that is not valid deflate', () => {
    expect(frameCodecFromDictionary({ id: 'abc', data: new Uint8Array([1, 2, 3, 4]) })).toBeNull();
  });

  it('returns null for nothing at all', () => {
    expect(frameCodecFromDictionary(null)).toBeNull();
    expect(frameCodecFromDictionary(undefined)).toBeNull();
  });
});
