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
