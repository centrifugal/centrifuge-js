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
  subscriptionGetState = 13,
  sharedPollGetSignature = 14,
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
  messageSizeLimit = 3,
  // Server-sent: the connection's cached state and/or token are no longer valid.
  // The client clears the connection token (to force getToken), invalidates all
  // subscription state, and reconnects. Delivered as a Disconnect push or a raw
  // WebSocket close code.
  stateInvalidated = 3014
}

export enum subscribingCodes {
  subscribeCalled = 0,
  transportClosed = 1
}

export enum unsubscribedCodes {
  unsubscribeCalled = 0,
  unauthorized = 1,
  clientClosed = 2,
  // Server-sent (in an Unsubscribe push): this subscription's cached state
  // and/or token are no longer valid. The client clears the subscription state
  // and resubscribes (this is a temporary unsubscribe, code >= 2500).
  stateInvalidated = 2502
}

export enum subscriptionFlags {
  channelCompaction = 1,
  rejectUnrecovered = 2,
}
