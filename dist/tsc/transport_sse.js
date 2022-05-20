"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseTransport = void 0;
class SseTransport {
    constructor(endpoint, options) {
        // @ts-ignore
        this.endpoint = endpoint;
        // @ts-ignore
        this.options = options;
        // @ts-ignore
        this._protocol = 'json';
        // @ts-ignore
        this._transport = null;
        // @ts-ignore
        this._onClose = null;
    }
    name() {
        return 'sse';
    }
    subName() {
        return 'sse';
    }
    emulation() {
        return true;
    }
    supported() {
        // @ts-ignore
        return this.options.eventsource !== null && this.options.fetch !== null;
    }
    initialize(_protocol, callbacks, encodedConnectCommand) {
        // @ts-ignore
        let url = new URL(this.endpoint);
        url.searchParams.append('cf_connect', encodedConnectCommand);
        // @ts-ignore
        const eventSource = new this.options.eventsource(url.toString());
        // @ts-ignore
        this._transport = eventSource;
        const self = this;
        eventSource.onopen = function () {
            callbacks.onOpen();
        };
        eventSource.onerror = function (e) {
            eventSource.close();
            callbacks.onError(e);
            callbacks.onClose({
                code: 4,
                reason: 'connection closed'
            });
        };
        eventSource.onmessage = function (e) {
            callbacks.onMessage(e.data);
        };
        // @ts-ignore
        self._onClose = function () {
            callbacks.onClose({
                code: 4,
                reason: 'connection closed'
            });
        };
    }
    close() {
        // @ts-ignore
        this._transport.close();
        // @ts-ignore
        if (this._onClose !== null) {
            // @ts-ignore
            this._onClose();
        }
    }
    send(data, session, node) {
        const req = {
            session: session,
            node: node,
            data: data
        };
        const headers = {
            'Content-Type': 'application/json'
        };
        const body = JSON.stringify(req);
        // @ts-ignore
        const fetchFunc = this.options.fetch;
        // @ts-ignore
        fetchFunc(this.options.emulationEndpoint, {
            method: 'POST',
            headers: headers,
            // @ts-ignore
            mode: this.options.emulationRequestMode,
            body: body
        });
    }
}
exports.SseTransport = SseTransport;
//# sourceMappingURL=transport_sse.js.map