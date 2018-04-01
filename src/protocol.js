const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));

export const MethodType = {
  CONNECT: proto.lookupEnum('MethodType').values.CONNECT,
  REFRESH: proto.lookupEnum('MethodType').values.REFRESH,
  SUBSCRIBE: proto.lookupEnum('MethodType').values.SUBSCRIBE,
  UNSUBSCRIBE: proto.lookupEnum('MethodType').values.UNSUBSCRIBE,
  PUBLISH: proto.lookupEnum('MethodType').values.PUBLISH,
  PRESENCE: proto.lookupEnum('MethodType').values.PRESENCE,
  PRESENCE_STATS: proto.lookupEnum('MethodType').values.PRESENCE_STATS,
  HISTORY: proto.lookupEnum('MethodType').values.HISTORY,
  PING: proto.lookupEnum('MethodType').values.PING,
  RPC: proto.lookupEnum('MethodType').values.RPC,
  MESSAGE: proto.lookupEnum('MethodType').values.MESSAGE
};

export const MessageType = {
  PUBLICATION: proto.lookupEnum('MessageType').values.PUBLICATION,
  JOIN: proto.lookupEnum('MessageType').values.JOIN,
  LEAVE: proto.lookupEnum('MessageType').values.LEAVE,
  UNSUB: proto.lookupEnum('MessageType').values.UNSUB
};

export class JsonEncoder {
  encodeCommands(commands) {
    const encodedCommands = [];
    for (const i in commands) {
      if (commands.hasOwnProperty(i)) {
        encodedCommands.push(JSON.stringify(commands[i]));
      }
    }
    return encodedCommands.join('\n');
  }
}

export class ProtobufEncoder {
  encodeCommands(commands) {
    let writer = protobuf.Writer.create();
    for (const i in commands) {
      if (commands.hasOwnProperty(i)) {
        const command = Object.assign({}, commands[i]);
        switch (command.method) {
          case MethodType.CONNECT:
            if (command.params) {
              command.params = proto.lookupType('proto.ConnectRequest').encode(command.params).finish();
            }
            break;
          case MethodType.REFRESH:
            command.params = proto.lookupType('proto.RefreshRequest').encode(command.params).finish();
            break;
          case MethodType.SUBSCRIBE:
            command.params = proto.lookupType('proto.SubscribeRequest').encode(command.params).finish();
            break;
          case MethodType.UNSUBSCRIBE:
            command.params = proto.lookupType('proto.UnsubscribeRequest').encode(command.params).finish();
            break;
          case MethodType.PUBLISH:
            command.params = proto.lookupType('proto.PublishRequest').encode(command.params).finish();
            break;
          case MethodType.PRESENCE:
            command.params = proto.lookupType('proto.PresenceRequest').encode(command.params).finish();
            break;
          case MethodType.PRESENCE_STATS:
            command.params = proto.lookupType('proto.PresenceStatsRequest').encode(command.params).finish();
            break;
          case MethodType.HISTORY:
            command.params = proto.lookupType('proto.HistoryRequest').encode(command.params).finish();
            break;
          case MethodType.PING:
            if (command.params) {
              command.params = proto.lookupType('proto.PingRequest').encode(command.params).finish();
            }
            break;
          case MethodType.RPC:
            command.params = proto.lookupType('proto.RPCRequest').encode(command.params).finish();
            break;
          case MethodType.MESSAGE:
            command.params = proto.lookupType('proto.MessageRequest').encode(command.params).finish();
            break;
        }
        proto.lookupType('proto.Command').encodeDelimited(command, writer);
      }
    }
    return writer.finish();
  }
}

export class JsonDecoder {
  decodeReplies(data) {
    let replies = [];
    const encodedReplies = data.split('\n');
    for (let i in encodedReplies) {
      if (encodedReplies.hasOwnProperty(i)) {
        if (!encodedReplies[i]) {
          continue;
        }
        const reply = JSON.parse(encodedReplies[i]);
        replies.push(reply);
      }
    }
    return replies;
  }

  decodeCommandResult(methodType, data) {
    return data;
  }

  decodeMessage(data) {
    return data;
  }

  decodeMessageData(messageType, data) {
    return data;
  }
}

export class ProtobufDecoder {
  decodeReplies(data) {
    let replies = [];
    const reader = protobuf.Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      const reply = proto.lookupType('proto.Reply').decodeDelimited(reader);
      replies.push(reply);
    }
    return replies;
  }

  decodeCommandResult(methodType, data) {
    let type;
    switch (methodType) {
      case MethodType.CONNECT:
        type = proto.lookupType('proto.ConnectResult');
        break;
      case MethodType.REFRESH:
        type = proto.lookupType('proto.RefreshResult');
        break;
      case MethodType.SUBSCRIBE:
        type = proto.lookupType('proto.SubscribeResult');
        break;
      case MethodType.UNSUBSCRIBE:
        type = proto.lookupType('proto.UnsubscribeResult');
        break;
      case MethodType.PUBLISH:
        type = proto.lookupType('proto.PublishResult');
        break;
      case MethodType.PRESENCE:
        type = proto.lookupType('proto.PresenceResult');
        break;
      case MethodType.PRESENCE_STATS:
        type = proto.lookupType('proto.PresenseStatsResult');
        break;
      case MethodType.HISTORY:
        type = proto.lookupType('proto.HistoryResult');
        break;
      case MethodType.PING:
        type = proto.lookupType('proto.PingResult');
        break;
      case MethodType.RPC:
        type = proto.lookupType('proto.RPCResult');
        break;
    }
    return this._decode(type, data);
  }

  decodeMessage(data) {
    return this._decode(proto.lookupType('proto.Message'), data);
  }

  decodeMessageData(messageType, data) {
    let type;
    switch (messageType) {
      case MessageType.PUBLICATION:
        type = proto.lookupType('proto.Publication');
        break;
      case MessageType.JOIN:
        type = proto.lookupType('proto.Join');
        break;
      case MessageType.LEAVE:
        type = proto.lookupType('proto.Leave');
        break;
      case MessageType.UNSUB:
        type = proto.lookupType('proto.Unsub');
        break;
    }
    return this._decode(type, data);
  }

  _decode(type, data) {
    let res;
    try {
      res = type.decode(data);
    } catch (err) {
      return null;
    }
    return res;
  }
}
