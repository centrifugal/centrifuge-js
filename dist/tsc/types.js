"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionState = exports.State = void 0;
var State;
(function (State) {
    State["Disconnected"] = "disconnected";
    State["Connecting"] = "connecting";
    State["Connected"] = "connected";
})(State = exports.State || (exports.State = {}));
var SubscriptionState;
(function (SubscriptionState) {
    SubscriptionState["Unsubscribed"] = "unsubscribed";
    SubscriptionState["Subscribing"] = "subscribing";
    SubscriptionState["Subscribed"] = "subscribed";
})(SubscriptionState = exports.SubscriptionState || (exports.SubscriptionState = {}));
//# sourceMappingURL=types.js.map