import EventEmitter from 'events';
import { errorCodes, unsubscribedCodes, subscribingCodes } from './codes';
import { ttlMilliseconds, backoff } from './utils';

export const subscriptionState = {
  // Unsubscribed is an initial state, also state when unsubscribe called from client,
  // also state when server called unsubscribe for a channel.
  Unsubscribed: 'unsubscribed',
  // Subscribing to a channel in progress.
  Subscribing: 'subscribing',
  // Sussessfully subscribed to a channel.
  Subscribed: 'subscribed'
};

export class Subscription extends EventEmitter {
  constructor(centrifuge, channel, options) {
    super();
    this.channel = channel;
    this.state = subscriptionState.Unsubscribed;
    this._centrifuge = centrifuge;
    this._token = null;
    this._data = null;
    this._recover = false;
    this._offset = null;
    this._epoch = null;
    this._recoverable = false;
    this._positioned = false;
    this._minResubscribeDelay = 500;
    this._maxResubscribeDelay = 20000;
    this._resubscribeTimeout = null;
    this._resubscribeAttempts = 0;
    this._promises = {};
    this._promiseId = 0;
    this._refreshTimeout = null;
    this._setOptions(options);
    if (this._centrifuge._debugEnabled) {
      this.on('state', function (ctx) {
        this._centrifuge._debug('subscription state', channel, ctx.oldState, '->', ctx.newState);
      });
      this.on('error', function (ctx) {
        this._centrifuge._debug('subscription error', channel, ctx);
      });
    }
  }

  // ready returns a Promise which resolves upon subscription goes to Subscribed
  // state and rejects in case of subscription goes to Unsubscribed state.
  // Optional timeout can be passed.
  ready(timeout) {
    if (this.state === subscriptionState.Unsubscribed) {
      return Promise.reject({ code: errorCodes.subscriptionUnsubscribed, message: this.state });
    };
    if (this.state === subscriptionState.Subscribed) {
      return Promise.resolve();
    };
    return new Promise((res, rej) => {
      let ctx = {
        resolve: res,
        reject: rej
      };
      if (timeout) {
        ctx.timeout = setTimeout(function () {
          rej({ code: errorCodes.timeout, message: timeout });
        }, timeout);
      }
      this._promises[this._nextPromiseId()] = ctx;
    });
  }

  // subscribe to a channel.
  subscribe() {
    if (this._isSubscribed()) {
      return;
    }
    this._resubscribeAttempts = 0;
    this._setSubscribing(subscribingCodes.subscribeCalled, 'subscribe called');
  };

  // unsubscribe from a channel, keeping position state.
  unsubscribe() {
    this._setUnsubscribed(unsubscribedCodes.unsubscribeCalled, 'unsubscribe called', true);
  };

  // cancel Subscription – remove it from client's registry and
  // remove link to a client. Subscription is UNUSABLE after this.
  // Subscription must be in Unsubscribed state before calling this.
  cancel() {
    if (this.state !== subscriptionState.Unsubscribed) {
      throw new Error('Subscription must be unsubscribed to cancel');
    }
    this._centrifuge._removeSubscription(this);
    this._centrifuge = undefined;
  };

  // publish data to a channel.
  publish(data) {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.publish(self.channel, data);
    });
  };

  // presence for a channel.
  presence() {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presence(self.channel);
    });
  };

  // presence stats for a channel.
  presenceStats() {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presenceStats(self.channel);
    });
  };

  // history for a channel.
  history(opts) {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.history(self.channel, opts);
    });
  };

  _methodCall() {
    if (this._isSubscribed()) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      const timeout = setTimeout(function () {
        rej({ code: errorCodes.timeout, message: timeout });
      }, this._centrifuge._config.timeout);
      this._promises[this._nextPromiseId()] = {
        timeout: timeout,
        resolve: res,
        reject: rej
      };
    });
  }

  _nextPromiseId() {
    return ++this._promiseId;
  }

  _needRecover() {
    return this._recover === true;
  };

  _isUnsubscribed() {
    return this.state === subscriptionState.Unsubscribed;
  }

  _isSubscribing() {
    return this.state === subscriptionState.Subscribing;
  }

  _isSubscribed() {
    return this.state === subscriptionState.Subscribed;
  }

  _setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('state', { 'newState': newState, 'oldState': oldState, channel: this.channel });
      return true;
    }
    return false;
  };

  _clearSubscribingState() {
    this._resubscribeAttempts = 0;
    this._clearResubscribeTimeout();
  }

  _clearSubscribedState() {
    this._clearRefreshTimeout();
  }

  _setSubscribed(result) {
    if (!this._isSubscribing()) {
      return;
    }
    this._clearSubscribingState();
    this._setState(subscriptionState.Subscribed);
    const ctx = this._centrifuge._getSubscribeContext(this.channel, result);
    this.emit('subscribed', ctx);
    this._resolvePromises();

    const pubs = result.publications;
    if (pubs && pubs.length > 0) {
      for (let i in pubs) {
        if (!pubs.hasOwnProperty(i)) {
          continue;
        }
        this._handlePublication(pubs[i]);
      }
    }

    if (result.recoverable) {
      this._recover = true;
      this._offset = result.offset || 0;
      this._epoch = result.epoch || '';
    }

    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  };

  _setSubscribing(code, reason) {
    if (this._isSubscribing()) {
      return;
    }
    if (this._isSubscribed()) {
      this._clearSubscribedState();
    }
    if (this._setState(subscriptionState.Subscribing)) {
      this.emit('subscribing', { channel: this.channel, code: code, reason: reason });
    }
    this._centrifuge._subscribe(this);
  };

  _setUnsubscribed(code, reason, sendUnsubscribe) {
    if (this._isUnsubscribed()) {
      return;
    }
    if (this._isSubscribed()) {
      if (sendUnsubscribe) {
        this._centrifuge._unsubscribe(this);
      }
      this._clearSubscribedState();
    }
    if (this._isSubscribing()) {
      this._clearSubscribingState();
    }
    if (this._setState(subscriptionState.Unsubscribed)) {
      this.emit('unsubscribed', { channel: this.channel, code: code, reason: reason });
    }
    this._rejectPromises({ code: errorCodes.subscriptionUnsubscribed, message: 'unsubscribed' });
  };

  _handlePublication(pub) {
    const ctx = this._centrifuge._getPublicationContext(this.channel, pub);
    this.emit('publication', ctx);
    if (pub.offset) {
      this._offset = pub.offset;
    }
  }

  _handleJoin(join) {
    this.emit('join', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(join.info) });
  }

  _handleLeave(leave) {
    this.emit('leave', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(leave.info) });
  }

  _resolvePromises() {
    for (const id in this._promises) {
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].resolve();
      delete this._promises[id];
    }
  }

  _rejectPromises(err) {
    for (const id in this._promises) {
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].reject(err);
      delete this._promises[id];
    }
  }

  _scheduleResubscribe() {
    const self = this;
    const delay = this._getResubscribeDelay();
    this._resubscribeTimeout = setTimeout(function () {
      if (self._isSubscribing()) {
        self._centrifuge._subscribe(self);
      }
    }, delay);
  }

  _subscribeError(err) {
    if (!this._isSubscribing()) {
      return;
    }

    if (err.code < 100 || err.code === 109 || err.temporary === true) {
      if (err.code === 109) { // Token expired error.
        this._token = null;
      }
      const errContext = {
        channel: this.channel,
        type: 'subscribe',
        error: err
      };
      this.emit('error', errContext);
      this._scheduleResubscribe();
    } else {
      this._setUnsubscribed(err.code, err.message, false);
    }
  };

  _getResubscribeDelay() {
    const delay = backoff(this._resubscribeAttempts, this._minResubscribeDelay, this._maxResubscribeDelay);
    this._resubscribeAttempts++;
    return delay;
  }

  _clearPositionState() {
    this._recover = false;
    this._offset = null;
    this._epoch = null;
  }

  _setOptions(options) {
    if (!options) {
      return;
    }
    if ('since' in options) {
      this._offset = options.since.offset;
      this._epoch = options.since.epoch;
      this._recover = true;
    }
    if ('data' in options) {
      this._data = options.data;
    }
    if ('minResubscribeDelay' in options) {
      this._minResubscribeDelay = options.minResubscribeDelay;
    }
    if ('maxResubscribeDelay' in options) {
      this._maxResubscribeDelay = options.maxResubscribeDelay;
    }
    if ('token' in options) {
      this._token = options.token;
    }
    if (options.positioned === true) {
      this._positioned = true;
    }
    if (options.recoverable === true) {
      this._recoverable = true;
    }
  }

  _getOffset() {
    const offset = this._offset;
    if (offset !== null) {
      return offset;
    }
    return 0;
  };

  _getEpoch() {
    const epoch = this._epoch;
    if (epoch !== null) {
      return epoch;
    }
    return '';
  };

  _clearRefreshTimeout() {
    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
  }

  _clearResubscribeTimeout() {
    if (this._resubscribeTimeout !== null) {
      clearTimeout(this._resubscribeTimeout);
      this._resubscribeTimeout = null;
    }
  }

  _getToken() {
    this._centrifuge._debug('get subscription token for channel', this.channel);
    const ctx = {
      channel: this.channel
    };
    const getToken = this._centrifuge._config.getSubscriptionToken;
    if (getToken === null) {
      throw new Error('provide a function to get channel subscription token');
    }
    return getToken(ctx);
  }

  _refresh() {
    this._clearRefreshTimeout();
    const self = this;
    this._getToken().then(function (token) {
      if (!self._isSubscribed()) {
        return;
      }
      if (!token) {
        self._failUnauthorized();
        return;
      }
      self._token = token;
      const req = {
        channel: self.channel,
        token: token
      };
      const msg = {
        'sub_refresh': req
      };
      self._centrifuge._call(msg).then(resolveCtx => {
        const result = resolveCtx.reply.sub_refresh;
        self._refreshResponse(result);
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        self._refreshError(rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    }).catch(function (e) {
      self.emit('error', {
        type: 'refreshToken',
        channel: self.channel,
        error: {
          code: errorCodes.subscriptionRefreshToken,
          message: e.toString()
        }
      });
      self._refreshTimeout = setTimeout(() => self._refresh(), self._getRefreshRetryDelay());
    });
  }

  _refreshResponse(result) {
    this._centrifuge._debug('subscription token refreshed, channel', this.channel);
    this._clearRefreshTimeout();
    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  };

  _refreshError(err) {
    if (err.code < 100 || err.temporary === true) {
      this.emit('error', {
        type: 'refresh',
        channel: this.channel,
        error: err
      });
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
    } else {
      this._setUnsubscribed(err.code, err.message);
    }
  }

  _getRefreshRetryDelay() {
    return backoff(0, 10000, 20000);
  }

  _failUnauthorized() {
    this._setUnsubscribed(unsubscribedCodes.unauthorized, 'unauthorized', true);
  };
}
