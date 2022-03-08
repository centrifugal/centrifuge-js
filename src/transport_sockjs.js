export class SockjsTransport {
  constructor(endpoint, options) {
    this.endpoint = endpoint;
    this.options = options;
    this._transport = null;
  }

  name() {
    return 'sockjs';
  }

  subName() {
    return 'sockjs-' + this._transport.transport;
  }

  emulation() {
    return false;
  }

  supported() {
    return this.options.sockjs !== null;
  }

  initialize(_protocol, callbacks, _connectCommand) {
    const sockjsOptions = {
      transports: this.options.transports
    };
    if (this.options.server !== null) {
      sockjsOptions.server = this.options.server;
    }
    if (this.options.timeout !== null) {
      sockjsOptions.timeout = this.options.timeout;
    }

    this._transport = new this.options.sockjs(this.endpoint, null, sockjsOptions);

    this._transport.onopen = () => {
      callbacks.onOpen();
    };

    this._transport.onerror = e => {
      callbacks.onError(e);
    };

    this._transport.onclose = closeEvent => {
      callbacks.onClose(closeEvent);
    };

    this._transport.onmessage = event => {
      callbacks.onMessage(event.data);
    };
  }

  close() {
    this._transport.close();
  }

  send(data) {
    this._transport.send(data);
  }
}
