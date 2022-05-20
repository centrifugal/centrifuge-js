"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsubscribedCodes = exports.subscribingCodes = exports.disconnectedCodes = exports.connectingCodes = exports.errorCodes = void 0;
exports.errorCodes = {
    timeout: 1,
    transportClosed: 2,
    clientDisconnected: 3,
    clientClosed: 4,
    clientConnectToken: 5,
    clientRefreshToken: 6,
    subscriptionUnsubscribed: 7,
    subscriptionSubscribeToken: 8,
    subscriptionRefreshToken: 9,
    transportWriteError: 10,
    connectionClosed: 11
};
exports.connectingCodes = {
    connectCalled: 0,
    transportClosed: 1,
    noPing: 2,
    subscribeTimeout: 3,
    unsubscribeError: 4
};
exports.disconnectedCodes = {
    disconnectCalled: 0,
    unauthorized: 1,
    badProtocol: 2,
    messageSizeLimit: 3
};
exports.subscribingCodes = {
    subscribeCalled: 0,
    transportClosed: 1
};
exports.unsubscribedCodes = {
    unsubscribeCalled: 0,
    unauthorized: 1,
    clientClosed: 2
};
//# sourceMappingURL=codes.js.map