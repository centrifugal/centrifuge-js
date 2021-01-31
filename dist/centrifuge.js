(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("Centrifuge", [], factory);
	else if(typeof exports === 'object')
		exports["Centrifuge"] = factory();
	else
		root["Centrifuge"] = factory();
})(this, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 187:
/***/ (function(module) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function eventListener() {
      if (errorListener !== undefined) {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };
    var errorListener;

    // Adding an error listener is not optional because
    // if an error is thrown on an event emitter we cannot
    // guarantee that the actual event we are waiting will
    // be fired. The result could be a silent way to create
    // memory or file descriptor leaks, which is something
    // we should avoid.
    if (name !== 'error') {
      errorListener = function errorListener(err) {
        emitter.removeListener(name, eventListener);
        reject(err);
      };

      emitter.once('error', errorListener);
    }

    emitter.once(name, eventListener);
  });
}


/***/ }),

/***/ 889:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ src; }
});

// EXTERNAL MODULE: ./node_modules/events/events.js
var events = __webpack_require__(187);
var events_default = /*#__PURE__*/__webpack_require__.n(events);
;// CONCATENATED MODULE: ./src/utils.js
function startsWith(value, prefix) {
  return value.lastIndexOf(prefix, 0) === 0;
};

function isFunction(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'function';
};

function log(level, args) {
  if (__webpack_require__.g.console) {
    const logger = __webpack_require__.g.console[level];

    if (isFunction(logger)) {
      logger.apply(__webpack_require__.g.console, args);
    }
  }
};

function backoff(step, min, max) {
  const jitter = 0.5 * Math.random();
  const interval = Math.min(max, min * Math.pow(2, step + 1));

  return Math.floor((1 - jitter) * interval);
};

function errorExists(data) {
  return 'error' in data && data.error !== null;
};

function extend(a, b) {
  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      a[key] = b[key];
    }
  }
  return a;
};

;// CONCATENATED MODULE: ./src/subscription.js




const _STATE_NEW = 0;
const _STATE_SUBSCRIBING = 1;
const _STATE_SUCCESS = 2;
const _STATE_ERROR = 3;
const _STATE_UNSUBSCRIBED = 4;

class Subscription extends (events_default()) {
  constructor(centrifuge, channel, events) {
    super();
    this.channel = channel;
    this._centrifuge = centrifuge;
    this._status = _STATE_NEW;
    this._error = null;
    this._isResubscribe = false;
    this._ready = false;
    this._subscriptionPromise = null;
    this._noResubscribe = false;
    this._recoverable = false;
    this._recover = false;
    this._setEvents(events);
    this._initializePromise();
    this._promises = {};
    this._promiseId = 0;
    this.on('error', function (errContext) {
      this._centrifuge._debug('subscription error', errContext);
    });
  }

  _nextPromiseId() {
    return ++this._promiseId;
  }

  _initializePromise() {
    // this helps us to wait until subscription will successfully
    // subscribe and call actions such as presence, history etc in
    // synchronous way.
    this._ready = false;

    this._subscriptionPromise = new Promise((resolve, reject) => {
      this._resolve = value => {
        this._ready = true;
        resolve(value);
      };
      this._reject = err => {
        this._ready = true;
        reject(err);
      };
    }).then(function () {}, function () {});
  };

  _needRecover() {
    return this._recoverable === true && this._recover === true;
  };

  _setEvents(events) {
    if (!events) {
      return;
    }
    if (isFunction(events)) {
      // events is just a function to handle publication received from channel.
      this.on('publish', events);
    } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
      const knownEvents = ['publish', 'join', 'leave', 'unsubscribe', 'subscribe', 'error'];
      for (let i = 0, l = knownEvents.length; i < l; i++) {
        const ev = knownEvents[i];
        if (ev in events) {
          this.on(ev, events[ev]);
        }
      }
    }
  };

  _isNew() {
    return this._status === _STATE_NEW;
  };

  _isUnsubscribed() {
    return this._status === _STATE_UNSUBSCRIBED;
  };

  _isSubscribing() {
    return this._status === _STATE_SUBSCRIBING;
  };

  _isReady() {
    return this._status === _STATE_SUCCESS || this._status === _STATE_ERROR;
  };

  _isSuccess() {
    return this._status === _STATE_SUCCESS;
  };

  _isError() {
    return this._status === _STATE_ERROR;
  };

  _setNew() {
    this._status = _STATE_NEW;
  };

  _setSubscribing(isResubscribe) {
    this._isResubscribe = isResubscribe || false;
    if (this._ready === true) {
      // new promise for this subscription
      this._initializePromise();
    }
    this._status = _STATE_SUBSCRIBING;
  };

  _setSubscribeSuccess(subscribeResult) {
    if (this._status === _STATE_SUCCESS) {
      return;
    }
    this._status = _STATE_SUCCESS;
    const successContext = this._getSubscribeSuccessContext(subscribeResult);
    this._recover = false;
    this.emit('subscribe', successContext);
    this._resolve(successContext);
    for (const id in this._promises) {
      clearTimeout(this._promises[id].timeout);
      this._promises[id].resolve();
      delete this._promises[id];
    }
  };

  _setSubscribeError(err) {
    if (this._status === _STATE_ERROR) {
      return;
    }
    this._status = _STATE_ERROR;
    this._error = err;
    const errContext = this._getSubscribeErrorContext();
    this.emit('error', errContext);
    this._reject(errContext);
    for (const id in this._promises) {
      clearTimeout(this._promises[id].timeout);
      this._promises[id].reject(err);
      delete this._promises[id];
    }
  };

  _triggerUnsubscribe() {
    this.emit('unsubscribe', {
      channel: this.channel
    });
  };

  _setUnsubscribed(noResubscribe) {
    this._centrifuge._clearSubRefreshTimeout(this.channel);
    if (this._status === _STATE_UNSUBSCRIBED) {
      return;
    }
    const needTrigger = this._status === _STATE_SUCCESS;
    this._status = _STATE_UNSUBSCRIBED;
    if (noResubscribe === true) {
      this._recover = false;
      this._noResubscribe = true;
      delete this._centrifuge._lastSeq[this.channel];
      delete this._centrifuge._lastGen[this.channel];
      delete this._centrifuge._lastEpoch[this.channel];
    }
    if (needTrigger) {
      this._triggerUnsubscribe();
    }
  };

  _shouldResubscribe() {
    return !this._noResubscribe;
  };

  _getSubscribeSuccessContext(subscribeResult) {
    let ctx = {
      channel: this.channel,
      isResubscribe: this._isResubscribe
    };
    if (subscribeResult) {
      // subscribeResult not available when called from Subscription.ready method at the moment.
      ctx = this._centrifuge._expandSubscribeContext(ctx, subscribeResult);
    }
    return ctx;
  };

  _getSubscribeErrorContext() {
    const subscribeErrorContext = this._error;
    subscribeErrorContext.channel = this.channel;
    subscribeErrorContext.isResubscribe = this._isResubscribe;
    return subscribeErrorContext;
  };

  ready(callback, errback) {
    if (this._ready) {
      if (this._isSuccess()) {
        callback(this._getSubscribeSuccessContext());
      } else {
        errback(this._getSubscribeErrorContext());
      }
    }
  };

  subscribe() {
    if (this._status === _STATE_SUCCESS) {
      return;
    }
    this._noResubscribe = false;
    this._centrifuge._subscribe(this);
  };

  unsubscribe() {
    this._setUnsubscribed(true);
    this._centrifuge._unsubscribe(this);
  };

  _methodCall(message, type) {
    const methodCallPromise = new Promise((resolve, reject) => {
      let subPromise;
      if (this._isSuccess()) {
        subPromise = Promise.resolve();
      } else if (this._isError()) {
        subPromise = Promise.reject(this._error);
      } else {
        subPromise = new Promise((res, rej) => {
          const timeout = setTimeout(function () {
            rej({'code': 0, 'message': 'timeout'});
          }, this._centrifuge._config.timeout);
          this._promises[this._nextPromiseId()] = {
            timeout: timeout,
            resolve: res,
            reject: rej
          };
        });
      }
      subPromise.then(
        () => {
          return this._centrifuge._call(message).then(
            resolveCtx => {
              resolve(this._centrifuge._decoder.decodeCommandResult(type, resolveCtx.result));
              if (resolveCtx.next) {
                resolveCtx.next();
              }
            },
            rejectCtx => {
              reject(rejectCtx.error);
              if (rejectCtx.next) {
                rejectCtx.next();
              }
            }
          );
        },
        error => {
          reject(error);
        }
      );
    });
    return methodCallPromise;
  }

  publish(data) {
    return this._methodCall({
      method: this._centrifuge._methodType.PUBLISH,
      params: {
        channel: this.channel,
        data: data
      }
    }, this._centrifuge._methodType.PUBLISH);
  };

  presence() {
    return this._methodCall({
      method: this._centrifuge._methodType.PRESENCE,
      params: {
        channel: this.channel
      }
    }, this._centrifuge._methodType.PRESENCE);
  };

  presenceStats() {
    return this._methodCall({
      method: this._centrifuge._methodType.PRESENCE_STATS,
      params: {
        channel: this.channel
      }
    }, this._centrifuge._methodType.PRESENCE_STATS);
  };

  history(options) {
    const params = this._centrifuge._getHistoryParams(this.channel, options);
    return this._methodCall({
      method: this._centrifuge._methodType.HISTORY,
      params: params
    }, this._centrifuge._methodType.HISTORY);
  };
}

;// CONCATENATED MODULE: ./src/json.js
const JsonMethodType = {
  CONNECT: 0,
  SUBSCRIBE: 1,
  UNSUBSCRIBE: 2,
  PUBLISH: 3,
  PRESENCE: 4,
  PRESENCE_STATS: 5,
  HISTORY: 6,
  PING: 7,
  SEND: 8,
  RPC: 9,
  REFRESH: 10,
  SUB_REFRESH: 11
};

const JsonPushType = {
  PUBLICATION: 0,
  JOIN: 1,
  LEAVE: 2,
  UNSUB: 3,
  MESSAGE: 4,
  SUB: 5
};

class JsonEncoder {
  encodeCommands(commands) {
    const encodedCommands = [];
    for (const i in commands) {
      if (commands.hasOwnProperty(i)) {
        encodedCommands.push(JSON.stringify(commands[i]));
      }
    }
    return encodedCommands.join('\n');
  }
}

class JsonDecoder {
  decodeReplies(data) {
    const replies = [];
    const encodedReplies = data.split('\n');
    for (const i in encodedReplies) {
      if (encodedReplies.hasOwnProperty(i)) {
        if (!encodedReplies[i]) {
          continue;
        }
        const reply = JSON.parse(encodedReplies[i]);
        replies.push(reply);
      }
    }
    return replies;
  }

  decodeCommandResult(methodType, data) {
    return data;
  }

  decodePush(data) {
    return data;
  }

  decodePushData(pushType, data) {
    return data;
  }
}


;// CONCATENATED MODULE: ./src/centrifuge.js







const _errorTimeout = 'timeout';
const _errorConnectionClosed = 'connection closed';

class Centrifuge extends (events_default()) {

  constructor(url, options) {
    super();
    this._url = url;
    this._websocket = null;
    this._sockjs = null;
    this._isSockjs = false;
    this._binary = false;
    this._methodType = null;
    this._pushType = null;
    this._encoder = null;
    this._decoder = null;
    this._status = 'disconnecte';
    this._reconnect = true;
    this._reconnecting = false;
    this._transport = null;
    this._transportName = null;
    this._transportClosed = true;
    this._messageId = 0;
    this._clientID = null;
    this._refreshRequired = false;
    this._subs = {};
    this._serverSubs = {};
    this._lastSeq = {};
    this._lastGen = {};
    this._lastOffset = {};
    this._lastEpoch = {};
    this._messages = [];
    this._isBatching = false;
    this._isSubscribeBatching = false;
    this._privateChannels = {};
    this._numRefreshFailed = 0;
    this._refreshTimeout = null;
    this._pingTimeout = null;
    this._pongTimeout = null;
    this._subRefreshTimeouts = {};
    this._retries = 0;
    this._callbacks = {};
    this._latency = null;
    this._latencyStart = null;
    this._connectData = null;
    this._token = null;
    this._xhrID = 0;
    this._xhrs = {};
    this._dispatchPromise = Promise.resolve();
    this._config = {
      debug: false,
      name: '',
      version: '',
      websocket: null,
      sockjs: null,
      minRetry: 1000,
      maxRetry: 20000,
      timeout: 5000,
      ping: true,
      pingInterval: 25000,
      pongWaitTimeout: 5000,
      privateChannelPrefix: '$',
      onTransportClose: null,
      sockjsServer: null,
      sockjsTransports: [
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
      refreshEndpoint: '/centrifuge/refresh',
      refreshHeaders: {},
      refreshParams: {},
      refreshData: {},
      refreshAttempts: null,
      refreshInterval: 1000,
      onRefreshFailed: null,
      onRefresh: null,
      subscribeEndpoint: '/centrifuge/subscribe',
      subscribeHeaders: {},
      subscribeParams: {},
      subRefreshInterval: 1000,
      onPrivateSubscribe: null
    };
    this._configure(options);
  }

  setToken(token) {
    this._token = token;
  }

  setConnectData(data) {
    this._connectData = data;
  }

  setRefreshHeaders(headers) {
    this._config.refreshHeaders = headers;
  }
  setRefreshParams(params) {
    this._config.refreshParams = params;
  }
  setRefreshData(data) {
    this._config.refreshData = data;
  }

  setSubscribeHeaders(headers) {
    this._config.subscribeHeaders = headers;
  }
  setSubscribeParams(params) {
    this._config.subscribeParams = params;
  }

  _ajax(url, params, headers, data, callback) {
    let query = '';
    this._debug('sending AJAX request to', url, 'with data', JSON.stringify(data));

    const xhr = (__webpack_require__.g.XMLHttpRequest ? new __webpack_require__.g.XMLHttpRequest() : new __webpack_require__.g.ActiveXObject('Microsoft.XMLHTTP'));

    for (const i in params) {
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

    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    for (const headerName in headers) {
      if (headers.hasOwnProperty(headerName)) {
        xhr.setRequestHeader(headerName, headers[headerName]);
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          let data, parsed = false;
          try {
            data = JSON.parse(xhr.responseText);
            parsed = true;
          } catch (e) {
            callback({
              error: 'Invalid JSON. Data was: ' + xhr.responseText,
              status: 200,
              data: null
            });
          }
          if (parsed) { // prevents double execution.
            callback({
              data: data,
              status: 200
            });
          }
        } else {
          this._log('wrong status code in AJAX response', xhr.status);
          callback({
            status: xhr.status,
            data: null
          });
        }
      }
    };
    setTimeout(() => xhr.send(JSON.stringify(data)), 20);
    return xhr;
  };

  _log() {
    log('info', arguments);
  };

  _debug() {
    if (this._config.debug === true) {
      log('debug', arguments);
    }
  };

  _websocketSupported() {
    if (this._config.websocket !== null) {
      return true;
    }
    return !(typeof WebSocket !== 'function' && typeof WebSocket !== 'object');
  };

  _setFormat(format) {
    if (this._formatOverride(format)) {
      return;
    }
    if (format === 'protobuf') {
      throw new Error('not implemented by JSON only Centrifuge client – use client with Protobuf');
    }
    this._binary = false;
    this._methodType = JsonMethodType;
    this._pushType = JsonPushType;
    this._encoder = new JsonEncoder();
    this._decoder = new JsonDecoder();
  }

  _formatOverride(format) {
    return false;
  }

  _configure(configuration) {
    if (!('Promise' in __webpack_require__.g)) {
      throw new Error('Promise polyfill required');
    }

    extend(this._config, configuration || {});
    this._debug('centrifuge config', this._config);

    if (!this._url) {
      throw new Error('url required');
    }

    if (startsWith(this._url, 'ws') && this._url.indexOf('format=protobuf') > -1) {
      this._setFormat('protobuf');
    } else {
      this._setFormat('json');
    }

    if (startsWith(this._url, 'http')) {
      this._debug('client will try to connect to SockJS endpoint');
      if (this._config.sockjs !== null) {
        this._debug('SockJS explicitly provided in options');
        this._sockjs = this._config.sockjs;
      } else {
        if (typeof __webpack_require__.g.SockJS === 'undefined') {
          throw new Error('SockJS not found, use ws:// in url or include SockJS');
        }
        this._debug('use globally defined SockJS');
        this._sockjs = __webpack_require__.g.SockJS;
      }
    } else {
      this._debug('client will connect to websocket endpoint');
    }
  };

  _setStatus(newStatus) {
    if (this._status !== newStatus) {
      this._debug('Status', this._status, '->', newStatus);
      this._status = newStatus;
    }
  };

  _isDisconnected() {
    return this._status === 'disconnected';
  };

  _isConnecting() {
    return this._status === 'connecting';
  };

  _isConnected() {
    return this._status === 'connected';
  };

  _nextMessageId() {
    return ++this._messageId;
  };

  _resetRetry() {
    this._debug('reset retries count to 0');
    this._retries = 0;
  };

  _getRetryInterval() {
    const interval = backoff(this._retries, this._config.minRetry, this._config.maxRetry);

    this._retries += 1;
    return interval;
  };

  _abortInflightXHRs() {
    for (const xhrID in this._xhrs) {
      try {
        this._xhrs[xhrID].abort();
      } catch (e) {
        this._debug('error aborting xhr', e);
      }
      delete this._xhrs[xhrID];
    }
  };

  _clearConnectedState(reconnect) {
    this._clientID = null;
    this._stopPing();

    // fire errbacks of registered outgoing calls.
    for (const id in this._callbacks) {
      if (this._callbacks.hasOwnProperty(id)) {
        const callbacks = this._callbacks[id];
        clearTimeout(callbacks.timeout);
        const errback = callbacks.errback;
        if (!errback) {
          continue;
        }
        errback({error: this._createErrorObject('disconnected')});
      }
    }
    this._callbacks = {};

    // fire unsubscribe events
    for (const channel in this._subs) {
      if (this._subs.hasOwnProperty(channel)) {
        const sub = this._subs[channel];

        if (reconnect) {
          if (sub._isSuccess()) {
            sub._triggerUnsubscribe();
            sub._recover = true;
          }
          if (sub._shouldResubscribe()) {
            sub._setSubscribing();
          }
        } else {
          sub._setUnsubscribed();
        }
      }
    }

    this._abortInflightXHRs();

    // clear refresh timer
    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    // clear sub refresh timers
    for (const channel in this._subRefreshTimeouts) {
      if (this._subRefreshTimeouts.hasOwnProperty(channel) && this._subRefreshTimeouts[channel]) {
        this._clearSubRefreshTimeout(channel);
      }
    }
    this._subRefreshTimeouts = {};

    if (!this._reconnect) {
      // completely clear subscriptions
      this._subs = {};
    }
  };

  _isTransportOpen() {
    if (this._isSockjs) {
      return this._transport &&
        this._transport.transport &&
        this._transport.transport.readyState === this._transport.transport.OPEN;
    }
    return this._transport && this._transport.readyState === this._transport.OPEN;
  };

  _transportSend(commands) {
    if (!commands.length) {
      return true;
    }

    if (!this._isTransportOpen()) {
      // resolve pending commands with error if transport is not open
      for (let command in commands) {
        let id = command.id;
        if (!(id in this._callbacks)) {
          continue;
        }
        const callbacks = this._callbacks[id];
        clearTimeout(this._callbacks[id].timeout);
        delete this._callbacks[id];
        const errback = callbacks.errback;
        errback({error: this._createErrorObject(_errorConnectionClosed, 0)});
      }
      return false;
    }
    this._transport.send(this._encoder.encodeCommands(commands));
    return true;
  }

  _setupTransport() {
    this._isSockjs = false;

    // detect transport to use - SockJS or Websocket
    if (this._sockjs !== null) {
      const sockjsOptions = {
        transports: this._config.sockjsTransports
      };

      if (this._config.sockjsServer !== null) {
        sockjsOptions.server = this._config.sockjsServer;
      }
      this._isSockjs = true;
      this._transport = new this._sockjs(this._url, null, sockjsOptions);
    } else {
      if (!this._websocketSupported()) {
        this._debug('No Websocket support and no SockJS configured, can not connect');
        return;
      }
      if (this._config.websocket !== null) {
        this._websocket = this._config.websocket;
      } else {
        this._websocket = WebSocket;
      }
      this._transport = new this._websocket(this._url);
      if (this._binary === true) {
        this._transport.binaryType = 'arraybuffer';
      }
    }

    this._transport.onopen = () => {
      this._transportClosed = false;

      if (this._isSockjs) {
        this._transportName = 'sockjs-' + this._transport.transport;
        this._transport.onheartbeat = () => this._restartPing();
      } else {
        this._transportName = 'websocket';
      }

      // Can omit method here due to zero value.
      const msg = {
        // method: this._methodType.CONNECT
      };

      if (this._token || this._connectData || this._config.name || this._config.version) {
        msg.params = {};
      }
      if (this._token) {
        msg.params.token = this._token;
      }
      if (this._connectData) {
        msg.params.data = this._connectData;
      }
      if (this._config.name) {
        msg.params.name = this._config.name;
      }
      if (this._config.version) {
        msg.params.version = this._config.version;
      }

      let subs = {};
      let hasSubs = false;
      for (const channel in this._serverSubs) {
        if (this._serverSubs.hasOwnProperty(channel) && this._serverSubs[channel].recoverable) {
          hasSubs = true;
          let sub = {
            'recover': true
          };
          if (this._serverSubs[channel].seq || this._serverSubs[channel].gen) {
            if (this._serverSubs[channel].seq) {
              sub['seq'] = this._serverSubs[channel].seq;
            }
            if (this._serverSubs[channel].gen) {
              sub['gen'] = this._serverSubs[channel].gen;
            }
          } else {
            if (this._serverSubs[channel].offset) {
              sub['offset'] = this._serverSubs[channel].offset;
            }
          }
          if (this._serverSubs[channel].epoch) {
            sub['epoch'] = this._serverSubs[channel].epoch;
          }
          subs[channel] = sub;
        }
      }
      if (hasSubs) {
        if (!msg.params) {msg.params = {};}
        msg.params.subs = subs;
      }

      this._latencyStart = new Date();
      this._call(msg).then(resolveCtx => {
        this._connectResponse(this._decoder.decodeCommandResult(this._methodType.CONNECT, resolveCtx.result), hasSubs);
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        const err = rejectCtx.error;
        if (err.code === 109) { // token expired.
          this._refreshRequired = true;
        }
        this._disconnect('connect error', true);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    };

    this._transport.onerror = error => {
      this._debug('transport level error', error);
    };

    this._transport.onclose = closeEvent => {
      this._transportClosed = true;
      let reason = _errorConnectionClosed;
      let needReconnect = true;

      if (closeEvent && 'reason' in closeEvent && closeEvent.reason) {
        try {
          const advice = JSON.parse(closeEvent.reason);
          this._debug('reason is an advice object', advice);
          reason = advice.reason;
          needReconnect = advice.reconnect;
        } catch (e) {
          reason = closeEvent.reason;
          this._debug('reason is a plain string', reason);
        }
      }

      // onTransportClose callback should be executed every time transport was closed.
      // This can be helpful to catch failed connection events (because our disconnect
      // event only called once and every future attempts to connect do not fire disconnect
      // event again).
      if (this._config.onTransportClose !== null) {
        this._config.onTransportClose({
          event: closeEvent,
          reason: reason,
          reconnect: needReconnect
        });
      }

      this._disconnect(reason, needReconnect);

      if (this._reconnect === true) {
        this._reconnecting = true;
        const interval = this._getRetryInterval();

        this._debug('reconnect after ' + interval + ' milliseconds');
        setTimeout(() => {
          if (this._reconnect === true) {
            if (this._refreshRequired) {
              this._refresh();
            } else {
              this._connect();
            }
          }
        }, interval);
      }
    };

    this._transport.onmessage = event => {
      this._dataReceived(event.data);
    };
  };

  rpc(data) {
    return this._rpc('', data);
  }

  namedRPC(method, data) {
    return this._rpc(method, data);
  }

  _rpc(method, data) {
    let params = {
      data: data
    };
    if (method !== '') {
      params.method = method;
    };
    const msg = {
      method: this._methodType.RPC,
      params: params
    };
    return this._methodCall(msg, function (result) {
      return result;
    });
  }

  send(data) {
    const msg = {
      method: this._methodType.SEND,
      params: {
        data: data
      }
    };

    if (!this.isConnected()) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    }

    const sent = this._transportSend([msg]); // can send async message to server without id set
    if (!sent) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    };
    return Promise.resolve({});
  }

  _getHistoryParams(channel, options) {
    let params = {
      channel: channel
    };
    if (options !== undefined) {
      if (options.since) {
        params['use_since'] = true;
        if (options.since.offset) {
          params['offset'] = options.since.offset;
        }
        if (options.since.epoch) {
          params['epoch'] = options.since.epoch;
        }
      };
      if (options.limit !== undefined) {
        params['use_limit'] = true;
        params['limit'] = options.limit;
      }
    };
    return params;
  }

  _methodCall(msg, resultCB) {
    if (!this.isConnected()) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    }
    return new Promise((resolve, reject) => {
      this._call(msg).then(resolveCtx => {
        resolve(resultCB(this._decoder.decodeCommandResult(msg.method, resolveCtx.result)));
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        reject(rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    });
  }

  publish(channel, data) {
    const msg = {
      method: this._methodType.PUBLISH,
      params: {
        channel: channel,
        data: data
      }
    };
    return this._methodCall(msg, function (result) {
      return {};
    });
  }

  history(channel, options) {
    const params = this._getHistoryParams(channel, options);
    const msg = {
      method: this._methodType.HISTORY,
      params: params
    };
    return this._methodCall(msg, function (result) {
      return result;
    });
  }

  presence(channel) {
    const msg = {
      method: this._methodType.PRESENCE,
      params: {
        channel: channel
      }
    };
    return this._methodCall(msg, function (result) {
      return result;
    });
  }

  presenceStats(channel) {
    const msg = {
      method: this._methodType.PRESENCE_STATS,
      params: {
        channel: channel
      }
    };
    return this._methodCall(msg, function (result) {
      return result;
    });
  }

  _dataReceived(data) {
    const replies = this._decoder.decodeReplies(data);
    // we have to guarantee order of events in replies processing - i.e. start processing
    // next reply only when we finished processing of current one. Without syncing things in
    // this way we could get wrong publication events order as reply promises resolve
    // on next loop tick so for loop continues before we finished emitting all reply events.
    this._dispatchPromise = this._dispatchPromise.then(() => {
      let finishDispatch;
      this._dispatchPromise = new Promise(resolve =>{
        finishDispatch = resolve;
      });
      this._dispatchSynchronized(replies, finishDispatch);
    });
    this._restartPing();
  }

  _dispatchSynchronized(replies, finishDispatch) {
    let p = Promise.resolve();
    for (const i in replies) {
      if (replies.hasOwnProperty(i)) {
        p = p.then(() => {
          return this._dispatchReply(replies[i]);
        });
      }
    }
    p = p.then(() => {
      finishDispatch();
    });
  }

  _dispatchReply(reply) {
    var next;
    const p = new Promise(resolve =>{
      next = resolve;
    });

    if (reply === undefined || reply === null) {
      this._debug('dispatch: got undefined or null reply');
      next();
      return p;
    }

    const id = reply.id;

    if (id && id > 0) {
      this._handleReply(reply, next);
    } else {
      this._handlePush(reply.result, next);
    }

    return p;
  };

  _call(msg) {
    return new Promise((resolve, reject) => {
      const id = this._addMessage(msg);
      this._registerCall(id, resolve, reject);
    });
  }

  _connect() {
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
    this._setupTransport();
  };

  _disconnect(reason, shouldReconnect) {

    const reconnect = shouldReconnect || false;
    if (reconnect === false) {
      this._reconnect = false;
    }

    if (this._isDisconnected()) {
      if (!reconnect) {
        this._clearConnectedState(reconnect);
      }
      return;
    }

    this._clearConnectedState(reconnect);

    this._debug('disconnected:', reason, shouldReconnect);
    this._setStatus('disconnected');

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (this._reconnecting === false) {
      // fire unsubscribe events for server side subs.
      for (const channel in this._serverSubs) {
        if (this._serverSubs.hasOwnProperty(channel)) {
          this.emit('unsubscribe', {channel: channel});
        }
      }
      this.emit('disconnect', {
        reason: reason,
        reconnect: reconnect
      });
    }

    if (reconnect === false) {
      this._subs = {};
      this._serverSubs = {};
    }

    if (!this._transportClosed) {
      this._transport.close();
    }
  };

  _refreshFailed() {
    this._numRefreshFailed = 0;
    if (!this._isDisconnected()) {
      this._disconnect('refresh failed', false);
    }
    if (this._config.onRefreshFailed !== null) {
      this._config.onRefreshFailed();
    }
  };

  _refresh() {
    // ask application for new connection token.
    this._debug('refresh token');

    if (this._config.refreshAttempts === 0) {
      this._debug('refresh attempts set to 0, do not send refresh request at all');
      this._refreshFailed();
      return;
    }

    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (this._clientID !== clientID) {
        return;
      }
      if (resp.error || resp.status !== 200) {
        // We don't perform any connection status related actions here as we are
        // relying on server that must close connection eventually.
        if (resp.error) {
          this._debug('error refreshing connection token', resp.error);
        } else {
          this._debug('error refreshing connection token: wrong status code', resp.status);
        }
        this._numRefreshFailed++;
        if (this._refreshTimeout !== null) {
          clearTimeout(this._refreshTimeout);
          this._refreshTimeout = null;
        }
        if (this._config.refreshAttempts !== null && this._numRefreshFailed >= this._config.refreshAttempts) {
          this._refreshFailed();
          return;
        }
        const jitter = Math.round(Math.random() * 1000 * Math.max(this._numRefreshFailed, 20));
        const interval = this._config.refreshInterval + jitter;
        this._refreshTimeout = setTimeout(() => this._refresh(), interval);
        return;
      }
      this._numRefreshFailed = 0;
      this._token = resp.data.token;
      if (!this._token) {
        this._refreshFailed();
        return;
      }
      if (this._isDisconnected() && this._reconnect) {
        this._debug('token refreshed, connect from scratch');
        this._connect();
      } else {
        this._debug('send refreshed token');
        const msg = {
          method: this._methodType.REFRESH,
          params: {
            token: this._token
          }
        };
        this._call(msg).then(resolveCtx => {
          this._refreshResponse(this._decoder.decodeCommandResult(this._methodType.REFRESH, resolveCtx.result));
          if (resolveCtx.next) {
            resolveCtx.next();
          }
        }, rejectCtx => {
          this._refreshError(rejectCtx.error);
          if (rejectCtx.next) {
            rejectCtx.next();
          }
        });
      }
    };

    if (this._config.onRefresh !== null) {
      const context = {};
      this._config.onRefresh(context, cb);
    } else {
      const xhr = this._ajax(
        this._config.refreshEndpoint,
        this._config.refreshParams,
        this._config.refreshHeaders,
        this._config.refreshData,
        cb
      );
      this._xhrs[xhrID] = xhr;
    }
  };

  _refreshError(err) {
    this._debug('refresh error', err);
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    const interval = this._config.refreshInterval + Math.round(Math.random() * 1000);
    this._refreshTimeout = setTimeout(() => this._refresh(), interval);
  }

  _refreshResponse(result) {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (result.expires) {
      this._clientID = result.client;
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getTTLMilliseconds(result.ttl));
    }
  };

  _newXHRID() {
    this._xhrID++;
    return this._xhrID;
  }

  _subRefresh(channel) {
    this._debug('refresh subscription token for channel', channel);

    if (this._subRefreshTimeouts[channel] !== undefined) {
      this._clearSubRefreshTimeout(channel);
    } else {
      return;
    }

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (resp.error || resp.status !== 200 || this._clientID !== clientID) {
        return;
      }
      let channelsData = {};
      if (resp.data.channels) {
        for (const i in resp.data.channels) {
          const channelData = resp.data.channels[i];
          if (!channelData.channel) {
            continue;
          }
          channelsData[channelData.channel] = channelData.token;
        }
      }

      const token = channelsData[channel];
      if (!token) {
        return;
      }
      const msg = {
        method: this._methodType.SUB_REFRESH,
        params: {
          channel: channel,
          token: token
        }
      };

      const sub = this._getSub(channel);
      if (sub === null) {
        return;
      }

      this._call(msg).then(resolveCtx => {
        this._subRefreshResponse(
          channel,
          this._decoder.decodeCommandResult(this._methodType.SUB_REFRESH, resolveCtx.result)
        );
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        this._subRefreshError(channel, rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    };

    const data = {
      client: this._clientID,
      channels: [channel]
    };

    if (this._config.onPrivateSubscribe !== null) {
      this._config.onPrivateSubscribe({
        data: data
      }, cb);
    } else {
      const xhr = this._ajax(
        this._config.subscribeEndpoint, this._config.subscribeParams, this._config.subscribeHeaders, data, cb);
      this._xhrs[xhrID] = xhr;
    }
  };

  _clearSubRefreshTimeout(channel) {
    if (this._subRefreshTimeouts[channel] !== undefined) {
      clearTimeout(this._subRefreshTimeouts[channel]);
      delete this._subRefreshTimeouts[channel];
    }
  }

  _subRefreshError(channel, err) {
    this._debug('subscription refresh error', channel, err);
    this._clearSubRefreshTimeout(channel);
    const sub = this._getSub(channel);
    if (sub === null) {
      return;
    }
    const jitter = Math.round(Math.random() * 1000);
    let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._config.subRefreshInterval + jitter);
    this._subRefreshTimeouts[channel] = subRefreshTimeout;
    return;
  }

  _subRefreshResponse(channel, result) {
    this._debug('subscription refresh success', channel);
    this._clearSubRefreshTimeout(channel);
    const sub = this._getSub(channel);
    if (sub === null) {
      return;
    }
    if (result.expires === true) {
      let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._getTTLMilliseconds(result.ttl));
      this._subRefreshTimeouts[channel] = subRefreshTimeout;
    }
    return;
  };

  _subscribe(sub, isResubscribe) {
    this._debug('subscribing on', sub.channel);
    const channel = sub.channel;

    if (!(channel in this._subs)) {
      this._subs[channel] = sub;
    }

    if (!this.isConnected()) {
      // subscribe will be called later
      sub._setNew();
      return;
    }

    sub._setSubscribing(isResubscribe);

    const msg = {
      method: this._methodType.SUBSCRIBE,
      params: {
        channel: channel
      }
    };

    // If channel name does not start with privateChannelPrefix - then we
    // can just send subscription message to Centrifuge. If channel name
    // starts with privateChannelPrefix - then this is a private channel
    // and we should ask web application backend for permission first.
    if (startsWith(channel, this._config.privateChannelPrefix)) {
      // private channel.
      if (this._isSubscribeBatching) {
        this._privateChannels[channel] = true;
      } else {
        this.startSubscribeBatching();
        this._subscribe(sub);
        this.stopSubscribeBatching();
      }
    } else {
      const recover = sub._needRecover();

      if (recover === true) {
        msg.params.recover = true;
        const seq = this._getLastSeq(channel);
        const gen = this._getLastGen(channel);
        if (seq || gen) {
          if (seq) {
            msg.params.seq = seq;
          }
          if (gen) {
            msg.params.gen = gen;
          }
        } else {
          const offset = this._getLastOffset(channel);
          if (offset) {
            msg.params.offset = offset;
          }
        }
        const epoch = this._getLastEpoch(channel);
        if (epoch) {
          msg.params.epoch = epoch;
        }
      }

      this._call(msg).then(resolveCtx => {
        this._subscribeResponse(
          channel,
          recover,
          this._decoder.decodeCommandResult(this._methodType.SUBSCRIBE, resolveCtx.result)
        );
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        this._subscribeError(channel, rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    }
  };

  _unsubscribe(sub) {
    delete this._subs[sub.channel];
    delete this._lastOffset[sub.channel];
    delete this._lastSeq[sub.channel];
    delete this._lastGen[sub.channel];
    if (this.isConnected()) {
      // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
      this._addMessage({
        method: this._methodType.UNSUBSCRIBE,
        params: {
          channel: sub.channel
        }
      });
    }
  };

  _getTTLMilliseconds(ttl) {
    // https://stackoverflow.com/questions/12633405/what-is-the-maximum-delay-for-setinterval
    return Math.min(ttl * 1000, 2147483647);
  }

  getSub(channel) {
    return this._getSub(channel);
  }

  _getSub(channel) {
    const sub = this._subs[channel];
    if (!sub) {
      return null;
    }
    return sub;
  };

  _isServerSub(channel) {
    return this._serverSubs[channel] !== undefined;
  };

  _connectResponse(result, isRecover) {
    const wasReconnecting = this._reconnecting;
    this._reconnecting = false;
    this._resetRetry();
    this._refreshRequired = false;

    if (this.isConnected()) {
      return;
    }

    if (this._latencyStart !== null) {
      this._latency = (new Date()).getTime() - this._latencyStart.getTime();
      this._latencyStart = null;
    }

    this._clientID = result.client;
    this._setStatus('connected');

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }

    if (result.expires) {
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getTTLMilliseconds(result.ttl));
    }

    this.startBatching();
    this.startSubscribeBatching();
    for (const channel in this._subs) {
      if (this._subs.hasOwnProperty(channel)) {
        const sub = this._subs[channel];
        if (sub._shouldResubscribe()) {
          this._subscribe(sub, wasReconnecting);
        }
      }
    }
    this.stopSubscribeBatching();
    this.stopBatching();

    this._startPing();

    const ctx = {
      client: result.client,
      transport: this._transportName,
      latency: this._latency
    };
    if (result.data) {
      ctx.data = result.data;
    }

    this.emit('connect', ctx);

    if (result.subs) {
      this._processServerSubs(result.subs);
    }
  };

  _processServerSubs(subs) {
    for (const channel in subs) {
      if (subs.hasOwnProperty(channel)) {
        const sub = subs[channel];
        const isResubscribe = this._serverSubs[channel] !== undefined;
        let subCtx = {channel: channel, isResubscribe: isResubscribe};
        subCtx = this._expandSubscribeContext(subCtx, sub);
        this.emit('subscribe', subCtx);
      }
    }
    for (const channel in subs) {
      if (subs.hasOwnProperty(channel)) {
        const sub = subs[channel];
        if (sub.recovered) {
          let pubs = sub.publications;
          if (pubs && pubs.length > 0) {

            // handle legacy order.
            // TODO: remove as soon as Centrifuge v1 released.
            if (pubs.length > 1 && (!pubs[0].offset || pubs[0].offset > pubs[1].offset)) {
              pubs = pubs.reverse();
            }

            for (let i in pubs) {
              if (pubs.hasOwnProperty(i)) {
                this._handlePublication(channel, pubs[i]);
              }
            }
          }
        }
        this._serverSubs[channel] = {
          'seq': sub.seq,
          'gen': sub.gen,
          'offset': sub.offset,
          'epoch': sub.epoch,
          'recoverable': sub.recoverable
        };
      }
    }
  };

  _stopPing() {
    if (this._pongTimeout !== null) {
      clearTimeout(this._pongTimeout);
      this._pongTimeout = null;
    }
    if (this._pingTimeout !== null) {
      clearTimeout(this._pingTimeout);
      this._pingTimeout = null;
    }
  };

  _startPing() {
    if (this._config.ping !== true || this._config.pingInterval <= 0) {
      return;
    }
    if (!this.isConnected()) {
      return;
    }

    this._pingTimeout = setTimeout(() => {
      if (!this.isConnected()) {
        this._stopPing();
        return;
      }
      this.ping();
      this._pongTimeout = setTimeout(() => {
        this._disconnect('no ping', true);
      }, this._config.pongWaitTimeout);
    }, this._config.pingInterval);
  };

  _restartPing() {
    this._stopPing();
    this._startPing();
  };

  _subscribeError(channel, error) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (!sub._isSubscribing()) {
      return;
    }
    if (error.code === 0 && error.message === _errorTimeout) { // client side timeout.
      this._disconnect('timeout', true);
      return;
    }
    sub._setSubscribeError(error);
  };

  _expandSubscribeContext(ctx, result) {
    let recovered = false;
    if ('recovered' in result) {
      recovered = result.recovered;
    }
    ctx.recovered = recovered;

    let positioned = false;
    if ('positioned' in result) {
      positioned = result.positioned;
    }
    let epoch = '';
    if ('epoch' in result) {
      epoch = result.epoch;
    }
    let offset = 0;
    if ('offset' in result) {
      offset = result.offset;
    }
    if (positioned) {
      ctx.streamPosition = {
        'offset': offset,
        'epoch': epoch
      };
    };
    return ctx;
  }

  _subscribeResponse(channel, isRecover, result) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (!sub._isSubscribing()) {
      return;
    }
    sub._setSubscribeSuccess(result);

    let pubs = result.publications;
    if (pubs && pubs.length > 0) {
      if (pubs.length >= 2 && !pubs[0].offset && !pubs[1].offset) {
        // handle legacy order.
        pubs = pubs.reverse();
      }
      for (let i in pubs) {
        if (pubs.hasOwnProperty(i)) {
          this._handlePublication(channel, pubs[i]);
        }
      }
    }

    if (result.recoverable && (!isRecover || !result.recovered)) {
      this._lastSeq[channel] = result.seq || 0;
      this._lastGen[channel] = result.gen || 0;
      this._lastOffset[channel] = result.offset || 0;
    }

    this._lastEpoch[channel] = result.epoch || '';

    if (result.recoverable) {
      sub._recoverable = true;
    }

    if (result.expires === true) {
      let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._getTTLMilliseconds(result.ttl));
      this._subRefreshTimeouts[channel] = subRefreshTimeout;
    }
  };

  _handleReply(reply, next) {
    const id = reply.id;
    const result = reply.result;

    if (!(id in this._callbacks)) {
      next();
      return;
    }
    const callbacks = this._callbacks[id];
    clearTimeout(this._callbacks[id].timeout);
    delete this._callbacks[id];

    if (!errorExists(reply)) {
      const callback = callbacks.callback;
      if (!callback) {
        return;
      }
      callback({result, next});
    } else {
      const errback = callbacks.errback;
      if (!errback) {
        next();
        return;
      }
      const error = reply.error;
      errback({error, next});
    }
  }

  _handleJoin(channel, join) {
    const ctx = {'info': join.info};
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        ctx.channel = channel;
        this.emit('join', ctx);
      }
      return;
    }
    sub.emit('join', ctx);
  };

  _handleLeave(channel, leave) {
    const ctx = {'info': leave.info};
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        ctx.channel = channel;
        this.emit('leave', ctx);
      }
      return;
    }
    sub.emit('leave', ctx);
  };

  _handleUnsub(channel, unsub) {
    const ctx = {};
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        delete this._serverSubs[channel];
        ctx.channel = channel;
        this.emit('unsubscribe', ctx);
      }
      return;
    }
    sub.unsubscribe();
    if (unsub.resubscribe === true) {
      sub.subscribe();
    }
  };

  _handleSub(channel, sub) {
    this._serverSubs[channel] = {
      'seq': sub.seq,
      'gen': sub.gen,
      'offset': sub.offset,
      'epoch': sub.epoch,
      'recoverable': sub.recoverable
    };
    let ctx = {'channel': channel, isResubscribe: false};
    ctx = this._expandSubscribeContext(ctx, sub);
    this.emit('subscribe', ctx);
  };

  _handlePublication(channel, pub) {
    const sub = this._getSub(channel);
    const ctx = {
      'data': pub.data,
      'seq': pub.seq,
      'gen': pub.gen,
      'offset': pub.offset
    };
    if (pub.info) {
      ctx.info = pub.info;
    }
    if (!sub) {
      if (this._isServerSub(channel)) {
        if (pub.seq !== undefined) {
          this._serverSubs[channel].seq = pub.seq;
        }
        if (pub.gen !== undefined) {
          this._serverSubs[channel].gen = pub.gen;
        }
        if (pub.offset !== undefined) {
          this._serverSubs[channel].offset = pub.offset;
        }
        ctx.channel = channel;
        this.emit('publish', ctx);
      }
      return;
    }
    if (pub.seq !== undefined) {
      this._lastSeq[channel] = pub.seq;
    }
    if (pub.gen !== undefined) {
      this._lastGen[channel] = pub.gen;
    }
    if (pub.offset !== undefined) {
      this._lastOffset[channel] = pub.offset;
    }
    sub.emit('publish', ctx);
  };

  _handleMessage(message) {
    this.emit('message', message.data);
  };

  _handlePush(data, next) {
    const push = this._decoder.decodePush(data);
    let type = 0;
    if ('type' in push) {
      type = push['type'];
    }
    const channel = push.channel;

    if (type === this._pushType.PUBLICATION) {
      const pub = this._decoder.decodePushData(this._pushType.PUBLICATION, push.data);
      this._handlePublication(channel, pub);
    } else if (type === this._pushType.MESSAGE) {
      const message = this._decoder.decodePushData(this._pushType.MESSAGE, push.data);
      this._handleMessage(message);
    } else if (type === this._pushType.JOIN) {
      const join = this._decoder.decodePushData(this._pushType.JOIN, push.data);
      this._handleJoin(channel, join);
    } else if (type === this._pushType.LEAVE) {
      const leave = this._decoder.decodePushData(this._pushType.LEAVE, push.data);
      this._handleLeave(channel, leave);
    } else if (type === this._pushType.UNSUB) {
      const unsub = this._decoder.decodePushData(this._pushType.UNSUB, push.data);
      this._handleUnsub(channel, unsub);
    } else if (type === this._pushType.SUB) {
      const sub = this._decoder.decodePushData(this._pushType.SUB, push.data);
      this._handleSub(channel, sub);
    }
    next();
  }

  _flush() {
    const messages = this._messages.slice(0);
    this._messages = [];
    this._transportSend(messages);
  };

  _ping() {
    const msg = {
      method: this._methodType.PING
    };
    this._call(msg).then(resolveCtx => {
      this._pingResponse(this._decoder.decodeCommandResult(this._methodType.PING, resolveCtx.result));
      if (resolveCtx.next) {
        resolveCtx.next();
      }
    }, rejectCtx => {
      this._debug('ping error', rejectCtx.error);
      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });
  };

  _pingResponse(result) {
    if (!this.isConnected()) {
      return;
    }
    this._stopPing();
    this._startPing();
  }

  _getLastSeq(channel) {
    const lastSeq = this._lastSeq[channel];
    if (lastSeq) {
      return lastSeq;
    }
    return 0;
  };

  _getLastOffset(channel) {
    const lastOffset = this._lastOffset[channel];
    if (lastOffset) {
      return lastOffset;
    }
    return 0;
  };

  _getLastGen(channel) {
    const lastGen = this._lastGen[channel];
    if (lastGen) {
      return lastGen;
    }
    return 0;
  };

  _getLastEpoch(channel) {
    const lastEpoch = this._lastEpoch[channel];
    if (lastEpoch) {
      return lastEpoch;
    }
    return '';
  };

  _createErrorObject(message, code) {
    const errObject = {
      message: message,
      code: code || 0
    };

    return errObject;
  };

  _registerCall(id, callback, errback) {
    this._callbacks[id] = {
      callback: callback,
      errback: errback,
      timeout: null
    };
    this._callbacks[id].timeout = setTimeout(() => {
      delete this._callbacks[id];
      if (isFunction(errback)) {
        errback({error: this._createErrorObject(_errorTimeout)});
      }
    }, this._config.timeout);
  };

  _addMessage(message) {
    let id = this._nextMessageId();
    message.id = id;
    if (this._isBatching === true) {
      this._messages.push(message);
    } else {
      this._transportSend([message]);
    }
    return id;
  };

  isConnected() {
    return this._isConnected();
  }

  connect() {
    this._connect();
  };

  disconnect() {
    this._disconnect('client', false);
  };

  ping() {
    return this._ping();
  }

  startBatching() {
    // start collecting messages without sending them to Centrifuge until flush
    // method called
    this._isBatching = true;
  };

  stopBatching() {
    this._isBatching = false;
    this._flush();
  };

  startSubscribeBatching() {
    // start collecting private channels to create bulk authentication
    // request to subscribeEndpoint when stopSubscribeBatching will be called
    this._isSubscribeBatching = true;
  };

  stopSubscribeBatching() {
    // create request to subscribeEndpoint with collected private channels
    // to ask if this client can subscribe on each channel
    this._isSubscribeBatching = false;
    const authChannels = this._privateChannels;
    this._privateChannels = {};

    const channels = [];

    for (const channel in authChannels) {
      if (authChannels.hasOwnProperty(channel)) {
        const sub = this._getSub(channel);
        if (!sub) {
          continue;
        }
        channels.push(channel);
      }
    }

    if (channels.length === 0) {
      this._debug('no private channels found, no need to make request');
      return;
    }

    const data = {
      client: this._clientID,
      channels: channels
    };

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (this._clientID !== clientID) {
        return;
      }
      if (resp.error || resp.status !== 200) {
        this._debug('authorization request failed');
        for (const i in channels) {
          if (channels.hasOwnProperty(i)) {
            const channel = channels[i];
            this._subscribeError(channel, this._createErrorObject('authorization request failed'));
          }
        }
        return;
      }

      let channelsData = {};
      if (resp.data.channels) {
        for (const i in resp.data.channels) {
          const channelData = resp.data.channels[i];
          if (!channelData.channel) {
            continue;
          }
          channelsData[channelData.channel] = channelData.token;
        }
      }

      // try to send all subscriptions in one request.
      let batch = false;

      if (!this._isBatching) {
        this.startBatching();
        batch = true;
      }

      for (const i in channels) {
        if (channels.hasOwnProperty(i)) {
          const channel = channels[i];
          const token = channelsData[channel];

          if (!token) {
            // subscription:error
            this._subscribeError(channel, this._createErrorObject('permission denied', 103));
            continue;
          } else {
            const msg = {
              method: this._methodType.SUBSCRIBE,
              params: {
                channel: channel,
                token: token
              }
            };

            const sub = this._getSub(channel);
            if (sub === null) {
              continue;
            }

            const recover = sub._needRecover();

            if (recover === true) {
              msg.params.recover = true;
              const seq = this._getLastSeq(channel);
              const gen = this._getLastGen(channel);
              if (seq || gen) {
                if (seq) {
                  msg.params.seq = seq;
                }
                if (gen) {
                  msg.params.gen = gen;
                }
              } else {
                const offset = this._getLastOffset(channel);
                if (offset) {
                  msg.params.offset = offset;
                }
              }
              const epoch = this._getLastEpoch(channel);
              if (epoch) {
                msg.params.epoch = epoch;
              }
            }
            this._call(msg).then(resolveCtx => {
              this._subscribeResponse(
                channel,
                recover,
                this._decoder.decodeCommandResult(this._methodType.SUBSCRIBE, resolveCtx.result)
              );
              if (resolveCtx.next) {
                resolveCtx.next();
              }
            }, rejectCtx => {
              this._subscribeError(channel, rejectCtx.error);
              if (rejectCtx.next) {
                rejectCtx.next();
              }
            });
          }
        }
      }

      if (batch) {
        this.stopBatching();
      }

    };

    if (this._config.onPrivateSubscribe !== null) {
      this._config.onPrivateSubscribe({
        data: data
      }, cb);
    } else {
      const xhr = this._ajax(
        this._config.subscribeEndpoint, this._config.subscribeParams, this._config.subscribeHeaders, data, cb);
      this._xhrs[xhrID] = xhr;
    }
  };

  subscribe(channel, events) {
    const currentSub = this._getSub(channel);
    if (currentSub !== null) {
      currentSub._setEvents(events);
      if (currentSub._isUnsubscribed()) {
        currentSub.subscribe();
      }
      return currentSub;
    }
    const sub = new Subscription(this, channel, events);
    this._subs[channel] = sub;
    sub.subscribe();
    return sub;
  };
}

;// CONCATENATED MODULE: ./src/index.js

/* harmony default export */ var src = (Centrifuge);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	!function() {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(889);
/******/ })()
;
});
//# sourceMappingURL=centrifuge.js.map