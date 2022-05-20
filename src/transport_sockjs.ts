export class SockjsTransport {
  constructor(endpoint, options) {
    // @ts-ignore
    this.endpoint = endpoint;
    // @ts-ignore
    this.options = options;
    // @ts-ignore
    this._transport = null;
  }

  name() {
    return 'sockjs';
  }

  subName() {
    // @ts-ignore
    return 'sockjs-' + this._transport.transport;
  }

  emulation() {
    return false;
  }

  supported() {
    // @ts-ignore
    return this.options.sockjs !== null;
  }

  initialize(_protocol, callbacks, _connectCommand) {
    const sockjsOptions = {
      // @ts-ignore
      transports: this.options.transports
    };
    // @ts-ignore
    if (this.options.server !== null) {
      // @ts-ignore
      sockjsOptions.server = this.options.server;
    }
    // @ts-ignore
    if (this.options.timeout !== null) {
      // @ts-ignore
      sockjsOptions.timeout = this.options.timeout;
    }

    // @ts-ignore
    this._transport = new this.options.sockjs(this.endpoint, null, sockjsOptions);

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
