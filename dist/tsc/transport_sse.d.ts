export declare class SseTransport {
    endpoint: string;
    options: any;
    _protocol: string;
    _transport: any;
    _onClose: any;
    constructor(endpoint: string, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    supported(): boolean;
    initialize(_protocol: any, callbacks: any, encodedConnectCommand: any): void;
    close(): void;
    send(data: any, session: string, node: string): void;
}
