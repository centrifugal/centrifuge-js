export declare const errorCodes: {
    timeout: number;
    transportClosed: number;
    clientDisconnected: number;
    clientClosed: number;
    clientConnectToken: number;
    clientRefreshToken: number;
    subscriptionUnsubscribed: number;
    subscriptionSubscribeToken: number;
    subscriptionRefreshToken: number;
    transportWriteError: number;
    connectionClosed: number;
};
export declare const connectingCodes: {
    connectCalled: number;
    transportClosed: number;
    noPing: number;
    subscribeTimeout: number;
    unsubscribeError: number;
};
export declare const disconnectedCodes: {
    disconnectCalled: number;
    unauthorized: number;
    badProtocol: number;
    messageSizeLimit: number;
};
export declare const subscribingCodes: {
    subscribeCalled: number;
    transportClosed: number;
};
export declare const unsubscribedCodes: {
    unsubscribeCalled: number;
    unauthorized: number;
    clientClosed: number;
};
