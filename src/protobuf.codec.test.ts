import { Writer } from 'protobufjs/minimal';
import { centrifugal } from './client_proto';
import { ProtobufCodec } from './protobuf.codec';

// Streaming transports (http_stream, WebTransport) feed decodeReply whatever has
// been read so far, which may end anywhere inside a reply.

const Reply = centrifugal.centrifuge.protocol.Reply;

function encodeReply(dataSize: number): Uint8Array {
  const writer = Writer.create();
  Reply.encodeDelimited({ push: { channel: 'ch', pub: { data: new Uint8Array(dataSize).fill(122), offset: 1 } } }, writer);
  return writer.finish();
}

describe('ProtobufCodec.decodeReply', () => {
  const codec = new ProtobufCodec();

  test('needs more data when the reply is incomplete', () => {
    // The length prefix of this reply takes 3 bytes: cuts 1 and 2 end inside it.
    const reply = encodeReply(70000);
    for (const cut of [0, 1, 2, 3, 10, 1000, reply.length - 1]) {
      expect(codec.decodeReply(reply.slice(0, cut))).toEqual({ ok: false });
    }
    expect(codec.decodeReply(reply)).toEqual({ ok: true, pos: reply.length });
  });

  test('returns the end of the first complete reply', () => {
    const first = encodeReply(10);
    const second = encodeReply(20);
    const both = new Uint8Array(first.length + second.length);
    both.set(first);
    both.set(second, first.length);
    expect(codec.decodeReply(both)).toEqual({ ok: true, pos: first.length });
    expect(codec.decodeReply(both.slice(0, first.length + 1))).toEqual({ ok: true, pos: first.length });
  });

  test('still throws on a malformed complete reply', () => {
    // Length 1, then a field with the invalid wire type 7.
    expect(() => codec.decodeReply(new Uint8Array([1, 0x0f]))).toThrow();
  });
});
