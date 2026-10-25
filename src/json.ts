import { applyDelta } from './fossil';

type ReviverContext = { source?: string };

/** @internal Whether JSON.parse gives a reviver the source text of each value -
 * Chrome 114+, Firefox 135+, Safari 18.4+, Node.js 21+. */
export function jsonSourceTextSupported(): boolean {
  let supported = false;
  try {
    JSON.parse('1', ((_key: string, value: any, context?: ReviverContext) => {
      supported = context !== undefined && context.source === '1';
      return value;
    }) as any);
  } catch {
    // An engine without the context argument.
  }
  return supported;
}

const integerLiteral = /^-?\d+$/;
// An integer past 2^53 has 16 digits or more: text without such a run holds
// none, and is parsed without a reviver.
const longDigits = /\d{16}/;

// reviveBigInteger decodes an integer a number cannot hold exactly as a
// bigint, from its source text: the number itself is already rounded.
function reviveBigInteger(_key: string, value: any, context?: ReviverContext) {
  if (typeof value === 'number' && !Number.isSafeInteger(value) &&
    context !== undefined && context.source !== undefined && integerLiteral.test(context.source)) {
    return (globalThis as any).BigInt(context.source);
  }
  return value;
}

// encodeBigInt writes a bigint as a JSON number, which JSON.stringify refuses
// to do itself.
function encodeBigInt(_key: string, value: any) {
  if (typeof value === 'bigint') {
    const rawJSON = (JSON as any).rawJSON;
    if (typeof rawJSON !== 'function') {
      throw new TypeError('a bigint needs JSON.rawJSON: Chrome 114+, Firefox 135+, Safari 18.4+, Node.js 21+');
    }
    return rawJSON(String(value));
  }
  return value;
}

// stringify is JSON.stringify which also writes bigints. The replacer costs a
// call per value, so it is used only for what JSON.stringify refused.
function stringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (e) {
    if (e instanceof TypeError) {
      return JSON.stringify(value, encodeBigInt);
    }
    throw e;
  }
}

/** @internal */
export class JsonCodec {
  private readonly _bigIntegers: boolean;

  /** With bigIntegers, integers a number cannot hold exactly - past 2^53 - are
   * decoded as bigint, where the runtime gives JSON.parse source text. */
  constructor(bigIntegers = false) {
    this._bigIntegers = bigIntegers && jsonSourceTextSupported();
  }

  name() {
    return 'json';
  }

  /** Decodes JSON text, with big integers as bigint when enabled. */
  parse(text: string): any {
    if (!this._bigIntegers || !longDigits.test(text)) {
      return JSON.parse(text);
    }
    return JSON.parse(text, reviveBigInteger as any);
  }

  encodeCommands(commands: any[]): string {
    return commands.map(c => stringify(c)).join('\n');
  }

  decodeReplies(data: string): any[] {
    // Empty lines carry nothing, e.g. newlines an intermediary sends to keep a
    // stream alive: they are skipped instead of failing to parse.
    return data.split('\n').filter(r => r.trim() !== '').map(r => this.parse(r));
  }

  applyDeltaIfNeeded(pub: any, prevValue: any) {
    let newData: any, newPrevValue: any, wireBytes: number;
    let isDelta: boolean;
    if (pub.delta) {
      isDelta = true;
      // JSON string delta.
      const deltaBytes = new TextEncoder().encode(pub.data);
      const valueArray = applyDelta(prevValue, deltaBytes);
      newData = this.parse(new TextDecoder().decode(valueArray))
      newPrevValue = valueArray;
      wireBytes = deltaBytes.length;
    } else {
      isDelta = false;
      // Full data as JSON string.
      newData = this.parse(pub.data);
      newPrevValue = new TextEncoder().encode(pub.data);
      wireBytes = newPrevValue.length;
    }
    // wireBytes is the UTF-8 byte length of pub.data, not its JS string length
    // (.length counts UTF-16 code units, which undercounts any non-ASCII content).
    return { newData, newPrevValue, isDelta, wireBytes, fullBytes: newPrevValue.length }
  }
}
