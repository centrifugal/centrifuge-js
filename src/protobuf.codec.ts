import { Writer, Reader } from 'protobufjs/minimal'
import { centrifugal } from './client_proto';
import { applyDelta } from './fossil';

const Command = centrifugal.centrifuge.protocol.Command;
const Reply = centrifugal.centrifuge.protocol.Reply;
const EmulationRequest = centrifugal.centrifuge.protocol.EmulationRequest;

/** @internal */
export class ProtobufCodec {
  name(): string {
    return 'protobuf';
  }

  encodeEmulationRequest(req: centrifugal.centrifuge.protocol.IEmulationRequest): Uint8Array {
    const writer = Writer.create();
    EmulationRequest.encode(req, writer);
    return writer.finish();
  }

  encodeCommands(commands: centrifugal.centrifuge.protocol.ICommand[]): Uint8Array {
    const writer = Writer.create();
    for (const command of commands) {
      writer.fork();
      Command.encodeDelimited(command, writer);
    }
    return writer.finish();
  }

  encodeReplies(replies: centrifugal.centrifuge.protocol.IReply[]): Uint8Array {
    const writer = Writer.create();
    for (const reply of replies) {
      writer.fork();
      Reply.encodeDelimited(reply, writer);
    }
    return writer.finish();
  }

  decodeReplies(data: ArrayBuffer | Uint8Array): centrifugal.centrifuge.protocol.Reply[] {
    const replies: centrifugal.centrifuge.protocol.Reply[] = [];
    const reader = Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      const reply = Reply.decodeDelimited(reader);
      replies.push(reply);
    }
    return replies;
  }

  decodeCommands(data: ArrayBuffer | Uint8Array): centrifugal.centrifuge.protocol.Command[] {
    const commands: centrifugal.centrifuge.protocol.Command[] = [];
    const reader = Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      const reply = Command.decodeDelimited(reader);
      commands.push(reply);
    }
    return commands;
  }

  decodeReply(data: ArrayBuffer | Uint8Array): { ok: true; pos: number } | { ok: false } {
    const reader = Reader.create(new Uint8Array(data));
    while (reader.pos < reader.len) {
      Reply.decodeDelimited(reader);
      return {
        ok: true,
        pos: reader.pos
      };
    }
    return {
      ok: false
    };
  }

  applyDeltaIfNeeded(pub: centrifugal.centrifuge.protocol.IPublication, prevValue: Uint8Array): { newData: Uint8Array; newPrevValue: Uint8Array } {
    let newData: Uint8Array, newPrevValue: Uint8Array;
    if (pub.delta) {
      // binary delta.
      const valueArray = applyDelta(prevValue, pub.data!);
      newData = new Uint8Array(valueArray)
      newPrevValue = valueArray;
    } else {
      // full binary data.
      newData = pub.data!;
      newPrevValue = pub.data!;
    }
    return { newData, newPrevValue }
  }
}
