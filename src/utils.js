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

export function backoff(step, min, max) {
  const jitter = 0.5 * Math.random();
  const interval = Math.min(max, min * Math.pow(2, step + 1));

  return Math.floor((1 - jitter) * interval);
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
