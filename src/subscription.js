const EventEmitter = require('events');
const Promise = require('es6-promise');

import {
  isFunction
} from './utils';

import {MethodType} from './protocol';

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
    this._recovered = false;
    this._ready = false;
    this._promise = null;
    this._noResubscribe = false;
    this._setEvents(events);
    this._initializePromise();
  }

  _initializePromise() {
    // this helps us to wait until subscription will successfully
    // subscribe and call actions such as presence, history etc in
    // synchronous way.
    var self = this;

    this._ready = false;

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

  _setEvents(events) {
    if (!events) {
      return;
    }
    if (isFunction(events)) {
      // events is just a function to handle publication received from channel.
      this.on('message', events);
    } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
      const knownEvents = ['message', 'join', 'leave', 'unsubscribe', 'subscribe', 'error'];
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

  _setSubscribing() {
    if (this._ready === true) {
      // new promise for this subscription
      this._initializePromise();
      this._isResubscribe = true;
    }
    this._status = _STATE_SUBSCRIBING;
  };

  _setSubscribeSuccess(recovered) {
    if (this._status === _STATE_SUCCESS) {
      return;
    }
    this._recovered = recovered;
    this._status = _STATE_SUCCESS;
    const successContext = this._getSubscribeSuccessContext(recovered);

    this.emit('subscribe', successContext);
    this._resolve(successContext);
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
  };

  _triggerUnsubscribe() {
    this.emit('unsubscribe', {
      channel: this.channel
    });
  };

  _setUnsubscribed(noResubscribe) {
    if (this._status === _STATE_UNSUBSCRIBED) {
      return;
    }
    this._status = _STATE_UNSUBSCRIBED;
    if (noResubscribe === true) {
      this._noResubscribe = true;
    }
    this._triggerUnsubscribe();
  };

  _shouldResubscribe() {
    return !this._noResubscribe;
  };

  _getSubscribeSuccessContext() {
    return {
      channel: this.channel,
      isResubscribe: this._isResubscribe,
      recovered: this._recovered
    };
  };

  _getSubscribeErrorContext() {
    let subscribeErrorContext = this._error;
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
    this._centrifuge._subscribe(this);
  };

  unsubscribe() {
    this._setUnsubscribed(true);
    this._centrifuge._unsubscribe(this);
  };

  _methodCall(message, type) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (self._isUnsubscribed()) {
        reject(self._centrifuge._createErrorObject('subscription unsubscribed'));
        return;
      }
      self._promise.then(function () {
        if (!self._centrifuge.isConnected()) {
          reject(self._centrifuge._createErrorObject('disconnected'));
          return;
        }
        self._centrifuge._call(message).then(function (result) {
          resolve(self._centrifuge._decoder.decodeCommandResult(type, result));
        }, function (err) {
          reject(err);
        });
      }, function (err) {
        reject(err);
      });
    });
  }

  publish(data) {
    return this._methodCall({
      method: MethodType.PUBLISH,
      params: {
        channel: self.channel,
        data: data
      }
    }, MethodType.PUBLISH);
  };

  presence() {
    return this._methodCall({
      method: MethodType.PRESENCE,
      params: {
        channel: self.channel
      }
    }, MethodType.PRESENCE);
  };

  presenceStats() {
    return this._methodCall({
      method: MethodType.PRESENCE_STATS,
      params: {
        channel: self.channel
      }
    }, MethodType.PRESENCE_STATS);
  };

  history() {
    return this._methodCall({
      method: MethodType.HISTORY,
      params: {
        channel: self.channel
      }
    }, MethodType.HISTORY);
  };
}
