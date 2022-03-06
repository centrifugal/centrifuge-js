// Type definitions for centrifuge 3.*.*

export = Centrifuge;

// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/globals.d.ts
declare class EventEmitter {
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners(event: string | symbol): Function[];
    rawListeners(event: string | symbol): Function[];
    emit(event: string | symbol, ...args: any[]): boolean;
    listenerCount(type: string | symbol): number;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    eventNames(): Array<string | symbol>;
}

declare class Centrifuge extends EventEmitter {
    constructor(endpoint: string | Array<Centrifuge.TransportEndpoint>, options?: Centrifuge.Options);
    newSubscription(channel: string, options?: Centrifuge.SubscribeOptions): Centrifuge.Subscription;
    getSubscription(channel: string): Centrifuge.Subscription;
    state(): string;
    connect(): void;
    disconnect(): void;
    close(): void;
    send(data: any): Promise<any>;
    rpc(method: string, data: any): Promise<any>;
    publish(channel: string, data: any): Promise<Centrifuge.PublishResult>;
    history(channel: string, options?: Centrifuge.HistoryOptions): Promise<Centrifuge.HistoryResult>;
    presence(channel: string): Promise<Centrifuge.PresenceResult>;
    presenceStats(channel: string): Promise<Centrifuge.PresenceStatsResult>;
    startBatching(): void;
    stopBatching(): void;
}

declare namespace Centrifuge {

    export interface TransportEndpoint {
        transport: string;
        endpoint: string;
    }

    export interface Options {
        protocol?: string;
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
        getConnectionToken?: (ctx: ConnectionTokenContext) => Promise<string>
        getSubscriptionToken?: (ctx: SubscriptionTokenContext) => Promise<string>

        // TODO: remove?
        pingInterval?: number;
        pongWaitTimeout?: number;
    }

    export interface Events {
        connect?: (ctx: ConnectContext) => void;
        disconnect?: (ctx: DisconnectContext) => void;
        close?: (ctx: CloseContext) => void;
        publication?: (ctx: PublicationContext) => void;
        join?: (ctx: JoinLeaveContext) => void;
        leave?: (ctx: JoinLeaveContext) => void;
        subscribe?: (ctx: SubscribeSuccessContext) => void;
        unsubscribe?: (ctx: UnsubscribeContext) => void;
    }

    export interface ConnectContext {
        client: string;
        transport: string;
        data?: any;
    }

    export interface DisconnectContext {
        code: number;
        reason: string;
        reconnect: boolean; 
    }

    export interface CloseContext {
        reason: string;
    }

    export class Subscription extends EventEmitter {
        channel: string;
        subscribe(opts?: SubscribeOptions): void;
        unsubscribe(): void;
        close(): void;
        cancel(): void;
        publish(data: any): Promise<PublishResult>;
        history(options?: HistoryOptions): Promise<HistoryResult>;
        presence(): Promise<PresenceResult>;
        presenceStats(): Promise<PresenceStatsResult>;
    }

    export interface SubscriptionEvents {
        publication?: (ctx: PublicationContext) => void;
        join?: (ctx: JoinLeaveContext) => void;
        leave?: (ctx: JoinLeaveContext) => void;
        subscribe?: (ctx: SubscribeSuccessContext) => void;
        error?: (ctx: SubscribeErrorContext) => void;
        unsubscribe?: (ctx: UnsubscribeContext) => void;
        close?: (ctx: SubscriptionCloseContext) => void;
    }

    export interface SubscriptionCloseContext {
        channel: string;
        reason: string;
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
        user?: string;
        connInfo?: any;
        chanInfo?: any;
    }

    export interface JoinLeaveContext {
        channel: string;
        info: ClientInfo;
    }

    export interface SubscribeSuccessContext {
        channel: string;
        streamPosition?: StreamPosition;
        data?: any;
    }

    export interface SubscribeErrorContext {
        channel: string;
        error: string;
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

    export interface PresenceResult {
        clients: ClientsMap;
    }

    export interface ClientsMap {
        [key: string]: ClientInfo;
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

    export interface SubscriptionOptions extends SubscribeOptions {}

    export interface StreamPosition {
        offset: number;
        epoch: string;
    }
}
