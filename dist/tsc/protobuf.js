"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentrifugeProtobuf = exports.ProtobufDecoder = exports.ProtobufEncoder = void 0;
const centrifuge_1 = require("./centrifuge");
const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));
const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');
const EmulationRequest = proto.lookupType('protocol.EmulationRequest');
class ProtobufEncoder {
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
exports.ProtobufEncoder = ProtobufEncoder;
class ProtobufDecoder {
    decodeReplies(data) {
        const replies = [];
        const reader = protobuf.Reader.create(new Uint8Array(data));
        while (reader.pos < reader.len) {
            const reply = Reply.decodeDelimited(reader);
            // @ts-ignore
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
exports.ProtobufDecoder = ProtobufDecoder;
class CentrifugeProtobuf extends centrifuge_1.Centrifuge {
    _formatOverride(format) {
        if (format === 'protobuf') {
            // @ts-ignore
            this._encoder = new ProtobufEncoder();
            // @ts-ignore
            this._decoder = new ProtobufDecoder();
            return true;
        }
        return false;
    }
}
exports.CentrifugeProtobuf = CentrifugeProtobuf;
//# sourceMappingURL=protobuf.js.map