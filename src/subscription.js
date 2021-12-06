import EventEmitter from 'events';

import {
  isFunction
} from './utils';

const _STATE_NEW = 0;
const _STATE_SUBSCRIBING = 1;
const _STATE_SUCCESS = 2;
const _STATE_ERROR = 3;
const _STATE_UNSUBSCRIBED = 4;

export default class Subscription extends EventEmitter {
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
    this._subscribeData = null;
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
    }).then(function () { }, function () { });
  };

  _setNeedRecover(enabled) {
    this._recoverable = enabled;
    this._recover = enabled;
  }

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

  _setSubscribeData(data) {
    this._subscribeData = data;
  }

  ready(callback, errback) {
    if (this._ready) {
      if (this._isSuccess()) {
        callback(this._getSubscribeSuccessContext());
      } else {
        errback(this._getSubscribeErrorContext());
      }
    }
  };

  subscribe(opts) {
    if (this._status === _STATE_SUCCESS) {
      return;
    }
    if (opts && opts.since) {
      this._centrifuge._setSubscribeSince(this, opts.since);
    }
    if (opts && opts.data) {
      this._setSubscribeData(opts.data);
    }
    this._noResubscribe = false;
    this._centrifuge._subscribe(this);
  };

  unsubscribe() {
    this._setUnsubscribed(true);
    this._centrifuge._unsubscribe(this);
  };

  _methodCall() {
    if (this._isSuccess()) {
      return Promise.resolve();
    } else if (this._isError()) {
      return Promise.reject(this._error);
    }
    let subPromise = new Promise((res, rej) => {
      const timeout = setTimeout(function () {
        rej({ 'code': 0, 'message': 'timeout' });
      }, this._centrifuge._config.timeout);
      this._promises[this._nextPromiseId()] = {
        timeout: timeout,
        resolve: res,
        reject: rej
      };
    });
    return subPromise;
  }

  publish(data) {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.publish(self.channel, data);
    });
  };

  presence() {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presence(self.channel);
    });
  };

  presenceStats() {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presenceStats(self.channel);
    });
  };

  history(options) {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.history(self.channel, options);
    });
  };
}
