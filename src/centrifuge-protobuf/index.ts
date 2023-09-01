import { Centrifuge } from '../centrifuge';

import * as protobuf from 'protobufjs/light'
import * as protoJSON from './client.proto.json';

const proto = protobuf.Root.fromJSON(protoJSON);

const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');
const EmulationRequest = proto.lookupType('protocol.EmulationRequest');

class ProtobufEncoder {
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
}

class ProtobufDecoder {
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

class CentrifugeProtobuf extends Centrifuge {
  protected _formatOverride(format: 'json' | 'protobuf') {
    if (format === 'protobuf') {
      this._encoder = new ProtobufEncoder();
      this._decoder = new ProtobufDecoder();
      return true;
    }
    return false;
  }
}

export default CentrifugeProtobuf
