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