import EventEmitter from 'events';

import { ttlMilliseconds, backoff } from './utils';

export const subscriptionState = {
  // Unsubscribed is an initial state, also state when unsubscribe called from client,
  // also state when server called unsubscribe for a channel.
  Unsubscribed: 'unsubscribed',
  // Subscribing to a channel in progress.
  Subscribing: 'subscribing',
  // Sussessfully subscribed to a channel.
  Subscribed: 'subscribed',
  // Failed to subscribe.
  Failed: 'failed'
};

export const subscriptionFailReason = {
  // Subscription failure caused by server force unsubscribe.
  Server: 'server',
  // Fatal error during subscribe or resubscribe.
  SubscribeFailed: 'subscribe failed',
  // Fatal error during subscription token refresh.
  RefreshFailed: 'refresh failed',
  // Access denied signaled by the application (empty subscription token).
  Unauthorized: 'unauthorized',
  // Client was not able to recover subscription state automatically, subscription
  // position state is cleared. If subscription failed due to this reason application
  // must decide what to do: subscribe from scratch, possibly load initial state from
  // the backend, or cancel subscription.
  Unrecoverable: 'unrecoverable'
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
    this._minResubscribeDelay = 500;
    this._maxResubscribeDelay = 20000;
    this._resubscribeTimeout = null;
    this._resubscribeAttempts = 0;
    this._tokenUniquePerConnection = false;
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
      this.on('fail', function (ctx) {
        this._centrifuge._debug('subscription failed', channel, ctx);
      });
    }
  }

  // ready returns a Promise which resolves upon subscription goes to Subscribed
  // state and rejects in case of subscription goes to Unsubscribed or Failed state.
  // Optional timeout can be passed.
  ready(timeout) {
    if (this.state === subscriptionState.Unsubscribed || this.state === subscriptionState.Failed) {
      return Promise.reject({ code: 0, message: this.state });
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
          rej({ 'code': 1, 'message': 'timeout' });
        }, timeout);
      }
      this._promises[this._nextPromiseId()] = ctx;
    });
  }

  // subscribe to a channel.
  subscribe(options) {
    if (this._isSubscribed()) {
      return;
    }
    this._setOptions(options);
    this._setSubscribing();
  };

  // unsubscribe from a channel, keeping position state.
  unsubscribe() {
    if (this._isSubscribed()) {
      this._centrifuge._unsubscribe(this);
    }
    this._setUnsubscribed();
  };

  // cancel Subscription – remove it from client's registry and
  // remove link to a client. Subscription is UNUSABLE after this.
  // Subscription must be in Unsubscribed or Failed state vefore calling
  // this.
  cancel() {
    if (this.state !== subscriptionState.Unsubscribed && this.state !== subscriptionState.Failed) {
      throw new Error('Subscription must be unsubscribed or failed to cancel');
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
        rej({ 'code': 1, 'message': 'timeout' });
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

  _setSubscribing() {
    if (this._isSubscribing()) {
      return;
    }
    const needUnsubscribeEvent = this._isSubscribed();
    if (this._isSubscribed()) {
      this._clearSubscribedState();
    }
    this._setState(subscriptionState.Subscribing);
    if (needUnsubscribeEvent) {
      this._triggerUnsubscribe();
    }
    this._centrifuge._subscribe(this);
  };

  _setSubscribed(result) {
    if (!this._isSubscribing()) {
      return;
    }
    this._clearSubscribingState();
    this._setState(subscriptionState.Subscribed);
    const successContext = this._centrifuge._getSubscribeContext(this.channel, result);
    this.emit('subscribe', successContext);
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

  _setUnsubscribed() {
    if (this._isUnsubscribed()) {
      return;
    }
    if (this._isSubscribed()) {
      this._clearSubscribedState();
    }
    if (this._isSubscribing()) {
      this._clearSubscribingState();
    }
    const triggerUnsubscribeEvent = this._isSubscribed();
    this._setState(subscriptionState.Unsubscribed);
    if (triggerUnsubscribeEvent) {
      this._triggerUnsubscribe();
    }
    this._rejectPromises({ code: 0, message: subscriptionState.Unsubscribed });
  };

  _fail(reason) {
    this.unsubscribe();
    this._setState(subscriptionState.Failed);
    this.emit('fail', { channel: this.channel, reason: reason });
  }

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

    const errContext = {
      channel: this.channel,
      type: 'subscribe',
      error: err
    };

    this.emit('error', errContext);

    if (err.code === 112) { // Unrecoverable position error.
      // In this case we assume that application should load initial state
      // and subscribe from scratch.
      this._clearPositionState();
      this._failUnrecoverable();
    } else if (err.code < 100 || err.code === 109 || err.temporary === true) {
      if (err.code === 109) { // Token expired error.
        this._token = null;
      }
      this._scheduleResubscribe();
    } else {
      this._subscribeFailed();
    }
  };

  _getResubscribeDelay() {
    const delay = backoff(this._resubscribeAttempts, this._minResubscribeDelay, this._maxResubscribeDelay);
    this._resubscribeAttempts++;
    return delay;
  }

  _triggerUnsubscribe() {
    this.emit('unsubscribe', { channel: this.channel });
  };

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
    if ('tokenUniquePerConnection' in options) {
      this._tokenUniquePerConnection = options.tokenUniquePerConnection;
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
    const clientId = this._centrifuge._client;
    const ctx = {
      client: clientId,
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
    const clientId = this._centrifuge._client;
    const self = this;
    this._getToken().then(function (token) {
      if (!self._isSubscribed()) {
        return;
      }
      if (clientId !== self._centrifuge._client) {
        return;
      }
      if (!token) {
        self._failUnauthorized();
        return;
      }
      if (!self._tokenUniquePerConnection) {
        self._token = token;
      }
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
          code: 6,
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
    this.emit('error', {
      type: 'refresh',
      channel: this.channel,
      error: err
    });
    if (err.code < 100 || err.temporary === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
    } else {
      this._refreshFailed();
    }
  }

  _getRefreshRetryDelay() {
    return backoff(0, 10000, 20000);
  }

  _failServer() {
    this._fail(subscriptionFailReason.Server);
  }

  _subscribeFailed() {
    this._fail(subscriptionFailReason.SubscribeFailed);
  }

  _refreshFailed() {
    this._fail(subscriptionFailReason.RefreshFailed);
  };

  _failUnauthorized() {
    this._fail(subscriptionFailReason.Unauthorized);
  };

  _failUnrecoverable() {
    this._clearPositionState();
    this._fail(subscriptionFailReason.Unrecoverable, true);
  }
}
