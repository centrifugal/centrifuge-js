export enum errorCodes {
  timeout = 1,
  transportClosed = 2,
  clientDisconnected = 3,
  clientClosed = 4,
  clientConnectToken = 5,
  clientRefreshToken = 6,
  subscriptionUnsubscribed = 7,
  subscriptionSubscribeToken = 8,
  subscriptionRefreshToken = 9,
  transportWriteError = 10,
  connectionClosed = 11,
  badConfiguration = 12,
}

export enum connectingCodes {
  connectCalled = 0,
  transportClosed = 1,
  noPing = 2,
  subscribeTimeout = 3,
  unsubscribeError = 4
}

export enum disconnectedCodes {
  disconnectCalled = 0,
  unauthorized = 1,
  badProtocol = 2,
  messageSizeLimit = 3
}

export enum subscribingCodes {
  subscribeCalled = 0,
  transportClosed = 1
}

export enum unsubscribedCodes {
  unsubscribeCalled = 0,
  unauthorized = 1,
  clientClosed = 2
}
