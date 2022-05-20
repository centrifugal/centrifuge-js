export declare class WebsocketTransport {
    constructor(endpoint: any, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    supported(): boolean;
    initialize(protocol: any, callbacks: any, _connectCommand: any): void;
    close(): void;
    send(data: any): void;
}
