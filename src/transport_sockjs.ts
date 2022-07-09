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
    return 'sockjs-' + this._transport.transport;
  }

  emulation() {
    return false;
  }

  supported() {
    return this.options.sockjs !== null;
  }

  initialize(_protocol: 'json', callbacks: any) {
    const sockjsOptions = {};
    if (this.options.sockjsOptionsModify) {
      this.options.sockjsOptionsModify(sockjsOptions);
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

  send(data: any) {
    this._transport.send(data);
  }
}
