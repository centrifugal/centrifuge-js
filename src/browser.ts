/**
 * This file is the entrypoint of browser builds.
 */
import { Centrifuge, UnauthorizedError } from './centrifuge'
import {
    State, SubscriptionState,
} from './types';

// @ts-ignore – need for browser build.
Centrifuge.SubscriptionState = SubscriptionState;
// @ts-ignore – need for browser build.
Centrifuge.State = State
// @ts-ignore – need for browser build.
Centrifuge.UnauthorizedError = UnauthorizedError;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = Centrifuge
