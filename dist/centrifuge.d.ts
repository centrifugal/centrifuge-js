// Type definitions for centrifuge 2.*.*
// Project: https://github.com/centrifugal/centrifuge-js
// Definitions by: Jekaspekas <https://github.com/jekaspekas>
// TypeScript Version: 3.4.5

import EventEmitter from 'events';

export = Centrifuge;

declare class Centrifuge extends EventEmitter {
    constructor(url: string, options?: Centrifuge.Options);
    setToken(token: string): void;
    setConnectData(data: any): void;
    rpc(data: any): Promise<any>;
    send(data: any): Promise<{}>;
    publish(channel: string, data: any): Promise<{}>;
    getSub(channel: string): Centrifuge.Subscription;
    isConnected(): boolean;
    connect(): void;
    disconnect(): void;
    ping(): void;
    startBatching(): void;
    stopBatching(): void;
    startSubscribeBatching(): void;
    stopSubscribeBatching(): void;
    subscribe(channel: string, events?: (...args: any[]) => void): Centrifuge.Subscription;
    subscribe(channel: string, events?: Centrifuge.SubscriptionEvents): Centrifuge.Subscription;
}

declare namespace Centrifuge {
    
    export interface Options {
        debug?: boolean;
        sockjs?: any;
        promise?: any;
        minRetry?: number;
        maxRetry?: number;
        timeout?: number;
        ping?: boolean;
        pingInterval?: number;
        pongWaitTimeout?: number;
        privateChannelPrefix?: string;
        onTransportClose?: boolean;
        sockjsServer?: string | null;
        sockjsTransports?: string[];
        refreshEndpoint?: string;
        refreshHeaders?: object;
        refreshParams?: object;
        refreshData?: object;
        refreshAttempts?: number | null;
        refreshInterval?: number;
        onRefreshFailed?: () => void;
        onRefresh?: (context: object, cb: (resp: any) => void) => void;
        subscribeEndpoint?: string;
        subscribeHeaders?: object;
        subscribeParams?: object;
        subRefreshInterval?: number;
        onPrivateSubscribe?: (message: {data: SubscribePrivateContext}, cb: (resp: SubscribePrivateResponse) => void) => void;
    }

    export class Subscription extends EventEmitter {
        channel: string;
        ready(callback: (context: SubscribeSuccessContext) => void, errback: (context: SubscribeErrorContext) => void): void;
        subscribe(): void;
        unsubscribe(): void;
        publish(data: any): Promise<undefined>;
        presence(): Promise<PresenceResult>;
        presenceStats(): Promise<PresenceStatsResult>;
        history(): Promise<HistoryResult>;
    }

    export interface SubscriptionEvents {
        publish?: (message: PublishContext) => void;
        join?: (message: JoinLeaveMessage) => void;
        leave?: (message: JoinLeaveMessage) => void;
        subscribe?: (context: SubscribeSuccessContext) => void;
        error?: (errContext: SubscribeErrorContext) => void;
        unsubscribe?: (context: UnsubscribeContext) => void;
    }

    export interface PublishContext {
        data: any;
        client?: string;
        info?: MessageInfo;
    }

    export interface MessageInfo {
        user? : string;
        client? : string;
        default_info?: any;
        channel_info?: any;
    }

    export interface JoinLeaveMessage {
        info: ClientInfo;
    }

    export interface ClientInfo {
        user?: string;
        client?: string;
        conn_info?: object;
        chan_info?: object;
    }

    export interface SubscribeSuccessContext {
        channel: string;
        isResubscribe: boolean;
        recovered: boolean;
    }

    export interface SubscribeErrorContext {
        error: string;
        channel: string;
        isResubscribe: boolean;
    }

    export interface UnsubscribeContext {
        channel: string;
    }
  
    export interface SubscribePrivateContext {
        client: string;
        channels: string[];
    }
  
    export interface SubscribePrivateResponse {
        channels: PrivateChannelData[];
    }

    export interface PrivateChannelData {
        channel: string;
        token: string;
    }

    export interface PresenceResult {
        presence: PresenceMap;
    }

    export interface PresenceMap {
        [key: string]: ClientInfo;
    }

    export interface PresenceStatsResult {
        num_clients: number;
        num_users: number;
    }

    export interface HistoryResult {
        publications: Publication[];
    }

    export interface Publication {
        seq?: number;
        gen?: number;
        uid?: string;
        data?: any;
        info?: ClientInfo;
    }

}
