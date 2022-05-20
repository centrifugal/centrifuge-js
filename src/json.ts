export class JsonEncoder {
  encodeCommands(commands) {
    return commands.map(c => JSON.stringify(c)).join('\n');
  }
}

export class JsonDecoder {
  decodeReplies(data) {
    return data.split('\n').filter(r => r !== '').map(r => JSON.parse(r));
  }
}
