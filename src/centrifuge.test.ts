import { Centrifuge } from './centrifuge'
import {
  DisconnectedContext,
  Error as CentrifugeError,
  PublicationContext,
  TransportName,
  UnsubscribedContext,
  State,
  SubscriptionState,
  SubscribedContext,
} from './types';
import {
  disconnectedCodes,
  unsubscribedCodes,
  connectingCodes,
} from './codes';

import WebSocket from 'ws';
import EventSource from 'eventsource';
import { fetch } from 'undici';
import { ReadableStream } from 'node:stream/web';

test('invalid endpoint', () => {
  expect(() => { new Centrifuge('') }).toThrowError();
});

test('no websocket constructor', async () => {
  const c = new Centrifuge('ws://localhost:8000/connection/websocket');
  expect(() => { c.connect() }).toThrowError();
});

const transportCases = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
  // ['http_stream', 'http://localhost:8000/connection/http_stream'],
  // ['sse', 'http://localhost:8000/connection/sse'],
]

const websocketOnly = [
  ['websocket', 'ws://localhost:8000/connection/websocket'],
]

test.each(transportCases)("%s: connects and disconnects", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
  });

  let disconnectCalled: any;
  const p = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })

  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  c.disconnect();
  const ctx = await p;
  expect(c.state).toBe(State.Disconnected);
  expect(ctx.code).toBe(disconnectedCodes.disconnectCalled);
});

test.each(transportCases)("%s: subscribe and unsubscribe", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let unsubscribeCalled: any;
  const p = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubscribeCalled = resolve;
  })

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');
  sub.on('unsubscribed', (ctx: UnsubscribedContext) => {
    unsubscribeCalled(ctx);
  });

  sub.subscribe()
  await sub.ready(5000);
  expect(sub.state).toBe(SubscriptionState.Subscribed);
  expect(c.state).toBe(State.Connected);

  sub.unsubscribe();
  c.disconnect();

  const ctx = await p;

  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  expect(c.state).toBe(State.Disconnected);
  expect(ctx.code).toBe(unsubscribedCodes.unsubscribeCalled)
});

test.each(transportCases)("%s: publish and receive message", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);

  let publicationReceived: any;
  const p = new Promise<PublicationContext>((resolve, _) => {
    publicationReceived = resolve;
  })

  const sub = c.newSubscription('test');
  sub.on('publication', (ctx: PublicationContext) => {
    publicationReceived(ctx);
  });
  sub.subscribe()
  await sub.ready(5000);

  await sub.publish({ "my": "data" });

  const ctx = await p;
  c.disconnect();
  expect(ctx.data).toStrictEqual({ "my": "data" });
});


test.each(transportCases)("%s: rpc buffered till connected", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let errorReceived: any;
  const p = new Promise<CentrifugeError>((resolve, _) => {
    errorReceived = resolve;
  })

  c.rpc('method', { "my": "data" }).then(function () {
    // we are not expecting data in this test, we expect Not Available error.
  }, function (err: CentrifugeError) {
    errorReceived(err);
  });

  // note: connect called after issuing rpc.
  c.connect();

  const rpcErr = await p;
  c.disconnect();
  expect(rpcErr.code).toStrictEqual(108);
});

test.each(transportCases)("%s: handles offline/online events", async (transport, endpoint) => {
  const networkEventTarget = new EventTarget();

  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    networkEventTarget: networkEventTarget,
  });

  let connectingCalled: any;
  const p = new Promise<DisconnectedContext>((resolve, _) => {
    connectingCalled = resolve;
  })

  c.on('connecting', (ctx) => {
    if (ctx.code == connectingCodes.transportClosed) {
      connectingCalled(ctx);
    }
  })

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  const offlineEvent = new Event('offline', { bubbles: true });
  networkEventTarget.dispatchEvent(offlineEvent);

  const ctx = await p;
  expect(c.state).toBe(State.Connecting);
  expect(ctx.code).toBe(connectingCodes.transportClosed);

  const onlineEvent = new Event('online', { bubbles: true });
  networkEventTarget.dispatchEvent(onlineEvent);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: not connecting on online in disconnected state", async (transport, endpoint) => {
  const networkEventTarget = new EventTarget();

  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    networkEventTarget: networkEventTarget,
  });

  c.connect();
  await c.ready(5000);
  expect(c.state).toBe(State.Connected);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);

  const onlineEvent = new Event('online', { bubbles: true });
  networkEventTarget.dispatchEvent(onlineEvent);
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: subscribe and presence", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');

  sub.subscribe()
  await sub.ready(5000);
  expect(sub.state).toBe(SubscriptionState.Subscribed);
  expect(c.state).toBe(State.Connected);

  const presence = await sub.presence();
  expect(Object.keys(presence.clients).length).toBeGreaterThan(0);

  const presenceStats = await sub.presenceStats();
  expect(presenceStats.numClients).toBeGreaterThan(0)
  expect(presenceStats.numUsers).toBeGreaterThan(0);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: connect disconnect loop", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  for (let index = 0; index < 10; index++) {
    c.connect();
    c.disconnect();
  }
  expect(c.state).toBe(State.Disconnected);
  await disconnectedPromise;
});

test.each(transportCases)("%s: subscribe and unsubscribe loop", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);
  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  for (let index = 0; index < 10; index++) {
    sub.subscribe();
    sub.unsubscribe();
  }
  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  await unsubscribedPromise;

  sub.subscribe()

  const retryWithDelay = async (fn, validate, maxRetries, delay) => {
    for (let i = 0; i < maxRetries; i++) {
      const result = await fn();
      if (validate(result)) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Validation failed after retries");
  };

  const presenceStats1 = await retryWithDelay(
    () => sub.presenceStats(),
    (stats: any) => stats.numClients === 1 && stats.numUsers === 1,
    10,
    200
  );

  const presence1 = await retryWithDelay(
    () => sub.presence(),
    (presence: any) => Object.keys(presence.clients).length === 1,
    10,
    200
  );

  expect(presenceStats1.numClients).toBe(1);
  expect(presenceStats1.numUsers).toBe(1);
  expect(Object.keys(presence1.clients).length).toBe(1);

  await sub.unsubscribe()

  const presenceStats2 = await retryWithDelay(
    () => c.presenceStats('test'),
    (stats: any) => stats.numClients === 0 && stats.numUsers === 0,
    10,
    200
  );

  const presence2 = await retryWithDelay(
    () => c.presence('test'),
    (presence: any) => Object.keys(presence.clients).length === 0,
    10,
    200
  );

  expect(presenceStats2.numClients).toBe(0);
  expect(presenceStats2.numUsers).toBe(0);
  expect(Object.keys(presence2.clients).length).toBe(0);

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

// Make sure we can unsubscribe right after connect called and connect/subscribe
// frames not sent yet.
test.each(transportCases)("%s: unsubscribe right after connect", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  c.connect();
  await c.ready(5000);

  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  let subcribeCalled: any;
  const subscribedPromise = new Promise<SubscribedContext>((resolve, _) => {
    subcribeCalled = resolve;
  })

  sub.on('subscribed', (ctx) => {
    subcribeCalled(ctx);
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  sub.subscribe();
  c.disconnect();
  c.connect();
  sub.unsubscribe();

  expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  await unsubscribedPromise;

  sub.subscribe();
  await subscribedPromise;

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

// Make sure we can unsubscribe right after connect frame sent but reply has not been yet received.
// This is important to cover bug described in https://github.com/centrifugal/centrifuge-js/pull/274.
test.each(websocketOnly)("%s: unsubscribe in between connect command and reply", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation'
  });

  const sub = c.newSubscription('test');

  let unsubcribeCalled: any;
  const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve, _) => {
    unsubcribeCalled = resolve;
  })
  let subcribeCalled: any;
  const subscribedPromise = new Promise<SubscribedContext>((resolve, _) => {
    subcribeCalled = resolve;
  })

  // @ts-ignore this is only for test purposes.
  c.on('__centrifuge_debug:connect_frame_sent', () => {
    sub.unsubscribe();
    unsubcribeCalled()
  })

  sub.on('subscribed', (ctx) => {
    subcribeCalled(ctx);
  })
  sub.on('unsubscribed', (ctx) => {
    unsubcribeCalled(ctx);
  })

  sub.subscribe();
  c.connect();

  await unsubscribedPromise;
  await c.ready()

  await new Promise(r => setTimeout(r, 2000));
  sub.subscribe();

  await subscribedPromise;

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

// Make sure we can resubscribe when offline event triggered before WebSocket transport open.
test.each(websocketOnly)("%s: reconnect after close before transport open", async (transport, endpoint) => {
  const networkEventTarget = new EventTarget();

  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    networkEventTarget: networkEventTarget,
  });

  const offlineEvent = new Event('offline', { bubbles: true });

  // @ts-ignore this is only for test purposes.
  c.once('__centrifuge_debug:transport_initialized', () => {
    networkEventTarget.dispatchEvent(offlineEvent);
  })

  c.connect();

  await c.ready()

  let disconnectCalled: any;
  const disconnectedPromise = new Promise<DisconnectedContext>((resolve, _) => {
    disconnectCalled = resolve;
  })
  c.on('disconnected', (ctx) => {
    disconnectCalled(ctx);
  })

  c.disconnect();
  await disconnectedPromise;
  expect(c.state).toBe(State.Disconnected);
});

test.each(transportCases)("%s: connects and subscribes with token", async (transport, endpoint) => {
  for (let index = 0; index < 5; index++) {
    // Connection token for anonymous user without ttl. Using an HMAC secret key used in tests ("secret").
    const connectToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzgwNzg4MjR9.MTb3higWfFW04E9-8wmTFOcf4MEm-rMDQaNKJ1VU_n4";
    let numConnectTokenCalls = 0;
    let numSubscribeTokenCalls = 0;
    const c = new Centrifuge([{
      transport: transport as TransportName,
      endpoint: endpoint,
    }], {
      getToken: async function (): Promise<string> {
        const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
        await sleep(Math.random() * 100);
        numConnectTokenCalls++;
        return connectToken;
      },
      websocket: WebSocket,
      fetch: fetch,
      eventsource: EventSource,
      readableStream: ReadableStream,
      emulationEndpoint: 'http://localhost:8000/emulation',
    });

    // Subscription tokens for anonymous users without ttl. Using an HMAC secret key used in tests ("secret").
    const testTokens = {
      'test1': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzIzNDgsImNoYW5uZWwiOiJ0ZXN0MSJ9.eqPQxbBtyYxL8Hvbkm-P6aH7chUsSG_EMWe-rTwF_HI",
    }

    c.connect();

    const sub = c.newSubscription('test1', {
      getToken: async function () {
        // Sleep for a random time between 0 and 100 milliseconds to emulate network.
        const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
        await sleep(Math.random() * 100);
        numSubscribeTokenCalls++;
        return testTokens['test1'];
      }
    });

    // Create a promise for the 'unsubscribed' event of this subscription.
    const unsubscribedPromise = new Promise<UnsubscribedContext>((resolve) => {
      sub.on("unsubscribed", (ctx) => {
        resolve(ctx);
      });
    });

    // Actually subscribe.
    sub.subscribe();

    await sub.ready(5000);
    expect(sub.state).toBe(SubscriptionState.Subscribed);

    // The client itself should be connected now.
    expect(c.state).toBe(State.Connected);

    sub.unsubscribe();
    c.disconnect();

    await unsubscribedPromise;
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
    expect(c.state).toBe(State.Disconnected);

    expect(numConnectTokenCalls).toBe(1);
    expect(numSubscribeTokenCalls).toBe(1);
  }
});

test.each(transportCases)("%s: subscribes and unsubscribes from many subs", async (transport, endpoint) => {
  const c = new Centrifuge([{
    transport: transport as TransportName,
    endpoint: endpoint,
  }], {
    websocket: WebSocket,
    fetch: fetch,
    eventsource: EventSource,
    readableStream: ReadableStream,
    emulationEndpoint: 'http://localhost:8000/emulation',
    // debug: true
  });
  // Keep an array of promises so that we can wait for each subscription's 'unsubscribed' event.
  const unsubscribedPromises: Promise<UnsubscribedContext>[] = [];

  const channels = [
    'test1',
    'test2',
    'test3',
    'test4',
    'test5',
  ];

  // Subscription tokens for anonymous users without ttl. Using an HMAC secret key used in tests ("secret").
  const testTokens = {
    'test1': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzIzNDgsImNoYW5uZWwiOiJ0ZXN0MSJ9.eqPQxbBtyYxL8Hvbkm-P6aH7chUsSG_EMWe-rTwF_HI",
    'test2': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzIzODcsImNoYW5uZWwiOiJ0ZXN0MiJ9.tTJB3uSa8XpEmCvfkmrSKclijofnJ5RkQk6L2SaGtUE",
    'test3': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzIzOTgsImNoYW5uZWwiOiJ0ZXN0MyJ9.nyLcMrIot441CszOKska7kQIjo2sEm8pSxV1XWfNCsI",
    'test4': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzI0MDksImNoYW5uZWwiOiJ0ZXN0NCJ9.wWAX2AhJX6Ep4HVexQWSVF3-cWytVhzY9Pm7QsMdCsI",
    'test5': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzc1MzI0MTgsImNoYW5uZWwiOiJ0ZXN0NSJ9.hCSfpHYws5TXLKkN0bW0DU6C-wgEUNuhGaIy8W1sT9o"
  }

  c.connect();

  const subscriptions: any[] = [];

  for (const channel of channels) {
    const sub = c.newSubscription(channel, {
      getToken: async function () {
        // Sleep for a random time between 0 and 100 milliseconds to emulate network.
        const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
        await sleep(Math.random() * 100);
        return testTokens[channel];
      }
    });

    // Create a promise for the 'unsubscribed' event of this subscription.
    const unsubPromise = new Promise<UnsubscribedContext>((resolve) => {
      sub.on("unsubscribed", (ctx) => {
        resolve(ctx);
      });
    });
    unsubscribedPromises.push(unsubPromise);

    // Actually subscribe.
    sub.subscribe();
    subscriptions.push(sub);
  }

  // Wait until all subscriptions are in the Subscribed state.
  await Promise.all(
    subscriptions.map(async (sub) => {
      await sub.ready(5000);
      expect(sub.state).toBe(SubscriptionState.Subscribed);
    })
  );

  // The client itself should be connected now.
  expect(c.state).toBe(State.Connected);

  // Unsubscribe from all and then disconnect.
  subscriptions.forEach((sub) => {
    sub.unsubscribe();
  });
  c.disconnect();

  // Wait until all 'unsubscribed' events are received.
  const unsubscribedContexts = await Promise.all(unsubscribedPromises);

  // Confirm each subscription is now Unsubscribed.
  subscriptions.forEach((sub) => {
    expect(sub.state).toBe(SubscriptionState.Unsubscribed);
  });

  // The client should be disconnected.
  expect(c.state).toBe(State.Disconnected);

  // Assert the correct unsubscribe code for each subscription.
  unsubscribedContexts.forEach((ctx) => {
    expect(ctx.code).toBe(unsubscribedCodes.unsubscribeCalled);
  });
});
