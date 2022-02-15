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
        let streamBuf = '';
        let streamPos = 0;
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
                  streamBuf += self._utf8decoder.decode(value);
                } catch (error) {
                  eventTarget.dispatchEvent(new CustomEvent('error', { detail: error }));
                }
                while (streamPos < streamBuf.length) {
                  if (streamBuf[streamPos] === '\n') {
                    const line = streamBuf.substring(0, streamPos);
                    eventTarget.dispatchEvent(new MessageEvent('message', { data: line }));
                    streamBuf = streamBuf.substring(streamPos + 1);
                    streamPos = 0;
                  } else {
                    ++streamPos;
                  }
                }
                pump();
              }).catch(function (e) {
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
      });
    return eventTarget;
  }

  initialize(_, callbacks, connectCommand) {
    this._abortController = new AbortController();

    const eventTarget = new this._fetchEventTarget(
      this,
      this.url,
      {
        method: 'POST',
        headers: new Headers({
          'accept': 'application/json',
          'content-type': 'application/json'
        }),
        mode: this.options.requestMode,
        signal: this._abortController.signal,
        body: JSON.stringify(connectCommand)
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
      let code = 4;
      let reason = 'connection closed';
      callbacks.onClose(code, reason, true);
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
    fetch(this.options.emulationEndpoint, {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json'
      }),
      mode: this.options.emulationRequestMode, // change to same-origin if sharing same host.
      body: JSON.stringify({
        session: session,
        node: node,
        data: data
      })
    });
  }
}
