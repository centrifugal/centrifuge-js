import EventEmitter from 'events';
import { Centrifuge, UnauthorizedError } from './centrifuge';
import { errorCodes, unsubscribedCodes, subscribingCodes, connectingCodes, subscriptionFlags } from './codes';
import {
  HistoryOptions, HistoryResult, PresenceResult, PresenceStatsResult,
  PublishResult, State, InternalSubscriptionEvents, InternalSubscriptionOptions,
  SubscriptionState, SubscriptionTokenContext, TypedEventEmitter,
  SubscriptionDataContext, FilterNode, MapUpdateContext, SharedPollUpdateContext,
  MapUnrecoverableStrategy, DeltaStats, StreamPosition,
  SharedPollTrackItem, SharedPollSignatureContext, SharedPollSignatureResult,
  SubscriptionErrorContext
} from './types';
import { ttlMilliseconds, backoff } from './utils';

// Internal-only — phases the SDK walks through during a map subscribe.
// Not exposed on the public surface; kept here so it doesn't leak via
// `export * from "./types"` in index.ts.
enum MapPhase {
  Live = 0,    // Join live pub/sub (default)
  Stream = 1,  // Paginating over stream (history catch-up)
  State = 2,   // Paginating over state (map state)
}

/** Base subscription to a channel — all subscription logic lives here. */
export class BaseSubscription extends (EventEmitter as new () => TypedEventEmitter<InternalSubscriptionEvents>) {
  channel: string;
  state: SubscriptionState;
  readonly type: string;

  protected _centrifuge: Centrifuge;
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

  // Stream getState callback (external state for stream subscriptions)
  private _getState: (() => Promise<StreamPosition>) | null = null;

  // Map subscription state
  private _map: boolean = false;
  private _mapPresenceType: number = 1;  // 1=MAP, 2=MAP_CLIENTS, 3=MAP_USERS
  // @ts-ignore – this is used for tracking map subscription phase state.
  private _mapPhase: MapPhase | null = null;
  private _mapStateBuffer: MapUpdateContext[] = [];  // Buffer snapshot entries
  private _mapStreamBuffer: MapUpdateContext[] = [];    // Buffer stream entries during catch-up
  private _mapCursor: string = '';          // Pagination cursor
  private _mapPageSize: number = 0;             // Page size (0 = use server default)
  private _mapUnrecoverableStrategy: MapUnrecoverableStrategy = 'from_scratch';
  // Publish debounce state (protocol-level, controlled by server)
  protected _debounceMs: number = 0;
  private _debouncePending: Map<string, { data: any; dirty: boolean; timer: ReturnType<typeof setTimeout> }> = new Map();

  // Shared poll subscription state
  private _sharedPoll: boolean = false;
  private _sharedPollEpoch: string = '';
  protected _sharedPollTrackedItems: Map<string, number> = new Map();  // key → version
  protected _sharedPollGetSignature: null | ((ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>) = null;
  // TTL-driven and 109-driven consolidating refresh (one call to getSignature
  // covering all tracked keys, replaces the library with one entry).
  private _sharedPollSignatureRefreshTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _sharedPollSignatureRefreshAttempts: number = 0;
  // Per-track-command transient retry (track call failed with temporary error).
  private _sharedPollTrackRetryTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _sharedPollTrackRetryAttempts: number = 0;
  // Replay-getSignature retry (Phase 2 of _sharedPollReplayTrack failed). Held
  // separately so it can't clobber the refresh timer or accumulate backoff
  // attempts onto refresh failures.
  private _sharedPollReplayRetryTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _sharedPollReplayRetryAttempts: number = 0;
  // Library of HMAC signatures previously obtained for track() calls.
  // Each entry covers the exact key set originally signed; reused on reconnect
  // so we don't hit the application's getSignature endpoint for every client
  // during mass reconnect storms. Periodic refresh consolidates entries into
  // one combined signature covering all currently tracked keys.
  protected _sharedPollSignatures: Array<{ keys: string[]; signature: string }> = [];
  // Earliest scheduled refresh time (unix milliseconds) across all received
  // track responses. Server returns MIN ttl per response; SDK keeps the
  // single earliest deadline as the refresh target. Cleared on consolidation
  // refresh and on explicit unsubscribe.
  private _sharedPollSignatureRefreshTargetMs: number | null = null;
  // Guard against concurrent refresh calls — multiple 109 errors during
  // reconnect replay could otherwise trigger overlapping getSignature calls.
  protected _sharedPollSignatureRefreshInFlight: boolean = false;

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
    this.type = this._sharedPoll ? 'shared_poll' : this._map ? 'map' : 'stream';
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

  protected _debouncedPublish(key: string, data: any, isMap: boolean): Promise<PublishResult> {
    const existing = this._debouncePending.get(key);
    if (existing) {
      // Update pending value, mark as dirty, keep existing timer.
      existing.data = data;
      existing.dirty = true;
      return Promise.resolve({});
    }
    // First publish for this key — send immediately, start debounce timer.
    const entry = { data, dirty: false, timer: null as any };
    entry.timer = setTimeout(() => {
      const pending = this._debouncePending.get(key);
      if (!pending || !pending.dirty) {
        // No new data since last send — just clean up.
        this._debouncePending.delete(key);
        return;
      }
      // Send the latest pending value, reset dirty flag, restart timer.
      pending.dirty = false;
      const sendData = pending.data;
      const sendFn = isMap
        ? this._centrifuge.mapPublish(this.channel, key, sendData)
        : this._centrifuge.publish(this.channel, sendData);
      sendFn.catch(() => {});
      // Restart timer for next window.
      pending.timer = setTimeout(() => {
        const p = this._debouncePending.get(key);
        if (!p || !p.dirty) {
          this._debouncePending.delete(key);
          return;
        }
        // Recursive — but in practice debounce windows are short.
        this._debouncePending.delete(key);
        this._debouncedPublish(key, p.data, isMap);
      }, this._debounceMs);
    }, this._debounceMs);
    this._debouncePending.set(key, entry);
    // Send first publish immediately.
    const sendFn = isMap
      ? this._centrifuge.mapPublish(this.channel, key, data)
      : this._centrifuge.publish(this.channel, data);
    return sendFn;
  }

  protected _cancelDebounce(key: string) {
    const existing = this._debouncePending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this._debouncePending.delete(key);
    }
  }

  private _cancelAllDebounce() {
    for (const [, entry] of this._debouncePending) {
      clearTimeout(entry.timer);
    }
    this._debouncePending.clear();
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
    // For map subscriptions, changing the filter invalidates the local state —
    // the next subscribe must go through full STATE phase, not stream recovery.
    if (this._map) {
      this._recover = false;
      this._offset = null;
      this._epoch = null;
    }
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

  protected _methodCall(): Promise<void> {
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

  protected _isSubscribed() {
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
    this._clearSharedPollTrackRetry();
    this._clearSharedPollReplayRetry();
    // Drop the stale refresh target — the replay after reconnect will set a
    // fresh one from the next batch of track responses.
    this._sharedPollSignatureRefreshTargetMs = null;
    // Reset the in-flight guard so refresh can run again after reconnect.
    this._sharedPollSignatureRefreshInFlight = false;
    // NOTE: do NOT clear _sharedPollSignatures or _sharedPollTrackedItems.
    // They persist across reconnects so _sharedPollReplayTrack can re-send
    // tracks using the cached signatures — avoids hitting getSignature for
    // every client during mass reconnect storms. Cleared only on explicit
    // unsubscribe via _setUnsubscribed.
  }

  /** Called on "state invalidated" — unsubscribe code 2502 for this channel,
   *  or connection disconnect code 3014. Clears the token (next subscribe
   *  fetches a fresh one) and the fossil delta base (every subscription type
   *  uses _prevValueMap; a stale base would corrupt decoding of the first
   *  publication after re-subscribe).
   *
   *  Map subscriptions restart from scratch: their recovery position and
   *  materialized-state buffers are dropped so the next subscribe does a full
   *  STATE re-sync.
   *
   *  Stream/shared-poll subscriptions instead reset the recovery position to a
   *  sentinel epoch ("_") the server can never match (offset 0), leaving
   *  _recover untouched: a recoverable subscription then resubscribes with
   *  was_recovering=true, recovered=false (so the app reloads via its existing
   *  recovery-failure path rather than treating it as a brand-new first
   *  subscribe), while a non-recoverable one simply resubscribes. The real
   *  epoch/offset are adopted from the subscribe reply. */
  _invalidateState() {
    this._token = '';
    this._prevValueMap = new Map();
    if (this._map) {
      this._offset = null;
      this._epoch = null;
      this._recover = false;
      this._mapStateBuffer = [];
      this._mapStreamBuffer = [];
      this._mapCursor = '';
      this._mapPhase = null;
    } else {
      this._offset = 0;
      this._epoch = '_';
    }
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

    if (result.publish_debounce) {
      this._debounceMs = result.publish_debounce;
    }

    if (this._sharedPoll) {
      const newEpoch = result.epoch || '';
      if (this._sharedPollEpoch !== '' && this._sharedPollEpoch !== newEpoch) {
        // Epoch changed (server restart, mode change, node switch) —
        // stored synthetic versions are invalid, reset to 0.
        for (const key of this._sharedPollTrackedItems.keys()) {
          this._sharedPollTrackedItems.set(key, 0);
        }
      }
      this._sharedPollEpoch = newEpoch;
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
    // Channel compaction: the numeric channel id is scoped to the connected
    // session — drop it when moving back to subscribing (e.g. on reconnect). The
    // next subscribe reply re-establishes it (the server may reuse the same id).
    this._id = 0;
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

    // Stream getState: call app's callback to load state + get position.
    // Only called when we don't have a saved position (first subscribe or after
    // position reset due to failed recovery). On normal reconnects with a valid
    // saved position, we skip getState and let the server try recovery — getState
    // is only called again if recovery fails (see _setSubscribed).
    if (this._getState && this._offset === null) {
      this._loadStreamState();
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

  /** Load stream position from app via getState callback, then proceed to subscribe
   * with recovery from that position. Called only when _offset is null:
   * - Initial subscribe (no saved position)
   * - After position reset due to failed recovery (see _setSubscribed)
   *
   * NOT called on normal reconnects where the SDK has a saved position — in that
   * case recovery is attempted first, and getState is only invoked if recovery fails.
   *
   * The app's getState callback should:
   * 1. Read cf_stream_top_position (or equivalent) FIRST to capture the stream position
   * 2. Then read its own data from the database/API
   * 3. Render/update the UI
   * 4. Return the captured stream position
   *
   * This order is critical: reading position first ensures it's a lower bound.
   * Recovered publications may overlap with data the app already loaded — this
   * requires idempotent updates or offset-based dedup. */
  private _loadStreamState(): void {
    if (!this._isSubscribing()) { this._inflight = false; return; }

    this._getState!().then(result => {
      if (!this._isSubscribing()) { this._inflight = false; return; }

      // Store stream position from app's source of truth.
      this._offset = result.offset;
      this._epoch = result.epoch;
      this._recover = true;

      // Proceed with normal subscribe flow (token → sendSubscribe).
      if (this._canSubscribeWithoutGettingToken()) {
        this._subscribeWithoutToken();
      } else {
        this._getSubscriptionToken()
          .then(token => this._handleTokenResponse(token))
          .catch(e => this._handleTokenError(e));
      }
    }).catch(e => {
      if (!this._isSubscribing()) { this._inflight = false; return; }
      // Match map subscription error handling: route through _subscribeError
      // which emits error event and schedules resubscribe for temporary errors
      // (code < 100), matching the map's _handleMapSubscribeError pattern.
      this._inflight = false;
      this._subscribeError({
        code: errorCodes.subscriptionGetState,
        message: e?.toString() || 'getState failed',
        temporary: true,
      });
    });
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
    if (this._getState) {
      req.flag |= subscriptionFlags.rejectUnrecovered;
    }

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
    if (error.code === 112 && this._getState) {
      // Unrecoverable position with getState: reset position so next
      // subscribe attempt calls getState() to reload app state from scratch.
      this._offset = null;
      this._epoch = null;
      this._recover = false;
      this._prevValueMap = new Map();
      this._scheduleResubscribe();
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
    // Channel compaction: the numeric channel id is scoped to the active
    // subscription. Drop it so a push for the old id (e.g. one in flight when we
    // unsubscribe) is no longer routed to this subscription.
    this._id = 0;
    this._sharedPollEpoch = '';
    // Explicit unsubscribe — drop all shared-poll state so a subsequent
    // subscribe starts cold. Reconnects use _clearSubscribedState (above)
    // which preserves the signature library and tracked items.
    this._sharedPollSignatures = [];
    this._sharedPollTrackedItems.clear();
    this._sharedPollSignatureRefreshInFlight = false;
    this._sharedPollSignatureRefreshTargetMs = null;
    this._cancelAllDebounce();
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
      // Ignore publications for keys the user is no longer tracking.
      // Common race: SDK replays a cached signature batch on reconnect with
      // some keys the user untracked locally; the chained untrack hasn't
      // reached the server yet, so the server may push updates for those
      // keys in the meantime. Without this guard those updates would
      // re-insert the keys into _sharedPollTrackedItems and emit 'update'
      // events the user already opted out of.
      if (pub.key && !this._sharedPollTrackedItems.has(pub.key)) {
        return;
      }
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
      const errContext: SubscriptionErrorContext = {
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
    // Stream getState option
    if (options.getState) {
      this._getState = options.getState;
      this._recover = true;  // getState implies recovery
    }
    // Map subscription options
    if (options.map === true) {
      this._map = true;
    }
    if (options.mapPageSize !== undefined) {
      this._mapPageSize = options.mapPageSize;
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

  // ============ Shared Poll Internal Helpers ============

  // Send ONE or MORE signature batches in a single sub_refresh frame.
  // Splits across frames when the estimated payload exceeds the wire frame
  // budget — keeps each request well under the 64k Centrifugo frame limit.
  protected _sendTrackRequest(
    batches: Array<{ items: { key: string; version: number }[]; signature: string }>,
    untrackKeys?: string[],
  ): Promise<void> {
    if (batches.length === 0) return Promise.resolve();

    // Estimate ~80 bytes per signature + ~40 bytes per item (key + varint + framing).
    // ~60KB budget leaves headroom for envelope, channel name, and reply.
    const maxBytes = 60000;
    const frames: typeof batches[] = [];
    let current: typeof batches = [];
    // Reserve space for inline untrack keys in the first frame.
    let currentBytes = 100; // envelope baseline
    if (untrackKeys && untrackKeys.length > 0) {
      for (const key of untrackKeys) currentBytes += key.length + 4;
    }
    for (const b of batches) {
      let cost = 100;
      for (const it of b.items) cost += it.key.length + 16;
      if (current.length > 0 && currentBytes + cost > maxBytes) {
        frames.push(current);
        current = [];
        currentBytes = 100;
      }
      current.push(b);
      currentBytes += cost;
    }
    if (current.length > 0) frames.push(current);

    const send = (frame: typeof batches, frameUntrackKeys?: string[]): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const req: any = {
          channel: this.channel,
          type: 1,
          track: frame.map(b => ({
            signature: b.signature,
            items: b.items.map(i => i.version > 0 ? i : { key: i.key }),
          })),
        };
        if (frameUntrackKeys && frameUntrackKeys.length > 0) {
          req.untrack = frameUntrackKeys;
        }
        const msg = { 'sub_refresh': req };
        // @ts-ignore – we are hiding some symbols from public API autocompletion.
        this._centrifuge._call(msg).then(resolveCtx => {
          this._handleTrackResponse(resolveCtx.reply.sub_refresh);
          if (resolveCtx.next) resolveCtx.next();
          resolve();
        }, rejectCtx => {
          if (rejectCtx.next) rejectCtx.next();
          reject(rejectCtx.error);
        });
      });

    // Sequential dispatch: a frame failure stops further frames so the SDK
    // doesn't end up with some frames committed server-side and others not
    // — which would otherwise lead to retry-with-duplicate-publications.
    // Inline untrack keys go only in the first frame.
    return frames.reduce<Promise<void>>(
      (chain, frame, idx) => chain.then(() => send(frame, idx === 0 ? untrackKeys : undefined)),
      Promise.resolve(),
    );
  }

  protected _sendUntrackRequest(keys: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const req: any = {
        channel: this.channel,
        type: 2,
        untrack: keys,
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
    // Track succeeded — reset retry state.
    this._clearSharedPollTrackRetry();
    // Process cached items from server (publications across all batches in the request).
    if (result && result.items && result.items.length > 0) {
      for (const pub of result.items) {
        this._handlePublication(pub);
      }
    }
    // Server returns MIN ttl across all batches in this request. Keep the
    // EARLIEST deadline received across all responses as the refresh target.
    // Refreshing too early is harmless (cheap getSignature call); refreshing
    // too late risks 109 errors mid-replay, so we err earlier.
    if (result && result.expires === true && result.ttl > 0) {
      const targetMs = Date.now() + result.ttl * 1000;
      this._maybeScheduleSharedPollSignatureRefresh(targetMs);
    }
  }

  // Reschedule the consolidating refresh timer if `targetMs` is earlier than
  // the currently scheduled target. No-op when a sooner refresh is already
  // pending. Pass null to clear and reset (e.g. after consolidation succeeded).
  private _maybeScheduleSharedPollSignatureRefresh(targetMs: number | null) {
    if (targetMs === null) {
      this._sharedPollSignatureRefreshTargetMs = null;
      this._clearSharedPollSignatureRefresh();
      return;
    }
    if (!this._isSubscribed()) return;
    if (this._sharedPollSignatureRefreshTargetMs !== null &&
        targetMs >= this._sharedPollSignatureRefreshTargetMs) {
      return; // existing timer fires sooner
    }
    this._sharedPollSignatureRefreshTargetMs = targetMs;
    this._clearSharedPollSignatureRefresh();
    this._sharedPollSignatureRefreshTimeout = setTimeout(
      () => this._sharedPollRefreshSignature(),
      Math.max(0, targetMs - Date.now()),
    );
  }

  private _clearSharedPollSignatureRefresh() {
    if (this._sharedPollSignatureRefreshTimeout !== null) {
      clearTimeout(this._sharedPollSignatureRefreshTimeout);
      this._sharedPollSignatureRefreshTimeout = null;
    }
    this._sharedPollSignatureRefreshAttempts = 0;
    // Do not clear the target here — _maybeScheduleSharedPollSignatureRefresh
    // owns target lifecycle. This helper only stops the timer and resets
    // backoff so the next reschedule starts fresh.
  }

  private _clearSharedPollTrackRetry() {
    if (this._sharedPollTrackRetryTimeout !== null) {
      clearTimeout(this._sharedPollTrackRetryTimeout);
      this._sharedPollTrackRetryTimeout = null;
    }
    this._sharedPollTrackRetryAttempts = 0;
  }

  private _clearSharedPollReplayRetry() {
    if (this._sharedPollReplayRetryTimeout !== null) {
      clearTimeout(this._sharedPollReplayRetryTimeout);
      this._sharedPollReplayRetryTimeout = null;
    }
    this._sharedPollReplayRetryAttempts = 0;
  }

  protected _handleTrackError(err: any) {
    if (!this._isSubscribed()) {
      return;
    }
    this.emit('error', {
      type: 'track',
      channel: this.channel,
      error: err,
    });
    // Error 109 (token expired) on a track command means the signature has
    // expired past the server's grace period. Trigger a refresh — getSignature
    // will issue a fresh consolidated signature that replaces stale ones.
    // The in-flight guard inside _sharedPollRefreshSignature prevents
    // duplicate refresh calls when multiple track retries all hit 109.
    if (err.code === 109) {
      this._sharedPollRefreshSignature();
      return;
    }
    if (err.code < 100 || err.temporary === true) {
      // Temporary error — retry full track replay with backoff.
      this._sharedPollTrackRetryTimeout = setTimeout(
        () => this._sharedPollReplayTrack(),
        backoff(this._sharedPollTrackRetryAttempts++, 1000, 15000)
      );
    }
  }

  // _sharedPollRefreshSignature obtains a fresh consolidated signature
  // covering all currently tracked keys, then replaces the library with the
  // single new entry. Triggered by the TTL timer (server's `expires/ttl`
  // response) and by 109 errors on track commands. The in-flight guard
  // collapses concurrent refresh attempts into one.
  private _sharedPollRefreshSignature() {
    this._clearSharedPollSignatureRefresh();
    if (!this._isSubscribed()) return;
    if (!this._sharedPollGetSignature) return;
    if (this._sharedPollTrackedItems.size === 0) return;
    if (this._sharedPollSignatureRefreshInFlight) return;

    // Reset the global refresh target — the timer that pointed at this
    // moment has already fired, and the in-flight refresh will publish a
    // fresh deadline via the consolidated track response. Resetting here
    // (not after consolidation success) lets any concurrent track() call
    // that lands during getSignature still set a tighter target if its
    // signature is shorter-lived than the consolidated one.
    this._sharedPollSignatureRefreshTargetMs = null;
    this._sharedPollSignatureRefreshInFlight = true;
    const keys = Array.from(this._sharedPollTrackedItems.keys());
    const self = this;

    this._sharedPollGetSignature({ keys }).then(result => {
      self._sharedPollSignatureRefreshInFlight = false;
      if (!self._isSubscribed()) return;

      self._sharedPollSignatureRefreshAttempts = 0;

      // Handle revoked keys (keys not in the returned set).
      const returnedKeys = new Set(result.keys);
      const revokedKeys: string[] = [];
      for (const key of keys) {
        if (!returnedKeys.has(key)) {
          self._sharedPollTrackedItems.delete(key);
          revokedKeys.push(key);
          self.emit('update', {
            channel: self.channel,
            key: key,
            data: null,
            removed: true,
          } as SharedPollUpdateContext);
        }
      }
      // Tell the server to stop tracking revoked keys — otherwise the server
      // keeps broadcasting them and the SDK silently drops the publications.
      if (revokedKeys.length > 0) {
        self._sendUntrackRequest(revokedKeys).catch(err => {
          self.emit('error', { type: 'untrack', channel: self.channel, error: err });
        });
      }

      // Re-track only keys covered by the returned signature.
      const items: { key: string; version: number }[] = [];
      for (const key of result.keys) {
        const version = self._sharedPollTrackedItems.get(key);
        if (version !== undefined) {
          items.push({ key, version });
        }
      }

      // Replace the signature library with the consolidated entry. Keep
      // any entries that cover keys NOT in the consolidation — those keys
      // may have been added via a concurrent track() while getSignature was
      // in flight and their signatures must remain available for reconnect.
      const consolidatedKeySet = new Set(result.keys);
      const uncovered = self._sharedPollSignatures.filter(entry =>
        entry.keys.some(k => self._sharedPollTrackedItems.has(k) && !consolidatedKeySet.has(k))
      );
      // Target was already reset at refresh start; any concurrent track()
      // during getSignature has set its own target if its TTL was tighter.
      // The consolidated track response below will set a target unless
      // something earlier is already in place.
      self._sharedPollSignatures = items.length > 0
        ? [{ keys: result.keys, signature: result.signature }, ...uncovered]
        : uncovered;

      if (items.length === 0) return;

      self._sendTrackRequest([{ items, signature: result.signature }]).catch(err => {
        self._handleTrackError(err);
      });
    }).catch(e => {
      self._sharedPollSignatureRefreshInFlight = false;
      self.emit('error', {
        type: 'signatureRefresh',
        channel: self.channel,
        error: {
          code: errorCodes.sharedPollGetSignature,
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

  // _sharedPollReplayTrack runs after subscribe completes — on initial
  // subscribe AND after every reconnect. It reuses every cached signature
  // in _sharedPollSignatures so that mass reconnects don't trigger mass
  // getSignature calls on the application backend.
  //
  // For each cached batch:
  //   - Build a track command with the batch's ORIGINAL key set (HMAC was
  //     signed over those keys, so the full set must be sent). Versions are
  //     CURRENT per-connection versions, so the server pushes only what's
  //     changed.
  //   - Any keys in the batch that were locally untracked() since the original
  //     track() are sent in the same frame's `untrack` field — the server
  //     validates the full HMAC then removes them immediately, avoiding a
  //     separate round-trip.
  //
  // getSignature is invoked only when there are no cached signatures (e.g.
  // initial subscribe where track(keys) was called without explicit sig).
  // Once a signature is expired beyond the server's grace period, the next
  // track command returns error 109 — _handleTrackError then triggers
  // _sharedPollRefreshSignature for a fresh consolidated signature.
  private _sharedPollReplayTrack() {
    if (!this._isSubscribed()) return;
    if (this._sharedPollTrackedItems.size === 0 && this._sharedPollSignatures.length === 0) return;

    // Phase 1: replay every cached signature batch in a SINGLE sub_refresh
    // frame (multi-batch wire format). The server validates each batch's
    // HMAC independently and merges the response. All-or-nothing semantics:
    // one failed signature → the whole replay fails and _handleTrackError
    // drives a consolidating refresh.
    //
    // After this block `coveredKeys` is the set of currently-tracked keys
    // that already have a signature in the library — any tracked key not
    // in this set needs a fresh getSignature in Phase 2.
    const coveredKeys = new Set<string>();
    const replayBatches: Array<{ items: SharedPollTrackItem[]; signature: string }> = [];
    const allUntrackedInReplay: string[] = [];
    for (const entry of this._sharedPollSignatures) {
      // Items: ORIGINAL key set + current per-connection versions. Keys that
      // were untracked locally still go in items (HMAC needs the full batch);
      // a single chained untrack runs after the multi-batch track resolves
      // to converge server-side state.
      const items: SharedPollTrackItem[] = entry.keys.map(key => ({
        key,
        version: this._sharedPollTrackedItems.get(key) ?? 0,
      }));
      replayBatches.push({ items, signature: entry.signature });
      for (const k of entry.keys) {
        if (this._sharedPollTrackedItems.has(k)) {
          coveredKeys.add(k);
        } else {
          allUntrackedInReplay.push(k);
        }
      }
    }
    if (replayBatches.length > 0) {
      // Pass untracked keys inline — server validates HMAC over the full batch
      // then immediately removes the stale keys in the same handler, eliminating
      // the previous two-round-trip track→untrack sequence.
      this._sendTrackRequest(replayBatches, allUntrackedInReplay).catch(err => {
        this._handleTrackError(err);
      });
    }

    // Phase 2: any tracked items NOT covered by a cached signature need
    // a fresh getSignature. This handles two cases:
    //   - initial subscribe where track(keys) was called without explicit
    //     sig (library starts empty, all keys uncovered);
    //   - mixed track(keys) + track(items, sig) before subscribe — the
    //     explicit batch sits in the library, but auto-tracked keys still
    //     need a signature.
    const uncoveredKeys: string[] = [];
    for (const key of this._sharedPollTrackedItems.keys()) {
      if (!coveredKeys.has(key)) uncoveredKeys.push(key);
    }
    if (uncoveredKeys.length === 0) return;

    if (!this._sharedPollGetSignature) {
      this.emit('error', {
        type: 'track',
        channel: this.channel,
        error: { code: errorCodes.sharedPollGetSignature, message: 'getSignature callback required for tracked keys without an explicit signature' },
      });
      return;
    }
    const self = this;

    this._sharedPollGetSignature({ keys: uncoveredKeys }).then(result => {
      if (!self._isSubscribed()) return;
      self._clearSharedPollReplayRetry();

      // Handle revoked keys (keys we asked about that the backend didn't authorize).
      const returnedKeys = new Set(result.keys);
      const revokedKeys: string[] = [];
      for (const key of uncoveredKeys) {
        if (!returnedKeys.has(key)) {
          self._sharedPollTrackedItems.delete(key);
          revokedKeys.push(key);
          self.emit('update', {
            channel: self.channel,
            key: key,
            data: null,
            removed: true,
          } as SharedPollUpdateContext);
        }
      }
      if (revokedKeys.length > 0) {
        self._sendUntrackRequest(revokedKeys).catch(err => {
          self.emit('error', { type: 'untrack', channel: self.channel, error: err });
        });
      }

      const items: SharedPollTrackItem[] = [];
      for (const key of result.keys) {
        const version = self._sharedPollTrackedItems.get(key);
        if (version !== undefined) {
          items.push({ key, version });
        }
      }
      if (items.length === 0) return;

      // Cache the obtained signature for subsequent reconnect replays.
      self._sharedPollSignatures.push({
        keys: result.keys,
        signature: result.signature,
      });
      self._sendTrackRequest([{ items, signature: result.signature }]).catch(err => {
        self._handleTrackError(err);
      });
    }).catch(e => {
      self.emit('error', {
        type: 'signatureRefresh',
        channel: self.channel,
        error: {
          code: errorCodes.sharedPollGetSignature,
          message: e !== undefined ? e.toString() : ''
        }
      });
      // Replay-getSignature retry uses its OWN backoff state — separate from
      // the refresh timer so a stuck replay can't delay the next TTL refresh.
      self._sharedPollReplayRetryTimeout = setTimeout(
        () => self._sharedPollReplayTrack(),
        backoff(self._sharedPollReplayRetryAttempts++, 5000, 30000)
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
      this._prevValueMap = new Map();
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

    // Validate epoch - if changed, we need to restart
    if (this._epoch && result.epoch && this._epoch !== result.epoch) {
      this._debug('map subscribe: epoch changed during stream, restarting');
      this._mapStateBuffer = [];
      this._mapStreamBuffer = [];
      this._epoch = null;
      this._offset = null;
      this._prevValueMap = new Map();
      this._mapPhase = MapPhase.State;
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
      this._epoch = null;
      this._offset = null;
      this._prevValueMap = new Map();
      this._inflight = true;
      this._mapPhase = MapPhase.State;
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

    // Set publish debounce from subscribe result.
    if (result.publish_debounce) {
      this._debounceMs = result.publish_debounce;
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
    // Skipped on successful recovery (app already has rendered state; stream
    // catch-up is emitted as individual update events).
    if (!ctx.recovered) {
      if (this._mapStreamBuffer.length > 0) {
        // Apply stream catch-up buffer to state by key (last value wins, removed deletes).
        // Produces a single sync snapshot that reflects state as of LIVE transition.
        const stateMap = new Map<string, MapUpdateContext>();
        for (const entry of this._mapStateBuffer) {
          stateMap.set(entry.key, entry);
        }
        for (const entry of this._mapStreamBuffer) {
          if (entry.removed) {
            stateMap.delete(entry.key);
          } else {
            stateMap.set(entry.key, entry);
          }
        }
        this._mapStateBuffer = Array.from(stateMap.values());
        this._mapStreamBuffer = []; // Already applied — don't emit as updates.
      }
      this.emit('sync', { entries: this._mapStateBuffer });
    }

    // Flush remaining stream buffer as publication and update events.
    // On recovery (sync skipped above) — app already has state and just needs
    // incremental changes.
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
    if (this._tagsFilter) req.tf = this._tagsFilter;
    if (this._delta) req.delta = this._delta;
    req.flag = subscriptionFlags.channelCompaction;

    // STATE phase
    if (phase === MapPhase.State) {
      if (this._mapPageSize > 0) req.limit = this._mapPageSize;
      if (cursor) req.cursor = cursor;
      // Epoch validation after first page
      if (this._epoch) {
        req.offset = this._offset;
        req.epoch = this._epoch;
      } else {
        // First request of the flow — include custom data.
        if (this._data) req.data = this._data;
      }
    }

    // STREAM phase
    if (phase === MapPhase.Stream) {
      if (this._mapPageSize > 0) req.limit = this._mapPageSize;
      req.offset = this._offset;
      req.epoch = this._epoch;
      if (this._recover) {
        req.recover = true;
        // First request of the flow (skipped STATE) — include custom data for authorization.
        if (this._mapStreamBuffer.length === 0) {
          if (this._data) req.data = this._data;
        }
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

/** Stream subscription with publish/history methods. */
export class Subscription extends BaseSubscription {
  /** Publish data to the channel. */
  async publish(data: any): Promise<PublishResult> {
    await this._methodCall();
    // Debounce per channel (key = "" for stream publishes).
    if (this._debounceMs > 0) {
      return this._debouncedPublish('', data, false);
    }
    return this._centrifuge.publish(this.channel, data);
  }

  /** history for a channel. By default it does not return publications (only current
   *  StreamPosition data) – provide an explicit limit > 0 to load publications.*/
  async history(opts: HistoryOptions): Promise<HistoryResult> {
    await this._methodCall();
    return this._centrifuge.history(this.channel, opts);
  }
}

/** Map subscription with publish/remove methods. */
export class MapSubscription extends BaseSubscription {
  /** Publish data to a key. */
  async publish(key: string, data: any): Promise<PublishResult> {
    await this._methodCall();
    if (this._debounceMs > 0) {
      return this._debouncedPublish(key, data, true);
    }
    return this._centrifuge.mapPublish(this.channel, key, data);
  }
  /** Remove a key. */
  async remove(key: string): Promise<PublishResult> {
    await this._methodCall();
    // Cancel any pending debounced publish for this key.
    this._cancelDebounce(key);
    return this._centrifuge.mapRemove(this.channel, key);
  }
}

/** Shared poll subscription with track/untrack/trackedKeys. */
export class SharedPollSubscription extends BaseSubscription {
  /** Track items in a shared poll subscription.
   *
   * Overloads:
   * - `track(keys: string[])` — pass key names only (version defaults to 0).
   *   Requires `getSignature` callback in subscription options. The SDK
   *   automatically obtains a signature before sending the track request.
   * - `track(items: SharedPollTrackItem[], signature: string)` — pass items
   *   with explicit versions and a pre-computed HMAC signature.
   *
   * Items are stored in local state immediately. If subscribed, the track request
   * is sent right away. If not yet subscribed, items will be sent via replay
   * (with a fresh signature from getSignature) after subscribe completes.
   *
   * **Fire-and-forget** (similar to subscribe/unsubscribe): returns void and never
   * throws for in-flight failures. Subscribe to the `error` event to observe
   * failures: `type: 'track'` covers both the server-side track request and
   * the `getSignature` callback when using `track(keys)`. Server-revoked keys
   * arrive as synthetic `update` events with `removed: true`. */
  track(keysOrItems: string[] | SharedPollTrackItem[], signature?: string): void {
    if (keysOrItems.length === 0) {
      return; // Nothing to track — avoid wasteful getSignature call.
    }

    let items: SharedPollTrackItem[];
    const sig: string | undefined = signature;

    if (typeof keysOrItems[0] === 'string') {
      const keys = keysOrItems as string[];
      items = keys.map(k => ({ key: k, version: 0 }));
    } else {
      items = keysOrItems as SharedPollTrackItem[];
    }

    // Update per-connection tracked items (use max(existing, new) so a stale
    // page load can't downgrade a version already advanced by a publication).
    for (const item of items) {
      const existing = this._sharedPollTrackedItems.get(item.key);
      if (existing === undefined || item.version > existing) {
        this._sharedPollTrackedItems.set(item.key, item.version);
      }
    }

    if (sig !== undefined) {
      // Explicit signature path — append to library and (if subscribed) send.
      this._sharedPollSignatures.push({
        keys: items.map(i => i.key),
        signature: sig,
      });
      if (this._isSubscribed()) {
        this._sendTrackRequest([{ items, signature: sig }]).catch(err => {
          this._handleTrackError(err);
        });
      }
      // If not subscribed yet, _sharedPollReplayTrack will fire after subscribe.
      return;
    }

    // Auto-obtain signature via getSignature callback.
    if (!this._sharedPollGetSignature) {
      this.emit('error', {
        type: 'track',
        channel: this.channel,
        error: { code: errorCodes.sharedPollGetSignature, message: 'getSignature callback required for track(keys)' },
      });
      return;
    }

    if (!this._isSubscribed()) {
      // Defer the getSignature call until after subscribe — _sharedPollReplayTrack
      // will obtain a signature covering all tracked keys at once.
      return;
    }

    const keys = items.map(i => i.key);
    this._sharedPollGetSignature({ keys }).then(result => {
      if (!this._isSubscribed()) return;
      // Handle revoked keys.
      const returnedKeys = new Set(result.keys);
      const revokedKeys: string[] = [];
      for (const key of keys) {
        if (!returnedKeys.has(key)) {
          this._sharedPollTrackedItems.delete(key);
          revokedKeys.push(key);
          this.emit('update', {
            channel: this.channel,
            key: key,
            data: null,
            removed: true,
          } as SharedPollUpdateContext);
        }
      }
      // Server may already be tracking some of these from a prior track() with
      // a different signature — send untrack so it stops broadcasting them.
      if (revokedKeys.length > 0) {
        this._sendUntrackRequest(revokedKeys).catch(err => {
          this.emit('error', { type: 'untrack', channel: this.channel, error: err });
        });
      }
      // Track authorized keys.
      const authorizedItems: { key: string; version: number }[] = [];
      for (const key of result.keys) {
        const version = this._sharedPollTrackedItems.get(key);
        if (version !== undefined) {
          authorizedItems.push({ key, version });
        }
      }
      if (authorizedItems.length === 0) return;
      // Cache the obtained signature for reconnect replay.
      this._sharedPollSignatures.push({
        keys: result.keys,
        signature: result.signature,
      });
      this._sendTrackRequest([{ items: authorizedItems, signature: result.signature }]).catch(err => {
        this._handleTrackError(err);
      });
    }).catch(e => {
      this.emit('error', {
        type: 'track',
        channel: this.channel,
        error: { code: errorCodes.sharedPollGetSignature, message: e !== undefined ? e.toString() : 'getSignature failed' },
      });
    });
  }

  /** Stop tracking specific keys in a shared poll subscription.
   * Keys are removed from local state immediately. If subscribed, the untrack
   * request is sent right away. If not yet subscribed, the keys simply won't
   * be included in the replay after subscribe completes.
   *
   * **Fire-and-forget** (similar to subscribe/unsubscribe): returns void and never
   * throws for in-flight failures. Subscribe to the `error` event with
   * `type: 'untrack'` to observe failures of the untrack request. */
  untrack(keys: string[]): void {
    for (const key of keys) {
      this._sharedPollTrackedItems.delete(key);
    }
    // Drop any signature entries whose ENTIRE key set is now untracked —
    // they contribute nothing to reconnect replays and would grow unboundedly
    // in long-running sessions with many track/untrack cycles. Entries where
    // at least one key is still tracked are kept intact: pruning them would
    // cause those live keys to lose their signature on the next reconnect.
    this._sharedPollSignatures = this._sharedPollSignatures.filter(entry =>
      entry.keys.some(k => this._sharedPollTrackedItems.has(k))
    );
    if (this._isSubscribed()) {
      this._sendUntrackRequest(keys).catch(err => {
        this.emit('error', {
          type: 'untrack',
          channel: this.channel,
          error: err,
        });
      });
    }
  }

  /** Returns the set of currently tracked keys in a shared poll subscription. */
  trackedKeys(): Set<string> {
    return new Set(this._sharedPollTrackedItems.keys());
  }
}