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

// import * as protobuf from 'protobufjs/light'
// import * as protoJSON from './client.proto.json';
// import { applyDelta } from './fossil';

// const proto = protobuf.Root.fromJSON(protoJSON);

// const Command = proto.lookupType('protocol.Command');
// const Reply = proto.lookupType('protocol.Reply');
// const EmulationRequest = proto.lookupType('protocol.EmulationRequest');

// /** @internal */
// export class ProtobufCodec {
//   name() {
//     return 'protobuf';
//   }

//   encodeEmulationRequest(req: any) {
//     const writer = protobuf.Writer.create();
//     EmulationRequest.encode(req, writer);
//     return writer.finish();
//   }

//   encodeCommands(commands: any[]) {
//     const writer = protobuf.Writer.create();
//     for (const i in commands) {
//       if (commands.hasOwnProperty(i)) {
//         const command = Object.assign({}, commands[i]);
//         Command.encodeDelimited(command, writer);
//       }
//     }
//     return writer.finish();
//   }

//   decodeReplies(data: any) {
//     const replies: any[] = [];
//     const reader = protobuf.Reader.create(new Uint8Array(data));
//     while (reader.pos < reader.len) {
//       const reply = Reply.decodeDelimited(reader);
//       replies.push(reply);
//     }
//     return replies;
//   }

//   decodeReply(data: any) {
//     const reader = protobuf.Reader.create(new Uint8Array(data));
//     while (reader.pos < reader.len) {
//       Reply.decodeDelimited(reader);
//       return {
//         ok: true,
//         pos: reader.pos
//       };
//     }
//     return {
//       ok: false
//     };
//   }

//   applyDeltaIfNeeded(pub: any, prevValue: any) {
//     let newData: any, newPrevValue: any;
//     if (pub.delta) {
//       // binary delta.
//       const valueArray = applyDelta(prevValue, pub.data);
//       newData = new Uint8Array(valueArray)
//       newPrevValue = valueArray;
//     } else {
//       // full binary data.
//       newData = pub.data;
//       newPrevValue = pub.data;
//     }
//     return { newData, newPrevValue }
//   }
// }
