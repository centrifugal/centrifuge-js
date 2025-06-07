import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  sizeDelimitedEncode,
  sizeDelimitedPeek,
} from "@bufbuild/protobuf/wire";
import {
  CommandSchema,
  EmulationRequestSchema,
  ReplySchema,
  type Reply,
} from "./client_pb";
import { applyDelta } from "./fossil";

/** @internal */
export class ProtobufCodec {
  name(): string {
    return "protobuf";
  }

  /**
   * Encode an EmulationRequest as a raw protobuf message (no length prefix).
   */
  encodeEmulationRequest(
    init: Parameters<typeof create>[1]  // MessageInit<EmulationRequest>
  ): Uint8Array {
    const msg = create(EmulationRequestSchema, init);
    return toBinary(EmulationRequestSchema, msg);
  }

  /**
   * Encode an array of Commands, each length-delimited with a varint prefix.
   */
  encodeCommands(
    inits: Array<Parameters<typeof create>[1]>  // MessageInit<Command>[]
  ): Uint8Array {
    const chunks = inits.map(init => {
      const cmd = create(CommandSchema, init);
      return sizeDelimitedEncode(CommandSchema, cmd);
    });
    return ProtobufCodec.concatUint8Arrays(chunks);
  }

  /**
   * Decode all length-delimited Reply messages from the buffer.
   */
  decodeReplies(data: Uint8Array | ArrayBuffer): Reply[] {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const replies: Reply[] = [];
    let offset = 0;

    while (offset < bytes.byteLength) {
      const slice = bytes.subarray(offset);
      const { size, offset: headerLen, eof } = sizeDelimitedPeek(slice);

      if (eof || headerLen == null || size == null) break;

      const start = offset + headerLen;
      const end = start + size;
      const msgBytes = bytes.subarray(start, end);
      replies.push(fromBinary(ReplySchema, msgBytes));
      offset = end;
    }

    return replies;
  }

  /**
   * Try decoding a single length-delimited Reply and report bytes consumed.
   */
  decodeReply(
    data: Uint8Array | ArrayBuffer
  ): { ok: true; pos: number } | { ok: false } {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength === 0) return { ok: false };

    const { size, offset: headerLen, eof } = sizeDelimitedPeek(bytes);
    if (eof || headerLen == null || size == null) return { ok: false };

    const total = headerLen + size;
    return bytes.byteLength >= total
      ? { ok: true, pos: total }
      : { ok: false };
  }

  /**
   * Apply a binary delta if needed; otherwise return full data.
   */
  applyDeltaIfNeeded(
    pub: { data: Uint8Array; delta: boolean },
    prevValue: Uint8Array
  ): { newData: Uint8Array; newPrevValue: Uint8Array } {
    if (pub.delta) {
      const patched = applyDelta(prevValue, pub.data);
      const newData = new Uint8Array(patched);
      return { newData, newPrevValue: newData };
    } else {
      return { newData: pub.data, newPrevValue: pub.data };
    }
  }

  private static concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const a of arrays) total += a.length;
    const result = new Uint8Array(total);
    let pos = 0;
    for (const a of arrays) {
      result.set(a, pos);
      pos += a.length;
    }
    return result;
  }
}
