export const JsonMethodType = {
  CONNECT: 0,
  REFRESH: 1,
  SUBSCRIBE: 2,
  UNSUBSCRIBE: 3,
  PUBLISH: 4,
  PRESENCE: 5,
  PRESENCE_STATS: 6,
  HISTORY: 7,
  PING: 8,
  RPC: 9,
  MESSAGE: 10
};

export const JsonMessageType = {
  PUBLICATION: 0,
  JOIN: 1,
  LEAVE: 2,
  UNSUB: 3
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

