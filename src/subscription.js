import EventEmitter from 'events';

import { ttlMilliseconds, backoff } from './utils';

const states = {
  UNSUBSCRIBED: 'unsubscribed',
  SUBSCRIBING: 'subscribing',
  SUBSCRIBED: 'subscribed',
  CLOSED: 'closed'
};

const closeReasons = {
  // Subscription closed by client, subscription position state cleared.
  // Subscription still kept in client's registry until explicitly canceled by client.
  CLIENT: 'client',
  // Subscription closed by server, subscription position state kept.
  // Subscription still kept in client's registry until explicitly canceled by client.
  SERVER: 'server',
  // Fatal error during subscribe or resubscribe, subscription position state kept.
  // Subscription still kept in client's registry until explicitly canceled by client.
  SUBSCRIBE_FAILED: 'subscribe failed',
  // Fatal error during subscribe or resubscribe, subscription position state kept.
  // Subscription still kept in client's registry until explicitly canceled by client.
  REFRESH_FAILED: 'refresh failed',
  // Access denied, subscription position state kept.
  // Subscription still kept in client's registry until explicitly canceled by client.
  UNAUTHORIZED: 'unauthorized',
  // Client was not able to recover subscription state automatically, subscription
  // position state is cleared. If subscription closed due to this reason application
  // must decide what to do: subscribe from scratch, possibly load initial state from
  // the backend, or cancel subscription.
  UNRECOVERABLE_POSITION: 'unrecoverable position'
};

export default class Subscription extends EventEmitter {
  constructor(centrifuge, channel, opts) {
    super();
    this.channel = channel;
    this._centrifuge = centrifuge;
    this._state = states.UNSUBSCRIBED;
    this._recoverable = false;
    this._token = null;
    this._data = null;
    this._recover = false;
    this._offset = null;
    this._epoch = null;
    this._getSubscriptionToken = null;
    this._minResubscribeDelay = 500;
    this._maxResubscribeDelay = 20000;
    this._resubscribeTimeout = null;
    this._resubscribeAttempts = 0;
    this._tokenUniquePerConnection = false;
    this._promises = {};
    this._promiseId = 0;
    this._refreshTimeout = null;
    this._setOpts(opts);
    this.on('error', function (errContext) {
      this._centrifuge._debug('subscription error', channel, errContext);
    });
  }

  // subscribed returns a Promise which resolves upon subscription goes to SUBSCRIBED
  // state and rejects in case of subscription goes to UNSUBSCRIBED or CLOSED state.
  _subscribed() {
    if (this._state === states.UNSUBSCRIBED || this._state === states.CLOSED) {
      return Promise.reject({ code: 0, message: this._state });
    };
    if (this._state === states.SUBSCRIBED) {
      return Promise.resolve();
    };
    return new Promise((res, rej) => {
      let ctx = {
        resolve: res,
        reject: rej
      };
      this._promises[this._nextPromiseId()] = ctx;
    });
  }

  state() {
    return this._state;
  }

  subscribe(opts) {
    if (this._isSubscribed()) {
      return;
    }
    this._setOpts(opts);
    this._setSubscribing();
    this._centrifuge._subscribe(this);
  };

  unsubscribe() {
    if (this._isSubscribed()) {
      this._centrifuge._unsubscribe(this);
    }
    this._setUnsubscribed(false);
    this._recover = true;
  };

  close() {
    this._close(closeReasons.CLIENT, true);
  };

  cancel() {
    this._centrifuge._removeSubscription(this);
    this._centrifuge = undefined;
  };

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

  _setNeedRecover(enabled) {
    this._recoverable = enabled;
    this._recover = enabled;
  }

  _needRecover() {
    return this._recoverable === true && this._recover === true;
  };

  _isUnsubscribed() {
    return this._isInState(states.UNSUBSCRIBED);
  }

  _isSubscribing() {
    return this._isInState(states.SUBSCRIBING);
  }

  _isSubscribed() {
    return this._isInState(states.SUBSCRIBED);
  }

  _isClosed() {
    return this._isInState(states.CLOSED);
  }

  _isInState(state) {
    return this._state === state;
  }

  _setState(newState) {
    if (this._state !== newState) {
      const prevState = this._state;
      this._centrifuge._debug('subscription state', this.channel, this._state, '->', newState);
      this._state = newState;
      this.emit('state', { 'state': newState, 'prevState': prevState });
      return true;
    }
    return false;
  };

  _setSubscribing() {
    this._clearRefreshTimeout();
    this._setState(states.SUBSCRIBING);
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

  _setSubscribed(result) {
    if (!this._isSubscribing()) {
      return;
    }
    this._setState(states.SUBSCRIBED);
    this._clearResubscribeTimeout();
    this._resubscribeAttempts = 0;
    const successContext = this._centrifuge._getSubscribeContext(this.channel, result);
    this.emit('subscribe', successContext);
    this._resolvePromises();

    this._recover = true;

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
      this._recoverable = true;
      this._offset = result.offset || 0;
      this._epoch = result.epoch || '';
    }

    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  };

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

  _subscribeError(err) {
    if (!this._isSubscribing()) {
      return;
    }

    const errContext = {
      'channel': this.channel,
      'code': err.code,
      'message': err.message
    };

    if (err.code === 112) { // Unrecoverable position error.
      // In this case we assume that application should load initial state
      // and subscribe from scratch.
      this._close(closeReasons.UNRECOVERABLE_POSITION, true);
    } else if (err.code < 100 || err.code === 109 || err.temporary === true) {
      if (err.code === 109) {
        this._token = null;
      }
      this.emit('error', errContext);
      const self = this;
      const interval = backoff(this._resubscribeAttempts, this._minResubscribeDelay, this._maxResubscribeDelay);
      this._resubscribeAttempts++;
      this._resubscribeTimeout = setTimeout(function () {
        if (self._isSubscribing()) {
          self.subscribe();
        }
      }, interval);
    } else {
      this.emit('error', errContext);
      this._close(closeReasons.SUBSCRIBE_FAILED, true);
    }
  };

  _triggerUnsubscribe() {
    this.emit('unsubscribe', { channel: this.channel });
  };

  _clearPositionState() {
    this._recover = false;
    this._offset = null;
    this._epoch = null;
  }

  _setUnsubscribed(clearPositionState) {
    this._resubscribeAttempts = 0;
    this._clearResubscribeTimeout();
    this._clearRefreshTimeout();
    if (this._isUnsubscribed()) {
      return;
    }
    const needTrigger = this._isSubscribed();
    this._setState(states.UNSUBSCRIBED);
    if (clearPositionState === true) {
      this._clearPositionState();
    }
    if (needTrigger) {
      this._triggerUnsubscribe();
    }
    this._rejectPromises({ code: 0, message: states.UNSUBSCRIBED });
  };

  _close(reason, clearPositionState) {
    if (this._isClosed()) {
      if (clearPositionState) {
        this._clearPositionState();
      }
      return;
    }
    if (this._isSubscribed()) {
      this._centrifuge._unsubscribe(this);
    }
    this._setUnsubscribed(clearPositionState);
    this._setState(states.CLOSED);
    this.emit('close', { channel: this.channel, reason: reason });
  }

  _setOpts(opts) {
    if (!opts) {
      return;
    }
    if ('since' in opts) {
      this._offset = opts.since.offset;
      this._epoch = opts.since.epoch;
      this._setNeedRecover(true);
    }
    if ('data' in opts) {
      this._data = opts.data;
    }
    if ('minResubscribeDelay' in opts) {
      this._minResubscribeDelay = opts.minResubscribeDelay;
    }
    if ('maxResubscribeDelay' in opts) {
      this._maxResubscribeDelay = opts.maxResubscribeDelay;
    }
    if ('token' in opts) {
      this._token = opts.token;
    }
    if ('getSubscriptionToken' in opts) {
      this._getSubscriptionToken = opts.getSubscriptionToken;
    }
    if ('tokenUniquePerConnection' in opts) {
      this._tokenUniquePerConnection = opts.tokenUniquePerConnection;
    }
  }

  _getLastOffset() {
    const lastOffset = this._offset;
    if (lastOffset !== null) {
      return lastOffset;
    }
    return 0;
  };

  _getLastEpoch() {
    const lastEpoch = this._epoch;
    if (lastEpoch !== null) {
      return lastEpoch;
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
    let getToken = this._getSubscriptionToken;
    if (getToken === null) {
      getToken = this._centrifuge._config.getSubscriptionToken;
      if (getToken === null) {
        throw new Error('provide a function to get private channel subscription token');
      }
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
        self._closeUnauthorized();
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
      self._centrifuge._debug('error refreshing subscription token', e);
      self._refreshTimeout = setTimeout(() => self._refresh(), backoff(0, 5000, 10000));
    });
  }

  _refreshError(err) {
    this._centrifuge._debug('subscription refresh error', this.channel, err);
    if (err.code < 100 || err.temporary === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), backoff(0, 5000, 10000));
    } else {
      this._closeRefreshFailed();
    }
  }

  _refreshResponse(result) {
    this._centrifuge._debug('subscription token refreshed, channel', this.channel);
    this._clearRefreshTimeout();
    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  };

  _closeUnauthorized() {
    this._close(closeReasons.UNAUTHORIZED, false);
  };

  _closeRefreshFailed() {
    this._close(closeReasons.REFRESH_FAILED, false);
  };
}

Subscription.STATE_UNSUBSCRIBED =
  Subscription.prototype.STATE_UNSUBSCRIBED = states.UNSUBSCRIBED;
Subscription.STATE_SUBSCRIBING =
  Subscription.prototype.STATE_SUBSCRIBING = states.SUBSCRIBING;
Subscription.STATE_SUBSCRIBED =
  Subscription.prototype.STATE_SUBSCRIBED = states.SUBSCRIBED;
Subscription.STATE_CLOSED =
  Subscription.prototype.STATE_CLOSED = states.CLOSED;

Subscription.CLOSE_CLIENT =
  Subscription.prototype.CLOSE_CLIENT = closeReasons.CLIENT;
Subscription.CLOSE_SERVER =
  Subscription.prototype.CLOSE_SERVER = closeReasons.SERVER;
Subscription.CLOSE_SUBSCRIBE_FAILED =
  Subscription.prototype.CLOSE_SUBSCRIBE_FAILED = closeReasons.SUBSCRIBE_FAILED;
Subscription.CLOSE_REFRESH_FAILED =
  Subscription.prototype.CLOSE_REFRESH_FAILED = closeReasons.REFRESH_FAILED;
Subscription.CLOSE_UNAUTHORIZED =
  Subscription.prototype.CLOSE_UNAUTHORIZED = closeReasons.UNAUTHORIZED;
Subscription.CLOSE_UNRECOVERABLE_POSITION =
  Subscription.prototype.CLOSE_UNRECOVERABLE_POSITION = closeReasons.UNRECOVERABLE_POSITION;
