/** @internal */
export class JsonEncoder {
  encodeCommands(commands: any[]): string {
    return commands.map(c => JSON.stringify(c)).join('\n');
  }
}

/** @internal */
export class JsonDecoder {
  decodeReplies(data: string): any[] {
    return data.trim().split('\n').map(r => JSON.parse(r));
  }
}
