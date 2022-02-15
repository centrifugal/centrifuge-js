export class SockjsTransport {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this._transport = null;
  }

  name() {
    return 'sockjs';
  }

  subName() {
    return 'sockjs-' + this._transport.transport;;
  }

  isOpen() {
    return this._transport &&
      this._transport.transport &&
      this._transport.transport.readyState === this._transport.transport.OPEN;
  }

  emulation() {
    return false;
  }

  initialize(_protocol, callbacks, _connectCommand) {
    if (this.options.sockjs !== null) {
      this._transport = this.options.sockjs;
    } else {
      this._transport = global.SockJS;
    }
    const sockjsOptions = {
      transports: this.options.transports
    };
    if (this.options.server !== null) {
      sockjsOptions.server = this.options.server;
    }
    if (this.options.timeout !== null) {
      sockjsOptions.timeout = this.options.timeout;
    }

    this._transport = new this.options.sockjs(this.url, null, sockjsOptions);

    this._transport.onopen = () => {
      this._transport.onheartbeat = () => callbacks.restartPing();
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
