// Type definitions for centrifuge 2.1.5
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
        onPrivateSubscribe?: (message: {data: SubscribePrivateMessage}, cb: (resp: any) => void) => void;
    }
    export class Subscription extends EventEmitter {
        constructor(centrifuge: Centrifuge, channel: string, events: (...args: any[]) => void);
        channel: string;
        ready(callback: (context: SubscribeSuccessContext) => void, errback: (context: SubscribeErrorContext) => void): void;
        subscribe(): void;
        unsubscribe(): void;
        publish(data: any): Promise<any>;
        presence(): Promise<any>;
        presenceStats(): Promise<any>;
        history(): Promise<any>;
    }
    export interface SubscriptionEvents {
        publish?: (message: PublishMessage) => void;
        join?: (message: JoinLeaveMessage) => void;
        leave?: (message: JoinLeaveMessage) => void;
        subscribe?: (context: SubscribeSuccessContext) => void;
        error?: (errContext: SubscribeErrorContext) => void;
        unsubscribe?: (context: UnsubscribeContext) => void;
    }
    export interface PublishMessage {
        uid: string;
        data: any;
        client?: string;
        info?: MessageInfo;
    }
    export interface MessageInfo {
        user? : string;
        client? : string;
        default_info?: object;
        channel_info?: object;
    }
    export interface JoinLeaveMessage {
        info: JoinLeaveMessageInfo;
    }
    export interface JoinLeaveMessageInfo {
        user : string;
        client : string;
        conn_info?: object;
        chan_info?: object;
    }
    export interface SubscribePrivateMessage {
        client: string;
        channels: string[] | object[];
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
}
