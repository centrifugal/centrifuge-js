/*
Copyright 2014-2024 Dmitry Chestnykh (JavaScript port)
Copyright 2007 D. Richard Hipp  (original C version)

Fossil SCM delta compression algorithm, this is only the applyDelta part extracted
from https://github.com/dchest/fossil-delta-js. The code was slightly modified
to strip unnecessary parts. The copyright on top of this file is from the original
repo on Github licensed under Simplified BSD License.
*/

// We accept plain arrays of bytes or Uint8Array.
type ByteArray = number[] | Uint8Array;


const zValue = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1,
  -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, -1, -1, -1, -1, 36, -1, 37,
  38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61, 62, -1, -1, -1, 63, -1,
];

// Reader reads bytes, chars, ints from array.
class Reader {
  public a: ByteArray;
  public pos: number;

  constructor(array: ByteArray) {
    this.a = array; // source array
    this.pos = 0; // current position in array
  }

  haveBytes() {
    return this.pos < this.a.length;
  }

  getByte() {
    const b = this.a[this.pos];
    this.pos++;
    if (this.pos > this.a.length) throw new RangeError("out of bounds");
    return b;
  }

  getChar() {
    return String.fromCharCode(this.getByte());
  }

  // Read base64-encoded unsigned integer.
  getInt() {
    let v = 0;
    let c: number;
    while (this.haveBytes() && (c = zValue[0x7f & this.getByte()]) >= 0) {
      v = (v << 6) + c;
    }
    this.pos--;
    return v >>> 0;
  }
}

// Write writes an array.
class Writer {
  private a: number[] = [];

  toByteArray<T extends ByteArray>(sourceType: T): T {
    if (Array.isArray(sourceType)) {
      return this.a as T;
    }
    return new Uint8Array(this.a) as T;
  }

  // Copy from array at start to end.
  putArray(a: ByteArray, start: number, end: number) {
    // TODO: optimize.
    for (let i = start; i < end; i++) this.a.push(a[i]);
  }
}

// Return a 32-bit checksum of the array.
function checksum(arr: ByteArray): number {
  let sum0 = 0,
    sum1 = 0,
    sum2 = 0,
    sum3 = 0,
    z = 0,
    N = arr.length;
  //TODO measure if this unrolling is helpful.
  while (N >= 16) {
    sum0 = (sum0 + arr[z + 0]) | 0;
    sum1 = (sum1 + arr[z + 1]) | 0;
    sum2 = (sum2 + arr[z + 2]) | 0;
    sum3 = (sum3 + arr[z + 3]) | 0;

    sum0 = (sum0 + arr[z + 4]) | 0;
    sum1 = (sum1 + arr[z + 5]) | 0;
    sum2 = (sum2 + arr[z + 6]) | 0;
    sum3 = (sum3 + arr[z + 7]) | 0;

    sum0 = (sum0 + arr[z + 8]) | 0;
    sum1 = (sum1 + arr[z + 9]) | 0;
    sum2 = (sum2 + arr[z + 10]) | 0;
    sum3 = (sum3 + arr[z + 11]) | 0;

    sum0 = (sum0 + arr[z + 12]) | 0;
    sum1 = (sum1 + arr[z + 13]) | 0;
    sum2 = (sum2 + arr[z + 14]) | 0;
    sum3 = (sum3 + arr[z + 15]) | 0;

    z += 16;
    N -= 16;
  }
  while (N >= 4) {
    sum0 = (sum0 + arr[z + 0]) | 0;
    sum1 = (sum1 + arr[z + 1]) | 0;
    sum2 = (sum2 + arr[z + 2]) | 0;
    sum3 = (sum3 + arr[z + 3]) | 0;
    z += 4;
    N -= 4;
  }
  sum3 = (((((sum3 + (sum2 << 8)) | 0) + (sum1 << 16)) | 0) + (sum0 << 24)) | 0;
  switch (N) {
    //@ts-ignore fallthrough is needed.
    case 3:
      sum3 = (sum3 + (arr[z + 2] << 8)) | 0; /* falls through */
    //@ts-ignore fallthrough is needed.
    case 2:
      sum3 = (sum3 + (arr[z + 1] << 16)) | 0; /* falls through */
    case 1:
      sum3 = (sum3 + (arr[z + 0] << 24)) | 0; /* falls through */
  }
  return sum3 >>> 0;
}

/**
 * Apply a delta byte array to a source byte array, returning the target byte array.
 */
export function applyDelta<T extends ByteArray>(
  source: T,
  delta: T
): T {
  let total = 0;
  const zDelta = new Reader(delta);
  const lenSrc = source.length;
  const lenDelta = delta.length;

  const limit = zDelta.getInt();
  if (zDelta.getChar() !== "\n")
    throw new Error("size integer not terminated by '\\n'");
  const zOut = new Writer();
  while (zDelta.haveBytes()) {
    const cnt = zDelta.getInt();
    let ofst: number;

    switch (zDelta.getChar()) {
      case "@":
        ofst = zDelta.getInt();
        if (zDelta.haveBytes() && zDelta.getChar() !== ",")
          throw new Error("copy command not terminated by ','");
        total += cnt;
        if (total > limit) throw new Error("copy exceeds output file size");
        if (ofst + cnt > lenSrc)
          throw new Error("copy extends past end of input");
        zOut.putArray(source, ofst, ofst + cnt);
        break;

      case ":":
        total += cnt;
        if (total > limit)
          throw new Error(
            "insert command gives an output larger than predicted"
          );
        if (cnt > lenDelta)
          throw new Error("insert count exceeds size of delta");
        zOut.putArray(zDelta.a, zDelta.pos, zDelta.pos + cnt);
        zDelta.pos += cnt;
        break;

      case ";":
        {
          const out = zOut.toByteArray(source);
          if (cnt !== checksum(out))
            throw new Error("bad checksum");
          if (total !== limit)
            throw new Error("generated size does not match predicted size");
          return out;
        }
      default:
        throw new Error("unknown delta operator");
    }
  }
  throw new Error("unterminated delta");
}
