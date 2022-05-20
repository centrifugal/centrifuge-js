export type EventMap = {
  [key: string]: (...args: any[]) => void
}

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

export enum State {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected"
}

export enum SubscriptionState {
  Unsubscribed = "unsubscribed",
  Subscribing = "subscribing",
  Subscribed = "subscribed"
}

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

export interface TransportEndpoint {
  transport: string;
  endpoint: string;
}

export interface Options {
  protocol: 'json' | 'protobuf';
  debug: boolean;
  token: string | null;
  getToken: null | ((ctx: ConnectionTokenContext) => Promise<string>);
  data: any;
  name: string;
  version: string;
  minReconnectDelay: number;
  maxReconnectDelay: number;
  timeout: number;
  maxServerPingDelay: number;
  websocket: any | null;
  fetch: any | null,
  readableStream: any | null,
  eventsource: any | null,
  sockjs: any | null;
  sockjsServer: string | null;
  sockjsTimeout: number | null;
  sockjsTransports: string[];
  httpStreamRequestMode: string;
  emulationEndpoint: string;
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
