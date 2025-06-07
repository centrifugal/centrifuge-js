import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  BinaryWriter,
  BinaryReader,
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
    inits: Parameters<typeof create>[1][]
  ): Uint8Array {
    const writer = new BinaryWriter();
    for (const init of inits) {
      const cmdBytes = toBinary(
        CommandSchema,
        create(CommandSchema, init)
      );
      writer.uint32(cmdBytes.length);
      writer.raw(cmdBytes);
    }
    return writer.finish();
  }

  /**
   * Decode all length-delimited Reply messages from the buffer.
   */
  decodeReplies(data: Uint8Array | ArrayBuffer): Reply[] {
    const bytes = data instanceof Uint8Array
      ? data
      : new Uint8Array(data);
    const replies: Reply[] = [];
    const reader = new BinaryReader(bytes);

    while (reader.pos < reader.len) {
      const length = reader.uint32();
      const start = reader.pos;
      reader.pos += length;
      const slice = bytes.subarray(start, reader.pos);
      replies.push(fromBinary(ReplySchema, slice));
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
}
