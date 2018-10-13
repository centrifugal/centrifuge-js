# Centrifuge client for NodeJS and browser

This client can connect to [Centrifuge](https://github.com/centrifugal/centrifuge) server (and [Centrifugo](https://github.com/centrifugal/centrifugo) in particular) using Websocket or SockJS transports from web browser or NodeJS environments.

* [Install and quick start](#install-and-quick-start)
* [Connection Token](#connection-token)
* [Configuration parameters](#configuration-parameters)
* [Client API](#client-api)
* [Private channels subscription](#private-channels-subscription)
* [Connection expiration](#connection-expiration)
* [Protobuf support](#protobuf-support)
* [Browser support](#browser-support)

Javascript client can connect to the server in two ways: using pure Websockets or using [SockJS](https://github.com/sockjs/sockjs-client) library to be able to use various available fallback transports if client browser does not support Websockets.

## Install and quick start

The simplest way to use javascript client is download it from `dist` folder and include into your web page using `script` tag:

```html
<script src="centrifuge.js"></script>
```

Or using cdn (replace `X` to concrete version number):

```html
<script src="//cdn.rawgit.com/centrifugal/centrifuge-js/2.X.X/dist/centrifuge.min.js"></script>
```

Client is also available via `npm`:

```bash
npm install centrifuge
```

And then:

```javascript
var Centrifuge = require("centrifuge");
```

Default library works with JSON only, see `Protobuf support` section to see how to import client with Protobuf support.

As soon as you included all libraries you can create new `Centrifuge` object instance, subscribe on channel and call `.connect()` method to make actual connection to server:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.subscribe("news", function(message) {
    console.log(message);
});

centrifuge.connect();
```

In example above we initialize `Centrifuge` object instance, subscribe on channel `news`, print all new messages received from channel `news` into console and actually make connection to Centrifugo. And that's all code which required for simple real-time messaging handling on client side!

If you want to use SockJS you must also import SockJS client before centrifuge.js

```html
<script src="//cdn.jsdelivr.net/sockjs/1.1/sockjs.min.js" type="text/javascript"></script>
<script src="centrifuge.js" type="text/javascript"></script>
```

Or provide it explicitly:

```javascript
var Centrifuge = require("centrifuge");
var SockJS = require('sockjs-client');

var centrifuge = new Centrifuge("http://localhost:8000/connection/sockjs", {
  sockjs: SockJS
})
```

**`Centrifuge` object is an instance of [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).**

## Connection Token

If you are connecting to Centrifugo you must also provide connection token:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.setToken(YOUR_TOKEN);

centrifuge.subscribe("news", function(message) {
    console.log(message);
});

centrifuge.connect();
```

This token contains information about user of your application that tries to connect. See documentation for connection JWT token in Centrifugo docs.

**Connection token comes to Javascript code from application backend - i.e. generated on backend**.

## Configuration parameters

Let's also look at optional configuration parameters available when initializing `Centrifuge` object instance.

#### sockjsTransports

In case of using SockJS additional configuration parameter can be used - `sockjsTransports`.

It defines allowed SockJS transports and by default equals

```javascript
var centrifuge = new Centrifuge(
  'http://centrifuge.example.com/connection/sockjs', 
  {
    sockjsTransports: [
        'websocket', 
        'xdr-streaming',
        'xhr-streaming',
        'eventsource',
        'iframe-eventsource',
        'iframe-htmlfile',
        'xdr-polling',
        'xhr-polling',
        'iframe-xhr-polling',
        'jsonp-polling'
    ]
});
```

i.e. all possible SockJS transports.

So to say `centrifuge-js` to use only `websocket` and `xhr-streaming` transports when
using SockJS endpoint:

```javascript
var centrifuge = new Centrifuge('http://centrifuge.example.com/connection/sockjs', {
    sockjsTransports: ["websocket", "xhr-streaming"]
});
```

#### sockjs

`sockjs` option allows to explicitly provide SockJS client object to Centrifuge client.

For example this can be useful if you develop in ES6 with imports:

```javascript
import Centrifuge from 'centrifuge'
import SockJS from 'sockjs-client'

var centrifuge = new Centrifuge('https://centrifuge.example.com/connection/sockjs', {
  sockjs: SockJS
});
```

#### sockjsServer

`sockjsServer` is SockJS specific option to set server name into connection urls instead
of random chars. See SockJS docs for more info.

#### debug

`debug` is a boolean option which is `false` by default. When enabled lots of various debug
messages will be logged into javascript console. Mostly useful for development or
troubleshooting.

#### insecure

`insecure` is a boolean option which is `false` by default. When enabled client will connect
to server in insecure mode - read about this mode in [special docs chapter](../mixed/insecure_modes.md).

This option nice if you want to use Centrifugo for quick real-time ideas prototyping, demos as
it allows to connect to Centrifugo without `sign`, `exp` and `user`. And moreover without
application backend! Please, [read separate chapter about insecure modes](../mixed/insecure_modes.md).

#### retry

When client disconnected from server it will automatically try to reconnect using exponential
backoff algorithm to get interval between reconnect attempts which value grows exponentially.
`retry` option sets minimal interval value in milliseconds. Default is `1000` milliseconds.

#### maxRetry

`maxRetry` sets upper interval value limit when reconnecting. Or your clients will never reconnect
as exponent grows very fast:) Default is `20000` milliseconds.

#### resubscribe

`resubscribe` is boolean option that allows to disable automatic resubscribing on
subscriptions. By default it's `true` - i.e. you don't need to manually handle
subscriptions resubscribing and no need to wait `connect` event triggered (first
time or when reconnecting) to start subscribing. `centrifuge-js` will by default
resubscribe automatically when connection established.

#### subscribeEndpoint

`subscribeEndpoint` is url to use when sending auth request for authorizing subscription on private channel. By default `/centrifuge/subscribe`. See also useful related options:

* `subscribeHeaders` - map of headers to send with subscribe request (default `{}``)
* `subscribeParams` - map of params to include in subscribe endpoint url (default `{}`)

#### refreshEndpoint

`refreshEndpoint` is url to use when refreshing client connection parameters when connection check mechanism enabled in Centrifugo configuration. See also related options:

* `refreshHeaders` - map of headers to send with refresh request (default `{}``)
* `refreshParams` - map of params to include in refresh url (default `{}`)
* `refreshData` - send extra data in body (as JSON payload) when sending AJAX POST refresh request.
* `refreshAttempts` - limit amount of refresh requests before giving up (by default `null` - unlimited)
* `onRefreshFailed` - callback function called when `refreshAttempts` came to the end. By default `null` - i.e. nothing called.

## Client API

When `Centrifuge` object properly initialized then it is ready to start communicating with server.

#### connect method

As we showed before, we must call `connect()` method to make an actual connection
request to Centrifugo server:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.connect();
```

`connect()` triggers an actual connection request to server.

#### connect event

After connection will be established and client credentials you provided authorized
then `connect` event on `Centrifuge` object instance will be called.

You can listen to this setting event listener function on `connect` event:

```javascript
centrifuge.on('connect', function(context) {
    // now client connected to Centrifugo and authorized
});
```

What's in `context`:

```javascript
{
    client: "79ec54fa-8348-4671-650b-d299c193a8a3",
    transport: "raw-websocket",
    latency: 21
}
```

* `client` – client ID Centrifugo gave to this connection (string)
* `transport` – name of transport used to establish connection with server (string)
* `latency` – latency in milliseconds (int). This measures time passed between sending
    `connect` client protocol command and receiving connect response.

#### disconnect event

`disconnect` event fired on centrifuge object every time client disconnects for
some reason. This can be network disconnect or disconnect initiated by Centrifugo server.

```javascript
centrifuge.on('disconnect', function(context) {
    // do whatever you need in case of disconnect from server
});
```

What's in `context`?

```javascript
{
    reason: "connection closed",
    reconnect: true
}
```

* `reason` – the reason of client's disconnect (string)
* `reconnect` – flag indicating if client will reconnect or not (boolean)

#### disconnect method

In some cases you may need to disconnect your client from server, use `disconnect` method to
do this:

```javascript
centrifuge.disconnect();
```

After calling this client will not try to reestablish connection periodically. You must call
`connect` method manually again.

## Subscriptions

Of course being just connected is useless. What we usually want from Centrifugo is to
receive new messages published into channels. So our next step is `subscribe` on channel
from which we want to receive real-time messages.

### subscribe method

To subscribe on channel we must use `subscribe` method of `Centrifuge` object instance.

The simplest usage that allow to subscribe on channel and listen to new messages is:

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle new message coming from channel "news"
    console.log(message);
});
```

And that's all! For lots of cases it's enough! But let's look at possible events that
can happen with subscription:

* `publish` – called when new publication message received (callback function in our previous example is `publish` event callback btw)
* `join` – called when someone joined channel
* `leave` – called when someone left channel
* `subscribe` – called when subscription on channel successful and acknowledged by Centrifugo
    server. It can be called several times during lifetime as browser client automatically resubscribes on channels after successful reconnect (caused by temporary network disconnect for example or Centrifugo server restart)
* `error` – called when subscription on channel failed with error. It can be called several times
    during lifetime as browser client automatically resubscribes on channels after successful reconnect 
    (caused by temporary network disconnect for example or Centrifugo server restart)
* `unsubscribe` – called every time subscription that was successfully subscribed
    unsubscribes from channel (can be caused by network disconnect or by calling
    `unsubscribe` method of subscription object)

Don't be frightened by amount of events available. In most cases you only need some of them
until you need full control to what happens with your subscriptions. We will look at format
of messages for this event callbacks later below.

There are 2 ways setting callback functions for events above.

First is providing object containing event callbacks as second argument to `subscribe` method.

```javascript
var callbacks = {
    "publish": function(message) {
        // See below description of message format
        console.log(message);
    },
    "join": function(message) {
        // See below description of join message format
        console.log(message);
    },
    "leave": function(message) {
        // See below description of leave message format
        console.log(message);
    },
    "subscribe": function(context) {
        // See below description of subscribe callback context format
        console.log(context);
    },
    "error": function(errContext) {
        // See below description of subscribe error callback context format
        console.log(err);
    },
    "unsubscribe": function(context) {
        // See below description of unsubscribe event callback context format
        console.log(context);
    }
}

var subscription = centrifuge.subscribe("news", callbacks);
```

Another way is setting callbacks using `on` method of subscription. Subscription object
is event emitter so you can simply do the following:

```javascript
var subscription = centrifuge.subscribe("news");

subscription.on("publish", publishHandlerFunction);
subscription.on("subscribe", subscribeHandlerFunction);
subscription.on("error", subscribeErrorHandlerFunction);
```

**`Subscription` objects are instances of [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).**

### join and leave events of subscription

As you know you can enable `join_leave` option for channel in Centrifugo configuration.
This gives you an opportunity to listen to `join` and `leave` events in those channels.
Just set event handlers on `join` and `leave` events of subscription.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
}).on("join", function(message) {
    console.log("Client joined channel", message);
}).on("leave", function(message) {
    console.log("Client left channel", message);
});
```

*Note, that in order join/leave events to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

### subscription event context formats

We already know how to listen for events on subscription. Let's look at format of
messages event callback functions receive as arguments.

#### format of message event context

Let's look at message format of new message received from channel:

```javascript
{
    "uid":"6778c79fccb2",
    "data":{"input":"hello"},
}
```

I.e. `data` field contains actual data that was published.

Message can optionally contain `client` field (client ID that published message) - if
it was provided when publishing new message:

```javascript
{
    "uid":"6778c79fccb2",
    "data":{"input":"hello"},
    "client":"7080fd2a-bd69-4f1f-6648-5f3ceba4b643"
}
```

And it can optionally contain additional client `info` in case when this message was
published by javascript client directly using `publish` method (see details below):

```javascript
{
    "uid":"6778c79f-ccb2-4a1b-5768-2e7381bc5410",
    "info":{
        "user":"2694",
        "client":"7080fd2a-bd69-4f1f-6648-5f3ceba4b643",
        "default_info":{"name":"Alexandr"},
        "channel_info":{"extra":"extra JSON data when authorizing private channel"}
    },
    "data":{"input":"hello"},
    "client":"7080fd2a-bd69-4f1f-6648-5f3ceba4b643"
}
```

#### format of join/leave event message

I.e. `on("join", function(message) {...})` or `on("leave", function(message) {...})`

```javascript
{
    "info":{
        "user":"2694",
        "client":"2724adea-6e9b-460b-4430-a9f999e94c36",
        "conn_info":{"first_name":"Alexandr"},
        "chan_info":{"extra":"extra JSON data when authorizing"}
    }
}
```

`conn_info` and `chan_info` exist in message only if not empty.

#### format of subscribe event context

I.e. `on("subscribe", function(context) {...})`

```javascript
{
    "channel": "$public:chat",
    "isResubscribe": true
}
```

`isResubscribe` – flag showing if this was initial subscribe (`false`) or resubscribe (`true`)

#### format of subscription error event context

I.e. `on("error", function(err) {...})`

```javascript
{
    "error": "permission denied",
    "channel": "$public:chat",
    "isResubscribe": true
}
```

`error` - error description
`isResubscribe` – flag showing if this was initial subscribe (`false`) or resubscribe (`true`)

#### format of unsubscribe event context

I.e `on("unsubscribe", function(context) {...})`

```javascript
{
    "channel": "$public:chat"
}
```

### presence method of subscription

`presence` allows to get information about clients which are subscribed on channel at
this moment. Note that this information is only available if `presence` option enabled
in Centrifugo configuration for all channels or for channel namespace.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
});

subscription.presence().then(function(message) {
    // presence data received
}, function(err) {
    // presence call failed with error
});
```

`presence` is internally a promise that will be resolved with data or error only
when subscription actually subscribed.

Format of success callback `message`:

```javascript
{
    "channel":"$public:chat",
    "data":{
        "2724adea-6e9b-460b-4430-a9f999e94c36": {
            "user":"2694",
            "client":"2724adea-6e9b-460b-4430-a9f999e94c36"
        },
        "d274505c-ce63-4e24-77cf-971fd8a59f00":{
            "user":"2694",
            "client":"d274505c-ce63-4e24-77cf-971fd8a59f00"
        }
    }
}
```

As you can see presence data is a map where keys are client IDs and values are objects
with client information.

Format of `err` in error callback:

```javascript
{
    "error": "timeout",
}
```

* `error` – error description (string)

*Note, that in order presence to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

### history method of subscription

`history` method allows to get last messages published into channel. Note that history
for channel must be configured in Centrifugo to be available for `history` calls from
client.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
});

subscription.history().then(function(message) {
        // history messages received
    }, function(err) {
        // history call failed with error
    });
});
```

Success callback `message` format:

```javascript
{
    "channel": "$public:chat",
    "data": [
        {
            "uid": "87219102-a31d-44ed-489d-52b1a7fa520c",
            "data": {"input": "hello2"}
        },
        {
            "uid": "71617557-7466-4cbb-760e-639042a5cade",
            "data": {"input": "hello1"}
        }
    ]
}
```

Where `data` is an array of messages published into channel.

Note that also additional fields can be included in messages - `client`, `info` if those
fields were in original messages.

`err` format – the same as for `presence` method.

*Note, that in order history to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

### publish method of subscription

`publish` method of subscription object allows to publish data into channel directly
from client. The main idea of Centrifugo is server side only push. Usually your application
backend receives new event (for example new comment created, someone clicked like button
etc) and then backend posts that event into Centrifugo over API. But in some cases you may
need to allow clients to publish data into channels themselves. This can be used for demo
projects, when prototyping ideas for example, for personal usage. And this allow to make
something with real-time features without any application backend at all. Just javascript
code and Centrifugo.

**So to emphasize: using client publish is not an idiomatic Centrifugo usage. It's not for
production applications but in some cases (demos, personal usage, Centrifugo as backend
microservice) can be justified and convenient. In most real-life apps you need to send new
data to your application backend first (using the convenient way, for example AJAX request
in web app) and then publish data to Centrifugo over Centrifugo API.**

To do this you can use `publish` method. Note that just like presence and history publish
must be allowed in Centrifugo configuration for all channels or for channel namespace. When
using `publish` data will go through Centrifugo to all clients in channel. Your application
backend won't receive this message.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
});

subscription.publish({"input": "hello world"}).then(function() {
        // success ack from Centrifugo received
    }, function(err) {
        // publish call failed with error
    });
});
```

`err` format – the same as for `presence` method.

*Note, that in order publish to work corresponding option must be enabled in server channel configuration (on top level or for channel namespace), by default client can not publish into channel*

### unsubscribe method of subscription

You can call `unsubscribe` method to unsubscribe from subscription:

```javascript
subscription.unsubscribe();
```

### subscribe method of subscription

You can restore subscription after unsubscribing calling `.subscribe()` method:

```javascript
subscription.subscribe();
```

### ready method of subscription

A small drawback of setting event handlers on subscription using `on` method is that event
handlers can be set after `subscribe` event of underlying subscription already fired. This
is not a problem in general but can be actual if you use one subscription (i.e. subscription
to the same channel) from different parts of your javascript application - so be careful.

For this case one extra helper method `.ready(callback, errback)` exists. This method calls
`callback` if subscription already subscribed and calls `errback` if subscription already
failed to subscribe with some error (because you subscribed on this channel before). So
when you want to call subscribe on channel already subscribed before you may find `ready()`
method useful:

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message;
});

// artificially model subscription to the same channel that happen after
// first subscription successfully subscribed - subscribe on the same
// channel after 5 seconds.
setTimeout(function() {
    var anotherSubscription = centrifuge.subscribe("news", function(message) {
        // another listener of channel "news"
    }).on("subscribe", function() {
        // won't be called on first subscribe because subscription already subscribed!
        // but will be called every time automatic resubscribe after network disconnect
        // happens
    });
    // one of subscribeSuccessHandler (or subscribeErrorHandler) will be called
    // only if subscription already subscribed (or subscribe request already failed).
    anotherSubscription.ready(subscribeSuccessHandler, subscribeErrorHandler);
}, 5000);
```

When called `callback` and `errback` of `ready` method receive the same arguments as
callback functions for `subscribe` and `error` events of subscription.

### Message batching

There is also message batching support. It allows to send several messages to server
in one request - this can be especially useful when connection established via one of
SockJS polling transports.

You can start collecting messages to send calling `startBatching()` method:

```javascript
centrifuge.startBatching();
```

Finally if you don't want batching anymore call `stopBatching()` method:

```javascript
centrifuge.stopBatching();
```

This call will flush all collected messages to network.

## Private channels subscription

If channel name starts with `$` then subscription on this channel will be checked via
AJAX POST request from javascript client to your web application backend.

You can subscribe on private channel as usual:

```javascript
centrifuge.subscribe('$private', function(message) {
    // process message
});
```

But in this case Javascript client will first check subscription via your backend sending AJAX POST request to `/centrifuge/subscribe` endpoint (by default, can be changed via configuration option `subscribeEndpoint`). As said this is a POST request with JSON body. Request will contain `client` field on top level which is your connection client ID and array `channels` field - one or multiple private channels client wants to subscribe to.

```javascript
{
  "cleint": "<CLIENT ID>",
  "channels": ["$chan1", "$chan2"]
}
```

Your server should validate all this subscriptions and return properly constructed response.

Response is a JSON with array `channels` field on top level:

```
{
  "channels": [
    {
      "channel": "$chan1",
      "token": "<SUBSCRIPTION JWT TOKEN>"
    },
    {
      "channel": "$chan2",
      "token": <SUBSCRIPTION JWT TOKEN>
    }
  ]
}
```

I.e. you need to return individual subscription token for each private channel in request. See [how to generate private channel tokens](https://centrifugal.github.io/centrifugo/server/private_channels/) in Centrifugo docs.

If you don't want to give client access to channel then just do not include it into response.

There are also two public API methods which can help to subscribe to many private channels sending only one POST request to your web application backend: `startSubscribeBatching` and `stopSubscribeBatching`. When you `startSubscribeBatching` javascript client will collect private subscriptions until `stopSubscribeBatching()` called – and then send them all at once.

## Connection expiration

When connection expiration mechanism is on on server client will automatically ask your backend for updated connection credentials sending AJAX HTTP POST request to `/centrifuge/refresh` endpoint (by default). Client will send that request when connection ttl is close to the end.

## Protobuf support

To import client with Protobuf protocol support:

```html
<script src="//cdn.rawgit.com/centrifugal/centrifuge-js/2.X.X/dist/centrifuge.protobuf.min.js"></script>
```

Or if you are developing with npm:

```javascript
import Centrifuge from 'centrifuge/dist/centrifuge.protobuf';
```

This client uses [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) under the hood.

Centrifuge client with Protobuf support also works with JSON. To enable binary websocket add `format` query param with `protobuf` value to Websocket endpoint URL:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket?format=protobuf');
```

## Browser support

This client intended to work in all modern browsers with Websocket support: https://caniuse.com/#search=websocket.

**To support IE 11** you must additionally polyfill `Promise` as this library uses `Promise`.

You can easily polyfill `Promise` via CDN (example here uses [es6-promise](https://github.com/stefanpenner/es6-promise) library):

```html
<script src="https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js"></script>
```

Or you can explicitly polyfill `Promise` in your code, see [auto-polyfill of es6-promise](https://github.com/stefanpenner/es6-promise#auto-polyfill)
