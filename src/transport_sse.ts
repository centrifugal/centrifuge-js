/** @internal */
export class SseTransport {
  endpoint: string;
  options: any;
  _protocol: string;
  _transport: any;
  _onClose: any;

  constructor(endpoint: string, options: any) {
    this.endpoint = endpoint;
    this.options = options;
    this._protocol = 'json';
    this._transport = null;
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
    return this.options.eventsource !== null && this.options.fetch !== null;
  }

  initialize(_protocol: 'json', callbacks: any, initialData: any) {
    let url: any;
    if (globalThis && globalThis.document && globalThis.document.baseURI) {
      // Handle case when endpoint is relative, like //example.com/connection/sse
      url = new URL(this.endpoint, globalThis.document.baseURI);
    } else {
      url = new URL(this.endpoint);
    }
    url.searchParams.append('cf_connect', initialData);

    const eventsourceOptions = {}
    const eventSource = new this.options.eventsource(url.toString(), eventsourceOptions);
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

    // EventSource fires nothing when closed, so close() has to synthesize the
    // notification. Deferred, because delivering it inline would make this the
    // only transport that re-enters the client from its own close() - every
    // other one reports asynchronously, via onclose, an aborted fetch or the
    // WebTransport closed promise.
    self._onClose = function () {
      setTimeout(function () {
        callbacks.onClose({
          code: 4,
          reason: 'connection closed'
        });
      }, 0);
    };
  }

  close() {
    try {
      this._transport?.close();
    } catch (e) {
      // already closed, or not closeable.
    }
    // Deliberately outside the guard above: errors raised downstream of the
    // synthesized close must not be mistaken for a transport-close failure.
    // Consumed one-shot, so repeated close() calls cannot synthesize repeated
    // closes.
    const onClose = this._onClose;
    this._onClose = null;
    if (onClose !== null) {
      onClose();
    }
  }

  send(data: any, session: string, node: string) {
    const req = {
      session: session,
      node: node,
      data: data
    };
    const headers = {
      'Content-Type': 'application/json'
    };
    const body = JSON.stringify(req);
    const fetchFunc = this.options.fetch;
    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: body,
      mode: 'cors',
      credentials: 'same-origin',
    }
    fetchFunc(this.options.emulationEndpoint, fetchOptions);
  }
}
