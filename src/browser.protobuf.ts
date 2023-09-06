/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import { Centrifuge, UnauthorizedError } from './centrifuge';
import { ProtobufCodec } from './protobuf.codec';
import {
    State, SubscriptionState,
} from './types';

// @ts-ignore – required for browser build.
Centrifuge.SubscriptionState = SubscriptionState;
// @ts-ignore – need for browser build.
Centrifuge.State = State
// @ts-ignore – need for browser build.
Centrifuge.UnauthorizedError = UnauthorizedError;

export default class CentrifugeProtobuf extends Centrifuge {
    protected _formatOverride() {
        this._codec = new ProtobufCodec();
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = CentrifugeProtobuf
