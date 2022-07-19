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
export function log(level, args) {
  if (global.console) {
    const logger = global.console[level];

    if (isFunction(logger)) {
      logger.apply(global.console, args);
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
