import * as protobuf from 'protobufjs/light'
import * as protoJSON from './client.proto.json';
import { applyDelta } from './fossil';

const proto = protobuf.Root.fromJSON(protoJSON);

const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');
const EmulationRequest = proto.lookupType('protocol.EmulationRequest');

/** @internal */
export class ProtobufCodec {
  name() {
    return 'protobuf';
  }

  encodeEmulationRequest(req: any) {
    const writer = protobuf.Writer.create();
    EmulationRequest.encode(req, writer);
    return writer.finish();
  }

  encodeCommands(commands: any[]) {
    const writer = protobuf.Writer.create();
    for (const i in commands) {
      if (commands.hasOwnProperty(i)) {
        const command = Object.assign({}, commands[i]);
        Command.encodeDelimited(command, writer);
      }
    }
    return writer.finish();
  }

  decodeReplies(data: any) {
    const replies: any[] = [];
    const reader = protobuf.Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      const reply = Reply.decodeDelimited(reader);
      replies.push(reply);
    }
    return replies;
  }

  decodeReply(data: any) {
    const reader = protobuf.Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      Reply.decodeDelimited(reader);
      return {
        ok: true,
        pos: reader.pos
      };
    }
    return {
      ok: false
    };
  }

  applyDeltaIfNeeded(pub: any, prevValue: any) {
    let newData: any, newPrevValue: any;
    if (pub.delta) {
      // binary delta.
      const valueArray = applyDelta(prevValue, pub.data);
      newData = new Uint8Array(valueArray)
      newPrevValue = valueArray;
    } else {
      // full binary data.
      newData = pub.data;
      newPrevValue = pub.data;
    }
    return { newData, newPrevValue }
  }
}
