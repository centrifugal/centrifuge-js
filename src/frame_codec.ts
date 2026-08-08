import { inflateSync } from 'fflate';
import { DictionaryCache } from './dictionary_cache';

/**
 * ConnectRequest.flag advertises which connection-level capabilities this client
 * supports. The server replies with the subset it enabled in ConnectResult.flag.
 * @internal
 */
export const connectionFlagDictionaryCompression = 1 << 0;

/**
 * What this SDK advertises at connect.
 * @internal
 */
export const supportedConnectionFlags = connectionFlagDictionaryCompression;

/**
 * Frame codec markers. Once a connection has negotiated dictionary compression
 * every frame starts with one of these.
 *
 * The marker deliberately does not name a codec. Which codec a connection uses
 * is settled once, at connect, by the capability flags the client advertised, so
 * repeating it per frame would be redundant. The marker only answers the one
 * question that varies frame to frame: was this frame compressed at all.
 *
 * @internal
 */
export const FrameCodecRaw = 0x00;
/** @internal */
export const FrameCodecCompressed = 0x01;

/**
 * Bounds a frame after decompression, so a small crafted frame can not be
 * inflated into an unbounded allocation.
 * @internal
 */
const maxDecompressedFrameSize = 16 * 1024 * 1024;

/**
 * Bounds a dictionary after inflation, for the same reason. Useful dictionaries
 * are a few kilobytes; this leaves generous headroom.
 * @internal
 */
const maxDictionarySize = 1024 * 1024;



/**
 * What a connection measured about dictionary compression.
 * @internal
 */
export interface FrameCodecStats {
  frames: number;
  bytesReceived: number;
  bytesDecompressed: number;
  dictionaryBytes: number;
}

/**
 * FrameCodec decodes frames compressed with DEFLATE against a shared dictionary
 * the server sent over ConnectionState.
 *
 * @internal
 */
export class FrameCodec {
  readonly id: string;
  readonly dictionary: Uint8Array;
  private dict: Uint8Array;
  private stats: FrameCodecStats;

  /**
   * transferred is what the dictionary cost to receive. The built-in dictionary
   * is compiled in and passes 0, so savings are not charged for bytes that never
   * crossed the wire.
   */
  constructor(id: string, dict: Uint8Array, transferred: number = dict.length) {
    this.id = id;
    this.dict = dict;
    this.dictionary = dict;
    this.stats = {
      frames: 0,
      bytesReceived: 0,
      bytesDecompressed: 0,
      dictionaryBytes: transferred,
    };
  }

  getStats(): FrameCodecStats {
    return { ...this.stats };
  }

  /**
   * Decode one frame. Input is whatever the transport delivered: an ArrayBuffer
   * or Uint8Array once compression is active, since compressed payloads arrive
   * as binary messages even on a JSON connection.
   *
   * Returns a string for the JSON protocol and a Uint8Array for Protobuf, which
   * is what each codec's decodeReplies expects.
   */
  decode(data: any, isJson: boolean): any {
    const bytes = toBytes(data);
    if (bytes.length === 0) {
      throw new Error('centrifuge: empty frame');
    }
    const marker = bytes[0];
    const body = bytes.subarray(1);

    let out: Uint8Array;
    if (marker === FrameCodecRaw) {
      out = body;
    } else if (marker === FrameCodecCompressed) {
      // Bounded during inflate, not after: letting it grow first means a
      // small crafted frame can force the allocation before anything checks
      // it. One byte over the limit is enough to detect the overflow, because
      // fflate fills a provided buffer and reports the real length when the
      // data fits - so a result at capacity means there was more to come.
      const out2 = inflateSync(body, {
        dictionary: this.dict,
        out: new Uint8Array(maxDecompressedFrameSize + 1),
      });
      if (out2.length > maxDecompressedFrameSize) {
        throw new Error('centrifuge: decompressed frame too large');
      }
      out = out2;
    } else {
      // A marker this client does not know means the server used a codec that
      // was never negotiated. Guessing would corrupt the stream.
      throw new Error('centrifuge: unknown frame codec ' + marker);
    }

    this.stats.frames++;
    this.stats.bytesReceived += bytes.length;
    this.stats.bytesDecompressed += out.length;

    return isJson ? new TextDecoder().decode(out) : out;
  }
}

function toBytes(data: any): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  // A string can only appear here if the server sent a text frame after
  // activating compression, which it never does.
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return new Uint8Array(data);
}

/**
 * Build a codec from a ConnectionState dictionary payload, or null when the
 * update carries something this client does not understand.
 *
 * Protobuf connections carry the dictionary as raw bytes; JSON connections have
 * to base64 it, because a bytes field carries raw JSON in that protocol.
 *
 * @internal
 */
export function frameCodecFromDictionary(dictionary: any, cache?: DictionaryCache): FrameCodec | null {
  if (!dictionary) {
    return null;
  }
  let raw: Uint8Array | null = null;
  if (dictionary.data && dictionary.data.length > 0) {
    raw = toBytes(dictionary.data);
  } else if (dictionary.data_b64 || dictionary.dataB64) {
    raw = base64ToBytes(dictionary.data_b64 || dictionary.dataB64);
  }
  const id = dictionary.id || '';
  if (raw !== null) {
    // Content is always deflated: the frame carrying it cannot be compressed,
    // because nothing is installed yet to compress it against.
    try {
      // Same bound-during-inflate reasoning as decode above.
      raw = inflateSync(raw, { out: new Uint8Array(maxDictionarySize + 1) });
    } catch (e) {
      return null;
    }
    if (raw.length > maxDictionarySize) {
      return null;
    }
  }
  if (!raw || raw.length === 0) {
    // An id with no content means "use the one you already have": the server
    // recognised an id this client advertised at connect, so there was nothing
    // to send. An id is a hash of the content, so a match is byte identical.
    const held = cache ? cache.get(id) : null;
    if (held === null) {
      return null;
    }
    // Cached, so it crossed no wire on this connection and is not charged.
    return new FrameCodec(id, held, 0);
  }
  return new FrameCodec(id, raw);
}

function base64ToBytes(s: string): Uint8Array {
  const binary = typeof atob === 'function'
    ? atob(s)
    // NodeJS has no atob in older versions; Buffer is available there instead.
    : Buffer.from(s, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/**
 * Byte length of whatever the transport delivered, before decompression.
 * @internal
 */
export function frameByteLength(data: any): number {
  if (typeof data === 'string') {
    // A UTF-8 JSON frame: count encoded bytes, not UTF-16 code units.
    return new TextEncoder().encode(data).length;
  }
  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }
  if (data && typeof data.length === 'number') {
    return data.length;
  }
  return 0;
}
