"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketTransport = void 0;
class WebsocketTransport {
    constructor(endpoint, options) {
        // @ts-ignore
        this.endpoint = endpoint;
        // @ts-ignore
        this.options = options;
        // @ts-ignore
        this._transport = null;
    }
    name() {
        return 'websocket';
    }
    subName() {
        return 'websocket';
    }
    emulation() {
        return false;
    }
    supported() {
        // @ts-ignore
        return this.options.websocket !== null;
    }
    initialize(protocol, callbacks, _connectCommand) {
        let subProtocol = '';
        if (protocol === 'protobuf') {
            subProtocol = 'centrifuge-protobuf';
        }
        if (subProtocol !== '') {
            // @ts-ignore
            this._transport = new this.options.websocket(this.endpoint, subProtocol);
        }
        else {
            // @ts-ignore
            this._transport = new this.options.websocket(this.endpoint);
        }
        if (protocol === 'protobuf') {
            // @ts-ignore
            this._transport.binaryType = 'arraybuffer';
        }
        // @ts-ignore
        this._transport.onopen = () => {
            callbacks.onOpen();
        };
        // @ts-ignore
        this._transport.onerror = e => {
            callbacks.onError(e);
        };
        // @ts-ignore
        this._transport.onclose = closeEvent => {
            callbacks.onClose(closeEvent);
        };
        // @ts-ignore
        this._transport.onmessage = event => {
            callbacks.onMessage(event.data);
        };
    }
    close() {
        // @ts-ignore
        this._transport.close();
    }
    send(data) {
        // @ts-ignore
        this._transport.send(data);
    }
}
exports.WebsocketTransport = WebsocketTransport;
//# sourceMappingURL=transport_websocket.js.map