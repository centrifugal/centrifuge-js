# Centrifuge client for NodeJS and browser

This client can connect to [Centrifuge](https://github.com/centrifugal/centrifuge) server (and [Centrifugo](https://github.com/centrifugal/centrifugo) in particular) using pure WebSocket or [SockJS](https://github.com/sockjs/sockjs-client) polyfill transports from web browser or NodeJS environments.

* [Install and quick start](#install-and-quick-start)
* [Connection Token](#connection-token)
* [Configuration parameters](#configuration-parameters)
* [Client API](#client-api)
* [Private channels subscription](#private-channels-subscription)
* [Server-side subscriptions](#server-side-subscriptions)
* [Connection expiration](#connection-expiration)
* [Protobuf support](#protobuf-support)
* [Browser support](#browser-support)
* [Using with NodeJS](#using-with-nodejs)
* [Custom XMLHttpRequest](#custom-xmlhttprequest)
* [Custom WebSocket constructor](#custom-websocket-constructor)
* [Subscribe since known position](#subscribe-since-known-position)
* [Feature Matrix](#feature-matrix)

## Install and quick start

The simplest way is to include `centrifuge-js` into your web page using `script` tag. For example, from CDN (replace `X` to concrete version number):

```html
<script src="https://cdn.jsdelivr.net/gh/centrifugal/centrifuge-js@2.X.X/dist/centrifuge.min.js"></script>
```

Or check out [centrifuge-js on cdnjs.com](https://cdnjs.com/libraries/centrifuge).

Client is also available via `npm`:

```bash
npm install centrifuge
```

And then:

```javascript
var Centrifuge = require("centrifuge");
```

Default library works with JSON only, see `Protobuf support` section to see how to import client with Protobuf support.

As soon as you installed and imported `centrifuge-js` you can create new `Centrifuge` object instance, subscribe on channel and call `.connect()` method to make actual connection to server:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.subscribe("news", function(message) {
    console.log(message);
});

centrifuge.connect();
```

In example above we initialize `Centrifuge` object instance, subscribe on channel `news`, print all new messages received from channel `news` into console and actually make connection to server. And that's all for basic real-time messaging on client side!

If you want to use SockJS you must also import SockJS client before centrifuge.js

```html
<script src="https://cdn.jsdelivr.net/npm/sockjs-client@1.3/dist/sockjs.min.js" type="text/javascript"></script>
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

If you are connecting to Centrifugo **you must also provide connection token**:

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket');

centrifuge.setToken(YOUR_TOKEN);

centrifuge.subscribe("news", function(message) {
    console.log(message);
});

centrifuge.connect();
```

This token contains information about user of your application that tries to connect. See [server authentication documentation](https://centrifugal.github.io/centrifugo/server/authentication/) for details on how to generate it on your backend side.

**Connection JWT comes to Javascript code from application backend - i.e. must be generated on backend**.

## Configuration parameters

Let's also look at optional configuration parameters available when initializing `Centrifuge` object instance.

#### websocket

`websocket` option allows to explicitly provide custom WebSocket client to use. By default centrifuge-js will try to use global WebSocket object, so if you are in web browser – it will just use native WebSocket implementation. See notes about using `centrifuge-js` with NodeJS below.

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

#### sockjsServer

`sockjsServer` is SockJS specific option to set server name into connection urls instead
of random chars. See SockJS docs for more info.

#### debug

`debug` is a boolean option which is `false` by default. When enabled lots of various debug
messages will be logged into javascript console. Mostly useful for development or
troubleshooting.

#### minRetry

When client disconnected from server it will automatically try to reconnect using exponential
backoff algorithm to get interval between reconnect attempts which value grows exponentially.
`minRetry` option sets minimal interval value in milliseconds. Default is `1000` milliseconds.

#### maxRetry

`maxRetry` sets upper interval value limit when reconnecting. Or your clients will never reconnect
as exponent grows very fast:) Default is `20000` milliseconds.

#### subscribeEndpoint

`subscribeEndpoint` is url to use when sending auth request for authorizing subscription on private channel. By default `/centrifuge/subscribe`. See also useful related options:

* `subscribeHeaders` - map of headers to send with subscribe request (default `{}`)
* `subscribeParams` - map of params to include in subscribe endpoint url (default `{}`)

#### refreshEndpoint

`refreshEndpoint` is url to use when refreshing client connection parameters when connection check mechanism enabled in Centrifugo configuration. See also related options:

* `refreshHeaders` - map of headers to send with refresh request (default `{}`)
* `refreshParams` - map of params to include in refresh url (default `{}`)
* `refreshData` - send extra data in body (as JSON payload) when sending AJAX POST refresh request.
* `refreshAttempts` - limit amount of refresh requests before giving up (by default `null` - unlimited)
* `onRefreshFailed` - callback function called when `refreshAttempts` came to the end. By default `null` - i.e. nothing called.
* `onRefresh` - optional callback to fully control refresh behaviour. This function will ve called as soon as connection token needs to be refreshed. After this it's up to application to get new token in a way it needs. As soon as application got token it must call callback passed as argument with proper data - see example below. *In this case `centrifuge-js` will not send automatic AJAX requests to your application*.

Here is an example of using custom `onRefresh` function:

```javascript
centrifuge = new Centrifuge("http://localhost:8000/connection/websocket", {
    debug: true,
    onRefresh: function(ctx, cb) {
        let promise = fetch("http://localhost:3000/centrifuge/refresh", {
            method: "POST"
        }).then(function(resp) {
            resp.json().then(function(data) {
                // Data must be like {"status": 200, "data": {"token": "JWT"}} - see 
                // type definitions in dist folder. Note that setting status to 200 is
                // required at moment. Any other status will result in refresh process
                // failure so client will eventually be disconnected by server.
                cb(data);
            });
        });
    }
});
```

#### disableWithCredentials

`disableWithCredentials` is a reverse boolean option for control
[withCredentials](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials)
property of XMLHttpRequest. By default `false` - i.e. `withCredentials` property is enabled.

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

#### publish method

Sometimes you need to publish into channel with `publish` option set to `true` without actually being subscribed to it. In this case you can use `publish` method:

```javascript
centrifuge.publish("channel", {"input": "hello"}).then(function(res) {
    console.log('successfully published');
}, function(err) {
    console.log('publish error', err);
});
```

#### send method

This is only valid for Centrifuge library and does not work for Centrifugo server. `send` method allows to send asynchronous message from client to server.

```javascript
centrifuge.send({"input": "hello"}).then(function(res) {
    console.log('successfully sent');
}, function(err) {
    console.log('send error', err);
});
```

#### rpc method

`rpc` method allows to send RPC request from client to server and wait for data response.

```javascript
centrifuge.rpc({"input": "hello"}).then(function(res) {
    console.log('rpc result', res);
}, function(err) {
    console.log('rpc error', err);
});
```

#### namedRPC method

`namedRPC` method allows to send rpc request from client to server and wait for data response. Unlike `rpc` it additionally allows to provide method name string (which can be handy to have on RPC request top level).

```javascript
centrifuge.namedRPC("my.method.name", {"input": "hello"}).then(function(res) {
    console.log('rpc result', res);
}, function(err) {
    console.log('rpc error', err);
});
```

#### history method

Available since v2.7.0

Allows to get history from a server. This is a top-level analogue of `Subscription.history` method. But accepts a channel as first argument.

```javascript
centrifuge.history("channel", {since: {offset: 0, epoch: "xyz"}, limit: 10}).then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('history error', err);
});
```

#### presence method

Available since v2.7.0

Allows to get presence info from a server. This is a top-level analogue of `Subscription.presence` method. But accepts a channel as first argument.

```javascript
centrifuge.presence("channel").then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('presence error', err);
});
```

#### presenceStats method

Available since v2.7.0

Allows to get presence stats from a server. This is a top-level analogue of `Subscription.presenceStats` method. But accepts a channel as first argument.

```javascript
centrifuge.presenceStats("channel").then(function(resp) {
    console.log(resp);
}, function(err) {
    console.log('presence stats error', err);
});
```

### setConnectData method

Allows setting custom data sent to a server in first message. This data will be available on a server side in OnConnecting callback (if using Centrifugo library) or proxied to application backend (in using Centrifugo with connect proxy enabled).

```
centrifuge.setConnectData({"any": "key"});
```

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
    "data":{"input":"hello"},
}
```

I.e. `data` field contains actual data that was published.

Message can optionally contain additional client `info` in case when this message was published by javascript client directly using `publish` method (see details below):

```javascript
{
    "info":{
        "user":"2694",
        "client":"7080fd2a-bd69-4f1f-6648-5f3ceba4b643",
        "conn_info":{"name":"Alexandr"},
        "chan_info":{"extra":"extra JSON data when authorizing private channel"}
    },
    "data":{"input":"hello"}
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
    "isResubscribe": true,
    "recovered": false
}
```

`isResubscribe` – boolean flag showing if this was initial subscribe (`false`) or resubscribe (`true`)
`recovered` – boolean flag that indicated whether missed messages were recovered on reconnect or not (recovery works according to Centrifugo channel configuration)

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
    "presence":{
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
    "code": 0,
    "message": "timeout"
}
```

* `code` - error code (number)
* `message` – error description (string)

*Note, that in order presence to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

### presenceStats method of subscription

`presenceStats` allows to get two counters from a server: number of total clients currently subscribed and number of unique users currently subscribed. Note that this information is only available if `presence` option enabled in server configuration for a channel.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
});

subscription.presenceStats().then(function(resp) {
    // presence stats data received
}, function(err) {
    // presence stats call failed with error
});
```

### history method of subscription

`history` method allows to get last messages published into channel. Note that history
for channel must be configured in Centrifugo to be available for `history` calls from
client.

```javascript
var subscription = centrifuge.subscribe("news", function(message) {
    // handle message
});

subscription.history().then(function(response) {
    // history messages received
}, function(err) {
    // history call failed with error
});
```

Success callback `response` format:

```javascript
{
    "publications": [
        {
            "data": {"input": "hello2"},
            "offset": 1
        },
        {
            "data": {"input": "hello1"},
            "offset": 2
        }
    ],
    "offset": 2,
    "epoch": "xcf4w"
}
```

Where `publications` is an array of messages published into channel, `offset` is a current stream top offset (added in v2.7.0), `epoch` is a current stream epoch (added in v2.7.0).

Note that also additional fields can be included in publication objects - `client`, `info` if those fields were set in original publications.

`err` format – the same as for `presence` method.

*Note, that in order history to work corresponding options must be enabled in server channel configuration (on top level or for channel namespace)*

Starting from v2.7.0 it's possible to iterate over history stream:

```javascript
resp = await subscription.history({'since': {'offset': 2, 'epoch': 'xcf4w'}, limit: 100});
```

If server can't fulfill a query for history (due to stream retention - size or expiration, or malformed offset, or stream already has another epoch) then an Unrecoverable Position Error will be returned (code `112`).

To only call for current `offset` and `epoch` use:

```javascript
resp = await subscription.history({limit: 0});
```

I.e. not providing `since` and using zero `limit`.

**For now history pagination feature only works with [Centrifuge](https://github.com/centrifugal/centrifuge) library based server and not available in Centrifugo**.

### publish method of subscription

`publish` method of subscription object allows to publish data into channel directly from client. The main idea of Centrifugo is server side only push. Usually your application backend receives new event (for example new comment created, someone clicked like button etc) and then backend posts that event into Centrifugo over API. But in some cases you may need to allow clients to publish data into channels themselves. This can be used for demo projects, when prototyping ideas for example, for personal usage. And this allow to make something with real-time features without any application backend at all. Just Javascript code and Centrifugo.

**So to emphasize: using client publish is not an idiomatic Centrifugo usage. It's not for production applications but in some cases (demos, personal usage, Centrifugo as backend microservice) can be justified and convenient. In most real-life apps you need to send new data to your application backend first (using the convenient way, for example AJAX request in web app) and then publish data to Centrifugo over Centrifugo API.**

To do this you can use `publish` method. Note that just like presence and history publish must be allowed in Centrifugo configuration for all channels or for channel namespace. When using `publish` data will go through Centrifugo to all clients in channel. Your application backend won't receive this message.

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

**Important thing to know** is that unsubscribing from subscription does not remove event hanlers you already set to that subscription object. This allows to simply subscribe to channel again later calling `.subscribe()` method of subscription (see below). But there are cases when your code structured in a way that you need to remove event handlers after unsubscribe **to prevent them be executed twice** in the future. To do this remove event listeners explicitly after calling `unsubscribe()`:

```javascript
subscription.unsubscribe();
subscription.removeAllListeners();
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

If channel name starts with `$` then subscription on this channel will be checked via AJAX POST request from Javascript client to your web application backend.

You can subscribe on private channel as usual:

```javascript
centrifuge.subscribe('$private', function(message) {
    // process message
});
```

But in this case Javascript client will first check subscription via your backend sending AJAX POST request to `/centrifuge/subscribe` endpoint (by default, can be changed via configuration option `subscribeEndpoint`). As said this is a POST request with JSON body. Request will contain `client` field on top level of JSON which is your connection client ID and array `channels` field - one or multiple private channels client wants to subscribe to.

```javascript
{
  "client": "<CLIENT ID>",
  "channels": ["$chan1", "$chan2"]
}
```

Your server should validate all these subscriptions and return properly constructed response.

Response is a JSON with array `channels` field on top level:

```javascript
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

I.e. you need to return individual subscription tokens for each private channel in request. See [how to generate private channel tokens](https://centrifugal.github.io/centrifugo/server/private_channels/) in Centrifugo docs.

If you don't want to give client access to channel then just do not include it into response.

There are also two public API methods which can help to subscribe to many private channels sending only one POST request to your web application backend: `startSubscribeBatching` and `stopSubscribeBatching`. When you `startSubscribeBatching` javascript client will collect private subscriptions until `stopSubscribeBatching()` called – and then send them all at once.

As we just described when client subscribes on private channel by default AJAX request will be sent to `subscribeEndpoint` automatically if channel starts with `$`. In this case developer only needs to return proper response from server. But there is a way to override default behaviour and take full control on authorizing private channels. To do this it's possible to provide custom `onPrivateSubscribe` function in configuration options. This function will be called with all data required to authorize private channels client subscribes to and should call callback (will be provided by centrifuge-js as second argument) with authorization data when done. See our type declarations in `dist` folder to find out data format (**for `onPrivateSubscribe` it is slightly different** - like `{"status": 200, "data": {"channels": [...]}}`).

## Server-side subscriptions

`centrifuge-js` v2.4.0 added support for server-side subscriptions. This means several new event handlers have been added.

The main one is `publish` event of Centrifuge instance to handle publications coming from server-side channels:

```javascript
var centrifuge = new Centrifuge(address);

centrifuge.on('publish', function(ctx) {
    const channel = ctx.channel;
    const payload = JSON.stringify(ctx.data);
    console.log('Publication from server-side channel', channel, payload);
});

centrifuge.connect();
```

Also there are event handlers for `join`, `leave`, `subscribe` and `unsubscribe` events. Actually they work the same way as analogues from Subscription instance but binded to Centrifuge instance instead.

For example:

```javascript
centrifuge.on('subscribe', function(ctx) {
    console.log('Subscribe to server-side channel ' + ctx.channel);
});

centrifuge.on('unsubscribe', function(ctx) {
    console.log('Unsubscribe from server-side channel ' + ctx.channel);
});
```

## Connection expiration

When connection expiration mechanism is on on server client will automatically ask your backend for updated connection credentials sending AJAX HTTP POST request to `/centrifuge/refresh` endpoint (by default, can be changed using `refreshEndpoint` option). Client will send that request when connection ttl is close to the end. In response backend should return response with JSON like this:

```javascript
{
  "token": "<ACTUAL JWT TOKEN>"
}
```

## Protobuf support

To import client with Protobuf protocol support:

```html
<script src="https://cdn.jsdelivr.net/gh/centrifugal/centrifuge-js@2.X.X/dist/centrifuge.protobuf.min.js"></script>
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

When using Centrifugo v3 or Centrifuge >= v0.18.0 on server side prefer using client options instead of setting format in URL (available in `centrifuge-js` >= v2.8.0):

```javascript
var centrifuge = new Centrifuge('ws://centrifuge.example.com/connection/websocket', {
    protocol: 'protobuf'
});
```

## Browser support

This client intended to work in all modern browsers with Websocket support: https://caniuse.com/#search=websocket.

**To support IE 11** you must additionally polyfill `Promise` as this library uses `Promise`.

You can easily polyfill `Promise` via CDN (example here uses [es6-promise](https://github.com/stefanpenner/es6-promise) library):

```html
<script src="https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js"></script>
```

Or you can explicitly polyfill `Promise` in your code, see [auto-polyfill of es6-promise](https://github.com/stefanpenner/es6-promise#auto-polyfill)

## Using with NodeJS

NodeJS does not have native WebSocket library in std lib. To use `centrifuge-js` on Node you need to provide WebSocket object. You need to install WebSocket dependency:

```
npm install ws
```

At this point you have 2 options. Explicitly pass WebSocket object to Centrifuge.

```javascript
const Centrifuge = require('centrifuge');
const WebSocket = require('ws');

var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    websocket: WebSocket
})
```

Or define it globally:

```javascript
const Centrifuge = require('centrifuge');
global.WebSocket = require('ws'); 

var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket')
```

The same if you want to use `SockJS`:

```javascript
const Centrifuge = require('centrifuge');
const SockJS = require('sockjs-client');

var centrifuge = new Centrifuge('ws://localhost:8000/connection/sockjs', {
    sockjs: SockJS
})
```

### Custom XMLHttpRequest

To work with private channels you may need to pass `XMLHttpRequest` object to library:

```javascript
const Centrifuge = require('centrifuge');
const WebSocket = require('ws');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    websocket: WebSocket,
    xmlhttprequest: XMLHttpRequest
})
```

Or define XMLHttpRequest globally over `global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;`

### Custom WebSocket constructor

If you are building a client for a non-browser environment and want to pass custom headers then you can use the following approach to wrap a WebSocket constructor and let custom options to be used on connection initialization:

```javascript
var Centrifuge = require("centrifuge");
const WebSocket = require('ws');

const myWs = function (options) {
    return class wsClass extends WebSocket {
        constructor(...args) {
            super(...[...args, ...[options]])
        }
    }
}
```

It should be now possible to use pass your custom WebSocket constructor to `centrifuge-js` and so custom headers will be used when connecting to a server:

```javascript
var centrifuge = new Centrifuge('ws://localhost:8000/connection/websocket', {
    websocket: myWs({ headers: { Authorization: '<token or key>' } }),
});
```

### Subscribe since known position

Available in `centrifuge-js` >= v2.8.0.

Subscribe API supports setting known StreamPosition object to use server recovery feature on the connection start (otherwise recovery only used upon client reconnections due to temporary connection problems).

```javascript
centrifuge.subscribe('channel', function(messageCtx) {
    console.log('new message', messageCtx);
}, {'since': {'offset': 0, 'epoch': '<EPOCH>'}});
```

## Feature matrix

- [x] connect to server using JSON protocol format
- [x] connect to server using Protobuf protocol format
- [x] connect with token (JWT)
- [ ] connect with custom header (not supported by browser API, though [possible for a non-browser target env](https://github.com/centrifugal/centrifuge-js#custom-websocket-constructor))
- [x] automatic reconnect in case of errors, network problems etc
- [x] an exponential backoff for reconnect
- [x] connect and disconnect events
- [x] handle disconnect reason
- [x] subscribe on a channel and handle asynchronous Publications
- [x] handle Join and Leave messages
- [x] handle Unsubscribe notifications
- [x] reconnect on subscribe timeout
- [x] publish method of Subscription
- [x] unsubscribe method of Subscription
- [x] presence method of Subscription
- [x] presence stats method of Subscription
- [x] history method of Subscription
- [x] top-level publish method
- [x] top-level presence method
- [x] top-level presence stats method
- [x] top-level history method
- [ ] top-level unsubscribe method
- [x] send asynchronous messages to server
- [x] handle asynchronous messages from server
- [x] send RPC commands
- [x] subscribe to private channels with token (JWT)
- [x] connection token (JWT) refresh
- [x] private channel subscription token (JWT) refresh
- [x] handle connection expired error
- [x] handle subscription expired error
- [x] ping/pong to find broken connection
- [x] message recovery mechanism for client-side subscriptions
- [x] server-side subscriptions
- [x] message recovery mechanism for server-side subscriptions
- [x] history stream pagination
