/** @internal */
export class WebtransportTransport {
  private _transport: any;
  private _stream: any;
  private _writer: any;
  private endpoint: string;
  private options: any;
  _utf8decoder: TextDecoder;
  _protocol: string;

  constructor(endpoint: string, options: any) {
    this.endpoint = endpoint;
    this.options = options;
    this._transport = null;
    this._stream = null;
    this._writer = null;
    this._utf8decoder = new TextDecoder();
    this._protocol = 'json';
  }

  name() {
    return 'webtransport';
  }

  subName() {
    return 'webtransport';
  }

  emulation() {
    return false;
  }

  supported() {
    return this.options.webtransport !== undefined && this.options.webtransport !== null;
  }

  async initialize(protocol: string, callbacks: any) {
    let url: any;
    if (globalThis && globalThis.document && globalThis.document.baseURI) {
      // Handle case when endpoint is relative, like //example.com/connection/webtransport
      url = new URL(this.endpoint, globalThis.document.baseURI);
    } else {
      url = new URL(this.endpoint);
    }
    if (protocol === 'protobuf') {
      url.searchParams.append('cf_protocol', 'protobuf');
    }

    this._protocol = protocol;
    const eventTarget = new EventTarget();

    this._transport = new this.options.webtransport(url.toString());
    this._transport.closed.then(() => {
      callbacks.onClose({
        code: 4,
        reason: 'connection closed'
      });
    }).catch(() => {
      callbacks.onClose({
        code: 4,
        reason: 'connection closed'
      });
    });
    try {
      await this._transport.ready;
    } catch {
      this.close();
      return;
    }
    let stream: any;
    try {
      stream = await this._transport.createBidirectionalStream();
    } catch {
      this.close();
      return;
    }
    this._stream = stream;
    this._writer = this._stream.writable.getWriter();

    eventTarget.addEventListener('close', () => {
      callbacks.onClose({
        code: 4,
        reason: 'connection closed'
      });
    });

    eventTarget.addEventListener('message', (e: any) => {
      callbacks.onMessage(e.data);
    });

    this._startReading(eventTarget);

    callbacks.onOpen();
  }

  async _startReading(eventTarget: any) {
    const reader = this._stream.readable.getReader();
    let jsonStreamBuf = '';
    let jsonStreamPos = 0;
    let protoStreamBuf = new Uint8Array();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (value.length > 0) {
          if (this._protocol === 'json') {
            jsonStreamBuf += this._utf8decoder.decode(value);
            while (jsonStreamPos < jsonStreamBuf.length) {
              if (jsonStreamBuf[jsonStreamPos] === '\n') {
                const line = jsonStreamBuf.substring(0, jsonStreamPos);
                eventTarget.dispatchEvent(new MessageEvent('message', { data: line }));
                jsonStreamBuf = jsonStreamBuf.substring(jsonStreamPos + 1);
                jsonStreamPos = 0;
              } else {
                ++jsonStreamPos;
              }
            }
          } else {
            const mergedArray = new Uint8Array(protoStreamBuf.length + value.length);
            mergedArray.set(protoStreamBuf);
            mergedArray.set(value, protoStreamBuf.length);
            protoStreamBuf = mergedArray;

            while (true) {
              const result = this.options.decoder.decodeReply(protoStreamBuf);
              if (result.ok) {
                const data = protoStreamBuf.slice(0, result.pos);
                eventTarget.dispatchEvent(new MessageEvent('message', { data: data }));
                protoStreamBuf = protoStreamBuf.slice(result.pos);
                continue;
              }
              break;
            }
          }
        }
        if (done) {
          break;
        }
      }
    } catch {
      eventTarget.dispatchEvent(new Event('close'));
    }
  }

  async close() {
    try {
      if (this._writer) {
        await this._writer.close();
      }
      this._transport.close();
    } catch (e) {
      // already closed.
    }
  }

  async send(data: any) {
    let binary: Uint8Array;
    if (this._protocol === 'json') {
      // Need extra \n since WT is non-frame protocol. 
      binary = new TextEncoder().encode(data + '\n');
    } else {
      binary = data;
    }
    try {
      await this._writer.write(binary);
    } catch (e) {
      this.close();
    }
  }
}
