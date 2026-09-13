/** @internal Collects the chunks of a binary stream and cuts complete replies out
 * of them. Appending a chunk and cutting a reply cost their own size only, not the
 * size of what is buffered: a large reply arriving in many small chunks is not
 * copied again for every chunk. */
export class ReplyStreamBuffer {
  private _buf = new Uint8Array(0);
  private _start = 0;
  private _end = 0;

  push(chunk: Uint8Array): void {
    const size = this._end - this._start;
    if (this._end + chunk.length > this._buf.length) {
      if (size + chunk.length <= this._buf.length / 2) {
        // Enough room once the data already cut out is dropped.
        this._buf.copyWithin(0, this._start, this._end);
      } else {
        const buf = new Uint8Array(Math.max(this._buf.length * 2, size + chunk.length));
        buf.set(this._buf.subarray(this._start, this._end));
        this._buf = buf;
      }
      this._start = 0;
      this._end = size;
    }
    this._buf.set(chunk, this._end);
    this._end += chunk.length;
  }

  // Calls onReply with a copy of each complete reply buffered, in order.
  // decodeReply tells whether the data starts with a complete reply, and where it ends.
  drain(
    decodeReply: (data: Uint8Array) => { ok: true; pos: number } | { ok: false },
    onReply: (reply: Uint8Array) => void,
  ): void {
    while (this._start < this._end) {
      const result = decodeReply(this._buf.subarray(this._start, this._end));
      if (!result.ok) {
        break;
      }
      const end = this._start + result.pos;
      const reply = this._buf.slice(this._start, end);
      this._start = end;
      onReply(reply);
    }
    if (this._start === this._end) {
      this._start = 0;
      this._end = 0;
    }
  }
}
