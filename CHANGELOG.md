2.8.5
=====

* fix typing of subscribe error context [#187](https://github.com/centrifugal/centrifuge-js/pull/187)
* throw error if no transport configured [#176](https://github.com/centrifugal/centrifuge-js/pull/176)

2.8.4
=====

* Support setting a custom `data` attached to a subscribe request. This `data` will be then available in `OnSubscribe` callback on the server side (in the case of Centrifugo subscribe proxy will be able to access this data). [#171](https://github.com/centrifugal/centrifuge-js/pull/171).

2.8.3
=====

* Fix regression of 2.8.0: handle server-side subscribe and unsubscribe pushes.

2.8.2
=====

* Fix TypeScript definitions for subscribe (`A rest parameter must be last in a parameter list.`). 

2.8.1
=====

* Support `sockjsTimeout` (number) option which translates to [SockJS.timeout option](https://github.com/sockjs/sockjs-client#sockjs-class) - i.e. a minimum timeout in milliseconds to use for the transport connections. By default SockJS uses timeout determined automatically based on calculating round trip time during info request. 

2.8.0
=====

Update to work with Centrifuge >= v0.18.0 and Centrifugo v3.

**Breaking change** in server behavior. Client History API behavior changed in Centrifuge >= v0.18.0 and Centrifugo >= v3.0.0. When using history call it won't return all publications in a stream by default. See Centrifuge [v0.18.0 release notes](https://github.com/centrifugal/centrifuge/releases/tag/v0.18.0) or [Centrifugo v3 migration guide](https://centrifugal.dev/docs/getting-started/migration_v3) for more information and workaround on server-side. If you are using `centrifuge-js` with older server versions then everything without using history options like `limit` and `since` then everything should work the same way. Since this is a change in a server behavior we don't release a new major `centrifuge-js` version.

Other changes:

* Protocol definitions updated to the latest version 
* When working with Centrifugo v3 or Centrifuge >= v0.18.0 it's now possible to avoid using `?format=protobuf` in connection URL when using Protobuf protocol. The intent to use binary Protobuf protocol can now be set explicitly in client options. In this case client will negotiate Protobuf protocol with a server using WebSocket subprotocol mechanism (in request headers). [Pull request](https://github.com/centrifugal/centrifuge-js/pull/145).
* It's now possible to call subscribe and provide custom subscribe options. One subscribe option available now is `since` – which allows setting known `StreamPosition` and initiate automatic recovery. [Pull request](https://github.com/centrifugal/centrifuge-js/pull/146).

2.7.7
=====

* possibility to set `disableWithCredentials` boolean option (`false` by default) to control `withCredentials` option of `XMLHttpRequest`. See [#155](https://github.com/centrifugal/centrifuge-js/issues/155).

2.7.6
=====

* `xmlhttprequest` option to explicitly pass XMLHttpRequest (for NodeJS environment)

2.7.5
=====

* Fix regression of 2.7.4 - `Unexpected end of JSON input`

2.7.4
=====

* Optimize & simplify json encode/decode, see [#138](https://github.com/centrifugal/centrifuge-js/pull/138)

2.7.3
=====

* `SubscribeSuccessContext` can contain `data` field if custom data returned from a server in a subscribe result.

2.7.2
=====

* Handle server-side SUB push in Protobuf case (previously ignored). Sub push is a message that contains information about server-side subscription made after connection already established.

2.7.1
=====

* Fix type definitions - see [#133](https://github.com/centrifugal/centrifuge-js/pull/133)

2.7.0
=====

* add missing `offset` to TS definitions for `PublicationContext`, note that `seq` and `gen` fields considered deprecated and will go away with next major `centrifuge-js` release
* add top-level methods: `history`, `presence`, `presenceStats` – those are useful when using sever-side subscriptions
* fix wrong error format of top-level `publish` Promise reject branch – it now contains protocol error object (with `code` and `message` fields)
* possibility to set `name` and `version` protocol fields over Centrifuge config options
* remove unused `promise` option from configuration
* add history iteration API (usage limited to Centrifuge library for Go at the moment) - see example below
* subscribe success event context in positioned subscriptions (added in Centrifuge library [v0.15.0](https://github.com/centrifugal/centrifuge/releases/tag/v0.15.0)) now contains `streamPosition` object (with current `offset` and `epoch` fields)
* updated `protobuf-js` dependency (now `^6.10.2`)
* all dev-dependencies updated and now use the latest versions of webpack, babel, eslint, mocha etc
* internal code refactoring of Subscrption methods - code is simplified and more reusable now

Let's look at history pagination feature in more detail. It's now possible to iterate over channel  history this way:

```javascript
resp = await subscription.history({'since': {'offset': 2, 'epoch': 'xcf4w'}, limit: 100});
```

If server can't fulfill a query for history (due to stream retention - size or expiration, or malformed offset, or stream already has another epoch) then an Unrecoverable Position Error will be returned (code `112`).

To only call for current `offset` and `epoch` use:

```javascript
resp = await subscription.history({limit: 0});
```

I.e. not providing `since` and using zero `limit`.

Due to backward compatibility `history` call without arguments will return full existing history in channel (though it's possible to limit max number of publications to return on server side).

**For now history pagination feature only works with [Centrifuge](https://github.com/centrifugal/centrifuge) library based server and not available in Centrifugo**.

2.6.4
=====

* fix missing `info` in Publication context
* add `namedRPC` method to call RPC with method string

2.6.3
=====

* fix possible event loss in server-side subscriptions due to Promise execution order

2.6.2
=====

* fix TypeError in subRefresh method, [#109](https://github.com/centrifugal/centrifuge-js/pull/109)

2.6.1
=====

* fix TypeError on refresh token with protobuf, [#107](https://github.com/centrifugal/centrifuge-js/pull/107)

2.6.0
=====

* Support `Offset` protocol field which is replacing `Seq` and `Gen`, client will work with both `Offset` and `Seq/Gen` based servers until next major release. Then support for `Seq/Gen` will be removed.

2.5.0
=====

* Remove subscription from internal `_subs` map after `.unsubscribe()` called, see [this discussion](https://github.com/centrifugal/centrifuge-js/issues/98) for more details
* Make sure that server-side subscription exists before calling server-side subscription events

2.4.0
=====

* Server-side subscriptions support, see [related README section](https://github.com/centrifugal/centrifuge-js#server-side-subscriptions)

2.3.0
=====

* Fix fulfilling Promise when RPC error happens. Before this fix RPC error did not properly called Promise error handler, now it does. 

2.2.3
=====

* Fix type declarations for `onPrivateSubscribe` callback. See [#94](https://github.com/centrifugal/centrifuge-js/issues/94) for details.

2.2.2
=====

* Do not reconnect after disconnect called in disconnected state, more details in [#92](https://github.com/centrifugal/centrifuge-js/issues/92).

2.2.1
=====

* Fix error on resolving `EventEmitter` import while building TypeScript project with definitions added in 2.2.0.

2.2.0
=====

* fix wrong case of fields in Publication info and in result of `presence()` and `presenceStats()` responses in  Protobuf format case. Those fields were not compliant with JSON format due to the fact that Protobuf compiler does not keep original case defined in proto schema by default. **If you are using Protobuf this can be a breaking change** - see [this commit](https://github.com/centrifugal/centrifuge-js/commit/0b8e65df0ef6ed3f959233f99ae0cf1463560a6a) for fix details and all fields that now use snake_case instead of camelCase in Protobuf case. If you are using JSON you are not affected with these changes
* fix unhandled promise exceptions on NodeJS when calling subscription methods
* add TypeScript [type definitions](https://github.com/centrifugal/centrifuge-js/blob/master/dist/centrifuge.d.ts), thanks to @jekaspekas for contribution
* add `websocket` option to explicitly provide custom WebSocket implementation to use

2.1.6
=====

* fix subscribe after clearing connection state, see [#83](https://github.com/centrifugal/centrifuge-js/issues/83) for details

2.1.5
=====

* fix wrong error object format (on timeout, disconnect and connection closed errors) introduced in 2.1.4 

2.1.4
=====

* fix broken iteration over several replies in one frame if one of replies had error field set 

2.1.3
=====

* fix setting setInterval with value greater than `2,147,483,647` which resulted in immediate refresh callback firing. Thi means that maximum possible TTL for JWT is about 25 days in Javascript.

2.1.2
=====

* fix private subscription races after reconnect, see [#76](https://github.com/centrifugal/centrifuge-js/issues/76) for issue and solution details

2.1.1
=====

* fix websocket transport state check - see [#74](https://github.com/centrifugal/centrifuge-js/issues/74)

2.1.0
=====

* new `publish` method of Centrifuge object to publish into channels without being subscribed
* check connection state to prevent writing to closed connection and thus unhandled errors 
* `send` method now sends message to server immediately and returns Promise

2.0.1
=====

* Prevent unhandled errors to be raised after failed subscription ([#70](https://github.com/centrifugal/centrifuge-js/issues/70))

2.0.0
=====

This is a new major release of library updated to work with Centrifugo v2 and Centrifuge library. Library is now written using more actual Javascript instruments - with Webpack and ES6 classes. See readme for more information about new API and how to use library in general.

Highlights:

* Webpack and ES6 for code base
* JSON and Protobuf (only Websocket) serialization formats supported
* new `presenceStats` method of subscription 

1.5.0
=====

* fix isResubscribe flag behaviour to only be `true` after resubscribe on reconnect. See more details in [#62](https://github.com/centrifugal/centrifuge-js/issues/62)
* fix resubscribe behaviour after `unsubscribe` sent from server - this is th remaining part of [#46](https://github.com/centrifugal/centrifuge-js/issues/46)


1.4.9
=====

* support new private subscription response format. Now it's possible to return JSON of this kind:

```json
{
  "channels": [
    {
      "channel": "$one",
      "sign": "..."
    }
  ]
}
```

I.e. object with `channels` on top level which is an array of objects with channel data. This resolves issues with API generators that do not support map on top level. This is also a bit more extendable and most probably will be default format in v2.

1.4.8
=====

* `withCredentials` support for XHR requests - [#39](https://github.com/centrifugal/centrifuge-js/issues/39).
* fix resubscribe bug introduced in 1.4.7

1.4.7
=====

* fix undesired resubscribe after reconnect. See [#45](https://github.com/centrifugal/centrifuge-js/issues/46)
* add `onRefresh` and `onPrivateChannelAuth` callback functions to config to replace built-in refresh and private channel auth behaviour with you own logic. See [#45](https://github.com/centrifugal/centrifuge-js/pull/45) for motivation and initial pull request sent by @skyborn8 
* `onTransportClose` callback should be executed every time transport was closed - see [#33](https://github.com/centrifugal/centrifuge-js/issues/33) for motivation.
* fix refresh workflow in case client offline for a while

1.4.6
=====

* export `recovered` flag in successful subscribe event context. It indicates that Centrifugo thinks all messages were successfully recovered (i.e. client did not miss any messages) after successful resubscribe on channel. See https://github.com/centrifugal/centrifugo/issues/165 for motivation.

So it's possible to use it like this:

```
function handleSubscribe(ctx) {
    console.log('Subscribed on channel ' + ctx.channel);
    if (ctx.isResubscribe && !ctx.recovered) {
        console.log("you need to restore messages from app backend");
    } else {
        console.log("no need to restore state");
    }
}

var sub = centrifuge.subscribe(channel, handleMessage).on("subscribe", handleSubscribe)
```

Note that asking your backend about actual state after every reconnect is still the most reliable way to recover your app state. Relying on `recovered` flag can be an acceptable trade off for some applications though.


1.4.5
=====

* update `es6-promise` dependency to `^4.0.5`

1.4.4
=====

* removing `ping` field from connect message as it not used by Centrifugo >= 1.6.3

1.4.3
=====

It's recommended to update SockJS library to latest version - 1.1.2

* Use public SockJS API to get transport name. See [#26](https://github.com/centrifugal/centrifuge-js/issues/26)

1.4.2
=====

* Do not send ping to server for a while after receiving SockJS heartbeat frame.

1.4.1
=====

* fix ReferenceError - see #25

1.4.0
=====

This release works with Centrifugo >= 1.6.0

* automatic client to server pings.

Ping will be sent to server only when connection was idle - i.e. if there was no wire activity
for `pingInterval` period so it should not affect performance much.

You can disable automatic pings using `"ping": false` option. But before turning it off make
sure you've read [chapter about pings in docs](https://fzambia.gitbooks.io/centrifugal/content/mixed/ping.html).

Also there is an adjustable `pongWaitTimeout` option to control how long to wait for pong
response before closing connection.


1.3.9
=====

* do not try to refresh after disconnected. See #24


1.3.8
=====

* properly handle disconnect API command - do not reconnect.


1.3.7
=====

* Adapt to use in ES6 style
* new `sockJS` option to explicitly provide SockJS client object
* npm entry point is `src/centrifuge.js` now to prevent webpack warning.

ES6 example:

```javascript
import Centrifuge from 'centrifuge'
import SockJS from 'sockjs-client'

var c = new Centrifuge({
    "url": "...",
    "user": "...",
    "token": "...",
    "timestamp": "...",
    "sockJS": SockJS
});

c.connect();
```

1.3.6
=====

* `refreshData` option to send extra data in body when sending AJAX POST refresh request
* `refreshAttempts` option to limit amount of refresh requests before giving up
* `refreshFailed` options to set callback function called when `refreshAttempts` came to the end.

1.3.5
=====

* fix using centrifuge-js in SharedWorker - there is no `window` object, so using `self` instead of `window` when we in SharedWorker context.

1.3.4
=====

* only call `subscribe` for existing subscription if its in unsubscribed state.

1.3.3
=====

* fix `centrifuge.subscribe` method when calling on channel for which subscription
    already exists but in unsubscribe state. [See this pull](https://github.com/centrifugal/centrifuge-js/pull/11) request for more details.

1.3.2
=====

* use browserify to build library
* fix import over requirejs introduced in 1.3.0


1.3.1
=====

* add `latency` field (in milliseconds) to `connect` event context. This measures time passed
    between sending `connect` client protocol command and receiving connect response.

Also there was debug logging statement in 1.3.0 left in source code occasionally. 1.3.0 was rebuilt
with fix, but I am not sure that it was not cached somewhere in bower. So here is 1.3.1

1.3.0
=====

**Client API completely refactored in this release**. You can still use previous versions
to communicate with Centrifugo server from browser environment but new implementation much
more comfortable to use in our opinion and will be supported in future releases so consider
upgrading!

Highlights of this release:

* automatic resubscribe, no need to subscribe manually in `connect` event handler
* more opaque error handling
* drop support for SockJS < 1.0.0 (but if you still use SockJS 0.3.4 then feel free to open
    issue and we will return its support to client)

Please, read [new documentation](https://fzambia.gitbooks.io/centrifugal/content/clients/javascript.html)
for Javascript browser client.

Also, DOM plugin was removed from repository as new client API design solves most of problems
that DOM plugin existed for - i.e. abstracting subscribe on many channels and automatically
resubscribe on them. With new client you can have one global connection to Centrifugo and
subscribe on channels at any moment from any part of your javascript code.

Also we updated [examples](https://github.com/centrifugal/examples) to fit new changes.

If you are searching for old API docs (`centrifuge-js` <= 1.2.0) - [you can find it here](https://github.com/centrifugal/documentation/tree/c69ca51f21c028a6b9bd582afdbf0a5c13331957/client)

1.2.0
=====

* use exponential backoff when reconnecting
* follow disconnect advice from Centrifugo

1.1.0
=====

* support for `recover` option (introduced in Centrifugo v1.2.0)
* fix removing subscription when unsubscribing from channel

1.0.0
=====

One backwards incompatible change here. Centrifuge-js now sends JSON (`application/json`)
request instead of `application/x-www-form-urlencoded` when client wants to subscribe on
private channel. See [in docs](https://fzambia.gitbooks.io/centrifugal/content/mixed/private_channels.html) how to deal with JSON in this case.

* send JSON instead of form when subscribing on private channel.
* simple reconnect strategy

0.9.0
=====

The only change in `0.9.0` is changing private channel request POST parameter name
`channels` to `channels[]`. If you are using private channels then you should update
your backend code to fit new parameter name. This change was required because of how
PHP and Ruby on Rails handle POST parameter names when POST request contains multiple
values for the same parameter name.

* `channels` parameter renamed to `channels[]` in private subscription POST request to application.

0.8.0
=====

* Support SockJS 1.0. Use `transports` instead of `protocols_whitelist`.
* auto detect connection endpoint when `url` without endpoint path provided
* properly handle auth request failure
