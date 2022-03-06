export function startsWith(value, prefix) {
  return value.lastIndexOf(prefix, 0) === 0;
};

export function isFunction(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'function';
};

export function log(level, args) {
  if (global.console) {
    const logger = global.console[level];

    if (isFunction(logger)) {
      logger.apply(global.console, args);
    }
  }
};

function randomInt(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export function backoff(step, min, max) {
  // Full jitter technique, see:
  // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
  const interval = randomInt(0, Math.min(max, min * Math.pow(2, step)));
  return Math.min(max, min + interval);
};

export function errorExists(data) {
  return 'error' in data && data.error !== null;
};

export function extend(a, b) {
  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      a[key] = b[key];
    }
  }
  return a;
};

export function ttlMilliseconds(ttl) {
  // https://stackoverflow.com/questions/12633405/what-is-the-maximum-delay-for-setinterval
  return Math.min(ttl * 1000, 2147483647);
};
