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

const MethodSchema = {
  CONNECT: [
    proto.lookupType('proto.ConnectRequest'),
    proto.lookupType('proto.ConnectResult')
  ],
  REFRESH: [
    proto.lookupType('proto.RefreshRequest'),
    proto.lookupType('proto.RefreshResult')
  ],
  SUBSCRIBE: [
    proto.lookupType('proto.SubscribeRequest'),
    proto.lookupType('proto.SubscribeResult')
  ],
  UNSUBSCRIBE: [
    proto.lookupType('proto.UnsubscribeRequest'),
    proto.lookupType('proto.UnsubscribeResult')
  ],
  PUBLISH: [
    proto.lookupType('proto.PublishRequest'),
    proto.lookupType('proto.PublishResult')
  ],
  PRESENCE: [
    proto.lookupType('proto.PresenceRequest'),
    proto.lookupType('proto.PresenceResult')
  ],
  PRESENCE_STATS: [
    proto.lookupType('proto.PresenceStatsRequest'),
    proto.lookupType('proto.PresenceStatsResult')
  ],
  HISTORY: [
    proto.lookupType('proto.HistoryRequest'),
    proto.lookupType('proto.HistoryResult')
  ],
  PING: [
    proto.lookupType('proto.PingRequest'),
    proto.lookupType('proto.PingResult')
  ],
  RPC: [
    proto.lookupType('proto.RPCRequest'),
    proto.lookupType('proto.RPCResult')
  ],
  MESSAGE: [
    proto.lookupType('proto.MessageRequest'),
    null
  ]
};

export const MessageType = {
  PUBLICATION: proto.lookupEnum('MessageType').values.PUBLICATION,
  JOIN: proto.lookupEnum('MessageType').values.JOIN,
  LEAVE: proto.lookupEnum('MessageType').values.LEAVE,
  UNSUB: proto.lookupEnum('MessageType').values.UNSUB
};

const MessageSchema = {
  PUBLICATION: proto.lookupType('proto.Publication'),
  JOIN: proto.lookupType('proto.Join'),
  LEAVE: proto.lookupType('proto.Leave'),
  UNSUB: proto.lookupType('proto.Unsub')
};

const Message = proto.lookupType('proto.Message');
const Command = proto.lookupType('proto.Command');
const Reply = proto.lookupType('proto.Reply');

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
        if (command.params) {
          let type;
          switch (command.method) {
            case MethodType.CONNECT:
              type = MethodSchema.CONNECT[0];
              break;
            case MethodType.REFRESH:
              type = MethodSchema.REFRESH;
              break;
            case MethodType.SUBSCRIBE:
              type = MethodSchema.SUBSCRIBE[0];
              break;
            case MethodType.UNSUBSCRIBE:
              type = MethodSchema.UNSUBSCRIBE[0];
              break;
            case MethodType.PUBLISH:
              type = MethodSchema.PUBLISH[0];
              break;
            case MethodType.PRESENCE:
              type = MethodSchema.PRESENCE[0];
              break;
            case MethodType.PRESENCE_STATS:
              type = MethodSchema.PRESENCE_STATS[0];
              break;
            case MethodType.HISTORY:
              type = MethodSchema.HISTORY[0];
              break;
            case MethodType.PING:
              type = MethodSchema.PING[0];
              break;
            case MethodType.RPC:
              type = MethodSchema.RPC[0];
              break;
            case MethodType.Message:
              type = MethodSchema.MESSAGE[0];
              break;
          }
          command.params = type.encode(command.params).finish();
        }
        Command.encodeDelimited(command, writer);
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
      const reply = Reply.decodeDelimited(reader);
      replies.push(reply);
    }
    return replies;
  }

  decodeCommandResult(methodType, data) {
    var type;
    switch (methodType) {
      case MethodType.CONNECT:
        type = MethodSchema.CONNECT[1];
        break;
      case MethodType.REFRESH:
        type = MethodSchema.REFRESH[1];
        break;
      case MethodType.SUBSCRIBE:
        type = MethodSchema.SUBSCRIBE[1];
        break;
      case MethodType.UNSUBSCRIBE:
        type = MethodSchema.UNSUBSCRIBE[1];
        break;
      case MethodType.PUBLISH:
        type = MethodSchema.PUBLISH[1];
        break;
      case MethodType.PRESENCE:
        type = MethodSchema.PRESENCE[1];
        break;
      case MethodType.PRESENCE_STATS:
        type = MethodSchema.PRESENCE_STATS[1];
        break;
      case MethodType.HISTORY:
        type = MethodSchema.HISTORY[1];
        break;
      case MethodType.PING:
        type = MethodSchema.PING[1];
        break;
      case MethodType.RPC:
        type = MethodSchema.RPC[1];
        break;
    }
    return this._decode(type, data);
  }

  decodeMessage(data) {
    return this._decode(Message, data);
  }

  decodeMessageData(messageType, data) {
    var type;
    switch (messageType) {
      case MessageType.PUBLICATION:
        type = MessageSchema.PUBLICATION;
        break;
      case MessageType.JOIN:
        type = MessageSchema.JOIN;
        break;
      case MessageType.LEAVE:
        type = MessageSchema.LEAVE;
        break;
      case MessageType.UNSUB:
        type = MessageSchema.UNSUB;
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
