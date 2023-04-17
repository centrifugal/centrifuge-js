export const errorCodes = {
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
  connectionClosed: 11,
  badConfiguration: 12,
};

export const connectingCodes = {
  connectCalled: 0,
  transportClosed: 1,
  noPing: 2,
  subscribeTimeout: 3,
  unsubscribeError: 4
};

export const disconnectedCodes = {
  disconnectCalled: 0,
  unauthorized: 1,
  badProtocol: 2,
  messageSizeLimit: 3
};

export const subscribingCodes = {
  subscribeCalled: 0,
  transportClosed: 1
};

export const unsubscribedCodes = {
  unsubscribeCalled: 0,
  unauthorized: 1,
  clientClosed: 2
};
