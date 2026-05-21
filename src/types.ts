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

/** Events emitted by the Centrifuge client. */
export type ClientEvents = {
  /** Emitted on every client state transition (connecting → connected → disconnected). */
  state: (ctx: StateContext) => void;
  /** Emitted when the client starts a connection attempt. */
  connecting: (ctx: ConnectingContext) => void;
  /** Emitted when the client successfully connects and the server acknowledges the session. */
  connected: (ctx: ConnectedContext) => void;
  /** Emitted when the client connection is closed. */
  disconnected: (ctx: DisconnectedContext) => void;
  /** Emitted when an async message pushed by the server (not tied to a channel) is received. */
  message: (ctx: MessageContext) => void;
  /** Emitted for internal errors (transport errors, token errors, etc.). Use for diagnostics. */
  error: (ctx: ErrorContext) => void;
  /** Emitted when a server-side subscription moves to the subscribed state. */
  subscribed: (ctx: ServerSubscribedContext) => void;
  /** Emitted when a server-side subscription moves to the subscribing state. */
  subscribing: (ctx: ServerSubscribingContext) => void;
  /** Emitted when a server-side subscription is removed. */
  unsubscribed: (ctx: ServerUnsubscribedContext) => void;
  /** Emitted when a publication arrives on a server-side subscription channel. */
  publication: (ctx: ServerPublicationContext) => void;
  /** Emitted when a client joins a server-side subscription channel. */
  join: (ctx: ServerJoinContext) => void;
  /** Emitted when a client leaves a server-side subscription channel. */
  leave: (ctx: ServerLeaveContext) => void;
}

/** State of client. */
export enum State {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected"
}

/** Events emitted by a Subscription. */
export type SubscriptionEvents = {
  /** Emitted on every subscription state transition. */
  state: (ctx: SubscriptionStateContext) => void;
  /** Emitted when the subscription moves to the subscribing state (attempting to subscribe). */
  subscribing: (ctx: SubscribingContext) => void;
  /** Emitted when the subscription is successfully established. */
  subscribed: (ctx: SubscribedContext) => void;
  /** Emitted when the subscription is removed (by the server, by the client, or on error). */
  unsubscribed: (ctx: UnsubscribedContext) => void;
  /** Emitted when a publication arrives on the channel. */
  publication: (ctx: PublicationContext) => void;
  /** Emitted when a client joins the channel (requires joinLeave to be enabled). */
  join: (ctx: JoinContext) => void;
  /** Emitted when a client leaves the channel (requires joinLeave to be enabled). */
  leave: (ctx: LeaveContext) => void;
  /** Emitted for internal subscription errors. Use for diagnostics and retry logic. */
  error: (ctx: SubscriptionErrorContext) => void;
}

/** Common events shared by all subscription types. */
export type BaseSubscriptionEvents = SubscriptionEvents;

/** Events emitted by a map subscription. */
export type MapSubscriptionEvents = SubscriptionEvents & {
  /** Emitted once the initial state snapshot has been fully delivered and the subscription is live.
   * Contains all current map entries. Also emitted after a full resync (e.g. from_scratch recovery).
   *
   * NOT emitted on reconnects where the server successfully recovers missed updates — in that
   * case the application's existing snapshot is still valid and missed key changes arrive as
   * `update` events. Use `subscribed` to learn that the subscription is live; use `sync` only
   * to refresh the initial snapshot. */
  sync: (ctx: MapSyncContext) => void;
  /** Emitted for each individual key change (add, update, or remove) in the map. */
  update: (ctx: MapUpdateContext) => void;
};

/** Events emitted by a shared poll subscription. */
export type SharedPollSubscriptionEvents = SubscriptionEvents & {
  /** Emitted when a tracked key's data changes or a tracked key is removed. */
  update: (ctx: SharedPollUpdateContext) => void;
};

/** Internal event type used by BaseSubscription class — includes all possible events. */
export type InternalSubscriptionEvents = SubscriptionEvents & {
  sync: (ctx: MapSyncContext) => void;
  update: (ctx: MapUpdateContext | SharedPollUpdateContext) => void;
};

/** State of Subscription */
export enum SubscriptionState {
  Unsubscribed = "unsubscribed",
  Subscribing = "subscribing",
  Subscribed = "subscribed"
}

/** Transport name identifier. */
export type TransportName = 'websocket' | 'http_stream' | 'sse' | 'sockjs' | 'webtransport';

/** Configures a single transport endpoint when using transport fallback mode. */
export interface TransportEndpoint {
  /** Transport type. */
  transport: TransportName;
  /** Endpoint URL for this transport type. */
  endpoint: string;
}

/** Options for Centrifuge client. */
export interface Options {
  /** Key-value map sent in the connect command payload. Centrifugo treats these as HTTP headers
   * (e.g. for auth or routing). Requires Centrifugo >= v6. */
  headers: {[key: string]: string};
  /** Enables debug logging to the console. Can also be activated at runtime via
   * `localStorage.centrifuge.debug = true` without rebuilding. */
  debug: boolean;
  /** Initial connection token (JWT). Sent with the connect command; not refreshed automatically —
   * provide getToken for token renewal. */
  token: string;
  /** Called to obtain a fresh connection token when the current token is missing or has expired.
   * Not called on every reconnect — only when a new token is actually needed. */
  getToken: null | ((ctx: ConnectionTokenContext) => Promise<string>);
  /** Arbitrary data sent to the server with the connect command. */
  data: any | null;
  /** Called on each reconnect attempt (after a token is obtained) to supply fresh connect data.
   * Prefer calling setData() between reconnects when data changes infrequently. */
  getData: null | (() => Promise<any>);
  /** Client name string identifying the connecting environment (e.g. "js", "browser").
   * Not unique per connection — used for server-side observability. */
  name: string;
  /** Application version string sent with the connect command for server-side observability. */
  version: string;
  /** Minimum delay between reconnect attempts in milliseconds. Default: 500. */
  minReconnectDelay: number;
  /** Maximum delay between reconnect attempts in milliseconds. Default: 20000. */
  maxReconnectDelay: number;
  /** Timeout in milliseconds applied to transport connection attempts, all command replies,
   * and ready() calls. Default: 5000. */
  timeout: number;
  /** Extra milliseconds added on top of the server-reported ping interval before declaring the
   * connection broken. Set to 0 to disable ping-based disconnect detection. Default: 10000. */
  maxServerPingDelay: number;
  /** Custom WebSocket constructor. Required in Node.js environments where WebSocket is not
   * available globally. */
  websocket: any | null;
  /** Custom fetch implementation. Used by the HTTP stream and SSE transports. */
  fetch: any | null;
  /** Custom ReadableStream implementation. Used by the HTTP stream transport. */
  readableStream: any | null;
  /** Custom EventSource implementation. Used by the SSE transport. */
  eventsource: any | null;
  /** Custom SockJS constructor.
   * @deprecated SockJS support is deprecated. Use WebSocket, HTTP stream, or SSE instead. */
  sockjs: any | null;
  /** Options passed directly to the SockJS constructor.
   * @deprecated SockJS support is deprecated. */
  sockjsOptions: SockjsOptions;
  /** Endpoint for the HTTP stream and SSE emulation transports. Default: '/emulation'. */
  emulationEndpoint: string;
  /** EventTarget used to observe network online/offline events. Defaults to globalThis (window
   * in browsers). Set to null to disable network-event-based reconnection. */
  networkEventTarget: EventTarget | null;
}

/**
 * Options passed to the SockJS constructor.
 * @deprecated SockJS support is deprecated.
 */
export interface SockjsOptions {
  /** List of transports SockJS is allowed to use. */
  transports?: string[];
  /** Connection timeout in milliseconds. */
  timeout?: number;
}

/** Context for the client 'state' event. */
export interface StateContext {
  /** State the client transitioned to. */
  newState: State;
  /** State the client transitioned from. */
  oldState: State;
}

/** Context for the client 'connected' event. */
export interface ConnectedContext {
  /** Unique client ID assigned by the server for this connection. */
  client: string;
  /** Name of the transport that was used to establish the connection. */
  transport: string;
  /** Optional custom data returned by the server in the connect reply. */
  data?: any;
}

/** Context for the client 'error' event. */
export interface ErrorContext {
  /** Category of the error (e.g. 'transport', 'token', 'connect'). */
  type: string;
  /** The error details. */
  error: Error;
  /** Transport name, present when the error is transport-specific. */
  transport?: string;
}

/** Server error with a numeric code and message. */
export interface Error {
  /** Numeric error code defined by the Centrifugo protocol. */
  code: number;
  /** Human-readable error description. */
  message: string;
}

/** Context for the client 'connecting' event. */
export interface ConnectingContext {
  /** Numeric code describing why the client is (re)connecting. */
  code: number;
  /** Human-readable reason for the connecting state. */
  reason: string;
}

/** Context for the client 'disconnected' event. */
export interface DisconnectedContext {
  /** Numeric code describing why the client disconnected. */
  code: number;
  /** Human-readable reason for the disconnection. */
  reason: string;
}

/** Context for the client 'message' event (async server push, not tied to a channel). */
export interface MessageContext {
  /** Payload of the message. */
  data: any;
}

/** Context for a publication received on a client subscription channel. */
export interface PublicationContext {
  /** Channel the publication was received on. */
  channel: string;
  /** Publication payload. */
  data: any;
  /** Present only when the publication was sent via the client SDK publish method.
   * Absent for server-API publishes where no publisher client context is available. */
  info?: ClientInfo;
  /** Monotonically increasing offset assigned by the broker. Present when history is enabled
   * for the channel. */
  offset?: number;
  /** Key-value tags attached to the publication. Set via the server publish API. */
  tags?: Record<string, string>;
}

/** Information about a connected client, attached to publications and join/leave events. */
export interface ClientInfo {
  /** Globally unique connection identifier assigned by the server. */
  client: string;
  /** Authenticated user ID. Empty string for anonymous connections. */
  user: string;
  /** Arbitrary data attached to the connection at authentication time. */
  connInfo?: any;
  /** Arbitrary data attached to the subscription at authorization time. */
  chanInfo?: any;
}

/** Context for a subscription 'join' event. */
export interface JoinContext {
  /** Channel the client joined. */
  channel: string;
  /** Information about the client that joined. */
  info: ClientInfo;
}

/** Context for a subscription 'leave' event. */
export interface LeaveContext {
  /** Channel the client left. */
  channel: string;
  /** Information about the client that left. */
  info: ClientInfo;
}

/** Context for a subscription 'state' event. */
export interface SubscriptionStateContext {
  /** Channel this subscription is for. */
  channel: string;
  /** State the subscription transitioned to. */
  newState: SubscriptionState;
  /** State the subscription transitioned from. */
  oldState: SubscriptionState;
}

/** Context for the server-side subscription 'subscribed' event. */
export interface ServerSubscribedContext {
  /** Channel this subscription is for. */
  channel: string;
  /** Whether the server will recover missed publications on reconnect. */
  recoverable: boolean;
  /** Whether the server tracks message loss between the broker and clients. */
  positioned: boolean;
  /** Current stream position, present when the subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** True when recovery was attempted in the subscribe request. */
  wasRecovering: boolean;
  /** True when all missed publications were successfully recovered. */
  recovered: boolean;
  /** True when recovered publications are pending delivery after this event.
   * For metrics and logging only — recovered publications are delivered after 'subscribed' fires. */
  hasRecoveredPublications: boolean;
  /** Custom data returned by the server in the subscribe reply. */
  data?: any;
}

/** Context for a client subscription 'subscribed' event. */
export interface SubscribedContext {
  /** Channel this subscription is for. */
  channel: string;
  /** Whether the server will recover missed publications on reconnect. */
  recoverable: boolean;
  /** Whether the server tracks message loss between the broker and clients. */
  positioned: boolean;
  /** Current stream position, present when the subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** True when recovery was attempted in the subscribe request. */
  wasRecovering: boolean;
  /** True when all missed publications were successfully recovered. */
  recovered: boolean;
  /** True when recovered publications are pending delivery after this event.
   * For metrics and logging only — recovered publications are delivered after 'subscribed' fires. */
  hasRecoveredPublications: boolean;
  /** Custom data returned by the server in the subscribe reply. */
  data?: any;
  /** Initial map entries delivered during state pagination (map subscriptions only).
   * A snapshot — never contains removed keys. */
  state?: MapEntry[];
}

/** Category of a subscription 'error' event.
 *
 * - `'subscribe'`         — subscribe attempt failed with a temporary error; SDK will resubscribe.
 *                           Also used for failures in the `getState` callback (stream subscriptions).
 * - `'subscribeData'`     — `getData` callback rejected; SDK will resubscribe.
 * - `'subscribeToken'`    — `getToken` callback rejected on initial subscribe; SDK will resubscribe.
 * - `'configuration'`     — server asked for a refreshed subscription token but no `getToken` is configured.
 * - `'refreshToken'`      — `getToken` callback rejected during token refresh; SDK will retry.
 * - `'refresh'`           — server-side subscription refresh failed with a temporary error; SDK will retry.
 * - `'track'`             — shared poll: `track()` request to the server failed, or the `getSignature`
 *                           callback rejected when called via `track(keys)`.
 * - `'untrack'`           — shared poll: `untrack()` request to the server failed.
 * - `'signatureRefresh'`  — shared poll: `getSignature` callback rejected during a periodic signature
 *                           refresh or on subscribe replay; SDK will retry with backoff.
 */
export type SubscriptionErrorType =
  | 'subscribe'
  | 'subscribeData'
  | 'subscribeToken'
  | 'configuration'
  | 'refreshToken'
  | 'refresh'
  | 'track'
  | 'untrack'
  | 'signatureRefresh';

/** Context for a subscription 'error' event. */
export interface SubscriptionErrorContext {
  /** Channel this subscription is for. */
  channel: string;
  /** Category of the error — see SubscriptionErrorType for the full list. */
  type: SubscriptionErrorType;
  /** The error details. */
  error: Error;
}

/** Context for a subscription 'unsubscribed' event. */
export interface UnsubscribedContext {
  /** Channel this subscription was for. */
  channel: string;
  /** Numeric code describing why the subscription was removed. */
  code: number;
  /** Human-readable reason for the unsubscription. */
  reason: string;
}

/** Context for a publication received on a server-side subscription channel. */
export interface ServerPublicationContext {
  /** Channel the publication was received on. */
  channel: string;
  /** Publication payload. */
  data: any;
  /** Present only when the publication was sent via the client SDK publish method.
   * Absent for server-API publishes where no publisher client context is available. */
  info?: ClientInfo;
  /** Monotonically increasing offset assigned by the broker. Present when history is enabled
   * for the channel. */
  offset?: number;
  /** Key-value tags attached to the publication. Set via the server publish API. */
  tags?: Record<string, string>;
}

/** Context for a server-side subscription 'join' event. */
export interface ServerJoinContext {
  /** Channel the client joined. */
  channel: string;
  /** Information about the client that joined. */
  info: ClientInfo;
}

/** Context for a server-side subscription 'leave' event. */
export interface ServerLeaveContext {
  /** Channel the client left. */
  channel: string;
  /** Information about the client that left. */
  info: ClientInfo;
}

/** Context for a server-side subscription 'unsubscribed' event. */
export interface ServerUnsubscribedContext {
  /** Channel that was unsubscribed. */
  channel: string;
}

/** Context for a subscription 'subscribing' event. */
export interface SubscribingContext {
  /** Channel this subscription is for. */
  channel: string;
  /** Numeric code describing why the subscription is (re)subscribing. */
  code: number;
  /** Human-readable reason for the subscribing state. */
  reason: string;
}

/** Context for a server-side subscription 'subscribing' event. */
export interface ServerSubscribingContext {
  /** Channel the server-side subscription is being re-established on. */
  channel: string;
}

/** Context passed to the client-level getToken callback. Currently empty; reserved for future use. */
export interface ConnectionTokenContext {
}

/** Context passed to the subscription-level getToken callback. */
export interface SubscriptionTokenContext {
  /** Channel the token is being requested for. */
  channel: string;
}

/** Context passed to the subscription-level getData callback. */
export interface SubscriptionDataContext {
  /** Channel the data is being requested for. */
  channel: string;
}

/** Result of a channel publish call. */
export interface PublishResult {
}

/** Result of an RPC call. */
export interface RpcResult {
  /** Arbitrary data returned by the server-side RPC handler. */
  data: any;
}

/** Result of a presence call. */
export interface PresenceResult {
  /** Map of client ID to client info for all currently subscribed clients. */
  clients: Record<string, ClientInfo>;
}

/** Result of a presence stats call. */
export interface PresenceStatsResult {
  /** Number of active client connections in the channel. */
  numClients: number;
  /** Number of unique authenticated users in the channel. */
  numUsers: number;
}

/** Result of a history call. */
export interface HistoryResult {
  /** Publications returned by the history query. */
  publications: PublicationContext[];
  /** Offset of the most recent publication in the stream. */
  offset: number;
  /** Epoch identifying the current stream generation. Changes when the stream is reset. */
  epoch: string;
}

/** Options for a history call. */
export interface HistoryOptions {
  /** Maximum number of publications to return. Negative value or 0 uses the server default. */
  limit?: number;
  /** Return publications after this stream position (exclusive). */
  since?: StreamPosition;
  /** Return publications in reverse order (newest first). */
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

/** SubscriptionOptions can customize regular (non-map) Subscription. */
export interface SubscriptionOptions {
  /** Initial subscription token (JWT). Not refreshed automatically — provide getToken for renewal. */
  token?: string;
  /** Called to obtain a fresh subscription token when the current token is missing or has expired
   * (e.g. after server code 109). Not called on every resubscribe — only when a new token is needed. */
  getToken?: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  /** Arbitrary data sent to the server with the subscribe command. */
  data?: any | null;
  /** Called on every resubscribe attempt (after a token is obtained) to supply fresh subscribe data.
   * Prefer calling setData() when data changes infrequently. */
  getData?: null | ((ctx: SubscriptionDataContext) => Promise<any>);
  /** Bootstrap recovery from a known stream position on the first subscribe. */
  since?: Partial<StreamPosition> | null;
  /** Minimum delay between resubscribe attempts in milliseconds. */
  minResubscribeDelay?: number;
  /** Maximum delay between resubscribe attempts in milliseconds. */
  maxResubscribeDelay?: number;
  /** Request a positioned subscription. The server must allow client-requested positioning;
   * server namespace config typically controls this. */
  positioned?: boolean;
  /** Request a recoverable subscription. The server must allow client-requested recovery;
   * server namespace config typically controls this. */
  recoverable?: boolean;
  /** Request join/leave events for this channel. The server must allow client-requested join/leave. */
  joinLeave?: boolean;
  /** Delta compression format for publications. Only 'fossil' is supported. Must be allowed on
   * the server side. Cannot be combined with tagsFilter. */
  delta?: 'fossil';
  /** Server-side publication filter based on tags. Must be enabled in the server namespace config.
   * Cannot be combined with delta. */
  tagsFilter?: FilterNode | null;
  /** Called to load the app's current state and stream position. Requires Centrifugo >= 6.8.0.
   *
   * The SDK calls this:
   * - On initial subscribe (no saved position)
   * - On reconnect when recovery fails (server returns error 112 — unrecoverable position)
   *
   * NOT called on reconnects where the server successfully recovers missed
   * publications — in that case the recovered publications arrive as events
   * and getState is skipped.
   *
   * The app should load its data from its own source of truth (database, API),
   * render it, and return the stream position (from cf_stream_top_position or
   * similar). The SDK subscribes with recovery from the returned position, so
   * any publications between the state read and the subscribe are delivered as
   * publication events.
   *
   * IMPORTANT: inside getState, read the stream position FIRST, then read your
   * data. This ensures the position is a lower bound — any data loaded after
   * the position read is guaranteed to be included. The reverse order can
   * produce gaps.
   *
   * Recovered publications may overlap with data already loaded in getState.
   * This works correctly when updates are idempotent (applying the same update
   * twice produces the same result). For non-idempotent updates, deduplicate
   * by publication offset.
   *
   * On error, the SDK emits an 'error' event and retries with backoff. */
  getState?: () => Promise<StreamPosition>;
}

/** MapSubscriptionOptions can customize map Subscription. */
export interface MapSubscriptionOptions {
  /** Initial subscription token (JWT). Not refreshed automatically — provide getToken for renewal. */
  token?: string;
  /** Called to obtain a fresh subscription token when the current token is missing or has expired.
   * Not called on every resubscribe — only when a new token is needed. */
  getToken?: (ctx: SubscriptionTokenContext) => Promise<string>;
  /** Arbitrary data sent to the server with the subscribe command. */
  data?: any;
  /** Minimum delay between resubscribe attempts in milliseconds. */
  minResubscribeDelay?: number;
  /** Maximum delay between resubscribe attempts in milliseconds. */
  maxResubscribeDelay?: number;
  /** Number of entries per page during state and stream pagination. 0 uses the server default.
   * Sent as the limit parameter in paginated requests. */
  pageSize?: number;
  /** Delta compression format for publications. Only 'fossil' is supported. Must be allowed on
   * the server side. Cannot be combined with tagsFilter. */
  delta?: 'fossil';
  /** Server-side publication filter based on tags. Must be enabled in the server namespace config.
   * Cannot be combined with delta. Can also be updated at runtime via setTagsFilter(). */
  tagsFilter?: FilterNode | null;
  /** How to handle an unrecoverable position error (server code 112):
   * - 'from_scratch' (default): reset and resubscribe from a fresh snapshot automatically.
   * - 'fatal': move to unsubscribed state and let the application decide what to do. */
  unrecoverableStrategy?: MapUnrecoverableStrategy;
}

/** Internal options interface used by Subscription class.
 * Extends SubscriptionOptions with map-specific options using internal naming. */
export interface InternalSubscriptionOptions extends SubscriptionOptions {
  map?: boolean;
  mapPageSize?: number;
  mapUnrecoverableStrategy?: MapUnrecoverableStrategy;
  mapPresenceType?: number; // 1=MAP (default), 2=MAP_CLIENTS, 3=MAP_USERS
  sharedPoll?: boolean;
  sharedPollGetSignature?: (ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>;
  // getState is inherited from SubscriptionOptions — no separate internal name needed
}

/** Strategy for handling unrecoverable position errors in map subscriptions */
export type MapUnrecoverableStrategy = 'from_scratch' | 'fatal';

/** Position of a publication within a channel stream. */
export interface StreamPosition {
  /** Monotonically increasing offset of the publication within the stream. */
  offset: number;
  /** Epoch string identifying the current stream generation. Changes when the stream is reset. */
  epoch: string;
}

/** A single entry in a map subscription snapshot.
 *
 * Used in `MapSyncContext.entries` and `SubscribedContext.state` — both represent
 * the current state of the map, not a change event. Snapshots never contain
 * removed keys, so there is no `removed` flag here; see `MapUpdateContext` for
 * the per-change event shape. */
export interface MapEntry extends PublicationContext {
  /** The map key. */
  key: string;
}

/** Context for a map subscription 'update' event — a single key change.
 *
 * Use `removed` to distinguish a key set/update (`removed` absent or false)
 * from a key removal (`removed === true`). For the current state of the map
 * (no change semantics), see `MapEntry`. */
export interface MapUpdateContext extends MapEntry {
  /** True when this update represents a key removal. The publication's `data`
   * field is not meaningful for removals. */
  removed?: boolean;
}

/** Context for a shared poll subscription 'update' event. */
export interface SharedPollUpdateContext {
  /** Channel this update belongs to. */
  channel: string;
  /** The key identifying this tracked entity. */
  key: string;
  /** Current entity data. Null when the entity was removed. */
  data: any;
  /** True when this entity was removed. */
  removed?: boolean;
  /** Entity version returned by the server. */
  version?: number;
}

/** Context for a map subscription 'sync' event — delivered when a fresh snapshot is ready. */
export interface MapSyncContext {
  /** All current map entries at the time of sync. Never contains removed keys. */
  entries: MapEntry[];
}

/** A single item tracked by a shared poll subscription. */
export interface SharedPollTrackItem {
  /** The key identifying this entity. */
  key: string;
  /** The client's last known version for this entity. 0 means no version is known. */
  version: number;
}

/** Context passed to the getSignature callback for shared poll subscriptions. */
export interface SharedPollSignatureContext {
  /** All currently tracked keys that require a fresh signature. */
  keys: string[];
}

/** Result returned by the getSignature callback. */
export interface SharedPollSignatureResult {
  /** Keys to track. May be a subset of the input keys to revoke access to removed ones. */
  keys: string[];
  /** HMAC signature authorizing these keys. */
  signature: string;
}

/** Options for shared poll subscriptions */
export interface SharedPollSubscriptionOptions {
  /** Initial subscription token (JWT). Not refreshed automatically — provide getToken for renewal. */
  token?: string;
  /** Called to obtain a fresh subscription token when the current token is missing or has expired.
   * Not called on every resubscribe — only when a new token is needed. */
  getToken?: (ctx: SubscriptionTokenContext) => Promise<string>;
  /** Arbitrary data sent to the server with the subscribe command. */
  data?: any;
  /** Called to obtain an HMAC signature authorizing the set of tracked keys. Invoked on
   * reconnect (to replay tracked keys), on signature TTL expiry, and when using the
   * simplified track(keys) overload. Required when using track(keys) or reconnect replay;
   * optional only when every track() call supplies an explicit per-call signature. */
  getSignature?: (ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>;
  /** Delta compression format for publications. Only 'fossil' is supported. Must be allowed on
   * the server side. */
  delta?: 'fossil';
  /** Minimum delay between resubscribe attempts in milliseconds. */
  minResubscribeDelay?: number;
  /** Maximum delay between resubscribe attempts in milliseconds. */
  maxResubscribeDelay?: number;
}

/** Delta compression statistics for a subscription. */
export interface DeltaStats {
  /** Total number of publications received (full + delta). */
  numPublications: number;
  /** Number of publications received as full payloads. */
  numFullPayloads: number;
  /** Number of publications received as delta-encoded payloads. */
  numDeltaPayloads: number;
  /** Total bytes received on the wire (before delta decoding). */
  bytesReceived: number;
  /** Total bytes of full payloads after delta decoding. */
  bytesDecoded: number;
  /** Compression ratio: 1 - (bytesReceived / bytesDecoded). 0 when bytesDecoded is 0. */
  compressionRatio: number;
}
