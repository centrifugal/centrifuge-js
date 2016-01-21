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