export const JsonMethodType = {
  CONNECT: 0,
  SUBSCRIBE: 1,
  UNSUBSCRIBE: 2,
  PUBLISH: 3,
  PRESENCE: 4,
  PRESENCE_STATS: 5,
  HISTORY: 6,
  PING: 7,
  SEND: 8,
  RPC: 9,
  REFRESH: 10,
  SUB_REFRESH: 11
};

export const JsonPushType = {
  PUBLICATION: 0,
  JOIN: 1,
  LEAVE: 2,
  UNSUB: 3,
  MESSAGE: 4,
  SUB: 5
};

export class JsonEncoder {
  encodeCommands(commands) {
    return commands.map(c => JSON.stringify(c)).join('\n');
  }
}

export class JsonDecoder {
  decodeReplies(data) {
    return data.split('\n').map(r => JSON.parse(r));
  }

  decodeCommandResult(methodType, data) {
    return data;
  }

  decodePush(data) {
    return data;
  }

  decodePushData(pushType, data) {
    return data;
  }
}

