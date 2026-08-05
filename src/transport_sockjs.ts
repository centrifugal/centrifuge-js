/** @internal */
export class SockjsTransport {
  endpoint: string;
  options: any;
  _transport: any;

  constructor(endpoint: string, options: any) {
    this.endpoint = endpoint;
    this.options = options;
    this._transport = null;
  }

  name() {
    return 'sockjs';
  }

  subName() {
    // Called from debug logging, which must not throw on a transport that was
    // constructed but never initialized.
    return 'sockjs-' + this._transport?.transport;
  }

  emulation() {
    return false;
  }

  supported() {
    return this.options.sockjs !== null;
  }

  initialize(_protocol: 'json', callbacks: any) {
    this._transport = new this.options.sockjs(this.endpoint, null, this.options.sockjsOptions);

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
    try {
      this._transport?.close();
    } catch (e) {
      // already closed, or not closeable.
    }
  }

  send(data: any) {
    this._transport.send(data);
  }
}
