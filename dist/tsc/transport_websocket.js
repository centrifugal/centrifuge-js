"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketTransport = void 0;
class WebsocketTransport {
    constructor(endpoint, options) {
        this.endpoint = endpoint;
        this.options = options;
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
        return this.options.websocket !== undefined && this.options.websocket !== null;
    }
    initialize(protocol, callbacks, _connectCommand) {
        let subProtocol = '';
        if (protocol === 'protobuf') {
            subProtocol = 'centrifuge-protobuf';
        }
        if (subProtocol !== '') {
            this._transport = new this.options.websocket(this.endpoint, subProtocol);
        }
        else {
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