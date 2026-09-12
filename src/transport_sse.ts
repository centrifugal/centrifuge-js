/** @internal */
export class SseTransport {
  endpoint: string;
  options: any;
  _protocol: string;
  _transport: any;
  _onClose: any;
  _abortController: any | null;

  constructor(endpoint: string, options: any) {
    this.endpoint = endpoint;
    this.options = options;
    this._protocol = 'json';
    this._transport = null;
    this._onClose = null;
    this._abortController = null;
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
    // Aborts pending emulation requests on close.
    if (typeof AbortController !== 'undefined') {
      this._abortController = new AbortController();
    }
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

    self._onClose = function () {
      callbacks.onClose({
        code: 4,
        reason: 'connection closed'
      });
    };
  }

  close() {
    if (this._abortController !== null) {
      this._abortController.abort();
    }
    // No event source if its constructor threw in initialize().
    if (this._transport !== null) {
      this._transport.close();
    }
    if (this._onClose !== null) {
      this._onClose();
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
    // Closing the transport aborts requests still pending, e.g. hung in an
    // intermediary, which would otherwise keep connections of the per-host pool.
    const signal = this._abortController !== null ? this._abortController.signal : undefined;
    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: body,
      mode: 'cors',
      credentials: 'same-origin',
      signal: signal
    }
    fetchFunc(this.options.emulationEndpoint, fetchOptions).then(response => {
      // The session is gone (404), or the server or an intermediary failed. Other
      // statuses, e.g. a too large request body, reject only this command.
      if (response && (response.status === 404 || response.status >= 500)) {
        this.close();
      }
    }, () => {
      // Aborted because the transport was closed already.
      if (signal && signal.aborted) {
        return;
      }
      // The command was not delivered. Close the transport so the client
      // reconnects instead of waiting for the command timeout.
      this.close();
    });
  }
}
