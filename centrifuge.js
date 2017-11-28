!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Centrifuge=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   4.0.5
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  return typeof x === 'function' || typeof x === 'object' && x !== null;
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (!Array.isArray) {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
} else {
  _isArray = Array.isArray;
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  _resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return _resolve(promise, value);
    }, function (reason) {
      return _reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$) {
  if (maybeThenable.constructor === promise.constructor && then$$ === then && maybeThenable.constructor.resolve === resolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$ === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then$$ === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$)) {
      handleForeignThenable(promise, maybeThenable, then$$);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  if (promise === value) {
    _reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      _reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      _resolve(promise, value);
    } else if (failed) {
      _reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      _reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      _resolve(promise, value);
    }, function rejectPromise(reason) {
      _reject(promise, reason);
    });
  } catch (e) {
    _reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this._input = input;
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate();
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    _reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._enumerate = function () {
  var length = this.length;
  var _input = this._input;

  for (var i = 0; this._state === PENDING && i < length; i++) {
    this._eachEntry(_input[i], i);
  }
};

Enumerator.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$ = c.resolve;

  if (resolve$$ === resolve) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$) {
        return resolve$$(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$(entry), i);
  }
};

Enumerator.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {function} resolver
  Useful for tooling.
  @constructor
*/
function Promise(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}

Promise.all = all;
Promise.race = race;
Promise.resolve = resolve;
Promise.reject = reject;
Promise._setScheduler = setScheduler;
Promise._setAsap = setAsap;
Promise._asap = asap;

Promise.prototype = {
  constructor: Promise,

  /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
  
    ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
  
    Chaining
    --------
  
    The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
  
    ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
  
    findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
  
    ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
  
    Assimilation
    ------------
  
    Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
  
    If the assimliated promise rejects, then the downstream promise will also reject.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
  
    Simple Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let result;
  
    try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
  
    Advanced Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let author, books;
  
    try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
  
    function foundBooks(books) {
  
    }
  
    function failure(reason) {
  
    }
  
    findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
  
    @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
  */
  then: then,

  /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
  
    ```js
    function findAuthor(){
      throw new Error('couldn't find that author');
    }
  
    // synchronous
    try {
      findAuthor();
    } catch(reason) {
      // something went wrong
    }
  
    // async with promises
    findAuthor().catch(function(reason){
      // something went wrong
    });
    ```
  
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
  */
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

function polyfill() {
    var local = undefined;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise;
}

// Strange compat..
Promise.polyfill = polyfill;
Promise.Promise = Promise;

return Promise;

})));
//# sourceMappingURL=es6-promise.map
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
/*!
 * EventEmitter v4.2.11 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function () {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var exports = this;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);
                i = listeners.length;

                while (i--) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}.call(this));

},{}],4:[function(require,module,exports){
(function (global){
var Promise = require('es6-promise').Promise;
var EventEmitter = require('wolfy87-eventemitter');

/**
 * Oliver Caldwell
 * http://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/
 */
if (!Object.create) {
    Object.create = (function () {
        var F = function () {
        };
        return function (o) {
            if (arguments.length !== 1) {
                throw new Error('Object.create implementation only accepts one parameter.');
            }
            F.prototype = o;
            return new F();
        }
    })()
}

function extend(destination, source) {
    destination.prototype = Object.create(source.prototype);
    destination.prototype.constructor = destination;
    return source.prototype;
}

/**
 * Array.prototype.indexOf polyfill from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
 */
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (vMember, nStartFrom) {
        /*
        In non-strict mode, if the `this` variable is null or undefined, then it is
        set the window object. Otherwise, `this` is automaticly converted to an
        object. In strict mode if the `this` variable is null or undefined a
        `TypeError` is thrown.
        */
        if (!this) {
            throw new TypeError('Array.prototype.indexOf() - can not convert "' + this + '" to object');
        }
        var nIdx = isFinite(nStartFrom) ? Math.floor(nStartFrom) : 0,
            oThis = this instanceof Object ? this : new Object(this),
            nLen = isFinite(oThis.length) ? Math.floor(oThis.length) : 0;
        if (nIdx >= nLen) {
            return -1;
        }
        if (nIdx < 0) {
            nIdx = Math.max(nLen + nIdx, 0);
        }
        if (vMember === undefined) {
            /*
            Since `vMember` is undefined, keys that don't exist will have the same
            value as `vMember`, and thus do need to be checked.
            */
            do {
                if (nIdx in oThis && oThis[nIdx] === undefined) {
                    return nIdx;
                }
            } while (++nIdx < nLen);
        } else {
            do {
                if (oThis[nIdx] === vMember) {
                    return nIdx;
                }
            } while (++nIdx < nLen);
        }
        return -1;
    };
}

function fieldValue(object, name) {
    try {
        return object[name];
    } catch (x) {
        return undefined;
    }
}

/**
 * Mixes in the given objects into the target object by copying the properties.
 * @param deep if the copy must be deep
 * @param target the target object
 * @param objects the objects whose properties are copied into the target
 */
function mixin(deep, target, objects) {
    var result = target || {};
    for (var i = 2, l = arguments.length; i < l; i++) { // Skip first 2 parameters (deep and target), and loop over the others
        var object = arguments[i];
        if (object === undefined || object === null) {
            continue;
        }
        for (var propName in object) {
            var prop = fieldValue(object, propName);
            var targ = fieldValue(result, propName);
            if (prop === target) {
                continue; // Avoid infinite loops
            }
            if (prop === undefined) {
                continue; // Do not mixin undefined values
            }
            if (deep && typeof prop === 'object' && prop !== null) {
                if (prop instanceof Array) {
                    result[propName] = mixin(deep, targ instanceof Array ? targ : [], prop);
                } else {
                    var source = typeof targ === 'object' && !(targ instanceof Array) ? targ : {};
                    result[propName] = mixin(deep, source, prop);
                }
            } else {
                result[propName] = prop;
            }
        }
    }
    return result;
}

function endsWith(value, suffix) {
    return value.indexOf(suffix, value.length - suffix.length) !== -1;
}

function startsWith(value, prefix) {
    return value.lastIndexOf(prefix, 0) === 0;
}

function stripSlash(value) {
    if (value.substring(value.length - 1) === '/') {
        value = value.substring(0, value.length - 1);
    }
    return value;
}

function isString(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return typeof value === 'string' || value instanceof String;
}

function isFunction(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return typeof value === 'function';
}

function log(level, args) {
    if (global.console) {
        var logger = global.console[level];
        if (isFunction(logger)) {
            logger.apply(global.console, args);
        }
    }
}

function backoff(step, min, max) {
    var jitter = 0.5 * Math.random();
    var interval = min * Math.pow(2, step + 1);
    if (interval > max) {
        interval = max;
    }
    return Math.floor((1 - jitter) * interval);
}

function errorExists(data) {
    return 'error' in data && data.error !== null && data.error !== '';
}

function Centrifuge(options) {
    this._sockJS = null;
    this._isSockJS = false;
    this._status = 'disconnected';
    this._reconnect = true;
    this._reconnecting = false;
    this._transport = null;
    this._transportName = null;
    this._transportClosed = true;
    this._messageId = 0;
    this._clientID = null;
    this._subs = {};
    this._lastMessageID = {};
    this._messages = [];
    this._isBatching = false;
    this._isAuthBatching = false;
    this._authChannels = {};
    this._numRefreshFailed = 0;
    this._refreshTimeout = null;
    this._pingInterval = null;
    this._pongTimeout = null;
    this._retries = 0;
    this._callbacks = {};
    this._latency = null;
    this._latencyStart = null;
    this._config = {
        sockJS: null,
        retry: 1000,
        maxRetry: 20000,
        timeout: 5000,
        info: '',
        resubscribe: true,
        ping: true,
        pingInterval: 30000,
        pongWaitTimeout: 5000,
        debug: false,
        insecure: false,
        server: null,
        privateChannelPrefix: '$',
        onTransportClose: null,
        transports: [
            'websocket',
            'xdr-streaming',
            'xhr-streaming',
            'eventsource',
            'iframe-eventsource',
            'iframe-htmlfile',
            'xdr-polling',
            'xhr-polling',
            'iframe-xhr-polling',
            'jsonp-polling'
        ],
        onRefresh: null,
        refreshEndpoint: '/centrifuge/refresh/',
        refreshHeaders: {},
        refreshParams: {},
        refreshData: {},
        refreshTransport: 'ajax',
        refreshAttempts: null,
        refreshInterval: 3000,
        refreshFailed: null,
        onPrivateChannelAuth: null,
        authEndpoint: '/centrifuge/auth/',
        authHeaders: {},
        authParams: {},
        authTransport: 'ajax'
    };
    if (options) {
        this.configure(options);
    }
}

extend(Centrifuge, EventEmitter);

Centrifuge._jsonpCallbacks = {};
Centrifuge._jsonpTimeouts = {};
Centrifuge._nextJSONPCallbackID = 1;

var centrifugeProto = Centrifuge.prototype;

centrifugeProto._jsonp = function (url, params, headers, data, callback) {
    if (headers.length > 0) {
        this._log('Only AJAX request allows to send custom headers, it is not possible with JSONP.');
    }
    self._debug('sending JSONP request to', url);

    var callbackName = 'centrifuge_jsonp_' + Centrifuge._nextJSONPCallbackID.toString();
    Centrifuge._nextJSONPCallbackID++;

    var document = global.document;
    var script = document.createElement('script');

    var timeoutTrigger = setTimeout(function () {
        Centrifuge._jsonpCallbacks[callbackName] = function () {
        };
        callback(true, 'timeout');
    }, 3000);

    Centrifuge._jsonpCallbacks[callbackName] = function (data) {
        clearTimeout(timeoutTrigger);
        callback(false, data);
        delete Centrifuge[callbackName];
    };

    var query = '';
    for (var i in params) {
        if (params.hasOwnProperty(i)) {
            if (query.length > 0) {
                query += '&';
            }
            query += encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
        }
    }

    var callback_name = 'Centrifuge._jsonpCallbacks[\'' + callbackName + '\']';
    script.src = this._config.authEndpoint +
        '?callback=' + encodeURIComponent(callback_name) +
        '&data=' + encodeURIComponent(JSON.stringify(data)) +
        '&' + query;

    var head = document.getElementsByTagName('head')[0] || document.documentElement;
    head.insertBefore(script, head.firstChild);
};

centrifugeProto._ajax = function (url, params, headers, data, callback) {
    var self = this;
    self._debug('sending AJAX request to', url);

    var xhr = (global.XMLHttpRequest ? new global.XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP'));

    var query = '';
    for (var i in params) {
        if (params.hasOwnProperty(i)) {
            if (query.length > 0) {
                query += '&';
            }
            query += encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
        }
    }
    if (query.length > 0) {
        query = '?' + query;
    }
    xhr.open('POST', url + query, true);
    if ('withCredentials' in xhr) {
        xhr.withCredentials = true;
    }

    // add request headers
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    for (var headerName in headers) {
        if (headers.hasOwnProperty(headerName)) {
            xhr.setRequestHeader(headerName, headers[headerName]);
        }
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var data, parsed = false;
                try {
                    data = JSON.parse(xhr.responseText);
                    parsed = true;
                } catch (e) {
                    callback(true, 'JSON returned was invalid, yet status code was 200. Data was: ' + xhr.responseText);
                }
                if (parsed) { // prevents double execution.
                    callback(false, data);
                }
            } else {
                self._log("Couldn't get auth info from application", xhr.status);
                callback(true, xhr.status);
            }
        }
    };

    setTimeout(function () {
        xhr.send(JSON.stringify(data));
    }, 20);
    return xhr;
};

centrifugeProto._log = function () {
    log('info', arguments);
};

centrifugeProto._debug = function () {
    if (this._config.debug === true) {
        log('debug', arguments);
    }
};

centrifugeProto._websocketSupported = function () {
    return !(typeof WebSocket !== 'function' && typeof WebSocket !== 'object')
};

centrifugeProto._sockjsEndpoint = function () {
    var url = this._config.url;
    url = url
        .replace('ws://', 'http://')
        .replace('wss://', 'https://');
    url = stripSlash(url);
    if (!endsWith(this._config.url, 'connection')) {
        url = url + '/connection';
    }
    return url;
};

centrifugeProto._rawWebsocketEndpoint = function () {
    var url = this._config.url;
    url = url
        .replace('http://', 'ws://')
        .replace('https://', 'wss://');
    url = stripSlash(url);
    if (!endsWith(this._config.url, 'connection/websocket')) {
        url = url + '/connection/websocket';
    }
    return url;
};

centrifugeProto._configure = function (configuration) {
    this._debug('Configuring centrifuge object with', configuration);

    if (!configuration) {
        configuration = {};
    }

    this._config = mixin(false, this._config, configuration);

    if (!this._config.url) {
        throw 'Missing required configuration parameter \'url\' specifying server URL';
    }

    if (!this._config.user && this._config.user !== '') {
        if (!this._config.insecure) {
            throw 'Missing required configuration parameter \'user\' specifying user\'s unique ID in your application';
        } else {
            this._debug('user not found but this is OK for insecure mode - anonymous access will be used');
            this._config.user = '';
        }
    }

    if (!this._config.timestamp) {
        if (!this._config.insecure) {
            throw 'Missing required configuration parameter \'timestamp\'';
        } else {
            this._debug('token not found but this is OK for insecure mode');
        }
    }

    if (!this._config.token) {
        if (!this._config.insecure) {
            throw 'Missing required configuration parameter \'token\' specifying the sign of authorization request';
        } else {
            this._debug('timestamp not found but this is OK for insecure mode');
        }
    }

    this._config.url = stripSlash(this._config.url);

    if (endsWith(this._config.url, 'connection')) {
        this._debug('client will connect to SockJS endpoint');
        if (this._config.sockJS !== null) {
            this._debug('SockJS explicitly provided in options');
            this._sockJS = this._config.sockJS;
        } else {
            if (typeof SockJS === 'undefined') {
                throw 'include SockJS client library before Centrifuge javascript client library or provide SockJS object in options or use raw Websocket connection endpoint';
            }
            this._debug('use globally defined SockJS');
            this._sockJS = SockJS;
        }
    } else if (endsWith(this._config.url, 'connection/websocket')) {
        this._debug('client will connect to raw Websocket endpoint');
    } else {
        this._debug('client will detect connection endpoint itself');
        if (this._config.sockJS !== null) {
            this._debug('SockJS explicitly provided in options');
            this._sockJS = this._config.sockJS;
        } else {
            if (typeof SockJS === 'undefined') {
                this._debug('SockJS not found');
            } else {
                this._debug('use globally defined SockJS');
                this._sockJS = SockJS;
            }
        }
    }
};

centrifugeProto._setStatus = function (newStatus) {
    if (this._status !== newStatus) {
        this._debug('Status', this._status, '->', newStatus);
        this._status = newStatus;
    }
};

centrifugeProto._isDisconnected = function () {
    return this._status === 'disconnected';
};

centrifugeProto._isConnecting = function () {
    return this._status === 'connecting';
};

centrifugeProto._isConnected = function () {
    return this._status === 'connected';
};

centrifugeProto._nextMessageId = function () {
    return ++this._messageId;
};

centrifugeProto._resetRetry = function () {
    this._debug('reset retries count to 0');
    this._retries = 0;
};

centrifugeProto._getRetryInterval = function () {
    var interval = backoff(this._retries, this._config.retry, this._config.maxRetry);
    this._retries += 1;
    return interval;
};

centrifugeProto._clearConnectedState = function (reconnect) {
    this._clientID = null;

    // fire errbacks of registered calls.
    for (var uid in this._callbacks) {
        if (this._callbacks.hasOwnProperty(uid)) {
            var callbacks = this._callbacks[uid];
            var errback = callbacks.errback;
            if (!errback) {
                continue;
            }
            errback(this._createErrorObject('disconnected', 'retry'));
        }
    }
    this._callbacks = {};

    // fire unsubscribe events
    for (var channel in this._subs) {
        if (this._subs.hasOwnProperty(channel)) {
            var sub = this._subs[channel];
            if (reconnect) {
                if (sub._isSuccess()) {
                    sub._triggerUnsubscribe();
                }
                sub._setSubscribing();
            } else {
                sub._setUnsubscribed();
            }
        }
    }

    if (!this._config.resubscribe || !this._reconnect) {
        // completely clear connected state
        this._subs = {};
    }
};

centrifugeProto._send = function (messages) {
    if (messages.length === 0) {
        return;
    }
    if (messages.length === 1) {
        // small optimization to send single object to server to reduce allocations required
        // to parse array compared to parse single object client request.
        messages = messages[0];
    }
    this._debug('Send', messages);
    this._transport.send(JSON.stringify(messages));
};

centrifugeProto._setupTransport = function () {

    var self = this;

    this._isSockJS = false;

    // detect transport to use - SockJS or raw Websocket
    if (this._sockJS !== null) {
        var sockjsOptions = {
            transports: this._config.transports
        };
        if (this._config.server !== null) {
            sockjsOptions.server = this._config.server;
        }
        this._isSockJS = true;
        this._transport = new this._sockJS(this._sockjsEndpoint(), null, sockjsOptions);
    } else {
        if (!this._websocketSupported()) {
            this._debug('No Websocket support and no SockJS configured, can not connect');
            return;
        }
        this._transport = new WebSocket(this._rawWebsocketEndpoint());
    }

    this._transport.onopen = function () {
        self._transportClosed = false;
        self._reconnecting = false;

        if (self._isSockJS) {
            self._transportName = self._transport.transport;
            self._transport.onheartbeat = function () {
                self._restartPing();
            };
        } else {
            self._transportName = 'raw-websocket';
        }

        self._resetRetry();

        if (!isString(self._config.user)) {
            self._log('user expected to be string');
        }
        if (!isString(self._config.info)) {
            self._log('info expected to be string');
        }

        var msg = {
            method: 'connect',
            params: {
                user: self._config.user,
                info: self._config.info
            }
        };

        if (!self._config.insecure) {
            // in insecure client mode we don't need timestamp and token.
            msg.params.timestamp = self._config.timestamp;
            msg.params.token = self._config.token;
            if (!isString(self._config.timestamp)) {
                self._log('timestamp expected to be string');
            }
            if (!isString(self._config.token)) {
                self._log('token expected to be string');
            }
        }
        self._addMessage(msg);
        self._latencyStart = new Date();
    };

    this._transport.onerror = function (error) {
        self._debug('transport level error', error);
    };

    this._transport.onclose = function (closeEvent) {
        self._transportClosed = true;
        var reason = 'connection closed';
        var needReconnect = true;
        if (closeEvent && 'reason' in closeEvent && closeEvent.reason) {
            try {
                var advice = JSON.parse(closeEvent.reason);
                self._debug('reason is an advice object', advice);
                reason = advice.reason;
                needReconnect = advice.reconnect;
            } catch (e) {
                reason = closeEvent.reason;
                self._debug('reason is a plain string', reason);
                needReconnect = reason !== 'disconnect';
            }
        }

        // onTransportClose callback should be executed every time transport was closed.
        // This can be helpful to catch failed connection events (because our disconnect
        // event only called once and every future attempts to connect do not fire disconnect
        // event again).
        if (self._config.onTransportClose !== null) {
            self._config.onTransportClose({
                event: closeEvent,
                reason: reason,
                reconnect: needReconnect
            });
        }

        self._disconnect(reason, needReconnect);

        if (self._reconnect === true) {
            self._reconnecting = true;
            var interval = self._getRetryInterval();
            self._debug('reconnect after ' + interval + ' milliseconds');
            setTimeout(function () {
                if (self._reconnect === true) {
                    self._connect.call(self);
                }
            }, interval);
        }

    };

    this._transport.onmessage = function (event) {
        var data;
        data = JSON.parse(event.data);
        self._debug('Received', data);
        self._receive(data);
        self._restartPing();
    };
};

centrifugeProto._connect = function (callback) {

    if (this.isConnected()) {
        this._debug('connect called when already connected');
        return;
    }

    if (this._status === 'connecting') {
        return;
    }

    this._debug('start connecting');

    this._setStatus('connecting');

    this._clientID = null;
    this._reconnect = true;

    if (callback) {
        this.on('connect', callback);
    }

    this._setupTransport();
};

centrifugeProto._disconnect = function (reason, shouldReconnect) {

    if (this.isDisconnected()) {
        return;
    }

    this._debug('disconnected:', reason, shouldReconnect);

    var reconnect = shouldReconnect || false;
    if (reconnect === false) {
        this._reconnect = false;
    }

    this._clearConnectedState(shouldReconnect);

    if (!this.isDisconnected()) {
        this._setStatus('disconnected');
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        if (this._reconnecting === false) {
            this.trigger('disconnect', [{
                reason: reason,
                reconnect: reconnect
            }]);
        }
    }

    if (!this._transportClosed) {
        this._transport.close();
    }
};

centrifugeProto._refreshFailed = function () {
    self._numRefreshFailed = 0;
    if (!this.isDisconnected()) {
        this._disconnect('refresh failed', false);
    }
    if (this._config.refreshFailed !== null) {
        this._config.refreshFailed();
    }
};

centrifugeProto._refresh = function () {
    // ask web app for connection parameters - user ID,
    // timestamp, info and token
    var self = this;
    this._debug('refresh credentials');

    if (self._config.refreshAttempts === 0) {
        this._debug('refresh attempts set to 0, do not send refresh request at all');
        self._refreshFailed();
        return;
    }

    if (self._refreshTimeout !== null) {
        clearTimeout(self._refreshTimeout);
    }

    var cb = function (error, data) {
        if (error === true) {
            // We don't perform any connection status related actions here as we are
            // relying on Centrifugo that must close connection eventually.
            self._debug('error getting connection credentials from refresh endpoint', data);
            self._numRefreshFailed++;
            if (self._refreshTimeout) {
                clearTimeout(self._refreshTimeout);
            }
            if (self._config.refreshAttempts !== null && self._numRefreshFailed >= self._config.refreshAttempts) {
                self._refreshFailed();
                return;
            }
            self._refreshTimeout = setTimeout(function () {
                self._refresh.call(self);
            }, self._config.refreshInterval + Math.round(Math.random() * 1000));
            return;
        }
        self._numRefreshFailed = 0;
        self._config.user = data.user;
        self._config.timestamp = data.timestamp;
        if ('info' in data) {
            self._config.info = data.info;
        }
        self._config.token = data.token;
        if (self.isDisconnected()) {
            self._debug('credentials refreshed, connect from scratch');
            self._connect();
        } else {
            self._debug('send refreshed credentials');
            self._addMessage({
                method: 'refresh',
                params: {
                    user: self._config.user,
                    timestamp: self._config.timestamp,
                    info: self._config.info,
                    token: self._config.token
                }
            });
        }
    };

    if (this._config.onRefresh !== null) {
        context = {};
        this._config.onRefresh(context, cb);
    } else {
        var transport = this._config.refreshTransport.toLowerCase();
        if (transport === 'ajax') {
            this._ajax(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, this._config.refreshData, cb);
        } else if (transport === 'jsonp') {
            this._jsonp(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, this._config.refreshData, cb);
        } else {
            throw 'Unknown refresh transport ' + transport;
        }
    }
};

centrifugeProto._subscribe = function (sub) {

    var channel = sub.channel;

    if (!(channel in this._subs)) {
        this._subs[channel] = sub;
    }

    if (!this.isConnected()) {
        // subscribe will be called later
        sub._setNew();
        return;
    }

    sub._setSubscribing();

    var msg = {
        method: 'subscribe',
        params: {
            channel: channel
        }
    };

    // If channel name does not start with privateChannelPrefix - then we
    // can just send subscription message to Centrifuge. If channel name
    // starts with privateChannelPrefix - then this is a private channel
    // and we should ask web application backend for permission first.
    if (startsWith(channel, this._config.privateChannelPrefix)) {
        // private channel
        if (this._isAuthBatching) {
            this._authChannels[channel] = true;
        } else {
            this.startAuthBatching();
            this._subscribe(sub);
            this.stopAuthBatching();
        }
    } else {
        var recover = this._recover(channel);
        if (recover === true) {
            msg.params.recover = true;
            msg.params.last = this._getLastID(channel);
        }
        this._addMessage(msg);
    }
};

centrifugeProto._unsubscribe = function (sub) {
    if (this.isConnected()) {
        // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
        this._addMessage({
            method: 'unsubscribe',
            params: {
                channel: sub.channel
            }
        });
    }
};

centrifugeProto._getSub = function (channel) {
    var sub = this._subs[channel];
    if (!sub) {
        return null;
    }
    return sub;
};

centrifugeProto._connectResponse = function (message) {
    if (this.isConnected()) {
        return;
    }

    if (!errorExists(message)) {

        if (this._latencyStart !== null) {
            this._latency = (new Date()).getTime() - this._latencyStart.getTime();
            this._latencyStart = null;
        }

        if (!message.body) {
            return;
        }
        if (message.body.expires) {
            var isExpired = message.body.expired;
            if (isExpired) {
                this._reconnecting = true;
                this._disconnect('expired', true);
                this._refresh();
                return;
            }
        }
        this._clientID = message.body.client;
        this._setStatus('connected');

        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }

        var self = this;

        if (message.body.expires) {
            this._refreshTimeout = setTimeout(function () {
                self._refresh.call(self);
            }, message.body.ttl * 1000);
        }

        if (this._config.resubscribe) {
            this.startBatching();
            this.startAuthBatching();
            for (var channel in this._subs) {
                if (this._subs.hasOwnProperty(channel)) {
                    var sub = this._subs[channel];
                    if (sub._shouldResubscribe()) {
                        this._subscribe(sub);
                    }
                }
            }
            this.stopAuthBatching();
            this.stopBatching(true);
        }

        this._restartPing();
        this.trigger('connect', [{
            client: message.body.client,
            transport: this._transportName,
            latency: this._latency
        }]);
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._stopPing = function () {
    if (this._pongTimeout !== null) {
        clearTimeout(this._pongTimeout);
    }
    if (this._pingInterval !== null) {
        clearInterval(this._pingInterval);
    }
};

centrifugeProto._startPing = function () {
    if (this._config.ping !== true || this._config.pingInterval <= 0) {
        return;
    }
    if (!this.isConnected()) {
        return;
    }

    var self = this;

    this._pingInterval = setInterval(function () {
        if (!self.isConnected()) {
            self._stopPing();
            return;
        }
        self.ping();
        self._pongTimeout = setTimeout(function () {
            self._disconnect('no ping', true);
        }, self._config.pongWaitTimeout);
    }, this._config.pingInterval);
};

centrifugeProto._restartPing = function () {
    this._stopPing();
    this._startPing();
};

centrifugeProto._disconnectResponse = function (message) {
    if (!errorExists(message)) {
        var shouldReconnect = false;
        if ('reconnect' in message.body) {
            shouldReconnect = message.body.reconnect;
        }
        var reason = '';
        if ('reason' in message.body) {
            reason = message.body.reason;
        }
        this._disconnect(reason, shouldReconnect);
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._subscribeResponse = function (message) {
    var body = message.body;
    if (body === null) {
        return;
    }
    var channel = body.channel;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }

    if (!sub._isSubscribing()) {
        return;
    }

    if (!errorExists(message)) {
        var messages = body.messages;
        if (messages && messages.length > 0) {
            // handle missed messages
            messages = messages.reverse();
            for (var i in messages) {
                if (messages.hasOwnProperty(i)) {
                    this._messageResponse({
                        body: messages[i]
                    });
                }
            }
        } else {
            if ('last' in body) {
                // no missed messages found so set last message id from body.
                this._lastMessageID[channel] = body.last;
            }
        }
        var recovered = false;
        if ('recovered' in body) {
            recovered = body.recovered;
        }
        sub._setSubscribeSuccess(recovered);
    } else {
        this.trigger('error', [{
            message: message
        }]);
        sub._setSubscribeError(this._errorObjectFromMessage(message));
    }
};

centrifugeProto._unsubscribeResponse = function (message) {
    var uid = message.uid;
    var body = message.body;
    var channel = body.channel;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }

    if (!errorExists(message)) {
        if (!uid) {
            // unsubscribe command from server – unsubscribe all current subs
            sub._setUnsubscribed();
        }
        // ignore client initiated successful unsubscribe responses as we
        // already unsubscribed on client level.
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._publishResponse = function (message) {
    var uid = message.uid;
    var body = message.body;
    if (!(uid in this._callbacks)) {
        return;
    }
    var callbacks = this._callbacks[uid];
    delete this._callbacks[uid];
    if (!errorExists(message)) {
        var callback = callbacks.callback;
        if (!callback) {
            return;
        }
        callback(body);
    } else {
        var errback = callbacks.errback;
        if (!errback) {
            return;
        }
        errback(this._errorObjectFromMessage(message));
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._presenceResponse = function (message) {
    var uid = message.uid;
    var body = message.body;
    if (!(uid in this._callbacks)) {
        return;
    }
    var callbacks = this._callbacks[uid];
    delete this._callbacks[uid];
    if (!errorExists(message)) {
        var callback = callbacks.callback;
        if (!callback) {
            return;
        }
        callback(body);
    } else {
        var errback = callbacks.errback;
        if (!errback) {
            return;
        }
        errback(this._errorObjectFromMessage(message));
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._historyResponse = function (message) {
    var uid = message.uid;
    var body = message.body;
    if (!(uid in this._callbacks)) {
        return;
    }
    var callbacks = this._callbacks[uid];
    delete this._callbacks[uid];
    if (!errorExists(message)) {
        var callback = callbacks.callback;
        if (!callback) {
            return;
        }
        callback(body);
    } else {
        var errback = callbacks.errback;
        if (!errback) {
            return;
        }
        errback(this._errorObjectFromMessage(message));
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._joinResponse = function (message) {
    var body = message.body;
    var channel = body.channel;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('join', [body]);
};

centrifugeProto._leaveResponse = function (message) {
    var body = message.body;
    var channel = body.channel;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('leave', [body]);
};

centrifugeProto._messageResponse = function (message) {
    var body = message.body;
    var channel = body.channel;

    // keep last uid received from channel.
    this._lastMessageID[channel] = body.uid;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('message', [body]);
};

centrifugeProto._refreshResponse = function (message) {
    if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
    }
    if (!errorExists(message)) {
        if (message.body.expires) {
            var self = this;
            var isExpired = message.body.expired;
            if (isExpired) {
                self._refreshTimeout = setTimeout(function () {
                    self._refresh.call(self);
                }, self._config.refreshInterval + Math.round(Math.random() * 1000));
                return;
            }
            this._clientID = message.body.client;
            self._refreshTimeout = setTimeout(function () {
                self._refresh.call(self);
            }, message.body.ttl * 1000);
        }
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._dispatchMessage = function (message) {
    if (message === undefined || message === null) {
        this._debug('dispatch: got undefined or null message');
        return;
    }

    var method = message.method;

    if (!method) {
        this._debug('dispatch: got message with empty method');
        return;
    }

    switch (method) {
        case 'connect':
            this._connectResponse(message);
            break;
        case 'disconnect':
            this._disconnectResponse(message);
            break;
        case 'subscribe':
            this._subscribeResponse(message);
            break;
        case 'unsubscribe':
            this._unsubscribeResponse(message);
            break;
        case 'publish':
            this._publishResponse(message);
            break;
        case 'presence':
            this._presenceResponse(message);
            break;
        case 'history':
            this._historyResponse(message);
            break;
        case 'join':
            this._joinResponse(message);
            break;
        case 'leave':
            this._leaveResponse(message);
            break;
        case 'ping':
            break;
        case 'refresh':
            this._refreshResponse(message);
            break;
        case 'message':
            this._messageResponse(message);
            break;
        default:
            this._debug('dispatch: got message with unknown method' + method);
            break;
    }
};

centrifugeProto._receive = function (data) {
    if (Object.prototype.toString.call(data) === Object.prototype.toString.call([])) {
        // array of responses received
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                this._dispatchMessage(data[i]);
            }
        }
    } else if (Object.prototype.toString.call(data) === Object.prototype.toString.call({})) {
        // one response received
        this._dispatchMessage(data);
    }
};

centrifugeProto._flush = function () {
    var messages = this._messages.slice(0);
    this._messages = [];
    this._send(messages);
};

centrifugeProto._ping = function () {
    this._addMessage({
        method: 'ping'
    });
};

centrifugeProto._recover = function (channel) {
    return channel in this._lastMessageID;
};

centrifugeProto._getLastID = function (channel) {
    var lastUID = this._lastMessageID[channel];
    if (lastUID) {
        this._debug('last uid found and sent for channel', channel);
        return lastUID;
    } else {
        this._debug('no last uid found for channel', channel);
        return '';
    }
};

centrifugeProto._createErrorObject = function (err, advice) {
    var errObject = {
        error: err
    };
    if (advice) {
        errObject.advice = advice;
    }
    return errObject;
};

centrifugeProto._errorObjectFromMessage = function (message) {
    return this._createErrorObject(message.error, message.advice);
};

centrifugeProto._registerCall = function (uid, callback, errback) {
    var self = this;
    this._callbacks[uid] = {
        callback: callback,
        errback: errback
    };
    setTimeout(function () {
        delete self._callbacks[uid];
        if (isFunction(errback)) {
            errback(self._createErrorObject('timeout', 'retry'));
        }
    }, this._config.timeout);
};

centrifugeProto._addMessage = function (message) {
    var uid = '' + this._nextMessageId();
    message.uid = uid;
    if (this._isBatching === true) {
        this._messages.push(message);
    } else {
        this._send([message]);
    }
    return uid;
};

centrifugeProto.getClientId = function () {
    return this._clientID;
};

centrifugeProto.isConnected = centrifugeProto._isConnected;

centrifugeProto.isDisconnected = centrifugeProto._isDisconnected;

centrifugeProto.configure = function (configuration) {
    this._configure.call(this, configuration);
};

centrifugeProto.connect = centrifugeProto._connect;

centrifugeProto.disconnect = function () {
    this._disconnect('client', false);
};

centrifugeProto.ping = centrifugeProto._ping;

centrifugeProto.startBatching = function () {
    // start collecting messages without sending them to Centrifuge until flush
    // method called
    this._isBatching = true;
};

centrifugeProto.stopBatching = function (flush) {
    // stop collecting messages
    flush = flush || false;
    this._isBatching = false;
    if (flush === true) {
        this.flush();
    }
};

centrifugeProto.flush = function () {
    // send batched messages to Centrifuge
    this._flush();
};

centrifugeProto.startAuthBatching = function () {
    // start collecting private channels to create bulk authentication
    // request to authEndpoint when stopAuthBatching will be called
    this._isAuthBatching = true;
};

centrifugeProto.stopAuthBatching = function () {
    var i,
        channel;

    // create request to authEndpoint with collected private channels
    // to ask if this client can subscribe on each channel
    this._isAuthBatching = false;
    var authChannels = this._authChannels;
    this._authChannels = {};
    var channels = [];

    for (channel in authChannels) {
        if (authChannels.hasOwnProperty(channel)) {
            var sub = this._getSub(channel);
            if (!sub) {
                continue;
            }
            channels.push(channel);
        }
    }

    if (channels.length === 0) {
        return;
    }

    var data = {
        client: this.getClientId(),
        channels: channels
    };

    var self = this;

    var cb = function (error, data) {
        if (error === true) {
            self._debug('authorization request failed');
            for (i in channels) {
                if (channels.hasOwnProperty(i)) {
                    channel = channels[i];
                    self._subscribeResponse({
                        error: 'authorization request failed',
                        advice: 'fix',
                        body: {
                            channel: channel
                        }
                    });
                }
            }
            return;
        }

        // try to send all subscriptions in one request.
        var batch = false;
        if (!self._isBatching) {
            self.startBatching();
            batch = true;
        }

        for (i in channels) {
            if (channels.hasOwnProperty(i)) {
                channel = channels[i];
                var channelResponse = data[channel];
                if (!channelResponse) {
                    // subscription:error
                    self._subscribeResponse({
                        error: 'channel not found in authorization response',
                        advice: 'fix',
                        body: {
                            channel: channel
                        }
                    });
                    continue;
                }
                if (!channelResponse.status || channelResponse.status === 200) {
                    var msg = {
                        method: 'subscribe',
                        params: {
                            channel: channel,
                            client: self.getClientId(),
                            info: channelResponse.info,
                            sign: channelResponse.sign
                        }
                    };
                    var recover = self._recover(channel);
                    if (recover === true) {
                        msg.params.recover = true;
                        msg.params.last = self._getLastID(channel);
                    }
                    self._addMessage(msg);
                } else {
                    self._subscribeResponse({
                        error: channelResponse.status,
                        body: {
                            channel: channel
                        }
                    });
                }
            }
        }

        if (batch) {
            self.stopBatching(true);
        }

    };

    if (this._config.onPrivateChannelAuth !== null) {
        this._config.onPrivateChannelAuth({
            data: data
        }, cb);
    } else {
        var transport = this._config.authTransport.toLowerCase();
        if (transport === 'ajax') {
            this._ajax(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else if (transport === 'jsonp') {
            this._jsonp(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else {
            throw 'Unknown private channel auth transport ' + transport;
        }
    }
};

centrifugeProto.subscribe = function (channel, events) {
    if (arguments.length < 1) {
        throw 'Illegal arguments number: required 1, got ' + arguments.length;
    }
    if (!isString(channel)) {
        throw 'Illegal argument type: channel must be a string';
    }
    if (!this._config.resubscribe && !this.isConnected()) {
        throw 'Can not only subscribe in connected state when resubscribe option is off';
    }

    var currentSub = this._getSub(channel);

    if (currentSub !== null) {
        currentSub._setEvents(events);
        if (currentSub._isUnsubscribed()) {
            currentSub.subscribe();
        }
        return currentSub;
    } else {
        var sub = new Sub(this, channel, events);
        this._subs[channel] = sub;
        sub.subscribe();
        return sub;
    }
};

var _STATE_NEW = 0;
var _STATE_SUBSCRIBING = 1;
var _STATE_SUCCESS = 2;
var _STATE_ERROR = 3;
var _STATE_UNSUBSCRIBED = 4;

function Sub(centrifuge, channel, events) {
    this._status = _STATE_NEW;
    this._error = null;
    this._centrifuge = centrifuge;
    this.channel = channel;
    this._setEvents(events);
    this._isResubscribe = false;
    this._recovered = false;
    this._ready = false;
    this._promise = null;
    this._noResubscribe = false;
    this._initializePromise();
}

extend(Sub, EventEmitter);

var subProto = Sub.prototype;

subProto._initializePromise = function () {
    this._ready = false;
    var self = this;
    this._promise = new Promise(function (resolve, reject) {
        self._resolve = function (value) {
            self._ready = true;
            resolve(value);
        };
        self._reject = function (err) {
            self._ready = true;
            reject(err);
        };
    });
};

subProto._setEvents = function (events) {
    if (!events) {
        return;
    }
    if (isFunction(events)) {
        this.on('message', events);
    } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
        var knownEvents = ['message', 'join', 'leave', 'unsubscribe', 'subscribe', 'error'];
        for (var i = 0, l = knownEvents.length; i < l; i++) {
            var ev = knownEvents[i];
            if (ev in events) {
                this.on(ev, events[ev]);
            }
        }
    }
};

subProto._isNew = function () {
    return this._status === _STATE_NEW;
};

subProto._isUnsubscribed = function () {
    return this._status === _STATE_UNSUBSCRIBED;
};

subProto._isSubscribing = function () {
    return this._status === _STATE_SUBSCRIBING;
};

subProto._isReady = function () {
    return this._status === _STATE_SUCCESS || this._status === _STATE_ERROR;
};

subProto._isSuccess = function () {
    return this._status === _STATE_SUCCESS;
};

subProto._isError = function () {
    return this._status === _STATE_ERROR;
};

subProto._setNew = function () {
    this._status = _STATE_NEW;
};

subProto._setSubscribing = function () {
    if (this._ready === true) {
        // new promise for this subscription
        this._initializePromise();
        this._isResubscribe = true;
    }
    this._status = _STATE_SUBSCRIBING;
};

subProto._setSubscribeSuccess = function (recovered) {
    if (this._status === _STATE_SUCCESS) {
        return;
    }
    this._recovered = recovered;
    this._status = _STATE_SUCCESS;
    var successContext = this._getSubscribeSuccessContext(recovered);
    this.trigger('subscribe', [successContext]);
    this._resolve(successContext);
};

subProto._setSubscribeError = function (err) {
    if (this._status === _STATE_ERROR) {
        return;
    }
    this._status = _STATE_ERROR;
    this._error = err;
    var errContext = this._getSubscribeErrorContext();
    this.trigger('error', [errContext]);
    this._reject(errContext);
};

subProto._triggerUnsubscribe = function () {
    this.trigger('unsubscribe', [{
        channel: this.channel
    }]);
};

subProto._setUnsubscribed = function (noResubscribe) {
    if (this._status === _STATE_UNSUBSCRIBED) {
        return;
    }
    this._status = _STATE_UNSUBSCRIBED;
    if (noResubscribe === true) {
        this._noResubscribe = true;
    }
    this._triggerUnsubscribe();
};

subProto._shouldResubscribe = function () {
    return !this._noResubscribe;
};

subProto._getSubscribeSuccessContext = function () {
    return {
        channel: this.channel,
        isResubscribe: this._isResubscribe,
        recovered: this._recovered
    };
};

subProto._getSubscribeErrorContext = function () {
    var subscribeErrorContext = this._error;
    subscribeErrorContext.channel = this.channel;
    subscribeErrorContext.isResubscribe = this._isResubscribe;
    return subscribeErrorContext;
};

subProto.ready = function (callback, errback) {
    if (this._ready) {
        if (this._isSuccess()) {
            callback(this._getSubscribeSuccessContext());
        } else {
            errback(this._getSubscribeErrorContext());
        }
    }
};

subProto.subscribe = function () {
    if (this._status === _STATE_SUCCESS) {
        return;
    }
    this._centrifuge._subscribe(this);
    return this;
};

subProto.unsubscribe = function () {
    this._setUnsubscribed(true);
    this._centrifuge._unsubscribe(this);
};

subProto.publish = function (data) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed', 'fix'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected', 'retry'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: 'publish',
                params: {
                    channel: self.channel,
                    data: data
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

subProto.presence = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed', 'fix'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected', 'retry'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: 'presence',
                params: {
                    channel: self.channel
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

subProto.history = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed', 'fix'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected', 'retry'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: 'history',
                params: {
                    channel: self.channel
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

module.exports = Centrifuge;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"es6-promise":2,"wolfy87-eventemitter":3}]},{},[4])(4)
});