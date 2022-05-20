import EventEmitter from 'events';
import { Centrifuge } from './centrifuge';
import { errorCodes, unsubscribedCodes, subscribingCodes } from './codes';
import { HistoryOptions, HistoryResult, PresenceResult, PresenceStatsResult, PublishResult, SubscriptionEvents, SubscriptionOptions, SubscriptionState, SubscriptionTokenContext, TypedEventEmitter } from './types';
import { ttlMilliseconds, backoff } from './utils';

export class Subscription extends (EventEmitter as new () => TypedEventEmitter<SubscriptionEvents>) {
  channel: string;
  state: SubscriptionState;
  private _centrifuge: Centrifuge;
  private _promises: Map<number, any>;
  private _resubscribeTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _refreshTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _token: string | null;
  private _getToken: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  private _minResubscribeDelay: number;
  private _maxResubscribeDelay: number;
  private _recover: boolean;
  private _offset: number | null;
  private _epoch: string | null;
  private _resubscribeAttempts: number;
  private _promiseId: number;

  _data: any | null;
  _recoverable: boolean;
  _positioned: boolean;

  constructor(centrifuge: Centrifuge, channel: string, options?: Partial<SubscriptionOptions>) {
    super();
    this.channel = channel;
    this.state = SubscriptionState.Unsubscribed;
    this._centrifuge = centrifuge;
    this._token = null;
    this._getToken = null;
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
    this._promises = new Map<number, any>();
    this._promiseId = 0;
    this._refreshTimeout = null;
    this._setOptions(options);
    if (this._centrifuge._debugEnabled) {
      this.on('state', (ctx) => {
        this._centrifuge._debug('subscription state', channel, ctx.oldState, '->', ctx.newState);
      });
      this.on('error', (ctx) => {
        this._centrifuge._debug('subscription error', channel, ctx);
      });
    }
  }

  // ready returns a Promise which resolves upon subscription goes to Subscribed
  // state and rejects in case of subscription goes to Unsubscribed state.
  // Optional timeout can be passed.
  ready(timeout?: number) {
    if (this.state === SubscriptionState.Unsubscribed) {
      return Promise.reject({ code: errorCodes.subscriptionUnsubscribed, message: this.state });
    };
    if (this.state === SubscriptionState.Subscribed) {
      return Promise.resolve();
    };
    return new Promise((res, rej) => {
      let ctx: any = {
        resolve: res,
        reject: rej
      };
      if (timeout) {
        ctx.timeout = setTimeout(function () {
          rej({ code: errorCodes.timeout, message: 'timeout' });
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

  // publish data to a channel.
  async publish(data: any): Promise<PublishResult> {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.publish(self.channel, data);
    });
  };

  // presence for a channel.
  async presence(): Promise<PresenceResult> {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presence(self.channel);
    });
  };

  // presence stats for a channel.
  async presenceStats(): Promise<PresenceStatsResult> {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.presenceStats(self.channel);
    });
  };

  // history for a channel.
  async history(opts: HistoryOptions): Promise<HistoryResult> {
    const self = this;
    return this._methodCall().then(function () {
      return self._centrifuge.history(self.channel, opts);
    });
  };

  private _methodCall(): any {
    if (this._isSubscribed()) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      const timeout = setTimeout(function () {
        rej({ code: errorCodes.timeout, message: 'timeout' });
      }, this._centrifuge._config.timeout);
      this._promises[this._nextPromiseId()] = {
        timeout: timeout,
        resolve: res,
        reject: rej
      };
    });
  }

  private _nextPromiseId() {
    return ++this._promiseId;
  }

  _needRecover() {
    return this._recover === true;
  };

  private _isUnsubscribed() {
    return this.state === SubscriptionState.Unsubscribed;
  }

  _isSubscribing() {
    return this.state === SubscriptionState.Subscribing;
  }

  _isSubscribed() {
    return this.state === SubscriptionState.Subscribed;
  }

  private _setState(newState: SubscriptionState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('state', { newState, oldState, channel: this.channel });
      return true;
    }
    return false;
  };

  protected _usesToken() {
    return this._token !== null || this._getToken !== null;
  }

  private _clearSubscribingState() {
    this._resubscribeAttempts = 0;
    this._clearResubscribeTimeout();
  }

  private _clearSubscribedState() {
    this._clearRefreshTimeout();
  }

  _setSubscribed(result: any) {
    if (!this._isSubscribing()) {
      return;
    }
    this._clearSubscribingState();

    if (result.recoverable) {
      this._recover = true;
      this._offset = result.offset || 0;
      this._epoch = result.epoch || '';
    }

    this._setState(SubscriptionState.Subscribed);
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
    if (this._setState(SubscriptionState.Subscribing)) {
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
    if (this._setState(SubscriptionState.Unsubscribed)) {
      this.emit('unsubscribed', { channel: this.channel, code: code, reason: reason });
    }
    this._rejectPromises({ code: errorCodes.subscriptionUnsubscribed, message: 'unsubscribed' });
  };

  _handlePublication(pub: any) {
    const ctx = this._centrifuge._getPublicationContext(this.channel, pub);
    this.emit('publication', ctx);
    if (pub.offset) {
      this._offset = pub.offset;
    }
  }

  _handleJoin(join: any) {
    this.emit('join', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(join.info) });
  }

  _handleLeave(leave: any) {
    this.emit('leave', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(leave.info) });
  }

  private _resolvePromises() {
    for (const id in this._promises) {
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].resolve();
      delete this._promises[id];
    }
  }

  private _rejectPromises(err: any) {
    for (const id in this._promises) {
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].reject(err);
      delete this._promises[id];
    }
  }

  private _scheduleResubscribe() {
    const self = this;
    const delay = this._getResubscribeDelay();
    this._resubscribeTimeout = setTimeout(function () {
      if (self._isSubscribing()) {
        self._centrifuge._subscribe(self);
      }
    }, delay);
  }

  _subscribeError(err: any) {
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

  private _getResubscribeDelay() {
    const delay = backoff(this._resubscribeAttempts, this._minResubscribeDelay, this._maxResubscribeDelay);
    this._resubscribeAttempts++;
    return delay;
  }

  private _setOptions(options: Partial<SubscriptionOptions> | undefined) {
    if (!options) {
      return;
    }
    if (options.since) {
      this._offset = options.since.offset;
      this._epoch = options.since.epoch;
      this._recover = true;
    }
    if (options.data) {
      this._data = options.data;
    }
    if (options.minResubscribeDelay !== undefined) {
      this._minResubscribeDelay = options.minResubscribeDelay;
    }
    if (options.maxResubscribeDelay !== undefined) {
      this._maxResubscribeDelay = options.maxResubscribeDelay;
    }
    if (options.token) {
      this._token = options.token;
    }
    if (options.getToken) {
      this._getToken = options.getToken;
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

  private _clearRefreshTimeout() {
    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
  }

  private _clearResubscribeTimeout() {
    if (this._resubscribeTimeout !== null) {
      clearTimeout(this._resubscribeTimeout);
      this._resubscribeTimeout = null;
    }
  }

  protected _getSubscriptionToken() {
    this._centrifuge._debug('get subscription token for channel', this.channel);
    const ctx = {
      channel: this.channel
    };
    const getToken = this._getToken;
    if (getToken === null) {
      throw new Error('provide a function to get channel subscription token');
    }
    return getToken(ctx);
  }

  private _refresh() {
    this._clearRefreshTimeout();
    const self = this;
    this._getSubscriptionToken().then(function (token) {
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
        // @ts-ignore
        const result = resolveCtx.reply.sub_refresh;
        self._refreshResponse(result);
        // @ts-ignore
        if (resolveCtx.next) {
          // @ts-ignore
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
          message: e !== undefined ? e.toString() : ''
        }
      });
      self._refreshTimeout = setTimeout(() => self._refresh(), self._getRefreshRetryDelay());
    });
  }

  _refreshResponse(result: any) {
    this._centrifuge._debug('subscription token refreshed, channel', this.channel);
    this._clearRefreshTimeout();
    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  };

  _refreshError(err: any) {
    if (err.code < 100 || err.temporary === true) {
      this.emit('error', {
        type: 'refresh',
        channel: this.channel,
        error: err
      });
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
    } else {
      this._setUnsubscribed(err.code, err.message, true);
    }
  }

  private _getRefreshRetryDelay() {
    return backoff(0, 10000, 20000);
  }

  protected _failUnauthorized() {
    this._setUnsubscribed(unsubscribedCodes.unauthorized, 'unauthorized', true);
  };
}
