/** @internal */
export function startsWith(value, prefix) {
  return value.lastIndexOf(prefix, 0) === 0;
}

/** @internal */
export function isFunction(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'function';
}

/** @internal */
export function log(level: string, args) {
  if (globalThis.console) {
    const logger = globalThis.console[level];

    if (isFunction(logger)) {
      logger.apply(globalThis.console, args);
    }
  }
}

function randomInt(min: number, max: number) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/** @internal */
export function backoff(step: number, min: number, max: number) {
  // Full jitter technique, see:
  // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
  if (step > 31) { step = 31; }
  const interval = randomInt(0, Math.min(max, min * Math.pow(2, step)));
  return Math.min(max, min + interval);
}

/** @internal */
export function errorExists(data: any) {
  return 'error' in data && data.error !== null;
}

/** @internal */
export function ttlMilliseconds(ttl: number) {
  // https://stackoverflow.com/questions/12633405/what-is-the-maximum-delay-for-setinterval
  return Math.min(ttl * 1000, 2147483647);
}

/** @internal */
export function localStorageItem(key: string): string | null {
  // Accessing localStorage is not always safe: it may be null (Safari in
  // private browsing mode), or even throw on property access (when access to
  // storage is denied by the browser settings).
  try {
    if (typeof localStorage === 'undefined' || localStorage === null || !isFunction(localStorage.getItem)) {
      return null;
    }
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/** @internal Reports whether a publication carries an offset. Protobuf decodes a
 * missing offset as 0 (a Long where long.js is available), which must not replace
 * a stored position. */
export function hasOffset(offset: any): boolean {
  return offset !== undefined && offset !== null && Number(offset) > 0;
}

/** @internal Converts an offset of a reply or a publication to a number.
 * Over the protobuf protocol a uint64 decodes to a Long object where long.js is
 * available (it comes with protobufjs), and such an object must reach neither the
 * app — the public types declare a number, and an app storing the position gets
 * `{low, high, unsigned}` back, which compares and adds as NaN — nor the position
 * the library keeps. A position an app stored with an earlier version, and passes
 * back through `since`, has the same shape without the methods, so it is converted
 * here too. Offsets above 2^53 lose exactness, as the public type implies. */
export function toOffset(offset: any): number {
  if (offset === undefined || offset === null) {
    return 0;
  }
  if (typeof offset === 'object') {
    const low = offset.low;
    const high = offset.high;
    if (typeof low === 'number' && typeof high === 'number') {
      return (high >>> 0) * 4294967296 + (low >>> 0);
    }
  }
  const value = Number(offset);
  return isNaN(value) ? 0 : value;
}
