import { Centrifuge, UnauthorizedError } from './centrifuge';
import { Subscription } from './subscription';
import { ProtobufCodec } from './protobuf.codec';
export * from "./types";
export * from "./codes";

class CentrifugeProtobuf extends Centrifuge {
  protected _formatOverride() {
    this._codec = new ProtobufCodec();
  }
}

export {
  CentrifugeProtobuf as Centrifuge,
  UnauthorizedError,
  Subscription
}
