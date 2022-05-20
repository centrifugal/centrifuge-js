"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDecoder = exports.JsonEncoder = void 0;
class JsonEncoder {
    encodeCommands(commands) {
        return commands.map(c => JSON.stringify(c)).join('\n');
    }
}
exports.JsonEncoder = JsonEncoder;
class JsonDecoder {
    decodeReplies(data) {
        return data.split('\n').filter(r => r !== '').map(r => JSON.parse(r));
    }
}
exports.JsonDecoder = JsonDecoder;
//# sourceMappingURL=json.js.map