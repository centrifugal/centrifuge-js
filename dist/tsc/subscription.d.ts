import { Centrifuge } from './centrifuge';
import { HistoryOptions, HistoryResult, PresenceResult, PresenceStatsResult, PublishResult, SubscriptionEvents, SubscriptionOptions, SubscriptionState, TypedEventEmitter } from './types';
declare const Subscription_base: new () => TypedEventEmitter<SubscriptionEvents>;
/** Subscription to a channel */
export declare class Subscription extends Subscription_base {
    channel: string;
    state: SubscriptionState;
    private _centrifuge;
    private _promises;
    private _resubscribeTimeout?;
    private _refreshTimeout?;
    /** @internal */
    _token: string | null;
    private _getToken;
    private _minResubscribeDelay;
    private _maxResubscribeDelay;
    private _recover;
    private _offset;
    private _epoch;
    private _resubscribeAttempts;
    private _promiseId;
    /** @internal */
    _data: any | null;
    /** @internal */
    _recoverable: boolean;
    /** @internal */
    _positioned: boolean;
    constructor(centrifuge: Centrifuge, channel: string, options?: Partial<SubscriptionOptions>);
    ready(timeout?: number): Promise<unknown>;
    subscribe(): void;
    unsubscribe(): void;
    publish(data: any): Promise<PublishResult>;
    presence(): Promise<PresenceResult>;
    presenceStats(): Promise<PresenceStatsResult>;
    history(opts: HistoryOptions): Promise<HistoryResult>;
    private _methodCall;
    private _nextPromiseId;
    /** @internal */
    _needRecover(): boolean;
    private _isUnsubscribed;
    /** @internal */
    _isSubscribing(): boolean;
    /** @internal */
    _isSubscribed(): boolean;
    private _setState;
    /** @internal */
    _usesToken(): boolean;
    private _clearSubscribingState;
    private _clearSubscribedState;
    /** @internal */
    _setSubscribed(result: any): void;
    /** @internal */
    _setSubscribing(code: any, reason: any): void;
    /** @internal */
    _setUnsubscribed(code: any, reason: any, sendUnsubscribe: any): void;
    /** @internal */
    _handlePublication(pub: any): void;
    /** @internal */
    _handleJoin(join: any): void;
    /** @internal */
    _handleLeave(leave: any): void;
    private _resolvePromises;
    private _rejectPromises;
    /** @internal */
    _scheduleResubscribe(): void;
    /** @internal */
    _subscribeError(err: any): void;
    private _getResubscribeDelay;
    private _setOptions;
    /** @internal */
    _getOffset(): number;
    /** @internal */
    _getEpoch(): string;
    private _clearRefreshTimeout;
    private _clearResubscribeTimeout;
    /** @internal */
    _getSubscriptionToken(): Promise<string>;
    /** @internal */
    private _refresh;
    /** @internal */
    _refreshResponse(result: any): void;
    /** @internal */
    _refreshError(err: any): void;
    private _getRefreshRetryDelay;
    /** @internal */
    _failUnauthorized(): void;
}
export {};
