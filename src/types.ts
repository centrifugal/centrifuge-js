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
  /** called when client state changes */
  state: (ctx: StateContext) => void;
  /** called when client goes to connecting state */
  connecting: (ctx: ConnectingContext) => void;
  /** called when client goes to connected state */
  connected: (ctx: ConnectedContext) => void;
  /** called when client goes to disconnected state */
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
  /** called when subscription state changes */
  state: (ctx: SubscriptionStateContext) => void;
  /** called when subscription state goes to subscribing */
  subscribing: (ctx: SubscribingContext) => void;
  /** called when subscription state goes to subscribed */
  subscribed: (ctx: SubscribedContext) => void;
  /** called when subscription state goes to unsubscribed */
  unsubscribed: (ctx: UnsubscribedContext) => void;

  /** called when publication from channel received */
  publication: (ctx: PublicationContext) => void;
  /** called when join event from channel received */
  join: (ctx: JoinContext) => void;
  /** called when leave event from channel received */
  leave: (ctx: LeaveContext) => void;

  /** listen to subscription errors happening internally */
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
  // provide header emulation, these headers are sent with first protocol message
  // the backend can process those in a customized manner. In case of Centrifugo
  // these headers are then used like real HTTP headers sent from the client.
  // Requires Centrifugo v6.
  headers: {[key: string]: string};
  /** allows enabling debug mode */
  debug: boolean;
  /** allows setting initial connection token (JWT) */
  token: string;
  /** allows setting function to get/refresh connection token,
   * this will only be called when new token needed, not on every reconnect. */
  getToken: null | ((ctx: ConnectionTokenContext) => Promise<string>);
  /** data to send to a server with connect command */
  data: any | null;
  /** allows setting function to get/renew connection data (called upon reconnects).
   * In many cases you may prefer using setData method of Centrifuge Client instead. */
  getData: null | (() => Promise<any>);
  /** name of client - it's not a unique name of each connection, it's sth to identify
   * from where client connected */
  name: string;
  /** version of client */
  version: string;
  /** minimum delay between reconnect attempts in milliseconds */
  minReconnectDelay: number;
  /** maximum delay between reconnect attempts in milliseconds */
  maxReconnectDelay: number;
  /** timeout for operations in milliseconds */
  timeout: number;
  /** maximum delay of server pings to detect broken connection in milliseconds */
  maxServerPingDelay: number;
  /** provide custom WebSocket constructor, useful for NodeJS env where WebSocket is not
   * available globally */
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
  /** EventTarget for network online/offline events, in browser environment 
   * Centrifuge uses global window online/offline events automatically
   * by default. */
  networkEventTarget: EventTarget | null;
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
  // channel from which publication was received.
  channel: string;
  // data contains publication payload.
  data: any;
  // info is an optional ClientInfo object. It's appended to publication only if publication was
  // sent using client SDK's publish method. If publication was sent over server publish API
  // this info object is missing as we don't have publisher client context in that case.
  info?: ClientInfo;
  // offset may be set for channels where history Centrifugo feature is on. In this case it's an
  // incremental number assigned to publication by server broker (upon adding to history stream).   
  offset?: number;
  // tags is an extra key-value attached to publication, tags may be set when calling server publish API. 
  tags?: Record<string, string>;
}

export interface ClientInfo {
  // client is a globally unique identifier which server allocates for every connection.
  client: string;
  // user contains ID of authenticated user. Empty user means anonymous user. One user can have
  // many client connections.
  user: string;
  // connInfo is optional information attached to connection (during connection authentication).
  connInfo?: any;
  // chanInfo is optional information attached to subscription (during subscription authorization).
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
  /** subscription is recoverable – i.e. can automatically recover missed messages */
  recoverable: boolean;
  /** subscription is positioned – i.e. server tracks message loss on the way from PUB/SUB broker */
  positioned: boolean;
  /** streamPosition set when Subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** wasRecovering is true when recovery was used in subscribe request. */
  wasRecovering: boolean;
  /** whether or not missed publications may be successfully recovered.  */
  recovered: boolean;
  /** whether or not successfully recovered subscription has received missed publications.
  Warning: must be used for metrics/logs purposes only.
  Recovered publications are processed after 'subscribed' event. **/
  hasRecoveredPublications: boolean;
  /** custom data for Subscription returned from server. */
  data?: any;
}

export interface SubscribedContext {
  /** channel of Subscription. */
  channel: string;
  /** subscription is recoverable – i.e. can automatically recover missed messages */
  recoverable: boolean;
  /** subscription is positioned – i.e. server tracks message loss on the way from PUB/SUB broker */
  positioned: boolean;
  /** streamPosition is set when Subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** wasRecovering is true when recovery was used in subscribe request. */
  wasRecovering: boolean;
  /** whether or not missed publications may be successfully recovered.  */
  recovered: boolean;
  /** whether or not successfully recovered subscription has received missed publications.
  Warning: must be used for metrics/logs purposes only.
  Recovered publications are processed after 'subscribed' event. **/
  hasRecoveredPublications: boolean;
  /** custom data for Subscription returned from server. */
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
  // channel from which publication was received.
  channel: string;
  // data contains publication payload.
  data: any;
  // info is an optional ClientInfo object. It's appended to publication only if publication was
  // sent using client SDK's publish method. If publication was sent over server publish API
  // this info object is missing as we don't have publisher client context in that case.
  info?: ClientInfo;
  // offset may be set for channels where history Centrifugo feature is on. In this case it's an
  // incremental number assigned to publication by server broker (upon adding to history stream).   
  offset?: number;
  // tags is an extra key-value attached to publication, tags may be set when calling server publish API. 
  tags?: Record<string, string>;
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

export interface SubscriptionDataContext {
  channel: string;
}

export interface PublishResult {
}

export interface RpcResult {
  data: any;
}

export interface PresenceResult {
  clients: Record<string, ClientInfo>;
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

/**
 * Comparison operators for leaf filter nodes.
 * Used when FilterNode.op is empty (leaf node).
 */
export type FilterComparisonOperator =
  | 'eq'   // equal
  | 'neq'  // not equal
  | 'in'   // value is in vals array
  | 'nin'  // value is not in vals array
  | 'ex'   // key exists in tags
  | 'nex'  // key does not exist in tags
  | 'sw'   // string starts with val
  | 'ew'   // string ends with val
  | 'ct'   // string contains val
  | 'lt'   // numeric less than val
  | 'lte'  // numeric less than or equal to val
  | 'gt'   // numeric greater than val
  | 'gte'; // numeric greater than or equal to val

/**
 * Logical operators for complex filter nodes.
 * Used in FilterNode.op for combining multiple conditions.
 */
export type FilterLogicalOperator = 'and' | 'or' | 'not';

/**
 * FilterNode represents a node in a filter expression tree used for server-side
 * publication filtering. It can be either:
 * - A leaf node (comparison) when op is empty
 * - A logical operation node (and/or/not) when op is set
 *
 * @example
 * // Simple equality filter
 * const filter: FilterNode = {
 *   key: 'ticker',
 *   cmp: 'eq',
 *   val: 'BTC'
 * };
 *
 * @example
 * // Filter with multiple conditions
 * const filter: FilterNode = {
 *   op: 'and',
 *   nodes: [
 *     { key: 'ticker', cmp: 'eq', val: 'BTC' },
 *     { key: 'price', cmp: 'gt', val: '50000' }
 *   ]
 * };
 *
 * @example
 * // Filter with IN operator
 * const filter: FilterNode = {
 *   key: 'ticker',
 *   cmp: 'in',
 *   vals: ['BTC', 'ETH', 'SOL']
 * };
 */
export interface FilterNode {
  /**
   * Operation type for this node:
   * - "" (empty string or undefined) → leaf node (comparison)
   * - "and" → logical AND of child nodes
   * - "or" → logical OR of child nodes
   * - "not" → logical NOT of a single child node
   */
  op?: FilterLogicalOperator;

  /**
   * Key for comparison (only valid for leaf nodes).
   * The tag key to compare against.
   */
  key?: string;

  /**
   * Comparison operator for leaf nodes.
   * Only meaningful if op is empty (leaf node).
   */
  cmp?: FilterComparisonOperator;

  /**
   * Single value used in most comparisons.
   * Used with operators: eq, neq, sw, ew, ct, lt, lte, gt, gte.
   */
  val?: string;

  /**
   * Multiple values used for set comparisons.
   * Used with operators: in, nin.
   */
  vals?: string[];

  /**
   * Child nodes for logical operations.
   * Used when op is "and", "or", or "not".
   */
  nodes?: FilterNode[];
}

/** SubscriptionOptions can customize Subscription. */
export interface SubscriptionOptions {
  /** allows setting initial subscription token (JWT) */
  token: string;
  /** allows setting function to get/refresh subscription token,
   * this will only be called when new token needed, not on every resubscribe. */
  getToken: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  /** data to send to a server with subscribe command */
  data: any | null;
  /** allows setting function to get/renew subscription data (during resubscriptions).
   * In many cases you may prefer using setData method of Subscription instead. */
  getData: null | ((ctx: SubscriptionDataContext) => Promise<any>);
  /** force recovery on first subscribe from a provided StreamPosition. */
  since: Partial<StreamPosition> | null;
  /** min delay between resubscribe attempts. */
  minResubscribeDelay: number;
  /** max delay between resubscribe attempts. */
  maxResubscribeDelay: number;
  /** ask server to make subscription positioned. */
  positioned: boolean;
  /** ask server to make subscription recoverable. */
  recoverable: boolean;
  /** ask server to send join/leave messages. */
  joinLeave: boolean;
  /** delta format to be used. Delta usage must be allowed on server-side. */
  delta: 'fossil';
  /** server-side tagsFilter to apply for publications in channel. Tags filter support must be allowed on server-side. */
  tagsFilter: FilterNode | null;
}

/** Stream postion describes position of publication inside a stream.  */
export interface StreamPosition {
  offset: number;
  epoch: string;
}
