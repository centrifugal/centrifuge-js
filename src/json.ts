/** @internal */
export class JsonCodec {
  name() {
    return 'json';
  }

  encodeCommands(commands: any[]): string {
    return commands.map(c => JSON.stringify(c)).join('\n');
  }

  decodeReplies(data: string): any[] {
    return data.trim().split('\n').map(r => JSON.parse(r));
  }
}
