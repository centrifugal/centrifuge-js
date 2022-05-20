"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttlMilliseconds = exports.extend = exports.errorExists = exports.backoff = exports.log = exports.isFunction = exports.startsWith = void 0;
function startsWith(value, prefix) {
    return value.lastIndexOf(prefix, 0) === 0;
}
exports.startsWith = startsWith;
;
function isFunction(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return typeof value === 'function';
}
exports.isFunction = isFunction;
;
function log(level, args) {
    if (global.console) {
        const logger = global.console[level];
        if (isFunction(logger)) {
            logger.apply(global.console, args);
        }
    }
}
exports.log = log;
;
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
;
function backoff(step, min, max) {
    // Full jitter technique, see:
    // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
    if (step > 31) {
        step = 31;
    }
    ;
    const interval = randomInt(0, Math.min(max, min * Math.pow(2, step)));
    return Math.min(max, min + interval);
}
exports.backoff = backoff;
;
function errorExists(data) {
    return 'error' in data && data.error !== null;
}
exports.errorExists = errorExists;
;
function extend(a, b) {
    for (const key in b) {
        if (b.hasOwnProperty(key)) {
            a[key] = b[key];
        }
    }
    return a;
}
exports.extend = extend;
;
function ttlMilliseconds(ttl) {
    // https://stackoverflow.com/questions/12633405/what-is-the-maximum-delay-for-setinterval
    return Math.min(ttl * 1000, 2147483647);
}
exports.ttlMilliseconds = ttlMilliseconds;
;
//# sourceMappingURL=utils.js.map