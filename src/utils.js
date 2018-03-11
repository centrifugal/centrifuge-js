export const endsWith = function (value, suffix) {
  return value.indexOf(suffix, value.length - suffix.length) !== -1;
};

export const startsWith = function (value, prefix) {
  return value.lastIndexOf(prefix, 0) === 0;
};

export const stripSlash = function (value) {
  if (value.substring(value.length - 1) === '/') {
    value = value.substring(0, value.length - 1);
  }
  return value;
};

export const isString = function (value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'string' || value instanceof String;
};

export const isFunction = function (value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'function';
};

export const log = function (level, args) {
  if (global.console) {
    const logger = global.console[level];

    if (isFunction(logger)) {
      logger.apply(global.console, args);
    }
  }
};

export const backoff = function (step, min, max) {
  var jitter = 0.5 * Math.random();
  var interval = min * Math.pow(2, step + 1);

  if (interval > max) {
    interval = max;
  }
  return Math.floor((1 - jitter) * interval);
};

export const errorExists = function (data) {
  return 'error' in data && data.error !== null;
};
