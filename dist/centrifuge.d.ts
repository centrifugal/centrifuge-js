// Type definitions for centrifuge 3.*.*

import {subscribingCodes, unsubscribedCodes} from "../src/codes";

export = Centrifuge;

type EventMap = {
  [key: string]: (...args: any[]) => void
}

type EventListener<Events extends EventMap, ContextMap extends Record<keyof Events, unknown>, Event extends keyof Events> = (ctx: ContextMap[Event]) => void

declare class TypedEventEmitter<Events extends EventMap, ListenerContextMap extends Record<keyof Events, unknown>> {
  addListener<E extends keyof Events>(event: E, listener: EventListener<Events, ListenerContextMap, E>): this
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

declare class Centrifuge extends TypedEventEmitter<Centrifuge.Events, Centrifuge.EventNamesToContext> {
  state: Centrifuge.State;
  constructor(endpoint: string | Array<Centrifuge.TransportEndpoint>, options?: Centrifuge.Options);
  newSubscription(channel: string, options?: Centrifuge.SubscriptionOptions): Centrifuge.Subscription;
  getSubscription(channel: string): Centrifuge.Subscription | null;
  removeSubscription(sub: Centrifuge.Subscription): void;
  subscriptions(): Map<string, Centrifuge.Subscription>;
  connect(): void;
  disconnect(): void;
  send(data: any): Promise<void>;
  rpc(method: string, data: any): Promise<Centrifuge.RpcResult>;
  publish(channel: string, data: any): Promise<Centrifuge.PublishResult>;
  history(channel: string, options?: Centrifuge.HistoryOptions): Promise<Centrifuge.HistoryResult>;
  presence(channel: string): Promise<Centrifuge.PresenceResult>;
  presenceStats(channel: string): Promise<Centrifuge.PresenceStatsResult>;
  startBatching(): void;
  stopBatching(): void;
  ready(timeout?: number): Promise<void>;
}

declare namespace Centrifuge {

  enum State {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected"
  }

  enum EventNames {
    state = 'state',
    connecting = 'connecting',
    connected = 'connected',
    disconnected = 'disconnected',
    error = 'error',

    // Server-side subscription events.
    publication = 'publication',
    join = 'join',
    leave = 'leave',
    subscribed = 'subscribed',
    subscribing = 'subscribing',
    unsubscribed = 'unsubscribed',
  }

  type EventNamesToContext = {
    [EventNames.state]: StateContext
    [EventNames.connecting]: ConnectingContext
    [EventNames.connected]: ConnectedContext
    [EventNames.disconnected]: DisconnectedContext
    [EventNames.error]: ErrorContext

    [EventNames.publication]: PublicationContext
    [EventNames.join]: JoinContext
    [EventNames.leave]: LeaveContext
    [EventNames.subscribed]: SubscribedContext
    [EventNames.subscribing]: SubscribingContext
    [EventNames.unsubscribed]: UnsubscribedContext
  }

  type Events = {
    [eventName in EventNames]: (ctx: EventNamesToContext[eventName]) => void
  }

  enum SubscriptionState {
    Unsubscribed = "unsubscribed",
    Subscribing = "subscribing",
    Subscribed = "subscribed"
  }

  type SubscriptionEvents = {
    state: (ctx: SubscriptionStateContext) => void;
    subscribing: (ctx: SubscribingContext) => void;
    subscribed: (ctx: SubscribedContext) => void;
    unsubscribed: (ctx: UnsubscribedContext) => void;
    error: (ctx: SubscriptionErrorContext) => void;
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

  export class Subscription extends TypedEventEmitter<SubscriptionEvents> {
    channel: string;
    state: SubscriptionState;
    subscribe(): void;
    unsubscribe(): void;
    publish(data: any): Promise<PublishResult>;
    history(options?: HistoryOptions): Promise<HistoryResult>;
    presence(): Promise<PresenceResult>;
    presenceStats(): Promise<PresenceStatsResult>;
    cancel(): void;
    ready(timeout?: number): Promise<void>;
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

  export interface SubscribedContext {
    channel: string;
    streamPosition?: StreamPosition;
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

  export interface SubscribingContext {
    channel: string;
    code: number;
    reason: string;
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
    data?: any;
    token?: string;
    since?: StreamPosition;
    minResubscribeDelay?: number;
    maxResubscribeDelay?: number;
  }

  export interface StreamPosition {
    offset: number;
    epoch: string;
  }
}
