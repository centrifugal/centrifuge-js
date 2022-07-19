/** @internal */
export class HttpStreamTransport {
  endpoint: string;
  options: any;
  _abortController: any | null;
  _utf8decoder: TextDecoder;
  _protocol: string;

  constructor(endpoint, options) {
    this.endpoint = endpoint;
    this.options = options;
    this._abortController = null;
    this._utf8decoder = new TextDecoder();
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

  _handleErrors(response: any) {
    if (!response.ok) throw new Error(response.status);
    return response;
  }

  _fetchEventTarget(self, endpoint: string, options: object) {
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
                      } else {
                        ++jsonStreamPos;
                      }
                    }
                  } else {
                    const mergedArray = new Uint8Array(protoStreamBuf.length + value.length);
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
                  // @ts-ignore - improve later.
                  eventTarget.dispatchEvent(new Event('error', { detail: error }));
                  eventTarget.dispatchEvent(new Event('close'));
                  controller.close();
                  return;
                }
                pump();
              }).catch(function (e) {
                // @ts-ignore - improve later.
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
        // @ts-ignore - improve later.
        eventTarget.dispatchEvent(new Event('error', { detail: error }));
        eventTarget.dispatchEvent(new Event('close'));
      });
    return eventTarget;
  }

  supported() {
    return this.options.fetch !== null &&
      this.options.readableStream !== null &&
      typeof TextDecoder !== 'undefined' &&
      typeof AbortController !== 'undefined' &&
      typeof EventTarget !== 'undefined' &&
      typeof Event !== 'undefined' &&
      typeof MessageEvent !== 'undefined' &&
      typeof Error !== 'undefined';
  }

  initialize(protocol: string, callbacks: any, initialData: any) {
    this._protocol = protocol;
    this._abortController = new AbortController();
    let headers: any;
    let body: any;
    if (protocol === 'json') {
      headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      body = initialData;
    } else {
      headers = {
        'Accept': 'application/octet-stream',
        'Content-Type': 'application/octet-stream'
      };
      body = initialData;
    }

    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: body,
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-cache',
      signal: this._abortController.signal
    }

    const eventTarget = this._fetchEventTarget(
      this,
      this.endpoint,
      fetchOptions
    );

    eventTarget.addEventListener('open', () => {
      callbacks.onOpen();
    });

    eventTarget.addEventListener('error', (e) => {
      this._abortController.abort();
      callbacks.onError(e);
    });

    eventTarget.addEventListener('close', () => {
      this._abortController.abort();
      callbacks.onClose({
        code: 4,
        reason: 'connection closed'
      });
    });

    eventTarget.addEventListener('message', (e: any) => {
      callbacks.onMessage(e.data);
    });
  }

  close() {
    this._abortController.abort();
  }

  send(data: any, session: string, node: string) {
    let headers: any;
    let body: any;
    const req = {
      session: session,
      node: node,
      data: data
    };
    if (this._protocol === 'json') {
      headers = {
        'Content-Type': 'application/json'
      };
      body = JSON.stringify(req);
    } else {
      headers = {
        'Content-Type': 'application/octet-stream'
      };
      body = this.options.encoder.encodeEmulationRequest(req);
    }

    const fetchFunc = this.options.fetch;
    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: body,
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-cache'
    }
    fetchFunc(this.options.emulationEndpoint, fetchOptions);
  }
}
