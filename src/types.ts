/** EventMap */
export type EventMap = {
  [key: string]: (...args: any[]) => void
}

/** Typed event emitter. */
export interface TypedEventEmitter<Events extends EventMap> {
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
}

/** Client events which can be emitted. */
export type ClientEvents = {
  state: (ctx: StateContext) => void;
  connecting: (ctx: ConnectingContext) => void;
  connected: (ctx: ConnectedContext) => void;
  disconnected: (ctx: DisconnectedContext) => void;
  message: (ctx: MessageContext) => void;
  error: (ctx: ErrorContext) => void;
  publication: (ctx: PublicationContext) => void;
  join: (ctx: JoinContext) => void;
  leave: (ctx: LeaveContext) => void;
  subscribed: (ctx: ServerSubscribedContext) => void;
  subscribing: (ctx: ServerSubscribingContext) => void;
  unsubscribed: (ctx: ServerUnsubscribedContext) => void;
}

/** State of client */
export enum State {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected"
}

/** Events of client */
export type SubscriptionEvents = {
  state: (ctx: SubscriptionStateContext) => void;
  subscribing: (ctx: SubscribingContext) => void;
  subscribed: (ctx: SubscribedContext) => void;
  unsubscribed: (ctx: UnsubscribedContext) => void;
  error: (ctx: SubscriptionErrorContext) => void;
  publication: (ctx: PublicationContext) => void;
  join: (ctx: JoinContext) => void;
  leave: (ctx: LeaveContext) => void;
}

/** State of Subscription */
export enum SubscriptionState {
  Unsubscribed = "unsubscribed",
  Subscribing = "subscribing",
  Subscribed = "subscribed"
}

/** TransportEndpoint allows configuring transport when using fallback mode */
export interface TransportEndpoint {
  /** transport to use */
  transport: 'websocket' | 'http_stream' | 'sse' | 'sockjs';
  /** endpoint for a selected transport type */
  endpoint: string;
}

/** Options for Centrifuge client. */
export interface Options {
  /** select protocol to use. Note that to use Protobuf protocol you need to use CentrifugeProtobuf class. */
  protocol: 'json' | 'protobuf';
  /** allows enabling debug mode */
  debug: boolean;
  /** allows setting connection token (JWT) */
  token: string | null;
  /** allows setting function to get/refresh connection token */
  getToken: null | ((ctx: ConnectionTokenContext) => Promise<string>);
  /** data to send to a sever with connect command */
  data: any | null;
  /** name of client - it's not a unique name of each connection, it's sth to identify from where client connected */
  name: string;
  /** version of client */
  version: string;
  /** minimum delay between reconnect attemts */
  minReconnectDelay: number;
  /** maximum delay between reconnect attemts */
  maxReconnectDelay: number;
  /** timeout for operations */
  timeout: number;
  /** maximum delay of server pings to detect broken connection */
  maxServerPingDelay: number;
  /** provide custom WebSocket constructor, useful for NodeJS env */
  websocket: any | null;
  /** provide shim for fetch implementation */
  fetch: any | null,
  /** provide shim for ReadableStream */
  readableStream: any | null,
  /** provide shim for EventSource object */
  eventsource: any | null,
  /** provide shim for SockJS object */
  sockjs: any | null;
  /** set sockjs server option */
  sockjsServer: string | null;
  /** set sockjs timeout option */
  sockjsTimeout: number | null;
  /** set custom transports to enable in SockJS */
  sockjsTransports: string[];
  /** request mode in http stream request */
  httpStreamRequestMode: string;
  /** which emulation endpoint to use */
  emulationEndpoint: string;
  /** request mode in emulation request */
  emulationRequestMode: string;
}

export interface StateContext {
  newState: State;
  oldState: State;
}

export interface ConnectedContext {
  client: string;
  transport: string;
  data?: any;
}

export interface ErrorContext {
  type: string;
  error: Error;
  transport?: string;
}

export interface Error {
  code: number;
  message: string;
}

export interface ConnectingContext {
  code: number;
  reason: string;
}

export interface DisconnectedContext {
  code: number;
  reason: string;
}

export interface MessageContext {
  data: any;
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

export interface JoinContext {
  channel: string;
  info: ClientInfo;
}

export interface LeaveContext {
  channel: string;
  info: ClientInfo;
}

export interface SubscriptionStateContext {
  channel: string;
  newState: SubscriptionState;
  oldState: SubscriptionState;
}

export interface ServerSubscribedContext {
  channel: string;
  recoverable: boolean;
  positioned: boolean;
  streamPosition?: StreamPosition;
  wasRecovering: boolean;
  recovered: boolean;
  data?: any;
}

export interface SubscribedContext {
  channel: string;
  recoverable: boolean;
  positioned: boolean;
  streamPosition?: StreamPosition;
  wasRecovering: boolean;
  recovered: boolean;
  data?: any;
}

export interface SubscriptionErrorContext {
  channel: string;
  type: string;
  error: Error;
}

export interface UnsubscribedContext {
  channel: string;
  code: number;
  reason: string;
}

export interface ServerUnsubscribedContext {
  channel: string;
}

export interface SubscribingContext {
  channel: string;
  code: number;
  reason: string;
}

export interface ServerSubscribingContext {
  channel: string;
}

export interface ConnectionTokenContext {
}

export interface SubscriptionTokenContext {
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

/** SubscriptionOptions can customize Subscription. */
export interface SubscriptionOptions {
  data: any | null;
  token: string | null;
  getToken: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  since: StreamPosition | null;
  minResubscribeDelay: number;
  maxResubscribeDelay: number;
  positioned: boolean;
  recoverable: boolean
}

export interface StreamPosition {
  offset: number;
  epoch: string;
}
