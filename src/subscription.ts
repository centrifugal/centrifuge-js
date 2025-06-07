import EventEmitter from 'events';
import { Centrifuge, UnauthorizedError } from './centrifuge';
import { errorCodes, unsubscribedCodes, subscribingCodes, connectingCodes } from './codes';
import {
  HistoryOptions, HistoryResult, PresenceResult, PresenceStatsResult,
  PublishResult, State, SubscriptionEvents, SubscriptionOptions,
  SubscriptionState, SubscriptionTokenContext, TypedEventEmitter,
  SubscriptionDataContext
} from './types';
import { ttlMilliseconds, backoff } from './utils';

/** Subscription to a channel */
export class Subscription extends (EventEmitter as new () => TypedEventEmitter<SubscriptionEvents>) {
  channel: string;
  state: SubscriptionState;

  private _centrifuge: Centrifuge;
  private _promises: Record<number, any>;
  private _resubscribeTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _refreshTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _getToken: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  private _minResubscribeDelay: number;
  private _maxResubscribeDelay: number;
  private _recover: boolean;
  private _offset: number | null;
  private _epoch: string | null;
  private _resubscribeAttempts: number;
  private _promiseId: number;
  private _delta: string;
  private _delta_negotiated: boolean;
  private _token: string;
  private _data: any | null;
  private _getData: null | ((ctx: SubscriptionDataContext) => Promise<any>);
  private _recoverable: boolean;
  private _positioned: boolean;
  private _joinLeave: boolean;
  // @ts-ignore – this is used by a client in centrifuge.ts.
  private _inflight: boolean;
  private _prevValue: any;
  private _unsubPromise: any;

  /** Subscription constructor should not be used directly, create subscriptions using Client method. */
  constructor(centrifuge: Centrifuge, channel: string, options?: Partial<SubscriptionOptions>) {
    super();
    this.channel = channel;
    this.state = SubscriptionState.Unsubscribed;
    this._centrifuge = centrifuge;
    this._token = '';
    this._getToken = null;
    this._data = null;
    this._getData = null;
    this._recover = false;
    this._offset = null;
    this._epoch = null;
    this._recoverable = false;
    this._positioned = false;
    this._joinLeave = false;
    this._minResubscribeDelay = 500;
    this._maxResubscribeDelay = 20000;
    this._resubscribeTimeout = null;
    this._resubscribeAttempts = 0;
    this._promises = {};
    this._promiseId = 0;
    this._inflight = false;
    this._refreshTimeout = null;
    this._delta = '';
    this._delta_negotiated = false;
    this._prevValue = null;
    this._unsubPromise = Promise.resolve();
    this._setOptions(options);
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    if (this._centrifuge._debugEnabled) {
      this.on('state', (ctx) => {
        this._debug('subscription state', channel, ctx.oldState, '->', ctx.newState);
      });
      this.on('error', (ctx) => {
        this._debug('subscription error', channel, ctx);
      });
    } else {
      // Avoid unhandled exception in EventEmitter for non-set error handler.
      this.on('error', function () { Function.prototype(); });
    }
  }

  /** ready returns a Promise which resolves upon subscription goes to Subscribed 
   * state and rejects in case of subscription goes to Unsubscribed state. 
   * Optional timeout can be passed.*/
  ready(timeout?: number): Promise<void> {
    if (this.state === SubscriptionState.Unsubscribed) {
      return Promise.reject({ code: errorCodes.subscriptionUnsubscribed, message: this.state });
    }
    if (this.state === SubscriptionState.Subscribed) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      const ctx: any = {
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

  /** subscribe to a channel.*/
  subscribe() {
    if (this._isSubscribed()) {
      return;
    }
    this._resubscribeAttempts = 0;
    this._setSubscribing(subscribingCodes.subscribeCalled, 'subscribe called');
  }

  /** unsubscribe from a channel, keeping position state.*/
  unsubscribe() {
    this._unsubPromise = this._setUnsubscribed(unsubscribedCodes.unsubscribeCalled, 'unsubscribe called', true);
  }

  /** publish data to a channel.*/
  async publish(data: any): Promise<PublishResult> {
    await this._methodCall();
    return this._centrifuge.publish(this.channel, data);
  }

  /** get online presence for a channel.*/
  async presence(): Promise<PresenceResult> {
    await this._methodCall();
    return this._centrifuge.presence(this.channel);
  }

  /** presence stats for a channel (num clients and unique users).*/
  async presenceStats(): Promise<PresenceStatsResult> {
    await this._methodCall();
    return this._centrifuge.presenceStats(this.channel);
  }

  /** history for a channel. By default it does not return publications (only current
   *  StreamPosition data) – provide an explicit limit > 0 to load publications.*/
  async history(opts: HistoryOptions): Promise<HistoryResult> {
    await this._methodCall();
    return this._centrifuge.history(this.channel, opts);
  }

  private _methodCall(): Promise<void> {
    if (this._isSubscribed()) {
      return Promise.resolve();
    }

    if (this._isUnsubscribed()) {
      return Promise.reject({
        code: errorCodes.subscriptionUnsubscribed,
        message: this.state
      });
    }

    return new Promise((resolve, reject) => {
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      const timeoutDuration = this._centrifuge._config.timeout;

      const timeout = setTimeout(() => {
        reject({ code: errorCodes.timeout, message: 'timeout' });
      }, timeoutDuration);

      this._promises[this._nextPromiseId()] = {
        timeout,
        resolve,
        reject
      };
    });
  }

  private _nextPromiseId() {
    return ++this._promiseId;
  }

  private _needRecover() {
    return this._recover === true;
  }

  private _isUnsubscribed() {
    return this.state === SubscriptionState.Unsubscribed;
  }

  private _isSubscribing() {
    return this.state === SubscriptionState.Subscribing;
  }

  private _isSubscribed() {
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
  }

  private _usesToken(): boolean {
    return this._token !== '' || this._getToken !== null;
  }

  private _clearSubscribingState() {
    this._resubscribeAttempts = 0;
    this._clearResubscribeTimeout();
  }

  private _clearSubscribedState() {
    this._clearRefreshTimeout();
  }

  private _setSubscribed(result: any) {
    if (!this._isSubscribing()) {
      return;
    }
    this._clearSubscribingState();

    if (result.recoverable) {
      this._recover = true;
      this._offset = result.offset || 0;
      this._epoch = result.epoch || '';
    }
    if (result.delta) {
      this._delta_negotiated = true;
    } else {
      this._delta_negotiated = false;
    }

    this._setState(SubscriptionState.Subscribed);
    // @ts-ignore – we are hiding some methods from public API autocompletion.
    const ctx = this._centrifuge._getSubscribeContext(this.channel, result);
    this.emit('subscribed', ctx);
    this._resolvePromises();

    const pubs = result.publications;
    if (pubs && pubs.length > 0) {
      for (const i in pubs) {
        if (!pubs.hasOwnProperty(i)) {
          continue;
        }
        this._handlePublication(pubs[i]);
      }
    }

    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  }

  private async _setSubscribing(code: number, reason: string) {
    if (this._isSubscribing()) {
      return;
    }
    if (this._isSubscribed()) {
      this._clearSubscribedState();
    }
    if (this._setState(SubscriptionState.Subscribing)) {
      this.emit('subscribing', { channel: this.channel, code: code, reason: reason });
    }
    // @ts-ignore – for performance reasons only await _unsubPromise for emulution case where it's required.
    if (this._centrifuge._transport && this._centrifuge._transport.emulation()) {
      await this._unsubPromise;
    }
    if (!this._isSubscribing()) {
      return;
    }
    this._subscribe();
  }

  private _subscribe(): any {
    this._debug('subscribing on', this.channel);

    if (!this._isTransportOpen()) {
      this._debug('delay subscribe on', this.channel, 'till connected');
      return null;
    }

    if (this._inflight) {
      return null;
    }
    this._inflight = true;

    if (this._canSubscribeWithoutGettingToken()) {
      return this._subscribeWithoutToken();
    }

    this._getSubscriptionToken()
      .then(token => this._handleTokenResponse(token))
      .catch(e => this._handleTokenError(e));

    return null;
  }

  private _isTransportOpen(): boolean {
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    return this._centrifuge._transportIsOpen;
  }

  private _canSubscribeWithoutGettingToken(): boolean {
    return !this._usesToken() || !!this._token;
  }

  private _subscribeWithoutToken(): any {
    if (this._getData) {
      this._getDataAndSubscribe(this._token);
      return null;
    } else {
      return this._sendSubscribe(this._token);
    }
  }

  private _getDataAndSubscribe(token: string): void {
    if (!this._getData) {
      this._inflight = false;
      return;
    }

    this._getData({ channel: this.channel })
      .then(data => {
        if (!this._isSubscribing()) {
          this._inflight = false;
          return;
        }
        this._data = data;
        this._sendSubscribe(token);
      })
      .catch(e => this._handleGetDataError(e));
  }

  private _handleGetDataError(error: any): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    if (error instanceof UnauthorizedError) {
      this._inflight = false;
      this._failUnauthorized();
      return;
    }

    this.emit('error', {
      type: 'subscribeData',
      channel: this.channel,
      error: {
        code: errorCodes.badConfiguration,
        message: error?.toString() || ''
      }
    });

    this._inflight = false;
    this._scheduleResubscribe();
  }

  private _handleTokenResponse(token: string | null): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    if (!token) {
      this._inflight = false;
      this._failUnauthorized();
      return;
    }

    this._token = token;

    if (this._getData) {
      this._getDataAndSubscribe(token);
    } else {
      this._sendSubscribe(token);
    }
  }

  private _handleTokenError(error: any): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    if (error instanceof UnauthorizedError) {
      this._inflight = false;
      this._failUnauthorized();
      return;
    }

    this.emit('error', {
      type: 'subscribeToken',
      channel: this.channel,
      error: {
        code: errorCodes.subscriptionSubscribeToken,
        message: error?.toString() || ''
      }
    });

    this._inflight = false;
    this._scheduleResubscribe();
  }

  private _sendSubscribe(token: string): any {
    if (!this._isTransportOpen()) {
      this._inflight = false;
      return null;
    }

    const cmd = this._buildSubscribeCommand(token);

    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    this._centrifuge._call(cmd).then(resolveCtx => {
      this._inflight = false;
      const result = resolveCtx.reply.subscribe;
      this._handleSubscribeResponse(result);
      if (resolveCtx.next) {
        resolveCtx.next();
      }
    }, rejectCtx => {
      this._inflight = false;
      this._handleSubscribeError(rejectCtx.error);

      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });

    return cmd;
  }

  private _buildSubscribeCommand(token: string): any {
    const req: any = { channel: this.channel };

    if (token) req.token = token;
    if (this._data) req.data = this._data;
    if (this._positioned) req.positioned = true;
    if (this._recoverable) req.recoverable = true;
    if (this._joinLeave) req.join_leave = true;

    if (this._needRecover()) {
      req.recover = true;
      const offset = this._getOffset();
      if (offset) req.offset = offset;
      const epoch = this._getEpoch();
      if (epoch) req.epoch = epoch;
    }

    if (this._delta) req.delta = this._delta;

    return { subscribe: req };
  }

  private _debug(...args: any[]): void {
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    this._centrifuge._debug(...args);
  }

  private _handleSubscribeError(error) {
    if (!this._isSubscribing()) {
      return;
    }
    if (error.code === errorCodes.timeout) {
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      this._centrifuge._disconnect(connectingCodes.subscribeTimeout, 'subscribe timeout', true);
      return;
    }
    this._subscribeError(error);
  }

  private _handleSubscribeResponse(result) {
    if (!this._isSubscribing()) {
      return;
    }
    this._setSubscribed(result);
  }

  private _setUnsubscribed(code, reason, sendUnsubscribe): Promise<void> {
    if (this._isUnsubscribed()) {
      return Promise.resolve();
    }
    let promise = Promise.resolve();
    if (this._isSubscribed()) {
      if (sendUnsubscribe) {
        // @ts-ignore – we are hiding some methods from public API autocompletion.
        promise = this._centrifuge._unsubscribe(this);
      }
      this._clearSubscribedState();
    } else if (this._isSubscribing()) {
      if (this._inflight && sendUnsubscribe) {
        // @ts-ignore – we are hiding some methods from public API autocompletion.
        promise = this._centrifuge._unsubscribe(this);
      }
      this._clearSubscribingState();
    }
    this._inflight = false;
    if (this._setState(SubscriptionState.Unsubscribed)) {
      this.emit('unsubscribed', { channel: this.channel, code: code, reason: reason });
    }
    this._rejectPromises({ code: errorCodes.subscriptionUnsubscribed, message: this.state });
    return promise;
  }

  private _handlePublication(pub: any) {
    if (this._delta && this._delta_negotiated) {
      // @ts-ignore – we are hiding some methods from public API autocompletion.
      const { newData, newPrevValue } = this._centrifuge._codec.applyDeltaIfNeeded(pub, this._prevValue)
      pub.data = newData;
      this._prevValue = newPrevValue;
    }
    // @ts-ignore – we are hiding some methods from public API autocompletion.
    const ctx = this._centrifuge._getPublicationContext(this.channel, pub);
    this.emit('publication', ctx);
    if (pub.offset) {
      this._offset = pub.offset;
    }
  }

  protected _handleJoin(join: any) {
    // @ts-ignore – we are hiding some methods from public API autocompletion.
    const info = this._centrifuge._getJoinLeaveContext(join.info)
    this.emit('join', { channel: this.channel, info: info });
  }

  protected _handleLeave(leave: any) {
    // @ts-ignore – we are hiding some methods from public API autocompletion.
    const info = this._centrifuge._getJoinLeaveContext(leave.info)
    this.emit('leave', { channel: this.channel, info: info });
  }

  private _resolvePromises() {
    for (const id in this._promises) {
      if (!this._promises.hasOwnProperty(id)) {
        continue;
      }
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].resolve();
      delete this._promises[id];
    }
  }

  private _rejectPromises(err: any) {
    for (const id in this._promises) {
      if (!this._promises.hasOwnProperty(id)) {
        continue;
      }
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].reject(err);
      delete this._promises[id];
    }
  }

  private _scheduleResubscribe() {
    if (!this._isSubscribing()) {
      this._debug('not in subscribing state, skip resubscribe scheduling', this.channel);
      return;
    }
    const self = this;
    const delay = this._getResubscribeDelay();
    this._resubscribeTimeout = setTimeout(function () {
      if (self._isSubscribing()) {
        self._subscribe();
      }
    }, delay);
    this._debug('resubscribe scheduled after ' + delay, this.channel);
  }

  private _subscribeError(err: any) {
    if (!this._isSubscribing()) {
      return;
    }
    if (err.code < 100 || err.code === 109 || err.temporary === true) {
      if (err.code === 109) { // Token expired error.
        this._token = '';
      }
      const errContext = {
        channel: this.channel,
        type: 'subscribe',
        error: err
      };
      if (this._centrifuge.state === State.Connected) {
        this.emit('error', errContext);
      }
      this._scheduleResubscribe();
    } else {
      this._setUnsubscribed(err.code, err.message, false);
    }
  }

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
      this._offset = options.since.offset || 0;
      this._epoch = options.since.epoch || '';
      this._recover = true;
    }
    if (options.data) {
      this._data = options.data;
    }
    if (options.getData) {
      this._getData = options.getData;
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
    if (options.joinLeave === true) {
      this._joinLeave = true;
    }
    if (options.delta) {
      if (options.delta !== 'fossil') {
        throw new Error('unsupported delta format');
      }
      this._delta = options.delta;
    }
  }

  private _getOffset() {
    const offset = this._offset;
    if (offset !== null) {
      return offset;
    }
    return 0;
  }

  private _getEpoch() {
    const epoch = this._epoch;
    if (epoch !== null) {
      return epoch;
    }
    return '';
  }

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

  private _getSubscriptionToken() {
    this._debug('get subscription token for channel', this.channel);
    const ctx = {
      channel: this.channel
    };
    const getToken = this._getToken;
    if (getToken === null) {
      this.emit('error', {
        type: 'configuration',
        channel: this.channel,
        error: {
          code: errorCodes.badConfiguration,
          message: 'provide a function to get channel subscription token'
        }
      });
      return Promise.reject(new UnauthorizedError(''));
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
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
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
      if (e instanceof UnauthorizedError) {
        self._failUnauthorized();
        return;
      }
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

  private _refreshResponse(result: any) {
    if (!this._isSubscribed()) {
      return;
    }
    this._debug('subscription token refreshed, channel', this.channel);
    this._clearRefreshTimeout();
    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  }

  private _refreshError(err: any) {
    if (!this._isSubscribed()) {
      return;
    }
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

  private _failUnauthorized() {
    this._setUnsubscribed(unsubscribedCodes.unauthorized, 'unauthorized', true);
  }
}