export declare class WebsocketTransport {
    private _transport;
    private endpoint;
    private options;
    constructor(endpoint: string, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    supported(): boolean;
    initialize(protocol: any, callbacks: any, _connectCommand: any): void;
    close(): void;
    send(data: any): void;
}
