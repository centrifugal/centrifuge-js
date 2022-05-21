export declare class SockjsTransport {
    endpoint: string;
    options: any;
    _transport: any;
    constructor(endpoint: string, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    supported(): boolean;
    initialize(_protocol: any, callbacks: any, _connectCommand: any): void;
    close(): void;
    send(data: any): void;
}
