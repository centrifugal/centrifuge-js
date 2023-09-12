/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import { Centrifuge } from './centrifuge';
import { ProtobufCodec } from './protobuf.codec';

export default class CentrifugeProtobuf extends Centrifuge {
    protected _formatOverride() {
        this._codec = new ProtobufCodec();
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = CentrifugeProtobuf
