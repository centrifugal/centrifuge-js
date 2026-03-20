import EventEmitter from 'events';
import { Centrifuge, UnauthorizedError } from './centrifuge';
import { errorCodes, unsubscribedCodes, subscribingCodes, connectingCodes, subscriptionFlags } from './codes';
import {
  HistoryOptions, HistoryResult, PresenceResult, PresenceStatsResult,
  PublishResult, State, SubscriptionEvents, InternalSubscriptionOptions,
  SubscriptionState, SubscriptionTokenContext, TypedEventEmitter,
  SubscriptionDataContext, FilterNode, MapPhase, MapUpdateContext, SharedPollUpdateContext,
  MapUnrecoverableStrategy, DeltaStats,
  SharedPollTrackItem, SharedPollSignatureContext, SharedPollSignatureResult
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
  // @ts-ignore – this is used by a client in centrifuge.ts.
  private _id: number;
  private _resubscribeAttempts: number;
  private _promiseId: number;
  private _delta: string;
  private _delta_negotiated: boolean;
  private _tagsFilter: FilterNode | null;
  private _token: string;
  private _data: any | null;
  private _getData: null | ((ctx: SubscriptionDataContext) => Promise<any>);
  private _recoverable: boolean;
  private _positioned: boolean;
  private _joinLeave: boolean;
  // @ts-ignore – this is used by a client in centrifuge.ts.
  private _inflight: boolean;
  private _prevValueMap: Map<string, any>;
  private _unsubPromise: any;
  private _deltaNumPubs: number;
  private _deltaNumFull: number;
  private _deltaNumDelta: number;
  private _deltaBytesReceived: number;
  private _deltaBytesDecoded: number;

  // Map subscription state
  private _map: boolean = false;
  private _mapPresenceType: number = 1;  // 1=MAP, 2=MAP_CLIENTS, 3=MAP_USERS
  // @ts-ignore – this is used for tracking map subscription phase state.
  private _mapPhase: MapPhase | null = null;
  private _mapStateBuffer: MapUpdateContext[] = [];  // Buffer snapshot entries
  private _mapStreamBuffer: MapUpdateContext[] = [];    // Buffer stream entries during catch-up
  private _mapCursor: string = '';          // Pagination cursor
  private _mapLimit: number = 100;          // Page size
  private _mapUnrecoverableStrategy: MapUnrecoverableStrategy = 'from_scratch';

  // Shared poll subscription state
  private _sharedPoll: boolean = false;
  private _sharedPollTrackedItems: Map<string, number> = new Map();  // key → version
  private _sharedPollGetSignature: null | ((ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>) = null;
  private _sharedPollSignatureRefreshTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _sharedPollSignatureRefreshAttempts: number = 0;

  /** Subscription constructor should not be used directly, create subscriptions using Client method. */
  constructor(centrifuge: Centrifuge, channel: string, options?: Partial<InternalSubscriptionOptions>) {
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
    this._id = 0;
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
    this._tagsFilter = null;
    this._prevValueMap = new Map();
    this._unsubPromise = Promise.resolve();
    this._deltaNumPubs = 0;
    this._deltaNumFull = 0;
    this._deltaNumDelta = 0;
    this._deltaBytesReceived = 0;
    this._deltaBytesDecoded = 0;
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

  /** Publish data to a key in a map subscription channel. */
  async mapPublish(key: string, data: any): Promise<PublishResult> {
    await this._methodCall();
    return this._centrifuge.mapPublish(this.channel, key, data);
  }

  /** Remove a key from a map subscription channel. */
  async mapRemove(key: string): Promise<PublishResult> {
    await this._methodCall();
    return this._centrifuge.mapRemove(this.channel, key);
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

  /**
   * Sets server-side tags filter for the subscription.
   * This only applies on the next subscription attempt, not the current one.
   * Cannot be used together with delta option.
   *
   * @param tagsFilter - Filter configuration object or null to remove filter
   * @throws {Error} If both delta and tagsFilter are configured
   *
   * @example
   * ```typescript
   * // Simple equality filter
   * sub.setTagsFilter({
   *   key: 'ticker',
   *   cmp: 'eq',
   *   val: 'BTC'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Complex filter with logical operators
   * sub.setTagsFilter({
   *   op: 'and',
   *   nodes: [
   *     { key: 'ticker', cmp: 'eq', val: 'BTC' },
   *     { key: 'price', cmp: 'gt', val: '50000' }
   *   ]
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Filter with IN operator
   * sub.setTagsFilter({
   *   key: 'ticker',
   *   cmp: 'in',
   *   vals: ['BTC', 'ETH', 'SOL']
   * });
   * ```
   */
  setTagsFilter(tagsFilter: FilterNode | null): void {
    if (tagsFilter && this._delta) {
      throw new Error('cannot use delta and tagsFilter together');
    }
    this._tagsFilter = tagsFilter;
  }

  /** setData allows setting subscription data. This only applied on the next subscription attempt,
   * Note that if getData callback is configured, it will override this value during resubscriptions. */
  setData(data: any) {
    this._data = data;
  }

  /** deltaStats returns delta compression statistics for this subscription.
   * Only meaningful when delta compression is enabled (delta: 'fossil'). */
  deltaStats(): DeltaStats {
    const bytesDecoded = this._deltaBytesDecoded;
    return {
      numPublications: this._deltaNumPubs,
      numFullPayloads: this._deltaNumFull,
      numDeltaPayloads: this._deltaNumDelta,
      bytesReceived: this._deltaBytesReceived,
      bytesDecoded: bytesDecoded,
      compressionRatio: bytesDecoded > 0 ? 1 - this._deltaBytesReceived / bytesDecoded : 0,
    };
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
    this._clearSharedPollSignatureRefresh();
  }

  private _setSubscribed(result: any) {
    if (!this._isSubscribing()) {
      return;
    }
    this._clearSubscribingState();

    if (result.id) {
      this._id = result.id;
    }

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

    // Route to map subscribe flow if map mode is enabled
    if (this._map) {
      this._mapSubscribe();
      return null;
    }

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

    // Shared poll: simple subscribe with type=4, no positioning/recovery fields.
    if (this._sharedPoll) {
      req.type = 4;
      if (this._delta) req.delta = this._delta;
      return { subscribe: req };
    }

    if (this._positioned) req.positioned = true;
    if (this._recoverable) req.recoverable = true;
    if (this._joinLeave) req.join_leave = true;
    req.flag = subscriptionFlags.channelCompaction;

    if (this._needRecover()) {
      req.recover = true;
      const offset = this._getOffset();
      if (offset) req.offset = offset;
      const epoch = this._getEpoch();
      if (epoch) req.epoch = epoch;
    }

    if (this._delta) req.delta = this._delta;
    if (this._tagsFilter) req.tf = this._tagsFilter;

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
    // After shared poll subscribe, replay tracked items if any.
    if (this._sharedPoll) {
      this._sharedPollReplayTrack();
    }
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
      // For map and shared poll subs, delta is per-key.
      // For non-map subs, delta is a single chain regardless of pub.key.
      const deltaKey = (this._map || this._sharedPoll) ? (pub.key || '') : '';
      // @ts-ignore – we are hiding some methods from public API autocompletion.
      const { newData, newPrevValue, isDelta, wireBytes, fullBytes } = this._centrifuge._codec.applyDeltaIfNeeded(pub, this._prevValueMap.get(deltaKey))
      pub.data = newData;
      this._deltaNumPubs++;
      this._deltaBytesReceived += wireBytes;
      this._deltaBytesDecoded += fullBytes;
      if (isDelta) {
        this._deltaNumDelta++;
      } else {
        this._deltaNumFull++;
      }
      if (pub.removed) {
        this._prevValueMap.delete(deltaKey);
      } else {
        this._prevValueMap.set(deltaKey, newPrevValue);
      }
    }

    let ctx: any;
    if (this._sharedPoll) {
      // Update locally tracked versions.
      if (pub.key) {
        if (pub.removed) {
          this._sharedPollTrackedItems.delete(pub.key);
        } else if (pub.version) {
          this._sharedPollTrackedItems.set(pub.key, pub.version);
        }
      }
      ctx = this._getSharedPollUpdateContext(pub);
    } else if (this._map) {
      ctx = this._getMapUpdateContext(pub);
    } else {
      // @ts-ignore – we are hiding some methods from public API autocompletion.
      ctx = this._centrifuge._getPublicationContext(this.channel, pub);
    }
    this.emit('publication', ctx);
    if (this._map || this._sharedPoll) {
      this.emit('update', ctx);
    }
    if (pub.offset) {
      this._offset = pub.offset;
    }
    if (pub.epoch) {
      this._epoch = pub.epoch;
    }
  }

  /** Seed per-key delta tracking from state/stream entries.
   * Handles JSON-escaped data (server-side delta escaping) and protobuf data.
   * Decodes escaped data back to original format for user consumption. */
  private _seedDeltaTracking(pub: any): void {
    if (!this._delta || !pub.key) return;
    if (typeof pub.data === 'string') {
      // JSON transport with server-side delta escaping.
      // Store raw bytes for delta, decode for user.
      const rawBytes = pub.data;
      if (!pub.removed) {
        this._prevValueMap.set(pub.key, new TextEncoder().encode(rawBytes));
      } else {
        this._prevValueMap.delete(pub.key);
      }
      // Count as full payload in delta stats.
      const byteLen = rawBytes.length;
      this._deltaNumPubs++;
      this._deltaNumFull++;
      this._deltaBytesReceived += byteLen;
      this._deltaBytesDecoded += byteLen;
      pub.data = JSON.parse(rawBytes);
    } else if (pub.data instanceof Uint8Array) {
      // Protobuf transport.
      if (!pub.removed) {
        this._prevValueMap.set(pub.key, pub.data);
      } else {
        this._prevValueMap.delete(pub.key);
      }
      // Count as full payload in delta stats.
      const byteLen = pub.data.length;
      this._deltaNumPubs++;
      this._deltaNumFull++;
      this._deltaBytesReceived += byteLen;
      this._deltaBytesDecoded += byteLen;
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

  private _setOptions(options: Partial<InternalSubscriptionOptions> | undefined) {
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
    if (options.tagsFilter) {
      this._tagsFilter = options.tagsFilter;
    }
    if (this._tagsFilter && this._delta) {
      throw new Error('cannot use delta and tagsFilter together');
    }
    // Map subscription options
    if (options.map === true) {
      this._map = true;
    }
    if (options.mapLimit !== undefined) {
      this._mapLimit = options.mapLimit;
    }
    // Presence type for presence subscriptions (2=clients, 3=users)
    if (options.mapPresenceType !== undefined) {
      this._mapPresenceType = options.mapPresenceType;
      this._map = true;  // Presence subscriptions are always map subscriptions
    }
    if (options.mapUnrecoverableStrategy) {
      this._mapUnrecoverableStrategy = options.mapUnrecoverableStrategy;
    }
    // Shared poll subscription options
    if (options.sharedPoll === true) {
      this._sharedPoll = true;
    }
    if (options.sharedPollGetSignature) {
      this._sharedPollGetSignature = options.sharedPollGetSignature;
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

  // ============ Shared Poll Methods ============

  /** Track items in a shared poll subscription. Each item has a key and version.
   * The signature must be an HMAC authenticating the key set. */
  async track(items: SharedPollTrackItem[], signature: string): Promise<void> {
    if (!this._sharedPoll) {
      throw new Error('track is only available on shared poll subscriptions');
    }
    await this._methodCall();
    // Merge into local tracking state.
    for (const item of items) {
      this._sharedPollTrackedItems.set(item.key, item.version);
    }
    return this._sendTrackRequest(items, signature);
  }

  /** Stop tracking specific keys in a shared poll subscription. */
  async untrack(keys: string[]): Promise<void> {
    if (!this._sharedPoll) {
      throw new Error('untrack is only available on shared poll subscriptions');
    }
    await this._methodCall();
    for (const key of keys) {
      this._sharedPollTrackedItems.delete(key);
    }
    return this._sendUntrackRequest(keys);
  }

  /** Returns the set of currently tracked keys in a shared poll subscription. */
  trackedKeys(): Set<string> {
    if (!this._sharedPoll) {
      throw new Error('trackedKeys is only available on shared poll subscriptions');
    }
    return new Set(this._sharedPollTrackedItems.keys());
  }

  private _sendTrackRequest(items: { key: string; version: number }[], signature: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const req: any = {
        channel: this.channel,
        type: 1,
        items: items,
        signature: signature,
      };
      const msg = { 'sub_refresh': req };
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      this._centrifuge._call(msg).then(resolveCtx => {
        const result = resolveCtx.reply.sub_refresh;
        this._handleTrackResponse(result);
        if (resolveCtx.next) {
          resolveCtx.next();
        }
        resolve();
      }, rejectCtx => {
        if (rejectCtx.next) {
          rejectCtx.next();
        }
        reject(rejectCtx.error);
      });
    });
  }

  private _sendUntrackRequest(keys: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const req: any = {
        channel: this.channel,
        type: 2,
        untrack_keys: keys,
      };
      const msg = { 'sub_refresh': req };
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      this._centrifuge._call(msg).then(resolveCtx => {
        if (resolveCtx.next) {
          resolveCtx.next();
        }
        resolve();
      }, rejectCtx => {
        if (rejectCtx.next) {
          rejectCtx.next();
        }
        reject(rejectCtx.error);
      });
    });
  }

  private _handleTrackResponse(result: any) {
    this._clearSharedPollSignatureRefresh();
    if (result.expires === true) {
      this._sharedPollSignatureRefreshTimeout = setTimeout(
        () => this._sharedPollRefreshSignature(),
        ttlMilliseconds(result.ttl)
      );
    }
  }

  private _clearSharedPollSignatureRefresh() {
    if (this._sharedPollSignatureRefreshTimeout !== null) {
      clearTimeout(this._sharedPollSignatureRefreshTimeout);
      this._sharedPollSignatureRefreshTimeout = null;
    }
    this._sharedPollSignatureRefreshAttempts = 0;
  }

  private _sharedPollRefreshSignature() {
    this._clearSharedPollSignatureRefresh();
    if (!this._isSubscribed()) return;
    if (!this._sharedPollGetSignature) return;
    if (this._sharedPollTrackedItems.size === 0) return;

    const keys = Array.from(this._sharedPollTrackedItems.keys());
    const self = this;

    this._sharedPollGetSignature({ keys }).then(result => {
      if (!self._isSubscribed()) return;

      self._sharedPollSignatureRefreshAttempts = 0;

      // Handle revoked keys (keys not in the returned set).
      const returnedKeys = new Set(result.keys);
      for (const key of keys) {
        if (!returnedKeys.has(key)) {
          self._sharedPollTrackedItems.delete(key);
          self.emit('update', {
            channel: self.channel,
            key: key,
            data: null,
            removed: true,
          } as SharedPollUpdateContext);
        }
      }

      // Re-track all remaining items with new signature.
      const items = Array.from(self._sharedPollTrackedItems.entries()).map(([key, version]) => ({
        key, version
      }));

      if (items.length === 0) return;

      self._sendTrackRequest(items, result.signature).catch(err => {
        self.emit('error', {
          type: 'track',
          channel: self.channel,
          error: err,
        });
      });
    }).catch(e => {
      self.emit('error', {
        type: 'signatureRefresh',
        channel: self.channel,
        error: {
          code: errorCodes.subscriptionRefreshToken,
          message: e !== undefined ? e.toString() : ''
        }
      });
      // Retry after delay with exponential backoff.
      self._sharedPollSignatureRefreshTimeout = setTimeout(
        () => self._sharedPollRefreshSignature(),
        backoff(self._sharedPollSignatureRefreshAttempts++, 5000, 30000)
      );
    });
  }

  private _sharedPollReplayTrack() {
    if (this._sharedPollTrackedItems.size === 0) return;
    if (!this._sharedPollGetSignature) return;
    if (!this._isSubscribed()) return;

    const keys = Array.from(this._sharedPollTrackedItems.keys());
    const self = this;

    this._sharedPollGetSignature({ keys }).then(result => {
      if (!self._isSubscribed()) return;

      self._sharedPollSignatureRefreshAttempts = 0;

      // Handle revoked keys.
      const returnedKeys = new Set(result.keys);
      for (const key of keys) {
        if (!returnedKeys.has(key)) {
          self._sharedPollTrackedItems.delete(key);
          self.emit('update', {
            channel: self.channel,
            key: key,
            data: null,
            removed: true,
          } as SharedPollUpdateContext);
        }
      }

      const items = Array.from(self._sharedPollTrackedItems.entries()).map(([key, version]) => ({
        key, version
      }));

      if (items.length === 0) return;

      self._sendTrackRequest(items, result.signature).catch(err => {
        self.emit('error', {
          type: 'track',
          channel: self.channel,
          error: err,
        });
      });
    }).catch(e => {
      self.emit('error', {
        type: 'signatureRefresh',
        channel: self.channel,
        error: {
          code: errorCodes.subscriptionRefreshToken,
          message: e !== undefined ? e.toString() : ''
        }
      });
      // Retry after delay with exponential backoff.
      self._sharedPollSignatureRefreshTimeout = setTimeout(
        () => self._sharedPollReplayTrack(),
        backoff(self._sharedPollSignatureRefreshAttempts++, 5000, 30000)
      );
    });
  }

  // ============ Keyed Subscription Methods ============

  /** Entry point for map subscriptions */
  private _mapSubscribe(): void {
    this._debug('starting map subscribe on', this.channel);

    // Initialize buffers and phase
    this._mapStateBuffer = [];
    this._mapStreamBuffer = [];
    this._mapCursor = '';
    // Preserve _prevValueMap when recovering — the server will send deltas
    // against the values the client already has from the previous session.
    // Only clear when starting from scratch (no recovery position).
    if (!(this._recover && this._offset !== null && this._epoch !== null)) {
      this._prevValueMap = new Map();
    }

    this._mapPhase = MapPhase.State;

    // If we have a position from `since`, we may skip snapshot and go to stream
    if (this._recover && this._offset !== null && this._epoch !== null) {
      this._debug('map subscribe: recovering from position, skipping to stream phase');
      this._mapPhase = MapPhase.Stream;
      this._fetchStream();
      return;
    }

    // Get token if needed, then start fetching snapshot
    if (this._canSubscribeWithoutGettingToken()) {
      this._fetchSnapshot();
    } else {
      this._getSubscriptionToken()
        .then(token => {
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
          this._fetchSnapshot();
        })
        .catch(e => this._handleTokenError(e));
    }
  }

  /** Fetch a page of snapshot data */
  private _fetchSnapshot(cursor?: string): void {
    if (!this._isSubscribing() || !this._isTransportOpen()) {
      this._inflight = false;
      return;
    }

    const cmd = this._buildMapSubscribeCommand(MapPhase.State, cursor);
    this._debug('map subscribe: fetching snapshot page', cursor ? `cursor=${cursor}` : 'initial');

    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    this._centrifuge._call(cmd).then(resolveCtx => {
      const result = resolveCtx.reply.subscribe;
      this._handleMapStateResponse(result);
      if (resolveCtx.next) {
        resolveCtx.next();
      }
    }, rejectCtx => {
      this._handleMapSubscribeError(rejectCtx.error);
      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });
  }

  /** Process snapshot response */
  private _handleMapStateResponse(result: any): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    // Check if server forced LIVE transition during STATE phase.
    // This happens on the last state page when server decides to skip STREAM phase
    // (streamless mode, or positioned mode with stream close enough).
    // Note: phase=0 may be omitted by JSON serializer, so !result.phase handles both 0 and undefined.
    if (!result.phase) {
      this._debug('map subscribe: server forced LIVE transition during state pagination');
      // _handleMapLiveResponse will process result.state and result.publications.
      this._handleMapLiveResponse(result);
      return;
    }

    // Store epoch/offset from first response. Both are frozen for the duration
    // of state pagination to maintain consistency: the stream catch-up must start
    // from where the first state page was captured, not from a later stream.Top().
    if (!this._epoch && result.epoch) {
      this._epoch = result.epoch;
      this._offset = result.offset || 0;
    }

    // Validate epoch on subsequent pages - if epoch changed, restart
    if (this._epoch && result.epoch && this._epoch !== result.epoch) {
      this._debug('map subscribe: epoch changed during snapshot pagination, restarting');
      this._mapStateBuffer = [];
      this._mapCursor = '';
      this._epoch = null;
      this._offset = null;
      this._fetchSnapshot();
      return;
    }

    // Append state entries to snapshot buffer (state field, not publications).
    if (result.state && result.state.length > 0) {
      for (const pub of result.state) {
        this._seedDeltaTracking(pub);
        this._mapStateBuffer.push(this._getMapUpdateContext(pub));
      }
    }

    // Check if there's more data to fetch
    if (result.cursor) {
      this._mapCursor = result.cursor;
      this._fetchSnapshot(this._mapCursor);
      return;
    }

    // No more snapshot pages, transition to next phase
    this._transitionFromSnapshot();
  }

  /** Transition from STATE to STREAM phase after snapshot pagination completes */
  private _transitionFromSnapshot(): void {
    this._debug('map subscribe: snapshot complete, transitioning to stream phase');

    // After STATE pagination, move to STREAM phase.
    // Client sends phase=1 requests, server decides when to go LIVE
    // by responding with phase=0.
    this._mapPhase = MapPhase.Stream;
    this._fetchStream();
  }

  /** Fetch stream data (offset-based catch-up) */
  private _fetchStream(): void {
    if (!this._isSubscribing() || !this._isTransportOpen()) {
      this._inflight = false;
      return;
    }

    const cmd = this._buildMapSubscribeCommand(MapPhase.Stream);
    this._debug('map subscribe: fetching stream from offset', this._offset);

    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    this._centrifuge._call(cmd).then(resolveCtx => {
      const result = resolveCtx.reply.subscribe;
      this._handleMapStreamResponse(result);
      if (resolveCtx.next) {
        resolveCtx.next();
      }
    }, rejectCtx => {
      this._handleMapSubscribeError(rejectCtx.error);
      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });
  }

  /** Process stream response */
  private _handleMapStreamResponse(result: any): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    // Check if server forced LIVE transition (server-controlled).
    // When server decides client is close enough, it returns phase=0 (LIVE).
    // Note: phase=0 may be omitted by JSON serializer, so !result.phase handles both 0 and undefined.
    if (!result.phase) {
      this._debug('map subscribe: server forced LIVE transition during stream');
      this._handleMapLiveResponse(result);
      return;
    }

    // Validate epoch - if changed, we need to restart from snapshot
    if (this._epoch && result.epoch && this._epoch !== result.epoch) {
      this._debug('map subscribe: epoch changed during stream, restarting from snapshot');
      this._mapStateBuffer = [];
      this._mapStreamBuffer = [];
      this._mapPhase = MapPhase.State;
      this._epoch = null;
      this._offset = null;
      this._fetchSnapshot();
      return;
    }

    // Append publications to stream buffer
    if (result.publications && result.publications.length > 0) {
      for (const pub of result.publications) {
        this._seedDeltaTracking(pub);
        this._mapStreamBuffer.push(this._getMapUpdateContext(pub));
      }
    }

    // Update offset from result. Server returns the last publication's actual
    // offset for intermediate STREAM pages (not stream.Top()), so this correctly
    // tracks the client's position for the next request.
    if (result.offset !== undefined) {
      this._offset = result.offset;
    }

    // Server controls LIVE transition. If server responded with phase=1,
    // we continue STREAM pagination. Server will respond with phase=0 when ready.
    this._fetchStream();
  }


  /** Process live response - complete the map subscription */
  private _handleMapLiveResponse(result: any): void {
    if (!this._isSubscribing()) {
      this._inflight = false;
      return;
    }

    this._inflight = false;

    // Validate epoch one more time
    if (this._epoch && result.epoch && this._epoch !== result.epoch) {
      this._debug('map subscribe: epoch changed during live transition, restarting');
      this._mapStateBuffer = [];
      this._mapStreamBuffer = [];
      this._mapPhase = MapPhase.State;
      this._epoch = null;
      this._offset = null;
      this._inflight = true;
      this._fetchSnapshot();
      return;
    }

    // Handle state from live response (present when state-to-live transition happens).
    if (result.state && result.state.length > 0) {
      for (const pub of result.state) {
        this._seedDeltaTracking(pub);
        this._mapStateBuffer.push(this._getMapUpdateContext(pub));
      }
    }

    // Append any remaining publications from the live response to stream buffer.
    // Recovery publications may be delta-encoded — decode before buffering.
    // Use result.delta (not this._delta_negotiated which is set later).
    if (result.publications && result.publications.length > 0) {
      for (const pub of result.publications) {
        if (this._delta && result.delta) {
          // Delta negotiated: decode and update tracking in one block.
          const deltaKey = pub.key || '';
          // @ts-ignore – we are hiding some methods from public API autocompletion.
          const { newData, newPrevValue, isDelta, wireBytes, fullBytes } = this._centrifuge._codec.applyDeltaIfNeeded(pub, this._prevValueMap.get(deltaKey));
          pub.data = newData;
          this._deltaNumPubs++;
          this._deltaBytesReceived += wireBytes;
          this._deltaBytesDecoded += fullBytes;
          if (isDelta) {
            this._deltaNumDelta++;
          } else {
            this._deltaNumFull++;
          }
          if (pub.removed) {
            this._prevValueMap.delete(deltaKey);
          } else {
            this._prevValueMap.set(deltaKey, newPrevValue);
          }
        } else if (this._delta && pub.key) {
          // Delta requested but not negotiated: seed tracking with raw data.
          if (pub.removed) {
            this._prevValueMap.delete(pub.key);
          } else {
            this._prevValueMap.set(pub.key, pub.data);
          }
        }
        this._mapStreamBuffer.push(this._getMapUpdateContext(pub));
      }
    }

    // Update final offset/epoch — use || 0/'' to handle zero values omitted by JSON/protobuf.
    this._offset = result.offset || 0;
    this._epoch = result.epoch || '';

    // Clear subscribing state
    this._clearSubscribingState();

    // Store subscription ID if provided
    if (result.id) {
      this._id = result.id;
    }

    // Set recoverable state - enable recovery for reconnects.
    // In streamless mode server omits recoverable (JSON: undefined, protobuf: false).
    this._recover = result.recoverable === true;

    // Handle delta negotiation
    if (result.delta) {
      this._delta_negotiated = true;
    } else {
      this._delta_negotiated = false;
    }

    // Transition to subscribed state
    this._setState(SubscriptionState.Subscribed);

    // Build subscribed context with state entries
    // @ts-ignore – we are hiding some methods from public API autocompletion.
    const ctx = this._centrifuge._getSubscribeContext(this.channel, result);
    ctx.state = this._mapStateBuffer;

    // Emit subscribed event
    this.emit('subscribed', ctx);
    this._resolvePromises();

    // Emit sync event — complete state for simplified state management.
    // On recovery (no state entries), emit sync with current state from stream buffer
    // applied on top. On fresh join, emit the state snapshot.
    if (!ctx.recovered) {
      this.emit('sync', { entries: this._mapStateBuffer });
    }

    // Flush stream buffer as publication and update events
    for (const pub of this._mapStreamBuffer) {
      this.emit('publication', pub);
      this.emit('update', pub);
    }

    // Clear buffers
    this._mapStateBuffer = [];
    this._mapStreamBuffer = [];
    this._mapPhase = null;

    // Handle token expiry
    if (result.expires === true) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  }

  /** Handle errors during map subscription process */
  private _handleMapSubscribeError(error: any): void {
    this._inflight = false;

    if (!this._isSubscribing()) {
      return;
    }

    if (error.code === errorCodes.timeout) {
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      this._centrifuge._disconnect(connectingCodes.subscribeTimeout, 'subscribe timeout', true);
      return;
    }

    // Clear map state on error
    this._mapStateBuffer = [];
    this._mapStreamBuffer = [];
    this._mapPhase = null;
    this._prevValueMap = new Map();

    // Handle unrecoverable position error (code 112) based on strategy
    if (error.code === 112) {
      if (this._mapUnrecoverableStrategy === 'from_scratch') {
        // Reset position and resubscribe from snapshot
        this._debug('map subscribe: unrecoverable position, restarting from scratch');
        this._offset = null;
        this._epoch = null;
        this._recover = false;
        this._scheduleResubscribe();
        return;
      }
      // 'fatal' strategy: fall through to _subscribeError which will unsubscribe
    }

    this._subscribeError(error);
  }

  /** Build map subscribe command for a specific phase */
  private _buildMapSubscribeCommand(phase: MapPhase, cursor?: string): any {
    const req: any = {
      channel: this.channel,
      type: this._mapPresenceType || 1, // 1=MAP, 2=MAP_CLIENTS, 3=MAP_USERS
      phase: phase,
    };

    if (this._token) req.token = this._token;
    if (this._data) req.data = this._data;
    if (this._tagsFilter) req.tf = this._tagsFilter;
    if (this._delta) req.delta = this._delta;
    req.flag = subscriptionFlags.channelCompaction;

    // STATE phase
    if (phase === MapPhase.State) {
      req.limit = this._mapLimit;
      if (cursor) req.cursor = cursor;
      // Epoch validation after first page
      if (this._epoch) {
        req.offset = this._offset;
        req.epoch = this._epoch;
      }
    }

    // STREAM phase
    if (phase === MapPhase.Stream) {
      req.limit = this._mapLimit;
      req.offset = this._offset;
      req.epoch = this._epoch;
      // For recovery: tell server we're reconnecting (skip STATE phase authorization)
      if (this._recover) {
        req.recover = true;
      }
    }

    return { subscribe: req };
  }

  /** Convert raw publication to MapUpdateContext */
  private _getMapUpdateContext(pub: any): MapUpdateContext {
    const ctx: MapUpdateContext = {
      channel: this.channel,
      data: pub.data,
      key: pub.key || '',
      score: pub.score || 0,
    };

    if (pub.removed === true) {
      ctx.removed = true;
    }
    if (pub.offset !== undefined) {
      ctx.offset = pub.offset;
    }
    if (pub.info) {
      // @ts-ignore – we are hiding some methods from public API autocompletion.
      ctx.info = this._centrifuge._getJoinLeaveContext(pub.info);
    }
    if (pub.tags) {
      ctx.tags = pub.tags;
    }

    return ctx;
  }

  /** Convert raw publication to SharedPollUpdateContext */
  private _getSharedPollUpdateContext(pub: any): SharedPollUpdateContext {
    const ctx: SharedPollUpdateContext = {
      channel: this.channel,
      key: pub.key || '',
      data: pub.data,
    };
    if (pub.removed === true) {
      ctx.removed = true;
    }
    if (pub.version !== undefined) {
      ctx.version = pub.version;
    }
    return ctx;
  }
}