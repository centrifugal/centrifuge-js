export class SseTransport {
  constructor(endpoint, options) {
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

  initialize(_protocol, callbacks, encodedConnectCommand) {
    let url = new URL(this.endpoint);
    url.searchParams.append('cf_connect', encodedConnectCommand);

    const eventSource = new this.options.eventsource(url.toString());
    this._transport = eventSource;

    const self = this;

    eventSource.onopen = function (e) {
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
    this._transport.close();
    if (this._onClose !== null) {
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
    const fetchFunc = this.options.fetch;
    fetchFunc(this.options.emulationEndpoint, {
      method: 'POST',
      headers: headers,
      mode: this.options.emulationRequestMode,
      body: body
    });
  }
}
