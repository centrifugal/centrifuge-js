// Type definitions for centrifuge 3.*.*

export = Centrifuge;

type EventMap = {
  [key: string]: (...args: any[]) => void
}

declare class TypedEventEmitter<Events extends EventMap> {
  addListener<E extends keyof Events>(event: E, listener: Events[E]): this
  on<E extends keyof Events>(event: E, listener: Events[E]): this
  once<E extends keyof Events>(event: E, listener: Events[E]): this
  prependListener<E extends keyof Events>(event: E, listener: Events[E]): this
  prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this
  off<E extends keyof Events>(event: E, listener: Events[E]): this
  removeAllListeners<E extends keyof Events>(event?: E): this
  removeListener<E extends keyof Events>(event: E, listener: Events[E]): this
  emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): boolean
  rawListeners<E extends keyof Events>(event: E): Events[E][]
  listeners<E extends keyof Events>(event: E): Events[E][]
  listenerCount<E extends keyof Events>(event: E): number
}

declare class Centrifuge extends TypedEventEmitter<Centrifuge.Events> {
  state: Centrifuge.State;
  constructor(endpoint: string | Array<Centrifuge.TransportEndpoint>, options?: Centrifuge.Options);
  newSubscription(channel: string, options?: Centrifuge.SubscriptionOptions): Centrifuge.Subscription;
  getSubscription(channel: string): Centrifuge.Subscription | null;
  removeSubscription(sub: Centrifuge.Subscription): void;
  subscriptions(): Map<string, Centrifuge.Subscription>;
  connect(): void;
  disconnect(): void;
  close(): void;
  send(data: any): Promise<void>;
  rpc(method: string, data: any): Promise<Centrifuge.RpcResult>;
  publish(channel: string, data: any): Promise<Centrifuge.PublishResult>;
  history(channel: string, options?: Centrifuge.HistoryOptions): Promise<Centrifuge.HistoryResult>;
  presence(channel: string): Promise<Centrifuge.PresenceResult>;
  presenceStats(channel: string): Promise<Centrifuge.PresenceStatsResult>;
  startBatching(): void;
  stopBatching(): void;
  connected(timeout?: number): Promise<void>;
}

declare namespace Centrifuge {

  enum State {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Failed = "failed",
  }

  enum FailReason {
    Server = "server",
    ConnectFailed = "connect failed",
    RefreshFailed = "refresh failed",
    Unauthorized = "unauthorized",
    Unrecoverable = "unrecoverable",
  }

  type Events = {
    state: (ctx: StateContext) => void;
    connect: (ctx: ConnectContext) => void;
    disconnect: (ctx: DisconnectContext) => void;
    fail: (ctx: FailContext) => void;
    error: (ctx: ConnectErrorContext) => void;

    // Server-side subscription events.
    publication: (ctx: PublicationContext) => void;
    join: (ctx: JoinLeaveContext) => void;
    leave: (ctx: JoinLeaveContext) => void;
    subscribe: (ctx: SubscribeContext) => void;
    unsubscribe: (ctx: UnsubscribeContext) => void;
  }

  enum SubscriptionState {
    Unsubscribed = "unsubscribed",
    Subscribing = "subscribing",
    Subscribed = "subscribed",
    Failed = "failed"
  }

  enum SubscriptionFailReason {
    ClientFailed = "client failed",
    SubscribeFailed = "subscribe failed",
    RefreshFailed = "refresh failed",
    Unauthorized = "unauthorized",
    Unrecoverable = "unrecoverable",
  }

  type SubscriptionEvents = {
    state: (ctx: SubscriptionStateContext) => void;
    subscribe: (ctx: SubscribeContext) => void;
    unsubscribe: (ctx: UnsubscribeContext) => void;
    fail: (ctx: SubscriptionFailContext) => void;
    error: (ctx: SubscribeErrorContext) => void;
    publication: (ctx: PublicationContext) => void;
    join: (ctx: JoinLeaveContext) => void;
    leave: (ctx: JoinLeaveContext) => void;
  }

  export interface TransportEndpoint {
    transport: string;
    endpoint: string;
  }

  export interface Options {
    protocol?: 'json' | 'protobuf';
    debug?: boolean;
    token?: string;
    data?: any;
    name?: string;
    version?: string;
    minReconnectDelay?: number;
    maxReconnectDelay?: number;
    timeout?: number;
    maxServerPingDelay?: number;
    privateChannelPrefix?: string;
    websocket?: any;
    fetch?: any,
    readableStream?: any,
    eventsource?: any,
    sockjs?: any;
    sockjsServer?: string;
    sockjsTimeout?: number;
    sockjsTransports?: string[];
    httpStreamRequestMode?: string;
    emulationEndpoint?: string;
    emulationRequestMode?: string;
    getConnectionToken?: (ctx: ConnectionTokenContext) => Promise<string>;
    getSubscriptionToken?: (ctx: SubscriptionTokenContext) => Promise<string>;
  }

  export interface StateContext {
    newState: State;
    oldState: State;
  }

  export interface ConnectContext {
    client: string;
    transport: string;
    data?: any;
  }

  export interface ConnectErrorContext {
    code: number;
    message: string;
    closeEvent?: any;
  }

  export interface DisconnectContext {
    code: number;
    reason: string;
    reconnect: boolean;
  }

  export interface FailContext {
    reason: FailReason;
  }

  export interface CloseContext {
  }

  export class Subscription extends TypedEventEmitter<SubscriptionEvents> {
    channel: string;
    state: SubscriptionState;
    subscribe(options?: SubscribeOptions): void;
    unsubscribe(): void;
    publish(data: any): Promise<PublishResult>;
    history(options?: HistoryOptions): Promise<HistoryResult>;
    presence(): Promise<PresenceResult>;
    presenceStats(): Promise<PresenceStatsResult>;
    cancel(): void;
    subscribed(timeout?: number): Promise<void>;
  }

  export interface SubscriptionFailContext {
    channel: string;
    reason: SubscriptionFailReason;
  }

  export interface PublicationContext {
    channel: string;
    data: any;
    info?: ClientInfo;
    offset?: number;
    tags?: Map<string, string>;
  }

  export interface ClientInfo {
    client: string;
    user: string;
    connInfo?: any;
    chanInfo?: any;
  }

  export interface JoinLeaveContext {
    channel: string;
    info: ClientInfo;
  }

  export interface SubscriptionStateContext {
    channel: string;
    newState: SubscriptionState;
    oldState: SubscriptionState;
  }

  export interface SubscribeContext {
    channel: string;
    streamPosition?: StreamPosition;
    data?: any;
  }

  export interface SubscribeErrorContext {
    channel: string;
    code: number;
    message: string;
  }

  export interface UnsubscribeContext {
    channel: string;
  }

  export interface ConnectionTokenContext {
  }

  export interface SubscriptionTokenContext {
    client: string;
    channel: string;
  }

  export interface PublishResult {
  }

  export interface RpcResult {
    data: any;
  }

  export interface PresenceResult {
    clients: Map<string, ClientInfo>;
  }

  export interface PresenceStatsResult {
    numClients: number;
    numUsers: number;
  }

  export interface HistoryResult {
    publications: PublicationContext[];
    offset: number;
    epoch: string;
  }

  export interface HistoryOptions {
    limit?: number;
    since?: StreamPosition;
    reverse?: boolean;
  }

  export interface SubscribeOptions {
    token?: string;
    tokenUniquePerConnection?: boolean;
    getSubscriptionToken?: (ctx: SubscriptionTokenContext) => Promise<string>
    data?: any;
    since?: StreamPosition;
    minResubscribeDelay?: number;
    maxResubscribeDelay?: number;
  }

  export interface SubscriptionOptions extends SubscribeOptions { }

  export interface StreamPosition {
    offset: number;
    epoch: string;
  }
}
