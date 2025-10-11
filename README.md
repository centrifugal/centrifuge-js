This SDK provides a client to connect to [Centrifugo](https://github.com/centrifugal/centrifugo) or any [Centrifuge-based](https://github.com/centrifugal/centrifuge) server using pure WebSocket or one of the alternative transports (HTTP-streaming, SSE/EventSource, experimental WebTransport) from web browser, ReactNative, or NodeJS environments.

> [!IMPORTANT]  
> This library behaves according to a common [Centrifigo SDK spec](https://centrifugal.dev/docs/transports/client_api). It's recommended to read that before starting to work with this SDK as the spec covers common SDK behavior - describes client and subscription state transitions, main options and methods. Then proceed with this readme for more specifics about `centrifuge-js`.

The features implemented by this SDK can be found in [SDK feature matrix](https://centrifugal.dev/docs/transports/client_sdk#sdk-feature-matrix).

> `centrifuge-js` v5.x is compatible with [Centrifugo](https://github.com/centrifugal/centrifugo) server v6, v5 and v4, and [Centrifuge](https://github.com/centrifugal/centrifuge) >= 0.25.0. For Centrifugo v2, Centrifugo v3 and Centrifuge < 0.25.0 you should use `centrifuge-js` v2.x.

* [Install](#install)
* [Quick start](#quick-start)
* [Supported real-time transports](#supported-real-time-transports)
    * [WebSocket transport](#websocket-transport)
    * [HTTP-based WebSocket fallbacks](#http-based-websocket-fallbacks)
    * [Using SockJS](#using-sockjs)
    * [WebTransport (experimental)](#webtransport-experimental)
* [Client API](#client-api)
    * [Client methods and events](#client-methods-and-events)
    * [Client options](#client-options)
    * [Connection token](#connection-token)
* [Subscription API](#subscription-api)
    * [Subscription methods and events](#subscription-methods-and-events)
    * [Subscription token](#subscription-token)
    * [Subscription options](#subscription-options)
* [Subscription management API](#subscription-management-api)
* [Message batching](#message-batching)
* [Server-side subscriptions](#server-side-subscriptions)
* [Protobuf support](#protobuf-support)
* [Using with NodeJS](#using-with-nodejs)
* [Custom WebSocket constructor](#custom-websocket-constructor)
* [Using with React Native on Android](#using-with-react-native-on-android)
* [Errors in callbacks](#errors-in-callbacks)
* [Run tests locally](#run-tests-locally)

## Install

SDK can be installed via `npm`:

```bash
npm install centrifuge
```

And then in your project:

```javascript
import { Centrifuge } from 'centrifuge';
```

In browser, you can import SDK from CDN (replace `5.0.0` with a concrete version number you want to use, see [releases](https://github.com/centrifugal/centrifuge-js/releases)):

```html
<script src="https://unpkg.com/centrifuge@5.0.0/dist/centrifuge.js"></script>
```

See also [centrifuge-js on cdnjs](https://cdnjs.com/libraries/centrifuge). Note that `centrifuge-js` browser builds target [ES6](https://caniuse.com/es6).

**By default, library works with JSON only**, if you want to send binary payloads go to [Protobuf support](#protobuf-support) section to see how to import client with Protobuf support.

## Quick start

The basic usage example may look like this:

```javascript
// Use WebSocket transport endpoint.
const centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

// Allocate Subscription to a channel.
const sub = centrifuge.newSubscription('news');

// React on `news` channel real-time publications.
sub.on('publication', function(ctx) {
    console.log(ctx.data);
});

// Trigger subscribe process.
sub.subscribe();

// Trigger actual connection establishement.
centrifuge.connect();
```

Note, that we explicitly call `.connect()` method to initiate connection establishement with a server and `.subscribe()` method to move Subscription to `subsribing` state (which should transform into `subscribed` state soon after connection with a server is established). The order of `.connect()` and `.subscribe` calls does not actually matter here.

**`Centrifuge` object and `Subscription` object are both instances of [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).** Below we will describe events that can be exposed in detail.

## Supported real-time transports

This SDK supports several real-time transports.

### Websocket transport

WebSocket is the main protocol used by `centrifuge-js` to communicate with a server.

In a browser environment WebSocket is available globally, but if you want to connect from NodeJS env – then you need to provide WebSocket constructor to `centrifuge-js` explicitly. [See below](#using-with-nodejs) more information about this.

It's the only transport for which you can just use a string endpoint as first argument of `Centrifuge` constructor. If you need to use other transports, or several transports – then you should use `Array<TransportEndpoint>`.

### HTTP-based WebSocket fallbacks

In the quick start example above we used WebSocket endpoint to configure Centrifuge. WebSocket is the main transport – it's bidirectional out of the box.

In some cases though, WebSocket connection may not be established (for example, due to corporate firewalls and proxies). For such situations `centrifuge-js` offers several WebSocket fallback options based on HTTP:

* HTTP-streaming based on [ReadableStream API](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
* [SSE (EventSource)](https://developer.mozilla.org/en-US/docs/Web/API/EventSource).

These two transports use Centrifugo/Centrifuge own bidirectional emulation layer. See [more details in introduction post](https://centrifugal.dev/blog/2022/07/19/centrifugo-v4-released#modern-websocket-emulation-in-javascript). Bidirectional emulation must be first enabled on a server-side. See [Centrifugo docs](https://centrifugal.dev/docs/transports/overview) to find out how.

After enabling HTTP-streaming or SSE endpoints on a server side you can slightly change client initialization and point Javascript SDK to a list of endpoints and transports you want to use:

```javascript
const transports = [
    {
        transport: 'websocket',
        endpoint: 'ws://example.com/connection/websocket'
    },
    {
        transport: 'http_stream',
        endpoint: 'http://example.com/connection/http_stream'
    },
    {
        transport: 'sse',
        endpoint: 'http://example.com/connection/sse'
    }
];
const centrifuge = new Centrifuge(transports);
centrifuge.connect()
```

In this case, client will try transports in order, one by one, during the initial handshake. Until success. Then will only use a successfully chosen transport during reconnects.

Supported transports are:

* `websocket`
* `http_stream`
* `sse`
* `sockjs` - SockJS can also be used as a fallback in Centrifugo < v6, in Centrifugo v6 SockJS was removed and will be removed in `centrifuge-js` v6 too. Also, sticky sessions must be used on the backend in distributed case with it. See more details below
* `webtransport` - this SDK also supports WebTransport in experimental form. See details below

If you want to use sticky sessions on a load balancer level as an optimimization for Centrifugal bidirectional emulation layer keep in mind that we currently use `same-origin` credentials policy for emulation requests in `http_stream` and `sse` transport cases. So cookies will only be passed in same-origin case. Please open an issue in case you need to configure more relaxed credentials. Though in most cases stickyness based on client's IP may be sufficient enough.

### Using SockJS

**SockJS usage is DEPRECATED**. Its support was removed in Centrifugo v6, and it will also be removed from this SDK in v6 release.

If you want to use SockJS you must also import SockJS client before centrifuge.js

```html
<script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js" type="text/javascript"></script>
<script src="https://unpkg.com/centrifuge@5.0.0/dist/centrifuge.js" type="text/javascript"></script>
```

Or provide it explicitly as a dependency:

```javascript
import { Centrifuge } from 'centrifuge'
import SockJS from 'sockjs-client'

const transports = [{
    transport: "sockjs",
    endpoint: "http://localhost:8000/connection/sockjs"
}];

const centrifuge = new Centrifuge(transports, {
  sockjs: SockJS
})
```

Note, that in SockJS case endpoint starts with `http://`, not with `ws://` as we used above when connecting to a pure WebSocket endpoint.

### WebTransport (experimental)

WebTransport is experimental and is only supported by Centrifugo at the moment (i.e. it's not available in Centrifuge library for Go out of the box).

Server must be additionally configured to work with WebTransport connections – see information in [Centrifugo WebTransport docs](https://centrifugal.dev/docs/transports/webtransport).

## Client API

Let's look at top-level API of `Centrifuge` client.

### Client methods and events

#### connect method

As we already showed above, we must call `connect()` method to make an actual connection
request to Centrifugo server:

```javascript
const centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');
centrifuge.connect();
```

`connect()` triggers an actual connection request to server.

#### connected event

As soon as connection is established and client successfully authenticated – `connected` event on `Centrifuge` object instance will be called.

It's possible to listen to this event by setting event listener function on `connected` event:

```javascript
centrifuge.on('connected', function(ctx) {
    // now client connected to Centrifugo and authenticated.
});
```

#### connecting event

`connecting` event fired when Centrifuge object goes to connecting state. This may be called during initial connect, or after being `connected` due to temporary connection loss.

```javascript
centrifuge.on('connecting', function(ctx) {
    // do whatever you need in case of connecting to a server
});
```

#### disconnected event

`disconnected` event fired on Centrifuge object every time client disconnects for some reason. This can be terminal disconnect due to advice from a server or disconnect initiated by client-side.

```javascript
centrifuge.on('disconnected', function(ctx) {
    // do whatever you need in case of disconnect from server
});
```

#### state event

`state` event is fired when client state changes. It provides both old and new state.

```javascript
centrifuge.on('state', function(ctx) {
    console.log('state changed from', ctx.oldState, 'to', ctx.newState);
});
```

#### disconnect method

In some cases you may need to disconnect your client from server, use `.disconnect()` method to do this:

```javascript
centrifuge.disconnect();
```

After calling this client will not try to reestablish connection periodically. You must call `.connect()` method manually again.

#### publish method

Sometimes you need to publish into channel without actually being subscribed to it. In this case you can use `publish` method:

```javascript
centrifuge.publish("channel", {"input": "hello"}).then(function(res) {
    console.log('successfully published');
}, function(err) {
    console.log('publish error', err);
});
```

#### send method

This is only valid for Centrifuge server library for Go and does not work for Centrifugo server at the moment. `send` method allows sending asynchronous message from a client to a server.

```javascript
centrifuge.send({"input": "hello"}).then(function(res) {
    console.log('successfully sent');
}, function(err) {
    console.log('send error', err);
});
```

#### rpc method

`rpc` method allows to send rpc request from client to server and wait for data response.

```javascript
centrifuge.rpc("my.method.name", {"input": "hello"}).then(function(res) {
    console.log('rpc result', res);
}, function(err) {
    console.log('rpc error', err);
});
```

#### history method

Allows to get history from a server. This is a top-level analogue of `Subscription.history` method. But accepts a channel as first argument.

```javascript
centrifuge.history("channel", {since: {offset: 0, epoch: "xyz"}, limit: 10}).then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('history error', err);
});
```

#### presence method

Allows to get presence info from a server. This is a top-level analogue of `Subscription.presence` method. But accepts a channel as first argument.

```javascript
centrifuge.presence("channel").then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('presence error', err);
});
```

#### presenceStats method

Allows to get presence stats from a server. This is a top-level analogue of `Subscription.presenceStats` method. But accepts a channel as first argument.

```javascript
centrifuge.presenceStats("channel").then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('presence stats error', err);
});
```

#### ready method

Returns a Promise which will be resolved upon connection establishement (i.e. when Client goes to `connected` state).

#### setToken method

`setToken` may be useful to dynamically change the connection token. For example when you need to implement login/logout workflow. See an example in [blog post](https://centrifugal.dev/blog/2023/06/29/centrifugo-v5-released#token-behaviour-adjustments-in-sdks).

#### setData method

`setData` (since v5.5.0) allows setting connection data (some extra payload to deliver to the backend with connection request). This only affects the next connection attempt, not the current one. Note that if `getData` callback is configured, it will override this value during reconnects.

```javascript
centrifuge.setData({ 'name': 'Maria' });
```

#### setHeaders method

`setHeaders` allows setting connection [emulated headers](https://centrifugal.dev/blog/2025/01/16/centrifugo-v6-released#headers-emulation). These headers will be sent with the next connection attempt. **Requires Centrifugo v6**.

```javascript
centrifuge.setHeaders({ 'Authorization': 'XXX' });
```

#### error event

To listen asynchronous error happening internally while Centrifuge client works you can set an `error` handler:

```javascript
const centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.on('error', function(ctx) {
    console.log(ctx);
});
```

This can help you to log failed connection attempts, or token refresh errors, etc.

### Client options

Let's look at available configuration parameters when initializing `Centrifuge` object instance.

#### token

Set initial connection token (JWT). See [Connection Token](#connection-token) section for more details.

#### getToken

Set function for getting connection token. This may be used for initial token loading and token refresh mechanism (when initial token is going to expire). See [Connection Token](#connection-token) section for more details.

#### data

Set custom data to send to a server within every connect command.

#### getData

Set function for getting/renewing connection data. This callback is called upon reconnects to get fresh connection data. In many cases you may prefer using `setData` method of Centrifuge Client instead.

```javascript
const centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    getData: async () => {
        // Return fresh data on each reconnect
        return { 'timestamp': Date.now() };
    }
});
```

#### name

Set custom client name. By default, it's set to `js`. This is useful for analytics and semantically must identify an environment from which client establishes a connection.

#### version

Version of your application - useful for analytics.

#### headers

Provide header emulation - these headers are sent with first protocol message. The backend can process those in a customized manner. In case of Centrifugo these headers are then used like real HTTP headers sent from the client. **Requires Centrifugo v6**.

```javascript
const centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    headers: {
        'X-Custom-Header': 'value',
        'Authorization': 'Bearer token'
    }
});
```

#### debug

`debug` is a boolean option which is `false` by default. When enabled lots of various debug
messages will be logged into javascript console. Mostly useful for development or
troubleshooting.

#### minReconnectDelay

When client disconnected from a server it will automatically try to reconnect using a backoff algorithm with jitter. `minReconnectDelay` option sets minimal interval value in milliseconds before first reconnect attempt. Default is `500` milliseconds.

#### maxReconnectDelay

`maxReconnectDelay` sets an upper reconnect delay value. Default is `20000` milliseconds - i.e. clients won't have delays between reconnect attempts which are larger than 20 seconds.

#### maxServerPingDelay

`maxServerPingDelay` sets the maximum delay of server pings after which connection is considered broken and client reconnects. In milliseconds. Default is `10000`.

#### timeout

Timeout for operations in milliseconds. Default is `5000`.

#### websocket

`websocket` option allows to explicitly provide custom WebSocket client to use. By default centrifuge-js will try to use global WebSocket object, so if you are in web browser – it will just use native WebSocket implementation. See notes about using `centrifuge-js` with NodeJS below.

#### fetch

Provide shim for fetch implementation. Useful when working in environments where fetch is not available globally.

#### readableStream

Provide shim for ReadableStream. Useful when working in environments where ReadableStream is not available globally.

#### eventsource

Provide shim for EventSource object. Useful when working in environments where EventSource is not available globally.

#### emulationEndpoint

Which emulation endpoint to use for bidirectional emulation transports. Default is `/emulation`.

#### sockjs

`sockjs` option allows to explicitly provide SockJS client object to Centrifuge client.

#### sockjsOptions

`sockjsOptions` allows modifying options passed to SockJS constructor. For example:

```javascript
const centrifuge = new Centrifuge(transports, {
    sockjs: SockJS,
    sockjsOptions: {
        transports: ['websocket', 'xhr-streaming'],
        timeout: 10000
    }
});
```

#### networkEventTarget

EventTarget for network online/offline events. In browser environment Centrifuge uses global window online/offline events automatically by default. This option allows providing a custom EventTarget for handling network state changes in other environments.


### Connection Token

Depending on authentication scheme used by a server you may also want to provide connection token:

```javascript
const centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket', {
    token: '<CONNECTION_TOKEN>'
});
```

In case of Centrifugo on a server side this may be a JSON Web Token - see [authentication documentation](https://centrifugal.github.io/centrifugo/server/authentication/) for details on how to generate it on your backend side.

**Connection token must come to the frontend from application backend - i.e. must be generated on the backend side**. The way to deliver token to the application frontend is up to the developer. Usually you can pass it in template rendering context or issue a separate call to request a connection token from the backend.

If the token sets connection expiration then the client SDK will keep the token refreshed. It does this by calling a special callback function. This callback must return a new token. If a new token with updated connection expiration is returned from callback then it's sent to Centrifugo. In case of error returned by your callback SDK will retry the operation after some jittered time. You can throw a special error (`throw new Centrifuge.UnauthorizedError();`) from `getToken` function to move the client into disconnected state (for example, when there is no permission to connect anymore).

An example of possible `getToken` function implementation:

```javascript
import { Centrifuge, UnauthorizedError } from 'centrifuge';

async function getToken() {
    if (!loggedIn) {
        return "";
    }
    const res = await fetch('/centrifuge/connection_token');
    if (!res.ok) {
        if (res.status === 403) {
            // Return special error to not proceed with token refreshes, client will be disconnected.
            throw new UnauthorizedError();
        }
        // Any other error thrown will result into token refresh re-attempts.
        throw new Error(`Unexpected status code ${res.status}`);
    }
    const data = await res.json();
    return data.token;
}

const client = new Centrifuge(
    'ws://localhost:8000/connection/websocket',
    {
        token: 'JWT-GENERATED-ON-BACKEND-SIDE',
        getToken: getToken
    }
);
```

> If initial token is not provided, but `getToken` is specified – then SDK assumes that developer wants to use token authentication. In this case SDK attempts to get a connection token before establishing an initial connection.

## Subscription API

What we usually want from Centrifugo is to receive new messages published into channels. To do this we must create `Subscription` object.

### Subscription methods and events

#### Subscribe to a channel

The simplest usage that allow to subscribe on channel and listen to new messages is:

```javascript
const sub = centrifuge.newSubscription('example');

sub.on('publication', function(ctx) {
    // handle new Publication data coming from channel "news".
    console.log(ctx.data);
});

sub.subscribe();
```

#### Subscription events

Some events which can be listened on Subscription object are:

* `publication` – called when new publication received from a Subscription channel
* `join` – called when someone joined channel
* `leave` – called when someone left channel
* `subscribing` - called when Subscription goes to `subscribing` state (initial subscribe and re-subscribes)
* `subscribed` – called when Subscription goes to `subscribed` state
* `unsubscribed` – called when Subscription goes to `unsubscribed` state
* `error` – called when subscription on channel failed with error. It can be called several times
    during lifetime as browser client automatically resubscribes on channels after successful reconnect 
    (caused by temporary network disconnect for example or Centrifugo server restart)

Don't be frightened by amount of events available. In most cases you only need some of them until you need full control to what happens with your subscriptions.

**`Subscription` objects are instances of [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).**

#### presence method of Subscription

`presence` allows to get information about clients which are subscribed on channel at
this moment. Note that this information is only available if `presence` option enabled
in Centrifugo configuration for all channels or for channel namespace.

```javascript
const sub = centrifuge.newSubscription("news");
sub.subscribe()

sub.presence().then(function(ctx) {
    console.log(ctx.clients);
}, function(err) {
    // presence call failed with error
});
```

`presence` is internally a promise that will be waiting for subscription subscribe success if required.

As you can see presence data is a map where keys are client IDs and values are objects
with client information.

Format of `err` in error callback:

```javascript
{
    "code": 108,
    "message": "not available"
}
```

* `code` - error code (number)
* `message` – error description (string)

*Note, that in order presence to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

#### presenceStats method of subscription

`presenceStats` allows to get two counters from a server: number of total clients currently subscribed and number of unique users currently subscribed. Note that this information is only available if `presence` option enabled in server configuration for a channel.

```javascript
sub.presenceStats().then(function(ctx) {
    console.log(ctx.numClients);
}, function(err) {
    // presence stats call failed with error
});
```

#### history method of subscription

`history` method allows to get last messages published into channel. Note that history for channel must be configured in Centrifugo to be available for `history` calls from client.

```javascript
sub.history({limit: 100}).then(function(ctx) {
    console.log(ctx.publications);
}, function(err) {
    // history call failed with error
});
```

*Note, that in order history to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

Some history options available:

* `limit` (number)
* `since` (StreamPosition)
* `reverse` (boolean)

```javascript
resp = await subscription.history({'since': {'offset': 2, 'epoch': 'xcf4w'}, limit: 100});
```

If server can't fulfill a query for history (due to stream retention - size or expiration, or malformed offset, or stream already has another epoch) then an Unrecoverable Position Error will be returned (code `112`).

To only call for current `offset` and `epoch` use:

```javascript
resp = await subscription.history({limit: 0});
```

I.e. not providing `since` and using zero `limit`.

#### publish method of subscription

`publish` method of Subscription object allows publishing data into channel directly from a client.

**Using client-side publish is not an idiomatic Centrifugo usage in many cases. Centrifugo is standalone server and when publishing from a client you won't get the message on the backend side (except using publish proxy feature of Centrifugo). In most real-life apps you need to send new data to your application backend first (using the convenient way, for example AJAX request in web app) and then publish data to Centrifugo over Centrifugo API.**

*Just like presence and history publish must be allowed in Centrifugo configuration for all channels or for channel namespace.*

```javascript
sub.publish({"input": "hello world"}).then(function() {
        // success ack from Centrifugo received
    }, function(err) {
        // publish call failed with error
    });
});
```

*Note, that in order publish to work in Centrifugo corresponding option must be enabled in server channel configuration or client should have capability to publish*.

#### unsubscribe method of subscription

You can call `unsubscribe` method to unsubscribe from a channel:

```javascript
sub.unsubscribe();
```

**Important thing to mention** is that unsubscribing from subscription does not remove event handlers you already set to that Subscription object. This allows to simply subscribe to channel again later calling `.subscribe()` method of subscription (see below). But there are cases when your code structured in a way that you need to remove event handlers after unsubscribe **to prevent them be executed twice** in the future. To do this remove event listeners explicitly after calling `unsubscribe()`:

```javascript
sub.unsubscribe();
sub.removeAllListeners();
```

#### ready method of subscription

Returns a Promise which will be resolved upon subscription success (i.e. when Subscription goes to `subscribed` state).

#### setData method of subscription

`setData` (since v5.5.0) allows setting subscription data (some extra payload to deliver to the backend with subscription request). This only applies on the next subscription attempt. Note that if `getData` callback is configured, it will override this value during resubscriptions.

#### setTagsFilter method of subscription

`setTagsFilter` (since v5.5.0) allows setting tags filter for the subscription. Cannot be used together with `delta` option.

See Centrifugo [Channel publication filtering](https://centrifugal.dev/docs/server/publication_filtering) docs.

```javascript
const tagsFilter = {
    key: "ticker",
    cmp: "eq",
    val: ticker
};
sub.setTagsFilter(tagsFilter);
```

### Subscription token

You may want to provide subscription token:

```javascript
const sub = centrifuge.newSubscription("news", {
    token: '<SUBSCRIPTION_TOKEN>'
});
```

In case of Centrifugo on a server side this may be a JSON Web Token - see [channel token auth documentation](https://centrifugal.github.io/centrifugo/server/channel_token_auth) for details on how to generate it on your backend side.

**Subscription token must come to the frontend from application backend - i.e. must be generated on the backend side**. The way to deliver token to the application frontend is up to the developer. Usually you can pass it in template rendering context or issue a separate call to request a connection token from the backend.

If token sets subscription expiration client SDK will keep token refreshed. It does this by calling special callback function. This callback must return a new token. If new token with updated subscription expiration returned from a calbback then it's sent to Centrifugo. If your callback returns an empty string – this means user has no permission to subscribe to a channel anymore and subscription will be unsubscribed. In case of error returned by your callback SDK will retry operation after some jittered time. 

An example:

```javascript
import { Centrifuge, UnauthorizedError } from 'centrifuge';

async function getToken(ctx) {
    // ctx argument has a channel.
    const res = await fetch('/centrifuge/subscription_token', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(ctx)
    });
    if (!res.ok) {
        if (res.status === 403) {
            // Return special error to not proceed with token refreshes, subscription will be unsubscribed.
            throw new UnauthorizedError();
        }
        // Any other error thrown will result into token refresh re-attempts.
        throw new Error(`Unexpected status code ${res.status}`);
    }
    const data = await res.json();
    return data.token;
}

const client = new Centrifuge('ws://localhost:8000/connection/websocket', {});

const sub = centrifuge.newSubscription(channel, {
    token: 'JWT-GENERATED-ON-BACKEND-SIDE',
    getToken: getToken,
});
sub.subscribe();
```

> If initial token is not provided, but `getToken` is specified – then SDK assumes that developer wants to use token authorization for a channel subscription. In this case SDK attempts to get a subscription token before initial subscribe.

### Subscription Options

When creating a new subscription using `centrifuge.newSubscription(channel, options)`, you can provide various options to customize subscription behavior:

#### token

Allows setting initial subscription token (JWT). See [Subscription token](#subscription-token) section for more details.

#### getToken

Allows setting function to get/refresh subscription token. This will only be called when new token needed, not on every resubscribe. See [Subscription token](#subscription-token) section for more details.

#### data

Data to send to a server with subscribe command.

#### getData

Allows setting function to get/renew subscription data during resubscriptions. In many cases you may prefer using `setData` method of Subscription instead.

```javascript
const sub = centrifuge.newSubscription("news", {
    getData: async (ctx) => {
        // ctx.channel contains channel name
        return { 'timestamp': Date.now() };
    }
});
```

#### since

Force recovery on first subscribe from a provided `StreamPosition`. This is useful when you want to recover messages from a specific point during initial Subscription initialization.

```javascript
const sub = centrifuge.newSubscription("news", {
    since: { offset: 100, epoch: 'xyz' }
});
```

#### minResubscribeDelay

Min delay between resubscribe attempts in milliseconds. Default is `500`.

#### maxResubscribeDelay

Max delay between resubscribe attempts in milliseconds. Default is `20000`.

#### delta

Delta format to be used for differential updates. Currently only `'fossil'` is supported. Cannot be used together with `tagsFilter`.

```javascript
const sub = centrifuge.newSubscription("news", {
    delta: 'fossil'
});
```

#### tagsFilter

Server-side tags filter to apply for publications in channel. Cannot be used together with `delta`.

See Centrifugo [Channel publication filtering](https://centrifugal.dev/docs/server/publication_filtering) docs.

```javascript
const tagsFilter = {
    key: "ticker",
    cmp: "eq",
    val: ticker
};

const sub = centrifuge.newSubscription("tickers", {
    tagsFilter: tagsFilter
});
```

## Subscription management API

According to [client SDK spec](https://centrifugal.dev/docs/transports/client_api#subscription-management) centrifuge-js supports several methods to manage client-side subscriptions in internal registry. The following methods are available on top level of the Centrifuge SDK client instance.

### newSubscription

`newSubscription(channel: string, options?: Partial<SubscriptionOptions>): Subscription`

Creates new `Subscription` to a channel or throws an exception if the Subscription to a channel already exists in the internal registry of the client.

### getSubscription

`getSubscription(channel: string): Subscription | null`

getSubscription returns `Subscription` if it's registered in the internal registry or `null`.

### removeSubscription

`removeSubscription(sub: Subscription | null)`

removeSubscription allows removing Subcription from the internal registry.

### subscriptions

`subscriptions(): Record<string, Subscription>`

 Get a map with all current client-side subscriptions registered in the client.

## Message batching

There is also a command batching support. It allows to send several commands to a server in one request - may be especially useful when connection established via one of HTTP-based transports.

You can start collecting commands by calling `startBatching()` method:

```javascript
centrifuge.startBatching();
```

Finally if you don't want batching anymore call `stopBatching()` method:

```javascript
centrifuge.stopBatching();
```

This call will flush all collected commands to a network.

## Server-side subscriptions

We encourage using client-side subscriptions where possible as they provide a better control and isolation from connection. But in some cases you may want to use [server-side subscriptions](https://centrifugal.dev/docs/server/server_subs) (i.e. subscriptions created by server upon connection establishment).

Technically, client SDK keeps server-side subscriptions in internal registry (similar to client-side subscriptions but without possibility to control them).

To listen for server-side subscription events use callbacks as shown in example below:

```javascript
const client = new Centrifuge('ws://localhost:8000/connection/websocket', {});

client.on('subscribed', function(ctx) {
    // Called when subscribed to a server-side channel upon Client moving to
    // connected state or during connection lifetime if server sends Subscribe
    // push message.
    console.log('subscribed to server-side channel', ctx.channel);
});

client.on('subscribing', function(ctx) {
    // Called when existing connection lost (Client reconnects) or Client
    // explicitly disconnected. Client continue keeping server-side subscription
    // registry with stream position information where applicable.
    console.log('subscribing to server-side channel', ctx.channel);
});

client.on('unsubscribed', function(ctx) {
    // Called when server sent unsubscribe push or server-side subscription
    // previously existed in SDK registry disappeared upon Client reconnect.
    console.log('unsubscribed from server-side channel', ctx.channel);
});

client.on('publication', function(ctx) {
    // Called when server sends Publication over server-side subscription.
    console.log('publication receive from server-side channel', ctx.channel, ctx.data);
});

client.connect();
```

Server-side subscription events mostly mimic events of client-side subscriptions. But again – they do not provide control to the client and managed entirely by a server side.

Additionally, Client has several top-level methods to call with server-side subscription related operations:

* `publish(channel, data)`
* `history(channel, options)`
* `presence(channel)`
* `presenceStats(channel)`

## Protobuf support

To import client which uses Protobuf protocol under the hood:

```html
<script src="https://unpkg.com/centrifuge@5.0.0/dist/centrifuge.protobuf.js"></script>
```

Or if you are developing with npm:

```javascript
import { Centrifuge } from 'centrifuge/build/protobuf';
```

This client uses [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) under the hood.

When running with Protobuf-based client, you can send and receive any binary data as `Uint8Array`. Make sure data is properly encoded when calling methods of Centrifuge Protobuf-based instance. For example, you can not just send JSON-like objects like in JSON protocol case, you need to encode data to `Uint8Array` first:

```javascript
const data = new TextEncoder("utf-8").encode(JSON.stringify({"any": "data"})); 
sub.publish(data);
```

## Using with NodeJS

NodeJS does not have native WebSocket library in std lib. To use `centrifuge-js` on Node you need to explicitly provide WebSocket constructor to the library.

First, install WebSocket dependency:

```
npm install ws
```

At this point you have 2 options. Explicitly pass WebSocket object to Centrifuge.

```javascript
import { Centrifuge } from 'centrifuge';
import WebSocket from 'ws';

var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    websocket: WebSocket
})
```

Or define it globally:

```javascript
import { Centrifuge } from 'centrifuge';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

const centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket');
```

## Custom WebSocket constructor

If you are building a client for a non-browser environment and want to pass custom headers then you can use the following approach to wrap a WebSocket constructor and let custom options to be used on connection initialization:

```javascript
const myWs = function (options) {
  return class wsClass extends WebSocket {
    constructor(...args) {
      if (args.length === 1) {
        super(...[...args, 'centrifuge-json', ...[options]])
      } else {
        super(...[...args, ...[options]])
      }
    }
  }
}
```

It should be now possible to use pass your custom WebSocket constructor to `centrifuge-js` and so custom headers will be used when connecting to a server (only in non-browser environment):

```javascript
var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    websocket: myWs({ headers: { Authorization: '<token or key>' } }),
});
```

See a basic example with React Native where this technique is used [in this comment](https://github.com/centrifugal/centrifuge-js/issues/224#issuecomment-1538820023).

## Using with React Native on Android

If you have issues with the connection on Android when using React Native – [check out this comment](https://github.com/centrifugal/centrifuge-js/issues/242#issuecomment-2569474401) – you may be using non-secure endpoint schemes and need to explicitly allow it.

## Errors in callbacks

There is currently no built-in error handling in the SDK for exceptions happening in application-level callbacks, which means you must catch any error that could be thrown in a listener. Not doing that may corrupt a state of SDK making it unusable.

## Run tests locally

If you want to run `centrifuge-js` tests locally, start test Centrifugo server:

```
docker compose up
```

Then:

```
yarn test
```
