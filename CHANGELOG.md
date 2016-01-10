1.3.0
=====

Client completely refactored in this release. You can still use previous versions to
communicate with Centrifugo but new implementation much more comfortable to use so
consider upgrading!

Please, read [new documentation]() for Javascript client.

If you are searching for old API docs (`centrifuge-js` <= 1.2.0) - [look here](https://fzambia.gitbooks.io/centrifugal/content/clients/javascript.html)

Highlights of this release:

* automatic resubscribe, no need to subscribe manually in `connect` event handler
* more opaque error handling

Also, I removed DOM plugin from repository as new client API design solves most of problems
that DOM plugin was for - i.e. abstracting subscribe on many channels and automatically
resubscribe on them.

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