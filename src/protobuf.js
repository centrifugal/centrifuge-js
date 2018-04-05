const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));

const methodValues = proto.lookupEnum('MethodType').values;

export const methodType = {
  CONNECT: methodValues.CONNECT,
  REFRESH: methodValues.REFRESH,
  SUBSCRIBE: methodValues.SUBSCRIBE,
  UNSUBSCRIBE: methodValues.UNSUBSCRIBE,
  PUBLISH: methodValues.PUBLISH,
  PRESENCE: methodValues.PRESENCE,
  PRESENCE_STATS: methodValues.PRESENCE_STATS,
  HISTORY: methodValues.HISTORY,
  PING: methodValues.PING,
  RPC: methodValues.RPC,
  MESSAGE: methodValues.MESSAGE
};

const methodSchema = {
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

export const messageType = {
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
            case methodType.CONNECT:
              type = methodSchema.CONNECT[0];
              break;
            case methodType.REFRESH:
              type = methodSchema.REFRESH;
              break;
            case methodType.SUBSCRIBE:
              type = methodSchema.SUBSCRIBE[0];
              break;
            case methodType.UNSUBSCRIBE:
              type = methodSchema.UNSUBSCRIBE[0];
              break;
            case methodType.PUBLISH:
              type = methodSchema.PUBLISH[0];
              break;
            case methodType.PRESENCE:
              type = methodSchema.PRESENCE[0];
              break;
            case methodType.PRESENCE_STATS:
              type = methodSchema.PRESENCE_STATS[0];
              break;
            case methodType.HISTORY:
              type = methodSchema.HISTORY[0];
              break;
            case methodType.PING:
              type = methodSchema.PING[0];
              break;
            case methodType.RPC:
              type = methodSchema.RPC[0];
              break;
            case methodType.Message:
              type = methodSchema.MESSAGE[0];
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
      case methodType.CONNECT:
        type = methodSchema.CONNECT[1];
        break;
      case methodType.REFRESH:
        type = methodSchema.REFRESH[1];
        break;
      case methodType.SUBSCRIBE:
        type = methodSchema.SUBSCRIBE[1];
        break;
      case methodType.UNSUBSCRIBE:
        type = methodSchema.UNSUBSCRIBE[1];
        break;
      case methodType.PUBLISH:
        type = methodSchema.PUBLISH[1];
        break;
      case methodType.PRESENCE:
        type = methodSchema.PRESENCE[1];
        break;
      case methodType.PRESENCE_STATS:
        type = methodSchema.PRESENCE_STATS[1];
        break;
      case methodType.HISTORY:
        type = methodSchema.HISTORY[1];
        break;
      case methodType.PING:
        type = methodSchema.PING[1];
        break;
      case methodType.RPC:
        type = methodSchema.RPC[1];
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
      case messageType.PUBLICATION:
        type = MessageSchema.PUBLICATION;
        break;
      case messageType.JOIN:
        type = MessageSchema.JOIN;
        break;
      case messageType.LEAVE:
        type = MessageSchema.LEAVE;
        break;
      case messageType.UNSUB:
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
