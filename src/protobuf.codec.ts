import * as protobuf from 'protobufjs/light'
import * as protoJSON from './client.proto.json';
const proto = protobuf.Root.fromJSON(protoJSON);

const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');
const EmulationRequest = proto.lookupType('protocol.EmulationRequest');

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
}