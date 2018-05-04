import {Centrifuge} from './centrifuge.js';

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
  REFRESH: methodValues.REFRESH
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
  SEND: [
    proto.lookupType('proto.SendRequest'),
    null
  ]
};

const protobufPushType = {
  PUBLICATION: proto.lookupEnum('PushType').values.PUBLICATION,
  JOIN: proto.lookupEnum('PushType').values.JOIN,
  LEAVE: proto.lookupEnum('PushType').values.LEAVE,
  UNSUB: proto.lookupEnum('PushType').values.UNSUB,
  MESSAGE: proto.lookupEnum('PushType').values.MESSAGE
};

const PushSchema = {
  PUBLICATION: proto.lookupType('proto.Publication'),
  JOIN: proto.lookupType('proto.Join'),
  LEAVE: proto.lookupType('proto.Leave'),
  UNSUB: proto.lookupType('proto.Unsub'),
  MESSAGE: proto.lookupType('proto.Message')
};

const Push = proto.lookupType('proto.Push');
const Command = proto.lookupType('proto.Command');
const Reply = proto.lookupType('proto.Reply');

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
              type = methodSchema.REFRESH;
              break;
            case protobufMethodType.SUBSCRIBE:
              type = methodSchema.SUBSCRIBE[0];
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
          console.log(command.params);
          command.params = type.encode(command.params).finish();
          console.log(2);
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
      case protobufPushType.UNSUB:
        type = PushSchema.UNSUB;
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
