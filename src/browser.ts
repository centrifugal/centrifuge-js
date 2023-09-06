/**
 * This file is the entrypoint of browser builds.
 */
import { Centrifuge, UnauthorizedError } from './centrifuge'
import {
    State, SubscriptionState,
} from './types';

Centrifuge.SubscriptionState = SubscriptionState;
Centrifuge.State = State
Centrifuge.UnauthorizedError = UnauthorizedError;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Centrifuge = Centrifuge
