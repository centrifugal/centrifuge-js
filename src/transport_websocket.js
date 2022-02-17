export class WebsocketTransport {
  constructor(endpoint, options) {
    this.endpoint = endpoint;
    this.options = options;
    this._transport = null;
  }

  name() {
    return 'websocket';
  }

  subName() {
    return 'websocket';
  }

  isOpen() {
    return this._transport && this._transport.readyState === this._transport.OPEN;
  }

  emulation() {
    return false;
  }

  initialize(protocol, callbacks, _connectCommand) {
    const subProtocol = '';
    if (protocol === 'protobuf') {
      subProtocol = 'centrifuge-protobuf';
    }
    if (subProtocol !== '') {
      this._transport = new this.options.websocket(this.endpoint, subProtocol);
    } else {
      this._transport = new this.options.websocket(this.endpoint);
    }
    if (protocol === 'protobuf') {
      this._transport.binaryType = 'arraybuffer';
    }

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
