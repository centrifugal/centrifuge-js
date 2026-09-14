import { LineStreamBuffer, ReplyStreamBuffer } from './stream_buffer';

/** @internal */
export class HttpStreamTransport {
  endpoint: string;
  options: any;
  _abortController: any | null;
  _protocol: string;

  constructor(endpoint, options) {
    this.endpoint = endpoint;
    this.options = options;
    this._abortController = null;
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
        const jsonStreamBuf = new LineStreamBuffer();
        const protoStreamBuf = new ReplyStreamBuffer();
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
                    jsonStreamBuf.push(value, line => eventTarget.dispatchEvent(new MessageEvent('message', { data: line })));
                  } else {
                    protoStreamBuf.push(value);
                    protoStreamBuf.drain(
                      data => self.options.decoder.decodeReply(data),
                      reply => eventTarget.dispatchEvent(new MessageEvent('message', { data: reply })),
                    );
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
    // Not created if initialize() threw before creating it.
    if (this._abortController !== null) {
      this._abortController.abort();
    }
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
      // Closing the transport aborts requests still pending, e.g. hung in an
      // intermediary, which would otherwise keep connections of the per-host pool.
      signal: this._abortController.signal
    }
    fetchFunc(this.options.emulationEndpoint, fetchOptions).then(response => {
      // The server has no node of the session (404), e.g. the node was restarted, or
      // the server or an intermediary failed. Other statuses, e.g. a too large request
      // body, reject only this command. A session gone from a running node is answered
      // with 204: its stream ends then.
      if (response && (response.status === 404 || response.status >= 500)) {
        this.close();
      }
    }, () => {
      // The command was not delivered. Close the transport so the client
      // reconnects instead of waiting for the command timeout.
      this.close();
    });
  }
}
