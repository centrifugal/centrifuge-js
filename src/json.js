export const JsonMethodType = {
  CONNECT: 0,
  SUBSCRIBE: 1,
  UNSUBSCRIBE: 2,
  PUBLISH: 3,
  PRESENCE: 4,
  PRESENCE_STATS: 5,
  HISTORY: 6,
  PING: 7,
  MESSAGE: 8,
  RPC: 9,
  REFRESH: 10
};

export const JsonMessageType = {
  PUBLICATION: 0,
  JOIN: 1,
  LEAVE: 2,
  UNSUB: 3,
  PUSH: 4
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

