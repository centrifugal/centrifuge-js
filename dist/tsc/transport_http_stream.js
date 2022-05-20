"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStreamTransport = void 0;
class HttpStreamTransport {
    constructor(endpoint, options) {
        // @ts-ignore
        this.endpoint = endpoint;
        // @ts-ignore
        this.options = options;
        // @ts-ignore
        this._abortController = null;
        // @ts-ignore
        this._utf8decoder = new TextDecoder();
        // @ts-ignore
        this._protocol = 'json';
    }
    name() {
        return 'http_stream';
    }
    subName() {
        return 'http_stream';
    }
    emulation() {
        return true;
    }
    _handleErrors(response) {
        if (!response.ok)
            throw new Error(response.status);
        return response;
    }
    _fetchEventTarget(self, endpoint, options) {
        const eventTarget = new EventTarget();
        // fetch with connection timeout maybe? https://github.com/github/fetch/issues/175
        const fetchFunc = self.options.fetch;
        fetchFunc(endpoint, options)
            .then(self._handleErrors)
            .then(response => {
            eventTarget.dispatchEvent(new Event('open'));
            let jsonStreamBuf = '';
            let jsonStreamPos = 0;
            let protoStreamBuf = new Uint8Array();
            const reader = response.body.getReader();
            return new self.options.readableStream({
                start(controller) {
                    function pump() {
                        return reader.read().then(({ done, value }) => {
                            // When no more data needs to be consumed, close the stream
                            if (done) {
                                eventTarget.dispatchEvent(new Event('close'));
                                controller.close();
                                return;
                            }
                            try {
                                if (self._protocol === 'json') {
                                    jsonStreamBuf += self._utf8decoder.decode(value);
                                    while (jsonStreamPos < jsonStreamBuf.length) {
                                        if (jsonStreamBuf[jsonStreamPos] === '\n') {
                                            const line = jsonStreamBuf.substring(0, jsonStreamPos);
                                            eventTarget.dispatchEvent(new MessageEvent('message', { data: line }));
                                            jsonStreamBuf = jsonStreamBuf.substring(jsonStreamPos + 1);
                                            jsonStreamPos = 0;
                                        }
                                        else {
                                            ++jsonStreamPos;
                                        }
                                    }
                                }
                                else {
                                    let mergedArray = new Uint8Array(protoStreamBuf.length + value.length);
                                    mergedArray.set(protoStreamBuf);
                                    mergedArray.set(value, protoStreamBuf.length);
                                    protoStreamBuf = mergedArray;
                                    while (true) {
                                        const result = self.options.decoder.decodeReply(protoStreamBuf);
                                        if (result.ok) {
                                            const data = protoStreamBuf.slice(0, result.pos);
                                            eventTarget.dispatchEvent(new MessageEvent('message', { data: data }));
                                            protoStreamBuf = protoStreamBuf.slice(result.pos);
                                            continue;
                                        }
                                        break;
                                    }
                                }
                            }
                            catch (error) {
                                // @ts-ignore
                                eventTarget.dispatchEvent(new Event('error', { detail: error }));
                                eventTarget.dispatchEvent(new Event('close'));
                                controller.close();
                                return;
                            }
                            pump();
                        }).catch(function (e) {
                            // @ts-ignore
                            eventTarget.dispatchEvent(new Event('error', { detail: e }));
                            eventTarget.dispatchEvent(new Event('close'));
                            controller.close();
                            return;
                        });
                    }
                    return pump();
                }
            });
        })
            .catch(error => {
            // @ts-ignore
            eventTarget.dispatchEvent(new Event('error', { detail: error }));
            eventTarget.dispatchEvent(new Event('close'));
        });
        return eventTarget;
    }
    supported() {
        // @ts-ignore
        return this.options.fetch !== null &&
            // @ts-ignore
            this.options.readableStream !== null &&
            typeof TextDecoder !== 'undefined' &&
            typeof AbortController !== 'undefined' &&
            typeof EventTarget !== 'undefined' &&
            typeof Event !== 'undefined' &&
            typeof MessageEvent !== 'undefined' &&
            typeof Error !== 'undefined';
    }
    initialize(protocol, callbacks, encodedConnectCommand) {
        // @ts-ignore
        this._protocol = protocol;
        // @ts-ignore
        this._abortController = new AbortController();
        let headers;
        let body;
        if (protocol === 'json') {
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            body = encodedConnectCommand;
        }
        else {
            headers = {
                'Accept': 'application/octet-stream',
                'Content-Type': 'application/octet-stream'
            };
            body = encodedConnectCommand;
        }
        // @ts-ignore
        const eventTarget = new this._fetchEventTarget(this, 
        // @ts-ignore
        this.endpoint, {
            method: 'POST',
            headers: headers,
            // @ts-ignore
            mode: this.options.requestMode,
            // @ts-ignore
            signal: this._abortController.signal,
            body: body
        });
        eventTarget.addEventListener('open', () => {
            callbacks.onOpen();
        });
        eventTarget.addEventListener('error', (e) => {
            // @ts-ignore
            this._abortController.abort();
            callbacks.onError(e);
        });
        eventTarget.addEventListener('close', () => {
            // @ts-ignore
            this._abortController.abort();
            callbacks.onClose({
                code: 4,
                reason: 'connection closed'
            });
        });
        eventTarget.addEventListener('message', (e) => {
            callbacks.onMessage(e.data);
        });
    }
    close() {
        // @ts-ignore
        this._abortController.abort();
    }
    send(data, session, node) {
        let headers;
        let body;
        const req = {
            session: session,
            node: node,
            data: data
        };
        // @ts-ignore
        if (this._protocol === 'json') {
            headers = {
                'Content-Type': 'application/json'
            };
            body = JSON.stringify(req);
        }
        else {
            headers = {
                'Content-Type': 'application/octet-stream'
            };
            // @ts-ignore
            body = this.options.encoder.encodeEmulationRequest(req);
        }
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
exports.HttpStreamTransport = HttpStreamTransport;
//# sourceMappingURL=transport_http_stream.js.map