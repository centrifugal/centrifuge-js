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

/** Common events shared by all subscription types. */
export type BaseSubscriptionEvents = SubscriptionEvents;

/** Events for map subscriptions. */
export type MapSubscriptionEvents = SubscriptionEvents & {
  sync: (ctx: MapSyncContext) => void;
  update: (ctx: MapUpdateContext) => void;
};

/** Events for shared poll subscriptions (no sync). */
export type SharedPollSubscriptionEvents = SubscriptionEvents & {
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
  /** name of client - it's not a unique name for each connection, it's something to identify
   * where the client connected from */
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
  /** emulation endpoint to use */
  emulationEndpoint: string;
  /** EventTarget for network online/offline events. In a browser environment,
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
  // info is an optional ClientInfo object. It's appended to a publication only if the publication was
  // sent using the client SDK's publish method. If the publication was sent over the server publish API,
  // this info object is missing as we don't have the publisher client context in that case.
  info?: ClientInfo;
  // offset may be set for channels where the history Centrifugo feature is enabled. In this case, it's an
  // incremental number assigned to the publication by the server broker (upon adding to the history stream).   
  offset?: number;
  // tags is an extra key-value map attached to a publication. Tags may be set when calling the server publish API. 
  tags?: Record<string, string>;
}

export interface ClientInfo {
  // client is a globally unique identifier that the server allocates for every connection.
  client: string;
  // user contains the ID of the authenticated user. An empty user means an anonymous user. One user can have
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
  /** streamPosition is set when Subscription is recoverable or positioned. */
  streamPosition?: StreamPosition;
  /** wasRecovering is true when recovery was used in the subscribe request. */
  wasRecovering: boolean;
  /** whether or not missed publications were successfully recovered.  */
  recovered: boolean;
  /** whether or not a successfully recovered subscription has received missed publications.
  Warning: must be used for metrics/logs purposes only.
  Recovered publications are processed after the 'subscribed' event. **/
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
  /** wasRecovering is true when recovery was used in the subscribe request. */
  wasRecovering: boolean;
  /** whether or not missed publications were successfully recovered.  */
  recovered: boolean;
  /** whether or not a successfully recovered subscription has received missed publications.
  Warning: must be used for metrics/logs purposes only.
  Recovered publications are processed after the 'subscribed' event. **/
  hasRecoveredPublications: boolean;
  /** custom data for Subscription returned from server. */
  data?: any;
  /** State entries for map subscriptions (from state pagination) */
  state?: MapUpdateContext[];
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
  // info is an optional ClientInfo object. It's appended to a publication only if the publication was
  // sent using the client SDK's publish method. If the publication was sent over the server publish API,
  // this info object is missing as we don't have the publisher client context in that case.
  info?: ClientInfo;
  // offset may be set for channels where the history Centrifugo feature is enabled. In this case, it's an
  // incremental number assigned to the publication by the server broker (upon adding to the history stream).   
  offset?: number;
  // tags is an extra key-value map attached to a publication. Tags may be set when calling the server publish API. 
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

/** SubscriptionOptions can customize regular (non-map) Subscription. */
export interface SubscriptionOptions {
  /** allows setting initial subscription token (JWT) */
  token?: string;
  /** allows setting function to get/refresh subscription token,
   * this will only be called when new token needed, not on every resubscribe. */
  getToken?: null | ((ctx: SubscriptionTokenContext) => Promise<string>);
  /** data to send to a server with subscribe command */
  data?: any | null;
  /** allows setting function to get/renew subscription data (during resubscriptions).
   * In many cases you may prefer using setData method of Subscription instead. */
  getData?: null | ((ctx: SubscriptionDataContext) => Promise<any>);
  /** force recovery on first subscribe from a provided StreamPosition. */
  since?: Partial<StreamPosition> | null;
  /** min delay between resubscribe attempts. */
  minResubscribeDelay?: number;
  /** max delay between resubscribe attempts. */
  maxResubscribeDelay?: number;
  /** ask server to make subscription positioned. */
  positioned?: boolean;
  /** ask server to make subscription recoverable. */
  recoverable?: boolean;
  /** ask server to send join/leave messages. */
  joinLeave?: boolean;
  /** delta format to be used. Delta usage must be allowed on the server side. */
  delta?: 'fossil';
  /** server-side tagsFilter to apply for publications in channel. Tags filter support must be allowed on the server side. */
  tagsFilter?: FilterNode | null;
  /** Called to load the app's current state and stream position. The SDK calls this:
   * - On initial subscribe (no saved position)
   * - On reconnect when recovery fails (recovered: false)
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
   * twice produces the same result). For non-idempotent updates, the app should
   * deduplicate by offset. This is the same consideration described in the
   * "Proper real-time document state synchronization" blog post, but natively
   * baked into the SDK via this callback.
   *
   * On error, the SDK emits an 'error' event and retries with backoff, matching
   * the error handling behavior of getState in map subscriptions. */
  getState?: () => Promise<StreamPosition>;
}

/** MapSubscriptionOptions can customize map Subscription. */
export interface MapSubscriptionOptions {
  /** allows setting initial subscription token (JWT) */
  token?: string;
  /** allows setting function to get/refresh subscription token,
   * this will only be called when new token needed, not on every resubscribe. */
  getToken?: (ctx: SubscriptionTokenContext) => Promise<string>;
  /** data to send to a server with subscribe command */
  data?: any;
  /** min delay between resubscribe attempts. */
  minResubscribeDelay?: number;
  /** max delay between resubscribe attempts. */
  maxResubscribeDelay?: number;
  /** Page size for map state/stream pagination (default: 100) */
  pageSize?: number;
  /** Delta compression format (currently only 'fossil' supported).
   * When set, the server may send delta-encoded publications for bandwidth savings. */
  delta?: 'fossil';
  /** Strategy for handling unrecoverable position errors (code 112) in map subscriptions.
   * - 'from_scratch': (default) auto-recover by resubscribing from snapshot
   * - 'fatal': go to unsubscribed state, let user handle */
  unrecoverableStrategy?: MapUnrecoverableStrategy;
  /** When true, stream catch-up publications are applied to the state snapshot by key
   * (last value wins, `removed: true` deletes the key) before the sync event is emitted.
   * The app gets a single sync with the state as of the moment the subscription went live,
   * and no individual update events for catch-up publications.
   *
   * When false (default), sync contains the state snapshot as-is and catch-up publications
   * are emitted as individual update events after sync.
   *
   * Only safe when stream publication payload matches state representation (same shape,
   * last value wins). If your stream carries a different payload than state (e.g. deltas,
   * computed events), leave this false — applying stream payload to state would overwrite
   * the canonical state with a non-snapshot value. */
  applyCatchUpToState?: boolean;
}

/** Internal options interface used by Subscription class.
 * Extends SubscriptionOptions with map-specific options using internal naming. */
export interface InternalSubscriptionOptions extends SubscriptionOptions {
  map?: boolean;
  mapPageSize?: number;
  mapUnrecoverableStrategy?: MapUnrecoverableStrategy;
  mapPresenceType?: number; // 1=MAP (default), 2=MAP_CLIENTS, 3=MAP_USERS
  mapApplyCatchUpToState?: boolean;
  sharedPoll?: boolean;
  sharedPollGetSignature?: (ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>;
  // getState is inherited from SubscriptionOptions — no separate internal name needed
}

/** Strategy for handling unrecoverable position errors in map subscriptions */
export type MapUnrecoverableStrategy = 'from_scratch' | 'fatal';

/** Stream position describes the position of a publication inside a stream.  */
export interface StreamPosition {
  offset: number;
  epoch: string;
}

/** Phase constants for map subscriptions */
export enum MapPhase {
  Live = 0,    // Join live pub/sub (default)
  Stream = 1,  // Paginating over stream (history catch-up)
  State = 2,   // Paginating over state (map state)
}

/** Map update context — emitted via 'update' event for map subscriptions */
export interface MapUpdateContext extends PublicationContext {
  /** The key identifying this entry */
  key: string;
  /** True if this publication represents a removal */
  removed?: boolean;
  /** Score associated with this entry */
  score: number;
}

/** Update context for shared poll subscriptions */
export interface SharedPollUpdateContext {
  /** Channel name */
  channel: string;
  /** The key identifying this entity */
  key: string;
  /** Current entity data (null when removed) */
  data: any;
  /** True if this entity was removed */
  removed?: boolean;
  /** Entity version */
  version?: number;
}

/** Complete state snapshot for map subscriptions (emitted on initial join and full resync) */
export interface MapSyncContext {
  /** All current entries, ordered by score for ordered subscriptions */
  entries: MapUpdateContext[];
}

/** Tracked item for shared poll subscriptions */
export interface SharedPollTrackItem {
  /** The key identifying this entity */
  key: string;
  /** Current version the client has for this entity (0 = no version known) */
  version: number;
}

/** Context passed to the getSignature callback for shared poll subscriptions */
export interface SharedPollSignatureContext {
  /** All currently tracked keys that need a signature */
  keys: string[];
}

/** Result expected from the getSignature callback */
export interface SharedPollSignatureResult {
  /** Keys to track (can be a subset of input keys to revoke removed ones) */
  keys: string[];
  /** HMAC signature authorizing these keys */
  signature: string;
}

/** Options for shared poll subscriptions */
export interface SharedPollSubscriptionOptions {
  /** Callback to get/refresh the HMAC signature for tracked keys.
   * Called on reconnect (to replay tracked items), on signature TTL expiry,
   * and when using the simplified `track(keys)` overload.
   * Required for `track(keys)` and reconnect replay; optional only when
   * every `track()` call provides an explicit signature. */
  getSignature?: (ctx: SharedPollSignatureContext) => Promise<SharedPollSignatureResult>;
  /** Delta compression type (e.g. 'fossil') */
  delta?: 'fossil';
  /** min delay between resubscribe attempts */
  minResubscribeDelay?: number;
  /** max delay between resubscribe attempts */
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
