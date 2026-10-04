/** @internal */
export class WebsocketTransport {
  private _transport: any;
  private endpoint: string;
  private options: any;

  constructor(endpoint: string, options: any) {
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

  emulation() {
    return false;
  }

  supported() {
    return this.options.websocket !== undefined && this.options.websocket !== null;
  }

  // handshakeConnectData is the base64url-encoded connect frame to send inside the
  // handshake (see maxHandshakeConnectSize), empty for none.
  initialize(protocol: string, callbacks: any, _initialData?: any, handshakeConnectData?: string) {
    let subProtocol = '';
    if (protocol === 'protobuf') {
      subProtocol = 'centrifuge-protobuf';
    }
    if (handshakeConnectData) {
      // The server confirms it takes the data by selecting the -hc subprotocol (see
      // handshakeConnectAccepted). A server which doesn't selects the usual one,
      // offered for JSON too: browsers fail a handshake offering subprotocols if the
      // server selects none.
      const protocols = [
        protocol === 'protobuf' ? 'cf-proto-hc' : 'cf-json-hc',
        protocol === 'protobuf' ? 'centrifuge-protobuf' : 'centrifuge-json',
        'cf-connect.' + handshakeConnectData,
      ];
      this._transport = new this.options.websocket(this.endpoint, protocols);
    } else if (subProtocol !== '') {
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

  // Whether the server took the connect frame sent inside the handshake.
  handshakeConnectAccepted(): boolean {
    if (this._transport === null) {
      return false;
    }
    return this._transport.protocol === 'cf-json-hc' || this._transport.protocol === 'cf-proto-hc';
  }

  close() {
    // No socket if its constructor threw in initialize().
    if (this._transport !== null) {
      this._transport.close();
    }
  }

  send(data: any) {
    this._transport.send(data);
  }
}
