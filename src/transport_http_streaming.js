export function HttpStreamingTransportSupported() {
  return typeof TextDecoder !== 'undefined' &&
    typeof AbortController !== 'undefined' &&
    typeof EventTarget !== 'undefined' &&
    typeof ReadableStream !== 'undefined' &&
    typeof Error !== 'undefined';
}

export class HttpStreamingTransport {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this._open = false;
    this._abortController = null;
    this._utf8decoder = new TextDecoder();
    this._protocol = 'json';
  }

  name() {
    return 'http-streaming';
  }

  subName() {
    return 'http-streaming';
  }

  isOpen() {
    return this._open;
  }

  emulation() {
    return true;
  }

  _handleErrors(response) {
    if (!response.ok) throw new Error(response.status);
    return response;
  }

  _fetchEventTarget(self, url, options) {
    const eventTarget = new EventTarget();
    // fetch with connection timeout maybe? https://github.com/github/fetch/issues/175
    fetch(url, options)
      .then(self._handleErrors)
      .then(response => {
        eventTarget.dispatchEvent(new Event('open'));
        let jsonStreamBuf = '';
        let jsonStreamPos = 0;
        let protoStreamBuf = new Uint8Array();
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            function pump() {
              return reader.read().then(({ done, value }) => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                  eventTarget.dispatchEvent(new CloseEvent('close'));
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
                      } else {
                        ++jsonStreamPos;
                      }
                    }
                  } else {
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
                } catch (error) {
                  eventTarget.dispatchEvent(new CustomEvent('error', { detail: error }));
                  eventTarget.dispatchEvent(new CloseEvent('close'));
                  controller.close();
                  return;
                }
                pump();
              }).catch(function (e) {
                eventTarget.dispatchEvent(new CustomEvent('error', { detail: e }));
                eventTarget.dispatchEvent(new CloseEvent('close'));
                controller.close();
                return;
              });
            }
            return pump();
          }
        });
      })
      .catch(error => {
        eventTarget.dispatchEvent(new CustomEvent('error', { detail: error }));
        eventTarget.dispatchEvent(new CloseEvent('close'));
      });
    return eventTarget;
  }

  initialize(protocol, callbacks, encodedConnectCommand) {
    this._protocol = protocol;
    this._abortController = new AbortController();

    let headers;
    let body;
    if (protocol === 'json') {
      headers = new Headers({
        'accept': 'application/json',
        'content-type': 'application/json'
      });
      body = encodedConnectCommand;
    } else {
      headers = new Headers({
        'accept': 'application/octet-stream',
        'content-type': 'application/octet-stream'
      });
      body = encodedConnectCommand;
    }

    const eventTarget = new this._fetchEventTarget(
      this,
      this.url,
      {
        method: 'POST',
        headers: headers,
        mode: this.options.requestMode,
        signal: this._abortController.signal,
        body: body
      }
    );

    eventTarget.addEventListener('open', (e) => {
      this._open = true;
      callbacks.onOpen();
    });

    eventTarget.addEventListener('error', (e) => {
      this._open = false;
      this._abortController.abort();
      callbacks.onError(e);
    });

    eventTarget.addEventListener('close', (e) => {
      this._open = false;
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
    this._open = false;
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
    if (this._protocol === 'json') {
      headers = new Headers({
        'content-type': 'application/json'
      });
      body = JSON.stringify(req);
    } else {
      headers = new Headers({
        'content-type': 'application/octet-stream'
      });
      body = this.options.encoder.encodeEmulationRequest(req);
    }

    fetch(this.options.emulationEndpoint, {
      method: 'POST',
      headers: headers,
      mode: this.options.emulationRequestMode,
      body: body
    });
  }
}
