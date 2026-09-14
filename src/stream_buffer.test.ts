import { Writer } from 'protobufjs/minimal';
import { centrifugal } from './client_proto';
import { ProtobufCodec } from './protobuf.codec';
import { LineStreamBuffer, ReplyStreamBuffer } from './stream_buffer';

const Reply = centrifugal.centrifuge.protocol.Reply;

function encodeReply(dataSize: number, offset: number): Uint8Array {
  const writer = Writer.create();
  Reply.encodeDelimited({ push: { channel: 'ch', pub: { data: new Uint8Array(dataSize).fill(122), offset } } }, writer);
  return writer.finish();
}

function concat(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    all.set(p, pos);
    pos += p.length;
  }
  return all;
}

const hex = (data: Uint8Array) => Buffer.from(data).toString('hex');

describe('ReplyStreamBuffer', () => {
  const codec = new ProtobufCodec();

  test('cuts out the replies in order, whatever the chunk boundaries', () => {
    const replies = [encodeReply(10, 1), encodeReply(300, 2), encodeReply(0, 3), encodeReply(70000, 4), encodeReply(5, 5)];
    const stream = concat(replies);
    for (const chunkSize of [1, 2, 3, 7, 64, 1000, 65536, stream.length]) {
      const buffer = new ReplyStreamBuffer();
      const out: Uint8Array[] = [];
      for (let i = 0; i < stream.length; i += chunkSize) {
        buffer.push(stream.slice(i, i + chunkSize));
        buffer.drain(data => codec.decodeReply(data), reply => out.push(reply));
      }
      expect(out.map(hex)).toEqual(replies.map(hex));
    }
  });

  test('replies handed out stay intact while more data is buffered', () => {
    const replies = [encodeReply(100, 1), encodeReply(100, 2), encodeReply(100, 3)];
    const buffer = new ReplyStreamBuffer();
    const out: Uint8Array[] = [];
    for (const reply of replies) {
      buffer.push(reply);
      buffer.drain(data => codec.decodeReply(data), r => out.push(r));
    }
    expect(out.map(hex)).toEqual(replies.map(hex));
  });

  test('releases the memory of a large reply once it is cut out', () => {
    const large = encodeReply(1024 * 1024, 1);
    const small = encodeReply(10, 2);
    // The last chunk read with the large reply holds a part of the next one.
    const stream = concat([large, small.subarray(0, 5)]);
    const buffer = new ReplyStreamBuffer();
    const out: Uint8Array[] = [];
    for (let i = 0; i < stream.length; i += 1024) {
      buffer.push(stream.slice(i, i + 1024));
      buffer.drain(data => codec.decodeReply(data), reply => out.push(reply));
    }
    expect(out.map(hex)).toEqual([hex(large)]);
    expect((buffer as any)._buf.length).toBeLessThanOrEqual(64 * 1024);

    buffer.push(small.slice(5));
    buffer.drain(data => codec.decodeReply(data), reply => out.push(reply));
    expect(out.map(hex)).toEqual([hex(large), hex(small)]);
  });
});

describe('LineStreamBuffer', () => {
  const encoder = new TextEncoder();

  test('cuts out the lines in order, whatever the chunk boundaries', () => {
    const lines = ['{"a":1}', '', '{"b":"ж€😀"}', 'x'.repeat(70000), '{"c":3}\r'];
    const stream = encoder.encode(lines.join('\n') + '\n');
    for (const chunkSize of [1, 2, 3, 7, 64, 1000, 65536, stream.length]) {
      const buffer = new LineStreamBuffer();
      const out: string[] = [];
      for (let i = 0; i < stream.length; i += chunkSize) {
        buffer.push(stream.slice(i, i + chunkSize), line => out.push(line));
      }
      expect(out).toEqual(lines);
    }
  });

  test('a line is handed out only once its newline arrives', () => {
    const buffer = new LineStreamBuffer();
    const out: string[] = [];
    buffer.push(encoder.encode('{"a":1}\n{"b"'), line => out.push(line));
    expect(out).toEqual(['{"a":1}']);
    buffer.push(encoder.encode(':2}\n'), line => out.push(line));
    expect(out).toEqual(['{"a":1}', '{"b":2}']);
  });
});
