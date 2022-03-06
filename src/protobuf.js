import { Centrifuge } from './centrifuge.js';

const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));

const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');
const EmulationRequest = proto.lookupType('protocol.EmulationRequest');

export class ProtobufEncoder {
  encodeEmulationRequest(req) {
    const writer = protobuf.Writer.create();
    EmulationRequest.encode(req, writer);
    return writer.finish();
  }

  encodeCommands(commands) {
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

export class ProtobufDecoder {
  decodeReplies(data) {
    const replies = [];
    const reader = protobuf.Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      const reply = Reply.decodeDelimited(reader);
      replies.push(reply);
    }
    return replies;
  }

  decodeReply(data) {
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

export class CentrifugeProtobuf extends Centrifuge {
  _formatOverride(format) {
    if (format === 'protobuf') {
      this._encoder = new ProtobufEncoder();
      this._decoder = new ProtobufDecoder();
      return true;
    }
    return false;
  }
}
