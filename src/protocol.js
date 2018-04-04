const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));

export const MethodType = proto.lookupEnum('MethodType').values;

const Message = proto.lookupType('proto.Message');

export const MessageType = proto.lookupEnum('MessageType').values;

const MessageTypePublication = proto.lookupType('proto.Publication');
const MessageTypeJoin = proto.lookupType('proto.Join');
const MessageTypeLeave = proto.lookupType('proto.Leave');
const MessageTypeUnsub = proto.lookupType('proto.Unsub');

const Command = proto.lookupType('proto.Command');

const ConnectRequest = proto.lookupType('proto.ConnectRequest');
const RefreshRequest = proto.lookupType('proto.RefreshRequest');
const SubscribeRequest = proto.lookupType('proto.SubscribeRequest');
const UnsubscribeRequest = proto.lookupType('proto.UnsubscribeRequest');
const PublishRequest = proto.lookupType('proto.PublishRequest');
const PresenceRequest = proto.lookupType('proto.PresenceRequest');
const PresenceStatsRequest = proto.lookupType('proto.PresenceStatsRequest');
const HistoryRequest = proto.lookupType('proto.HistoryRequest');
const PingRequest = proto.lookupType('proto.PingRequest');
const RPCRequest = proto.lookupType('proto.RPCRequest');
const MessageRequest = proto.lookupType('proto.MessageRequest');

const Reply = proto.lookupType('proto.Reply');

const ConnectResult = proto.lookupType('proto.ConnectResult');
const RefreshResult = proto.lookupType('proto.RefreshResult');
const SubscribeResult = proto.lookupType('proto.SubscribeResult');
const UnsubscribeResult = proto.lookupType('proto.UnsubscribeResult');
const PublishResult = proto.lookupType('proto.PublishResult');
const PresenceResult = proto.lookupType('proto.PresenceResult');
const PresenceStatsResult = proto.lookupType('proto.PresenceStatsResult');
const HistoryResult = proto.lookupType('proto.HistoryResult');
const PingResult = proto.lookupType('proto.PingResult');
const RPCResult = proto.lookupType('proto.RPCResult');

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
              type = ConnectRequest;
              break;
            case MethodType.REFRESH:
              type = RefreshRequest;
              break;
            case MethodType.SUBSCRIBE:
              type = SubscribeRequest;
              break;
            case MethodType.UNSUBSCRIBE:
              type = UnsubscribeRequest;
              break;
            case MethodType.PUBLISH:
              type = PublishRequest;
              break;
            case MethodType.PRESENCE:
              type = PresenceRequest;
              break;
            case MethodType.PRESENCE_STATS:
              type = PresenceStatsRequest;
              break;
            case MethodType.HISTORY:
              type = HistoryRequest;
              break;
            case MethodType.PING:
              type = PingRequest;
              break;
            case MethodType.RPC:
              type = RPCRequest;
              break;
            case MethodType.Message:
              type = MessageRequest;
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
        type = ConnectResult;
        break;
      case MethodType.REFRESH:
        type = RefreshResult;
        break;
      case MethodType.SUBSCRIBE:
        type = SubscribeResult;
        break;
      case MethodType.UNSUBSCRIBE:
        type = UnsubscribeResult;
        break;
      case MethodType.PUBLISH:
        type = PublishResult;
        break;
      case MethodType.PRESENCE:
        type = PresenceResult;
        break;
      case MethodType.PRESENCE_STATS:
        type = PresenceStatsResult;
        break;
      case MethodType.HISTORY:
        type = HistoryResult;
        break;
      case MethodType.PING:
        type = PingResult;
        break;
      case MethodType.RPC:
        type = RPCResult;
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
        type = MessageTypePublication;
        break;
      case MessageType.JOIN:
        type = MessageTypeJoin;
        break;
      case MessageType.LEAVE:
        type = MessageTypeLeave;
        break;
      case MessageType.UNSUB:
        type = MessageTypeUnsub;
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
