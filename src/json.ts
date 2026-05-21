import { applyDelta } from './fossil';

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

  applyDeltaIfNeeded(pub: any, prevValue: any) {
    let newData: any, newPrevValue: any;
    let isDelta: boolean;
    if (pub.delta) {
      isDelta = true;
      // JSON string delta.
      const deltaBytes = new TextEncoder().encode(pub.data);
      const valueArray = applyDelta(prevValue, deltaBytes);
      newData = JSON.parse(new TextDecoder().decode(valueArray))
      newPrevValue = valueArray;
    } else {
      isDelta = false;
      // Full data as JSON string.
      newData = JSON.parse(pub.data);
      newPrevValue = new TextEncoder().encode(pub.data);
    }
    return { newData, newPrevValue, isDelta, wireBytes: pub.data.length, fullBytes: newPrevValue.length }
  }
}
