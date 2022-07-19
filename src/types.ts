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

  // Async message coming from a server.
  message: (ctx: MessageContext) => void;
  // Listen to errors happening internally. 
  error: (ctx: ErrorContext) => void;

  // Listen for server-side subscription events.
  subscribed: (ctx: ServerSubscribedContext) => void;
  subscribing: (ctx: ServerSubscribingContext) => void;
  unsubscribed: (ctx: ServerUnsubscribedContext) => void;
  publication: (ctx: ServerPublicationContext) => void;
  join: (ctx: ServerJoinContext) => void;
  leave: (ctx: ServerLeaveContext) => void;
}

/** State of client. */
export enum State {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected"
}

/** Events of Subscription. */
export type SubscriptionEvents = {
  state: (ctx: SubscriptionStateContext) => void;
  subscribing: (ctx: SubscribingContext) => void;
  subscribed: (ctx: SubscribedContext) => void;
  unsubscribed: (ctx: UnsubscribedContext) => void;

  publication: (ctx: PublicationContext) => void;
  join: (ctx: JoinContext) => void;
  leave: (ctx: LeaveContext) => void;

  // listen to errors happening internally. 
  error: (ctx: SubscriptionErrorContext) => void;
}

/** State of Subscription */
export enum SubscriptionState {
  Unsubscribed = "unsubscribed",
  Subscribing = "subscribing",
  Subscribed = "subscribed"
}

export type TransportName = 'websocket' | 'http_stream' | 'sse' | 'sockjs' | 'webtransport';

/** TransportEndpoint allows configuring transport when using fallback mode */
export interface TransportEndpoint {
  /** transport to use */
  transport: TransportName;
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
  /** data to send to a server with connect command */
  data: any | null;
  /** name of client - it's not a unique name of each connection, it's sth to identify from where client connected */
  name: string;
  /** version of client */
  version: string;
  /** minimum delay between reconnect attemts in milliseconds */
  minReconnectDelay: number;
  /** maximum delay between reconnect attemts in milliseconds */
  maxReconnectDelay: number;
  /** timeout for operations in milliseconds */
  timeout: number;
  /** maximum delay of server pings to detect broken connection in milliseconds */
  maxServerPingDelay: number;
  /** provide custom WebSocket constructor, useful for NodeJS env where WebSocket is not available globally */
  websocket: any | null;
  /** provide shim for fetch implementation */
  fetch: any | null;
  /** provide shim for ReadableStream */
  readableStream: any | null;
  /** provide shim for EventSource object */
  eventsource: any | null;
  /** provide shim for SockJS object */
  sockjs: any | null;
  /** allows modifying options passed to SockJS constructor */
  sockjsOptions: SockjsOptions;
  /** which emulation endpoint to use */
  emulationEndpoint: string;
}

export interface SockjsOptions {
  transports?: string[];
  timeout?: number;
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
  /** channel of Subscription. */
  channel: string;
  /** Subscription is recoverable – i.e. can automatically recover missied messages */
  recoverable: boolean;
  /** Subscription is positioned – i.e. server tracks message loss on the way from PUB/SUB broker */
  positioned: boolean;
  /** streamPosition set when Subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** wasRecovering is true when recovery was used in subscribe request. */
  wasRecovering: boolean;
  /** whether or not missed publications may be successfully recovered.  */
  recovered: boolean;
  /** custom data for Subscription returned from server. */
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

export interface ServerPublicationContext {
  channel: string;
  data: any;
  info?: ClientInfo;
  offset?: number;
  tags?: Map<string, string>;
}

export interface ServerJoinContext {
  channel: string;
  info: ClientInfo;
}

export interface ServerLeaveContext {
  channel: string;
  info: ClientInfo;
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
  /** allows setting subscription token (JWT) */
  token: string | null;
  /** allows setting function to get/refresh subscription token */
  getToken: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  /** data to send to a server with subscribe command */
  data: any | null;
  /** force recovery on first subscribe from a provided StreamPosition. */
  since: StreamPosition | null;
  /** min delay between resubscribe attemts. */
  minResubscribeDelay: number;
  /** max delay between resubscribe attempts. */
  maxResubscribeDelay: number;
  /** ask server to make subsription positioned. */
  positioned: boolean;
  /** ask server to make subsription recoverable. */
  recoverable: boolean;
  /** ask server to send join/leave messages. */
  joinLeave: boolean;
}

/** Stream postion describes position of publication inside a stream.  */
export interface StreamPosition {
  offset: number;
  epoch: string;
}
