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
  }

  _initializePromise() {
    // this helps us to wait until subscription will successfully
    // subscribe and call actions such as presence, history etc in
    // synchronous way.
    this._ready = false;

    this._subscriptionPromise = new global.Promise((resolve, reject) => {
      this._resolve = value => {
        this._ready = true;
        resolve(value);
      };
      this._reject = err => {
        this._ready = true;
        reject(err);
      };
    });
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

  _setSubscribeSuccess(recovered) {
    if (this._status === _STATE_SUCCESS) {
      return;
    }
    this._status = _STATE_SUCCESS;
    const successContext = this._getSubscribeSuccessContext(recovered);

    this._recover = false;
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
    this._centrifuge._clearSubRefreshTimeout(this.channel);
    if (this._status === _STATE_UNSUBSCRIBED) {
      return;
    }
    const needTrigger = this._status === _STATE_SUCCESS;
    this._status = _STATE_UNSUBSCRIBED;
    if (noResubscribe === true) {
      this._recover = false;
      this._noResubscribe = true;
      delete this._centrifuge._lastPubID[this.channel];
    }
    if (needTrigger) {
      this._triggerUnsubscribe();
    }
  };

  _shouldResubscribe() {
    return !this._noResubscribe;
  };

  _getSubscribeSuccessContext(recovered) {
    return {
      channel: this.channel,
      isResubscribe: this._isResubscribe,
      recovered: recovered
    };
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
    return this._subscriptionPromise
      .then(() => this._centrifuge._call(message))
      .then(result => {
        result.next();
        return this._centrifuge._decoder.decodeCommandResult(type, result.result);
      })
    ;
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

  history() {
    return this._methodCall({
      method: this._centrifuge._methodType.HISTORY,
      params: {
        channel: this.channel
      }
    }, this._centrifuge._methodType.HISTORY);
  };
}
