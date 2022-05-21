import { Subscription } from './subscription';
import { State, Options, ClientEvents, TypedEventEmitter, RpcResult, SubscriptionOptions, HistoryOptions, HistoryResult, PublishResult, PresenceResult, PresenceStatsResult, SubscribedContext, TransportEndpoint } from './types';
declare const Centrifuge_base: new () => TypedEventEmitter<ClientEvents>;
/** Centrifuge is a Centrifuge/Centrifugo bidirectional client. */
export declare class Centrifuge extends Centrifuge_base {
    state: State;
    private _endpoint;
    private _emulation;
    private _transports;
    private _currentTransportIndex;
    private _triedAllTransports;
    private _transportWasOpen;
    private _transport?;
    private _transportClosed;
    private _reconnectTimeout?;
    private _reconnectAttempts;
    private _client;
    private _session;
    private _node;
    private _subs;
    private _serverSubs;
    private _commandId;
    private _commands;
    private _batching;
    private _refreshRequired;
    private _refreshTimeout?;
    private _callbacks;
    private _token?;
    private _dispatchPromise;
    private _serverPing;
    private _serverPingTimeout?;
    private _sendPong;
    private _promises;
    private _promiseId;
    /** @internal */
    _debugEnabled: boolean;
    /** @internal */
    _config: Options;
    /** @internal */
    _encoder: any;
    /** @internal */
    _decoder: any;
    static State: {
        Disconnected: string;
        Connecting: string;
        Connected: string;
    };
    static SubscriptionState: {
        Unsubscribed: string;
        Subscribing: string;
        Subscribed: string;
    };
    /** Constructs Centrifuge client. Call connect() method to start connecting. */
    constructor(endpoint: string | Array<TransportEndpoint>, options?: Partial<Options>);
    /** newSubscription allocates new Subscription to a channel. Since server only allows
     * one subscription per channel per client this method throws if client already has
     * channel subscription in internal registry.
     * */
    newSubscription(channel: string, options?: Partial<SubscriptionOptions>): Subscription;
    /** getSubscription returns Subscription if it's registered in the internal
     * registry or null. */
    getSubscription(channel: string): Subscription | null;
    /** removeSubscription allows removing Subcription from the internal registry. Subscrption
     * must be in unsubscribed state. */
    removeSubscription(sub: Subscription | null): void;
    /** Get a map with all current client-side subscriptions. */
    subscriptions(): Map<string, Subscription>;
    /** ready returns a Promise which resolves upon client goes to Connected
     * state and rejects in case of client goes to Disconnected or Failed state.
     * Users can provide optional timeout in milliseconds. */
    ready(timeout?: number): Promise<unknown>;
    /** connect to a server. */
    connect(): void;
    /** disconnect from a server. */
    disconnect(): void;
    /** send asynchronous data to a server (without any response from a server
     * expected, see rpc method if you need response). */
    send(data: any): Promise<void>;
    /** rpc to a server - i.e. a call which waits for a response with data. */
    rpc(method: string, data: any): Promise<RpcResult>;
    /** publish data to a channel. */
    publish(channel: string, data: any): Promise<PublishResult>;
    /** history of a channel. */
    history(channel: string, options?: HistoryOptions): Promise<HistoryResult>;
    /** presence for a channel. */
    presence(channel: string): Promise<PresenceResult>;
    /** presence stats for a channel. */
    presenceStats(channel: string): Promise<PresenceStatsResult>;
    /** start command batching (collect into temporary buffer without sending to a server)
     * until stopBatching called.*/
    startBatching(): void;
    /** stop batching commands and flush collected commands to the
     * network (all in one request/frame).*/
    stopBatching(): void;
    /** @internal */
    _debug(...args: any[]): void;
    /** @internal */
    private _setFormat;
    /** @internal */
    protected _formatOverride(_format: string): boolean;
    private _configure;
    private _setState;
    private _isDisconnected;
    private _isConnecting;
    private _isConnected;
    private _nextCommandId;
    private _getReconnectDelay;
    private _clearOutgoingRequests;
    private _clearConnectedState;
    private _handleWriteError;
    private _transportSendCommands;
    private _initializeTransport;
    private _sendConnect;
    private _startReconnecting;
    private _connectError;
    private _constructConnectCommand;
    private _getHistoryRequest;
    private _methodCall;
    private _callPromise;
    private _dataReceived;
    private _dispatchSynchronized;
    private _dispatchReply;
    /** @internal */
    _call(cmd: any): Promise<unknown>;
    private _callConnectFake;
    private _startConnecting;
    private _disconnect;
    private _failUnauthorized;
    private _getToken;
    private _refresh;
    private _refreshError;
    private _getRefreshRetryDelay;
    private _refreshResponse;
    /** @internal */
    _subscribe(sub: Subscription): void;
    private _sendSubscribe;
    /** @internal */
    _sendSubRefresh(sub: Subscription, token: string): void;
    private _removeSubscription;
    /** @internal */
    _unsubscribe(sub: Subscription): void;
    private _getSub;
    private _isServerSub;
    private _connectResponse;
    private _processServerSubs;
    private _clearRefreshTimeout;
    private _clearReconnectTimeout;
    private _clearServerPingTimeout;
    private _waitServerPing;
    private _subscribeError;
    /** @internal */
    _getSubscribeContext(channel: string, result: any): SubscribedContext;
    private _subscribeResponse;
    private _handleReply;
    private _handleJoin;
    private _handleLeave;
    private _handleUnsubscribe;
    private _handleSubscribe;
    private _handleDisconnect;
    /** @internal */
    _getPublicationContext(channel: string, pub: any): any;
    /** @internal */
    _getJoinLeaveContext(clientInfo: any): any;
    private _handlePublication;
    private _handleMessage;
    private _handleServerPing;
    private _handlePush;
    private _flush;
    private _createErrorObject;
    private _registerCall;
    private _addCommand;
    private _nextPromiseId;
    private _resolvePromises;
    private _rejectPromises;
}
export {};
