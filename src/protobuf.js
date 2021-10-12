import { Centrifuge } from './centrifuge.js';

const protobuf = require('protobufjs/light');
const proto = protobuf.Root.fromJSON(require('./client.proto.json'));

const methodValues = proto.lookupEnum('MethodType').values;

const protobufMethodType = {
  CONNECT: methodValues.CONNECT,
  SUBSCRIBE: methodValues.SUBSCRIBE,
  UNSUBSCRIBE: methodValues.UNSUBSCRIBE,
  PUBLISH: methodValues.PUBLISH,
  PRESENCE: methodValues.PRESENCE,
  PRESENCE_STATS: methodValues.PRESENCE_STATS,
  HISTORY: methodValues.HISTORY,
  PING: methodValues.PING,
  RPC: methodValues.RPC,
  SEND: methodValues.SEND,
  REFRESH: methodValues.REFRESH,
  SUB_REFRESH: methodValues.SUB_REFRESH
};

const methodSchema = {
  CONNECT: [
    proto.lookupType('protocol.ConnectRequest'),
    proto.lookupType('protocol.ConnectResult')
  ],
  REFRESH: [
    proto.lookupType('protocol.RefreshRequest'),
    proto.lookupType('protocol.RefreshResult')
  ],
  SUBSCRIBE: [
    proto.lookupType('protocol.SubscribeRequest'),
    proto.lookupType('protocol.SubscribeResult')
  ],
  SUB_REFRESH: [
    proto.lookupType('protocol.SubRefreshRequest'),
    proto.lookupType('protocol.SubRefreshResult')
  ],
  UNSUBSCRIBE: [
    proto.lookupType('protocol.UnsubscribeRequest'),
    proto.lookupType('protocol.UnsubscribeResult')
  ],
  PUBLISH: [
    proto.lookupType('protocol.PublishRequest'),
    proto.lookupType('protocol.PublishResult')
  ],
  PRESENCE: [
    proto.lookupType('protocol.PresenceRequest'),
    proto.lookupType('protocol.PresenceResult')
  ],
  PRESENCE_STATS: [
    proto.lookupType('protocol.PresenceStatsRequest'),
    proto.lookupType('protocol.PresenceStatsResult')
  ],
  HISTORY: [
    proto.lookupType('protocol.HistoryRequest'),
    proto.lookupType('protocol.HistoryResult')
  ],
  PING: [
    proto.lookupType('protocol.PingRequest'),
    proto.lookupType('protocol.PingResult')
  ],
  RPC: [
    proto.lookupType('protocol.RPCRequest'),
    proto.lookupType('protocol.RPCResult')
  ],
  SEND: [
    proto.lookupType('protocol.SendRequest'),
    null
  ]
};

const protobufPushType = {
  PUBLICATION: proto.lookupEnum('PushType').values.PUBLICATION,
  JOIN: proto.lookupEnum('PushType').values.JOIN,
  LEAVE: proto.lookupEnum('PushType').values.LEAVE,
  UNSUBSCRIBE: proto.lookupEnum('PushType').values.UNSUBSCRIBE,
  MESSAGE: proto.lookupEnum('PushType').values.MESSAGE,
  SUBSCRIBE: proto.lookupEnum('PushType').values.SUBSCRIBE
};

const PushSchema = {
  PUBLICATION: proto.lookupType('protocol.Publication'),
  JOIN: proto.lookupType('protocol.Join'),
  LEAVE: proto.lookupType('protocol.Leave'),
  UNSUBSCRIBE: proto.lookupType('protocol.Unsubscribe'),
  MESSAGE: proto.lookupType('protocol.Message'),
  SUBSCRIBE: proto.lookupType('protocol.Subscribe')
};

const Push = proto.lookupType('protocol.Push');
const Command = proto.lookupType('protocol.Command');
const Reply = proto.lookupType('protocol.Reply');

export class ProtobufEncoder {
  encodeCommands(commands) {
    const writer = protobuf.Writer.create();
    for (const i in commands) {
      if (commands.hasOwnProperty(i)) {
        const command = Object.assign({}, commands[i]);
        if (command.params) {
          let type;
          if (!command.method) {
            command.method = protobufMethodType.CONNECT;
          };
          switch (command.method) {
            case protobufMethodType.CONNECT:
              type = methodSchema.CONNECT[0];
              break;
            case protobufMethodType.REFRESH:
              type = methodSchema.REFRESH[0];
              break;
            case protobufMethodType.SUBSCRIBE:
              type = methodSchema.SUBSCRIBE[0];
              break;
            case protobufMethodType.SUB_REFRESH:
              type = methodSchema.SUB_REFRESH[0];
              break;
            case protobufMethodType.UNSUBSCRIBE:
              type = methodSchema.UNSUBSCRIBE[0];
              break;
            case protobufMethodType.PUBLISH:
              type = methodSchema.PUBLISH[0];
              break;
            case protobufMethodType.PRESENCE:
              type = methodSchema.PRESENCE[0];
              break;
            case protobufMethodType.PRESENCE_STATS:
              type = methodSchema.PRESENCE_STATS[0];
              break;
            case protobufMethodType.HISTORY:
              type = methodSchema.HISTORY[0];
              break;
            case protobufMethodType.PING:
              type = methodSchema.PING[0];
              break;
            case protobufMethodType.RPC:
              type = methodSchema.RPC[0];
              break;
            case protobufMethodType.SEND:
              type = methodSchema.SEND[0];
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

  decodeCommandResult(methodType, data) {
    var type;
    switch (methodType) {
      case protobufMethodType.CONNECT:
        type = methodSchema.CONNECT[1];
        break;
      case protobufMethodType.REFRESH:
        type = methodSchema.REFRESH[1];
        break;
      case protobufMethodType.SUBSCRIBE:
        type = methodSchema.SUBSCRIBE[1];
        break;
      case protobufMethodType.SUB_REFRESH:
        type = methodSchema.SUB_REFRESH[1];
        break;
      case protobufMethodType.UNSUBSCRIBE:
        type = methodSchema.UNSUBSCRIBE[1];
        break;
      case protobufMethodType.PUBLISH:
        type = methodSchema.PUBLISH[1];
        break;
      case protobufMethodType.PRESENCE:
        type = methodSchema.PRESENCE[1];
        break;
      case protobufMethodType.PRESENCE_STATS:
        type = methodSchema.PRESENCE_STATS[1];
        break;
      case protobufMethodType.HISTORY:
        type = methodSchema.HISTORY[1];
        break;
      case protobufMethodType.PING:
        type = methodSchema.PING[1];
        break;
      case protobufMethodType.RPC:
        type = methodSchema.RPC[1];
        break;
    }
    return this._decode(type, data);
  }

  decodePush(data) {
    return this._decode(Push, data);
  }

  decodePushData(pushType, data) {
    var type;
    switch (pushType) {
      case protobufPushType.PUBLICATION:
        type = PushSchema.PUBLICATION;
        break;
      case protobufPushType.MESSAGE:
        type = PushSchema.MESSAGE;
        break;
      case protobufPushType.JOIN:
        type = PushSchema.JOIN;
        break;
      case protobufPushType.LEAVE:
        type = PushSchema.LEAVE;
        break;
      case protobufPushType.UNSUBSCRIBE:
        type = PushSchema.UNSUBSCRIBE;
        break;
      case protobufPushType.SUBSCRIBE:
        type = PushSchema.SUBSCRIBE;
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

export class CentrifugeProtobuf extends Centrifuge {
  _formatOverride(format) {
    if (format === 'protobuf') {
      this._binary = true;
      this._methodType = protobufMethodType;
      this._pushType = protobufPushType;
      this._encoder = new ProtobufEncoder();
      this._decoder = new ProtobufDecoder();
      return true;
    }
    return false;
  }
}
