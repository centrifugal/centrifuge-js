export declare class HttpStreamTransport {
    constructor(endpoint: any, options: any);
    name(): string;
    subName(): string;
    emulation(): boolean;
    _handleErrors(response: any): any;
    _fetchEventTarget(self: any, endpoint: any, options: any): EventTarget;
    supported(): boolean;
    initialize(protocol: any, callbacks: any, encodedConnectCommand: any): void;
    close(): void;
    send(data: any, session: any, node: any): void;
}
