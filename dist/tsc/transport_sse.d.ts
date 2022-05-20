export declare class SseTransport {
    constructor(endpoint: any, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    supported(): boolean;
    initialize(_protocol: any, callbacks: any, encodedConnectCommand: any): void;
    close(): void;
    send(data: any, session: any, node: any): void;
}
