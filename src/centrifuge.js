var Promise = require('es6-promise').Promise;
var EventEmitter = require('wolfy87-eventemitter');

/**
 * Oliver Caldwell
 * http://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/
 */
if (!Object.create) {
    Object.create = (function () {
        var F = function () {
        };
        return function (o) {
            if (arguments.length !== 1) {
                throw new Error('Object.create implementation only accepts one parameter.');
            }
            F.prototype = o;
            return new F();
        }
    })()
}

function extend(destination, source) {
    destination.prototype = Object.create(source.prototype);
    destination.prototype.constructor = destination;
    return source.prototype;
}

/**
 * Array.prototype.indexOf polyfill from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
 */
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (vMember, nStartFrom) {
        /*
        In non-strict mode, if the `this` variable is null or undefined, then it is
        set the window object. Otherwise, `this` is automaticly converted to an
        object. In strict mode if the `this` variable is null or undefined a
        `TypeError` is thrown.
        */
        if (!this) {
            throw new TypeError('Array.prototype.indexOf() - can not convert "' + this + '" to object');
        }
        var nIdx = isFinite(nStartFrom) ? Math.floor(nStartFrom) : 0,
            oThis = this instanceof Object ? this : new Object(this),
            nLen = isFinite(oThis.length) ? Math.floor(oThis.length) : 0;
        if (nIdx >= nLen) {
            return -1;
        }
        if (nIdx < 0) {
            nIdx = Math.max(nLen + nIdx, 0);
        }
        if (vMember === undefined) {
            /*
            Since `vMember` is undefined, keys that don't exist will have the same
            value as `vMember`, and thus do need to be checked.
            */
            do {
                if (nIdx in oThis && oThis[nIdx] === undefined) {
                    return nIdx;
                }
            } while (++nIdx < nLen);
        } else {
            do {
                if (oThis[nIdx] === vMember) {
                    return nIdx;
                }
            } while (++nIdx < nLen);
        }
        return -1;
    };
}

function fieldValue(object, name) {
    try {
        return object[name];
    } catch (x) {
        return undefined;
    }
}

/**
 * Mixes in the given objects into the target object by copying the properties.
 * @param deep if the copy must be deep
 * @param target the target object
 * @param objects the objects whose properties are copied into the target
 */
function mixin(deep, target, objects) {
    var result = target || {};
    for (var i = 2, l = arguments.length; i < l; i++) { // Skip first 2 parameters (deep and target), and loop over the others
        var object = arguments[i];
        if (object === undefined || object === null) {
            continue;
        }
        for (var propName in object) {
            var prop = fieldValue(object, propName);
            var targ = fieldValue(result, propName);
            if (prop === target) {
                continue; // Avoid infinite loops
            }
            if (prop === undefined) {
                continue; // Do not mixin undefined values
            }
            if (deep && typeof prop === 'object' && prop !== null) {
                if (prop instanceof Array) {
                    result[propName] = mixin(deep, targ instanceof Array ? targ : [], prop);
                } else {
                    var source = typeof targ === 'object' && !(targ instanceof Array) ? targ : {};
                    result[propName] = mixin(deep, source, prop);
                }
            } else {
                result[propName] = prop;
            }
        }
    }
    return result;
}

function endsWith(value, suffix) {
    return value.indexOf(suffix, value.length - suffix.length) !== -1;
}

function startsWith(value, prefix) {
    return value.lastIndexOf(prefix, 0) === 0;
}

function stripSlash(value) {
    if (value.substring(value.length - 1) === '/') {
        value = value.substring(0, value.length - 1);
    }
    return value;
}

function isString(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return typeof value === 'string' || value instanceof String;
}

function isFunction(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return typeof value === 'function';
}

function log(level, args) {
    if (global.console) {
        var logger = global.console[level];
        if (isFunction(logger)) {
            logger.apply(global.console, args);
        }
    }
}

function backoff(step, min, max) {
    var jitter = 0.5 * Math.random();
    var interval = min * Math.pow(2, step + 1);
    if (interval > max) {
        interval = max;
    }
    return Math.floor((1 - jitter) * interval);
}

function errorExists(data) {
    return 'error' in data && data.error !== null && data.error !== '';
}

var CONNECT = 0;
var REFRESH = 1;
var SUBSCRIBE = 2;
var UNSUBSCRIBE = 3;
var PUBLISH = 4;
var PRESENCE = 5;
var PRESENCE_STATS = 6;
var HISTORY = 7;
var PING = 8;
var RPC = 9;
var MESSAGE = 10;

var commandMethods = {
    CONNECT: "connect",
    REFRESH: "refresh",
    SUBSCRIBE: "subscribe",
    UNSUBSCRIBE: "unsubscribe",
    PUBLISH: "publish",
    PRESENCE: "presence",
    PRESENCE_STATS: "presence_stats",
    HISTORY: "history",
    PING: "ping",
    RPC: "rpc",
    MESSAGE: "message",
}

function Centrifuge(url, options) {
    this._sockjs = null;
    this._isSockjs = false;
    this._status = 'disconnected';
    this._reconnect = true;
    this._reconnecting = false;
    this._transport = null;
    this._transportName = null;
    this._transportClosed = true;
    this._messageId = 0;
    this._clientID = null;
    this._subs = {};
    this._lastMessageID = {};
    this._messages = [];
    this._isBatching = false;
    this._isAuthBatching = false;
    this._authChannels = {};
    this._numRefreshFailed = 0;
    this._refreshTimeout = null;
    this._pingInterval = null;
    this._pongTimeout = null;
    this._retries = 0;
    this._callbacks = {};
    this._latency = null;
    this._latencyStart = null;
    this._config = {
        url: null,
        sockjs: null,
        retry: 1000,
        maxRetry: 20000,
        timeout: 5000,
        credentials: null,
        resubscribe: true,
        ping: true,
        pingInterval: 30000,
        pongWaitTimeout: 5000,
        debug: false,
        insecure: false,
        server: null,
        privateChannelPrefix: '$',
        onTransportClose: null,
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
        ],
        onRefresh: null,
        refreshEndpoint: '/centrifuge/refresh/',
        refreshHeaders: {},
        refreshParams: {},
        refreshData: {},
        refreshTransport: 'ajax',
        refreshAttempts: null,
        refreshInterval: 3000,
        refreshFailed: null,
        onPrivateChannelAuth: null,
        authEndpoint: '/centrifuge/auth/',
        authHeaders: {},
        authParams: {},
        authTransport: 'ajax'
    };
    this._configure(url, options);
}

extend(Centrifuge, EventEmitter);

Centrifuge._jsonpCallbacks = {};
Centrifuge._jsonpTimeouts = {};
Centrifuge._nextJSONPCallbackID = 1;

var centrifugeProto = Centrifuge.prototype;

centrifugeProto._jsonp = function (url, params, headers, data, callback) {
    if (Object.keys(headers).length > 0) {
        this._log('Only AJAX request allows to send custom headers, it is not possible with JSONP.');
    }
    this._debug('sending JSONP request to', url);

    var callbackName = 'centrifuge_jsonp_' + Centrifuge._nextJSONPCallbackID.toString();
    Centrifuge._nextJSONPCallbackID++;

    var document = global.document;
    var script = document.createElement('script');

    var timeoutTrigger = setTimeout(function () {
        Centrifuge._jsonpCallbacks[callbackName] = function () {
        };
        callback(true, 'timeout');
    }, 3000);

    Centrifuge._jsonpCallbacks[callbackName] = function (data) {
        clearTimeout(timeoutTrigger);
        callback(false, data);
        delete Centrifuge._jsonpCallbacks[callbackName];
    };

    var query = '';
    for (var i in params) {
        if (params.hasOwnProperty(i)) {
            if (query.length > 0) {
                query += '&';
            }
            query += encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
        }
    }

    var callback_name = 'Centrifuge._jsonpCallbacks[\'' + callbackName + '\']';
    script.src = this._config.authEndpoint +
        '?callback=' + encodeURIComponent(callback_name) +
        '&data=' + encodeURIComponent(JSON.stringify(data)) +
        '&' + query;

    var head = document.getElementsByTagName('head')[0] || document.documentElement;
    head.insertBefore(script, head.firstChild);
};

centrifugeProto._ajax = function (url, params, headers, data, callback) {
    var self = this;
    self._debug('sending AJAX request to', url);

    var xhr = (global.XMLHttpRequest ? new global.XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP'));

    var query = '';
    for (var i in params) {
        if (params.hasOwnProperty(i)) {
            if (query.length > 0) {
                query += '&';
            }
            query += encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
        }
    }
    if (query.length > 0) {
        query = '?' + query;
    }
    xhr.open('POST', url + query, true);
    if ('withCredentials' in xhr) {
        xhr.withCredentials = true;
    }

    // add request headers
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    for (var headerName in headers) {
        if (headers.hasOwnProperty(headerName)) {
            xhr.setRequestHeader(headerName, headers[headerName]);
        }
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var data, parsed = false;
                try {
                    data = JSON.parse(xhr.responseText);
                    parsed = true;
                } catch (e) {
                    callback(true, 'JSON returned was invalid, yet status code was 200. Data was: ' + xhr.responseText);
                }
                if (parsed) { // prevents double execution.
                    callback(false, data);
                }
            } else {
                self._log("Couldn't get auth info from application", xhr.status);
                callback(true, xhr.status);
            }
        }
    };

    setTimeout(function () {
        xhr.send(JSON.stringify(data));
    }, 20);
    return xhr;
};

centrifugeProto._log = function () {
    log('info', arguments);
};

centrifugeProto._debug = function () {
    if (this._config.debug === true) {
        log('debug', arguments);
    }
};

centrifugeProto._websocketSupported = function () {
    return !(typeof WebSocket !== 'function' && typeof WebSocket !== 'object')
};

centrifugeProto._sockjsEndpoint = function () {
    var url = this._config.url;
    url = url
        .replace('ws://', 'http://')
        .replace('wss://', 'https://');
    url = stripSlash(url);
    if (!endsWith(this._config.url, 'connection/sockjs')) {
        url = url + '/connection/sockjs';
    }
    return url;
};

centrifugeProto._rawWebsocketEndpoint = function () {
    var url = this._config.url;
    url = url
        .replace('http://', 'ws://')
        .replace('https://', 'wss://');
    url = stripSlash(url);
    if (!endsWith(this._config.url, 'connection/websocket')) {
        url = url + '/connection/websocket';
    }
    return url;
};

centrifugeProto._configure = function (url, configuration) {
    this._config.url = url;
    this._config = mixin(false, this._config, configuration||{});
    this._debug('centrifuge config', this._config);

    if (!this._config.url) {
        throw 'Missing required configuration parameter \'url\' specifying server URL';
    }

    if (this._config.credentials !== null) {
        if (!this._config.credentials.user && this._config.credentials.user !== '') {
            if (!this._config.insecure) {
                throw 'Missing required credentials parameter \'user\' specifying user\'s unique ID in your application';
            } else {
                this._debug('user not found but this is OK for insecure mode - anonymous access will be used');
                this._config.user = '';
            }
        }

        if (!this._config.credentials.info) {
            this._config.credentials.info = "";
        }

        if (!this._config.credentials.exp) {
            if (!this._config.insecure) {
                throw 'Missing required credentials parameter \'exp\'';
            } else {
                this._debug('exp not found but this is OK for insecure mode');
            }
        }

        if (!this._config.credentials.sign) {
            if (!this._config.insecure) {
                throw 'Missing required credentials parameter \'sign\' specifying the sign of authentication credentials';
            } else {
                this._debug('sign not found but this is OK for insecure mode');
            }
        }
    }

    this._config.url = stripSlash(this._config.url);

    if (endsWith(this._config.url, 'connection/sockjs')) {
        this._debug('client will connect to SockJS endpoint');
        if (this._config.sockjs !== null) {
            this._debug('SockJS explicitly provided in options');
            this._sockjs = this._config.sockjs;
        } else {
            if (typeof SockJS === 'undefined') {
                throw 'include SockJS client library before Centrifuge javascript client library or provide SockJS object in options or use raw Websocket connection endpoint';
            }
            this._debug('use globally defined SockJS');
            this._sockjs = SockJS;
        }
    } else if (endsWith(this._config.url, 'connection/websocket')) {
        this._debug('client will connect to raw Websocket endpoint');
    } else {
        this._debug('client will detect connection endpoint itself');
        if (this._config.sockjs !== null) {
            this._debug('SockJS explicitly provided in options');
            this._sockjs = this._config.sockjs;
        } else {
            if (typeof SockJS === 'undefined') {
                this._debug('SockJS not found');
            } else {
                this._debug('use globally defined SockJS');
                this._sockjs = SockJS;
            }
        }
    }
};

centrifugeProto._setStatus = function (newStatus) {
    if (this._status !== newStatus) {
        this._debug('Status', this._status, '->', newStatus);
        this._status = newStatus;
    }
};

centrifugeProto._isDisconnected = function () {
    return this._status === 'disconnected';
};

centrifugeProto._isConnecting = function () {
    return this._status === 'connecting';
};

centrifugeProto._isConnected = function () {
    return this._status === 'connected';
};

centrifugeProto._nextMessageId = function () {
    return ++this._messageId;
};

centrifugeProto._resetRetry = function () {
    this._debug('reset retries count to 0');
    this._retries = 0;
};

centrifugeProto._getRetryInterval = function () {
    var interval = backoff(this._retries, this._config.retry, this._config.maxRetry);
    this._retries += 1;
    return interval;
};

centrifugeProto._clearConnectedState = function (reconnect) {
    this._clientID = null;

    // fire errbacks of registered calls.
    for (var uid in this._callbacks) {
        if (this._callbacks.hasOwnProperty(uid)) {
            var callbacks = this._callbacks[uid];
            var errback = callbacks.errback;
            if (!errback) {
                continue;
            }
            errback(this._createErrorObject('disconnected'));
        }
    }
    this._callbacks = {};

    // fire unsubscribe events
    for (var channel in this._subs) {
        if (this._subs.hasOwnProperty(channel)) {
            var sub = this._subs[channel];
            if (reconnect) {
                if (sub._isSuccess()) {
                    sub._triggerUnsubscribe();
                }
                sub._setSubscribing();
            } else {
                sub._setUnsubscribed();
            }
        }
    }

    if (!this._config.resubscribe || !this._reconnect) {
        // completely clear connected state
        this._subs = {};
    }
};

centrifugeProto._send = function (messages) {
    if (messages.length === 0) {
        return;
    }
    this._debug('Send', messages);
    var encodedMessages = [];
    for (var i in messages) {
        message = messages[i];
        encodedMessages.push(JSON.stringify(message))
    }
    this._transport.send(encodedMessages.join("\n"));
};

centrifugeProto._setupTransport = function () {

    var self = this;

    this._isSockjs = false;

    // detect transport to use - SockJS or raw Websocket
    if (this._sockjs !== null) {
        var sockjsOptions = {
            transports: this._config.sockjsTransports
        };
        if (this._config.server !== null) {
            sockjsOptions.server = this._config.server;
        }
        this._isSockjs = true;
        this._transport = new this._sockjs(this._sockjsEndpoint(), null, sockjsOptions);
    } else {
        if (!this._websocketSupported()) {
            this._debug('No Websocket support and no SockJS configured, can not connect');
            return;
        }
        this._transport = new WebSocket(this._rawWebsocketEndpoint());
    }

    this._transport.onopen = function () {
        self._transportClosed = false;
        self._reconnecting = false;
        if (self._isSockjs) {
            self._transportName = self._transport.transport;
            self._transport.onheartbeat = function () {
                self._restartPing();
            };
        } else {
            self._transportName = 'raw-websocket';
        }

        self._resetRetry();

        if (!isString(self._config.user)) {
            self._log('user expected to be string');
        }
        if (!isString(self._config.info)) {
            self._log('info expected to be string');
        }

        var msg = {
            method: commandMethods.CONNECT
        };

        if (self._config.credentials) {
            alert(1);
            msg.params = self._config.credentials;
        }

        self._latencyStart = new Date();
        self._call(msg).then(function(result){
            self._connectResponse(result);
        }, function(err){
            console.log(err);
        });
    };

    this._transport.onerror = function (error) {
        self._debug('transport level error', error);
    };

    this._transport.onclose = function (closeEvent) {
        self._transportClosed = true;
        var reason = 'connection closed';
        var needReconnect = true;
        if (closeEvent && 'reason' in closeEvent && closeEvent.reason) {
            try {
                var advice = JSON.parse(closeEvent.reason);
                self._debug('reason is an advice object', advice);
                reason = advice.reason;
                needReconnect = advice.reconnect;
            } catch (e) {
                reason = closeEvent.reason;
                self._debug('reason is a plain string', reason);
                needReconnect = reason !== 'disconnect';
            }
        }

        // onTransportClose callback should be executed every time transport was closed.
        // This can be helpful to catch failed connection events (because our disconnect
        // event only called once and every future attempts to connect do not fire disconnect
        // event again).
        if (self._config.onTransportClose !== null) {
            self._config.onTransportClose({
                event: closeEvent,
                reason: reason,
                reconnect: needReconnect
            });
        }

        self._disconnect(reason, needReconnect);

        if (self._reconnect === true) {
            self._reconnecting = true;
            var interval = self._getRetryInterval();
            self._debug('reconnect after ' + interval + ' milliseconds');
            setTimeout(function () {
                if (self._reconnect === true) {
                    self._connect.call(self);
                }
            }, interval);
        }

    };

    this._transport.onmessage = function (event) {
        var replies = event.data.split("\n");
        for (var i in replies) {
            if (replies.hasOwnProperty(i)) {
                if (!replies[i]) {
                    continue;
                }
                var data = JSON.parse(replies[i]);
                self._debug('Received', data);
                self._receive(data);
            }
        }
        self._restartPing();
    };
};

centrifugeProto.rpc = function(data) {
    var msg = {
        method: commandMethods.RPC,
        params: {
            data: data
        }
    }
    var promise = this._call(msg);
    return new Promise(function (resolve, reject) {
        promise.then(function(message){
            resolve(message.data);
        }, function(error) {
            reject(error);
        })
    });
}

centrifugeProto.send = function(data) {
    var msg = {
        method: commandMethods.MESSAGE,
        params: {
            data: data
        }
    }
    return this._callAsync(msg);
}

centrifugeProto._callAsync = function (msg) {
    this._addMessage(msg, true);
}

centrifugeProto._call = function (msg) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var id = self._addMessage(msg);
        self._registerCall(id, resolve, reject);
    });
}

centrifugeProto._connect = function (callback) {

    if (this.isConnected()) {
        this._debug('connect called when already connected');
        return;
    }

    if (this._status === 'connecting') {
        return;
    }

    this._debug('start connecting');

    this._setStatus('connecting');

    this._clientID = null;
    this._reconnect = true;

    if (callback) {
        this.on('connect', callback);
    }

    this._setupTransport();
};

centrifugeProto._disconnect = function (reason, shouldReconnect) {

    if (this.isDisconnected()) {
        return;
    }

    this._debug('disconnected:', reason, shouldReconnect);

    var reconnect = shouldReconnect || false;
    if (reconnect === false) {
        this._reconnect = false;
    }

    this._clearConnectedState(reconnect);

    if (!this.isDisconnected()) {
        this._setStatus('disconnected');
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        if (this._reconnecting === false) {
            this.trigger('disconnect', [{
                reason: reason,
                reconnect: reconnect
            }]);
        }
    }

    if (!this._transportClosed) {
        this._transport.close();
    }
};

centrifugeProto._refreshFailed = function () {
    this._numRefreshFailed = 0;
    if (!this.isDisconnected()) {
        this._disconnect('refresh failed', false);
    }
    if (this._config.refreshFailed !== null) {
        this._config.refreshFailed();
    }
};

centrifugeProto._refresh = function () {
    // ask web app for connection parameters - user ID,
    // timestamp, info and token
    var self = this;
    this._debug('refresh credentials');

    if (self._config.refreshAttempts === 0) {
        this._debug('refresh attempts set to 0, do not send refresh request at all');
        self._refreshFailed();
        return;
    }

    if (self._refreshTimeout !== null) {
        clearTimeout(self._refreshTimeout);
    }

    var cb = function (error, data) {
        if (error === true) {
            // We don't perform any connection status related actions here as we are
            // relying on Centrifugo that must close connection eventually.
            self._debug('error getting connection credentials from refresh endpoint', data);
            self._numRefreshFailed++;
            if (self._refreshTimeout) {
                clearTimeout(self._refreshTimeout);
            }
            if (self._config.refreshAttempts !== null && self._numRefreshFailed >= self._config.refreshAttempts) {
                self._refreshFailed();
                return;
            }
            self._refreshTimeout = setTimeout(function () {
                self._refresh.call(self);
            }, self._config.refreshInterval + Math.round(Math.random() * 1000));
            return;
        }
        self._numRefreshFailed = 0;
        self._config.user = data.user;
        self._config.timestamp = data.timestamp;
        if ('info' in data) {
            self._config.info = data.info;
        }
        self._config.token = data.token;
        if (self.isDisconnected()) {
            self._debug('credentials refreshed, connect from scratch');
            self._connect();
        } else {
            self._debug('send refreshed credentials');
            self._addMessage({
                method: commandMethods.REFRESH,
                params: {
                    user: self._config.user,
                    timestamp: self._config.timestamp,
                    info: self._config.info,
                    token: self._config.token
                }
            });
        }
    };

    if (this._config.onRefresh !== null) {
        var context = {};
        this._config.onRefresh(context, cb);
    } else {
        var transport = this._config.refreshTransport.toLowerCase();
        if (transport === 'ajax') {
            this._ajax(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, this._config.refreshData, cb);
        } else if (transport === 'jsonp') {
            this._jsonp(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, this._config.refreshData, cb);
        } else {
            throw 'Unknown refresh transport ' + transport;
        }
    }
};

centrifugeProto._subscribe = function (sub) {

    var channel = sub.channel;

    if (!(channel in this._subs)) {
        this._subs[channel] = sub;
    }

    if (!this.isConnected()) {
        // subscribe will be called later
        sub._setNew();
        return;
    }

    sub._setSubscribing();

    var msg = {
        method: commandMethods.SUBSCRIBE,
        params: {
            channel: channel
        }
    };

    // If channel name does not start with privateChannelPrefix - then we
    // can just send subscription message to Centrifuge. If channel name
    // starts with privateChannelPrefix - then this is a private channel
    // and we should ask web application backend for permission first.
    if (startsWith(channel, this._config.privateChannelPrefix)) {
        // private channel
        if (this._isAuthBatching) {
            this._authChannels[channel] = true;
        } else {
            this.startAuthBatching();
            this._subscribe(sub);
            this.stopAuthBatching();
        }
    } else {
        var recover = this._recover(channel);
        if (recover === true) {
            msg.params.recover = true;
            msg.params.last = this._getLastID(channel);
        }
        var self = this;
        this._call(msg).then(function(message) {
            self._subscribeResponse(channel, message);
        }, function(err) {
            self._subscribeError(err);
        });
    }
};

centrifugeProto._unsubscribe = function (sub) {
    if (this.isConnected()) {
        // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
        this._addMessage({
            method: commandMethods.UNSUBSCRIBE,
            params: {
                channel: sub.channel
            }
        });
    }
};

centrifugeProto._getSub = function (channel) {
    var sub = this._subs[channel];
    if (!sub) {
        return null;
    }
    return sub;
};

centrifugeProto._connectResponse = function (result) {
    if (this.isConnected()) {
        return;
    }

    if (this._latencyStart !== null) {
        this._latency = (new Date()).getTime() - this._latencyStart.getTime();
        this._latencyStart = null;
    }

    if (result.expires) {
        var isExpired = result.expired;
        if (isExpired) {
            this._reconnecting = true;
            this._disconnect('expired', true);
            this._refresh();
            return;
        }
    }
    this._clientID = result.client;
    this._setStatus('connected');

    if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
    }

    var self = this;

    if (result.expires) {
        this._refreshTimeout = setTimeout(function () {
            self._refresh.call(self);
        }, result.ttl * 1000);
    }

    if (this._config.resubscribe) {
        this.startBatching();
        this.startAuthBatching();
        for (var channel in this._subs) {
            if (this._subs.hasOwnProperty(channel)) {
                var sub = this._subs[channel];
                if (sub._shouldResubscribe()) {
                    this._subscribe(sub);
                }
            }
        }
        this.stopAuthBatching();
        this.stopBatching(true);
    }

    this._restartPing();
    this.trigger('connect', [{
        client: result.client,
        transport: this._transportName,
        latency: this._latency
    }]);
};

centrifugeProto._stopPing = function () {
    if (this._pongTimeout !== null) {
        clearTimeout(this._pongTimeout);
    }
    if (this._pingInterval !== null) {
        clearInterval(this._pingInterval);
    }
};

centrifugeProto._startPing = function () {
    if (this._config.ping !== true || this._config.pingInterval <= 0) {
        return;
    }
    if (!this.isConnected()) {
        return;
    }

    var self = this;

    this._pingInterval = setInterval(function () {
        if (!self.isConnected()) {
            self._stopPing();
            return;
        }
        self.ping();
        self._pongTimeout = setTimeout(function () {
            self._disconnect('no ping', true);
        }, self._config.pongWaitTimeout);
    }, this._config.pingInterval);
};

centrifugeProto._restartPing = function () {
    this._stopPing();
    this._startPing();
};

centrifugeProto._disconnectResponse = function (message) {
    if (!errorExists(message)) {
        var shouldReconnect = false;
        if ('reconnect' in message.body) {
            shouldReconnect = message.body.reconnect;
        }
        var reason = '';
        if ('reason' in message.body) {
            reason = message.body.reason;
        }
        this._disconnect(reason, shouldReconnect);
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._subscribeResponse = function (channel, result) {

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }

    if (!sub._isSubscribing()) {
        return;
    }

    var publications = result.publications;
    if (publications && publications.length > 0) {
        // handle missed publications.
        publications = publications.reverse();
        for (var i in publications) {
            if (publications.hasOwnProperty(i)) {
                this._messageResponse({
                    body: messages[i]
                });
            }
        }
    } else {
        if ('last' in result) {
            // no missed messages found so set last message id from body.
            this._lastMessageID[channel] = result.last;
        }
    }
    var recovered = false;
    if ('recovered' in result) {
        recovered = result.recovered;
    }
    sub._setSubscribeSuccess(recovered);
};

centrifugeProto._unsubscribeResponse = function (message) {
    var uid = message.uid;
    var body = message.body;
    var channel = body.channel;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }

    if (!errorExists(message)) {
        if (!uid) {
            // unsubscribe command from server – unsubscribe all current subs
            sub._setUnsubscribed();
        }
        // ignore client initiated successful unsubscribe responses as we
        // already unsubscribed on client level.
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._handleResponse = function(message) {
    var id = message.id;
    var result = message.result;
    if (!(id in this._callbacks)) {
        return;
    }
    var callbacks = this._callbacks[id];
    delete this._callbacks[id];
    if (!errorExists(message)) {
        var callback = callbacks.callback;
        if (!callback) {
            return;
        }
        callback(result);
    } else {
        var errback = callbacks.errback;
        if (!errback) {
            return;
        }
        errback(message.error);
        this.trigger('error', [{
            message: message
        }]);
    }
}

centrifugeProto._joinResponse = function (channel, data) {
    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('join', [data]);
};

centrifugeProto._leaveResponse = function (channel, data) {
    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('leave', [data]);
};

centrifugeProto._messageResponse = function (channel, message) {
    // keep last uid received from channel.
    this._lastMessageID[channel] = message.uid;

    var sub = this._getSub(channel);
    if (!sub) {
        return;
    }
    sub.trigger('message', [message]);
};

centrifugeProto._refreshResponse = function (message) {
    if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
    }
    if (!errorExists(message)) {
        if (message.body.expires) {
            var self = this;
            var isExpired = message.body.expired;
            if (isExpired) {
                self._refreshTimeout = setTimeout(function () {
                    self._refresh.call(self);
                }, self._config.refreshInterval + Math.round(Math.random() * 1000));
                return;
            }
            this._clientID = message.body.client;
            self._refreshTimeout = setTimeout(function () {
                self._refresh.call(self);
            }, message.body.ttl * 1000);
        }
    } else {
        this.trigger('error', [{
            message: message
        }]);
    }
};

centrifugeProto._handleAsyncMessage = function(message) {
    result = message.result;
    var type = 0;
    if ("type" in result) {
        type = result["type"];
    }
    var channel = result.channel;
    if (type === 0) {
        this._messageResponse(channel, result.data);
    } else if (type === 1) {
        this._joinResponse(channel, result.data);
    } else if (type === 2) {
        this._leaveResponse(channel, result.data);
    }
    console.log("ASYNC MESSAGE", result);
}

centrifugeProto._dispatchMessage = function (message) {
    if (message === undefined || message === null) {
        this._debug('dispatch: got undefined or null message');
        return;
    }

    var id = message.id;

    if (id && id > 0) {
        this._handleResponse(message);
    } else {
        this._handleAsyncMessage(message);
    }
};

centrifugeProto._receive = function (data) {
    if (Object.prototype.toString.call(data) === Object.prototype.toString.call([])) {
        // array of responses received
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                this._dispatchMessage(data[i]);
            }
        }
    } else if (Object.prototype.toString.call(data) === Object.prototype.toString.call({})) {
        // one response received
        this._dispatchMessage(data);
    }
};

centrifugeProto._flush = function () {
    var messages = this._messages.slice(0);
    this._messages = [];
    this._send(messages);
};

centrifugeProto._ping = function () {
    this._addMessage({
        method: commandMethods.PING
    });
};

centrifugeProto._recover = function (channel) {
    return channel in this._lastMessageID;
};

centrifugeProto._getLastID = function (channel) {
    var lastUID = this._lastMessageID[channel];
    if (lastUID) {
        this._debug('last uid found and sent for channel', channel);
        return lastUID;
    } else {
        this._debug('no last uid found for channel', channel);
        return '';
    }
};

centrifugeProto._createErrorObject = function (message, code) {
    var errObject = {
        error: {
            message: message,
            code: code || 0,
        }
    };
    return errObject;
};

centrifugeProto._errorObjectFromMessage = function (message) {
    return this._createErrorObject(message.error, message.code);
};

centrifugeProto._registerCall = function (id, callback, errback) {
    var self = this;
    this._callbacks[id] = {
        callback: callback,
        errback: errback
    };
    setTimeout(function () {
        delete self._callbacks[id];
        if (isFunction(errback)) {
            errback(self._createErrorObject('timeout'));
        }
    }, this._config.timeout);
};

centrifugeProto._addMessage = function (message, async) {
    if (!async) {
        var id = this._nextMessageId();
        message.id = id;
    }
    if (this._isBatching === true) {
        this._messages.push(message);
    } else {
        this._send([message]);
    }
    if (!async) {
        return id;
    }
    return 0;
};

centrifugeProto.getClientId = function () {
    return this._clientID;
};

centrifugeProto.isConnected = centrifugeProto._isConnected;

centrifugeProto.isDisconnected = centrifugeProto._isDisconnected;

centrifugeProto.connect = centrifugeProto._connect;

centrifugeProto.disconnect = function () {
    this._disconnect('client', false);
};

centrifugeProto.ping = centrifugeProto._ping;

centrifugeProto.startBatching = function () {
    // start collecting messages without sending them to Centrifuge until flush
    // method called
    this._isBatching = true;
};

centrifugeProto.stopBatching = function (flush) {
    // stop collecting messages
    flush = flush || false;
    this._isBatching = false;
    if (flush === true) {
        this.flush();
    }
};

centrifugeProto.flush = function () {
    // send batched messages to Centrifuge
    this._flush();
};

centrifugeProto.startAuthBatching = function () {
    // start collecting private channels to create bulk authentication
    // request to authEndpoint when stopAuthBatching will be called
    this._isAuthBatching = true;
};

centrifugeProto.stopAuthBatching = function () {
    var i,
        channel;

    // create request to authEndpoint with collected private channels
    // to ask if this client can subscribe on each channel
    this._isAuthBatching = false;
    var authChannels = this._authChannels;
    this._authChannels = {};
    var channels = [];

    for (channel in authChannels) {
        if (authChannels.hasOwnProperty(channel)) {
            var sub = this._getSub(channel);
            if (!sub) {
                continue;
            }
            channels.push(channel);
        }
    }

    if (channels.length === 0) {
        return;
    }

    var data = {
        client: this.getClientId(),
        channels: channels
    };

    var self = this;

    var cb = function (error, data) {
        if (error === true) {
            self._debug('authorization request failed');
            for (i in channels) {
                if (channels.hasOwnProperty(i)) {
                    channel = channels[i];
                    self._subscribeResponse({
                        error: 'authorization request failed',
                        advice: 'fix',
                        body: {
                            channel: channel
                        }
                    });
                }
            }
            return;
        }

        // try to send all subscriptions in one request.
        var batch = false;
        if (!self._isBatching) {
            self.startBatching();
            batch = true;
        }

        for (i in channels) {
            if (channels.hasOwnProperty(i)) {
                channel = channels[i];
                var channelResponse = data[channel];
                if (!channelResponse) {
                    // subscription:error
                    self._subscribeResponse({
                        error: 'channel not found in authorization response',
                        advice: 'fix',
                        body: {
                            channel: channel
                        }
                    });
                    continue;
                }
                if (!channelResponse.status || channelResponse.status === 200) {
                    var msg = {
                        method: commandMethods.SUBSCRIBE,
                        params: {
                            channel: channel,
                            client: self.getClientId(),
                            info: channelResponse.info,
                            sign: channelResponse.sign
                        }
                    };
                    var recover = self._recover(channel);
                    if (recover === true) {
                        msg.params.recover = true;
                        msg.params.last = self._getLastID(channel);
                    }
                    self._call(msg).then(function(message) {
                        self._subscribeResponse(channel, message);
                    }, function(err) {
                        self._subscribeError(channel, err);
                    });
                } else {
                    self._subscribeResponse({
                        error: channelResponse.status,
                        body: {
                            channel: channel
                        }
                    });
                }
            }
        }

        if (batch) {
            self.stopBatching(true);
        }

    };

    if (this._config.onPrivateChannelAuth !== null) {
        this._config.onPrivateChannelAuth({
            data: data
        }, cb);
    } else {
        var transport = this._config.authTransport.toLowerCase();
        if (transport === 'ajax') {
            this._ajax(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else if (transport === 'jsonp') {
            this._jsonp(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else {
            throw 'Unknown private channel auth transport ' + transport;
        }
    }
};

centrifugeProto.subscribe = function (channel, events) {
    if (arguments.length < 1) {
        throw 'Illegal arguments number: required 1, got ' + arguments.length;
    }
    if (!isString(channel)) {
        throw 'Illegal argument type: channel must be a string';
    }
    if (!this._config.resubscribe && !this.isConnected()) {
        throw 'Can not only subscribe in connected state when resubscribe option is off';
    }

    var currentSub = this._getSub(channel);

    if (currentSub !== null) {
        currentSub._setEvents(events);
        if (currentSub._isUnsubscribed()) {
            currentSub.subscribe();
        }
        return currentSub;
    } else {
        var sub = new Sub(this, channel, events);
        this._subs[channel] = sub;
        sub.subscribe();
        return sub;
    }
};

var _STATE_NEW = 0;
var _STATE_SUBSCRIBING = 1;
var _STATE_SUCCESS = 2;
var _STATE_ERROR = 3;
var _STATE_UNSUBSCRIBED = 4;

function Sub(centrifuge, channel, events) {
    this._status = _STATE_NEW;
    this._error = null;
    this._centrifuge = centrifuge;
    this.channel = channel;
    this._setEvents(events);
    this._isResubscribe = false;
    this._recovered = false;
    this._ready = false;
    this._promise = null;
    this._noResubscribe = false;
    this._initializePromise();
}

extend(Sub, EventEmitter);

var subProto = Sub.prototype;

subProto._initializePromise = function () {
    this._ready = false;
    var self = this;
    this._promise = new Promise(function (resolve, reject) {
        self._resolve = function (value) {
            self._ready = true;
            resolve(value);
        };
        self._reject = function (err) {
            self._ready = true;
            reject(err);
        };
    });
};

subProto._setEvents = function (events) {
    if (!events) {
        return;
    }
    if (isFunction(events)) {
        this.on('message', events);
    } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
        var knownEvents = ['message', 'join', 'leave', 'unsubscribe', 'subscribe', 'error'];
        for (var i = 0, l = knownEvents.length; i < l; i++) {
            var ev = knownEvents[i];
            if (ev in events) {
                this.on(ev, events[ev]);
            }
        }
    }
};

subProto._isNew = function () {
    return this._status === _STATE_NEW;
};

subProto._isUnsubscribed = function () {
    return this._status === _STATE_UNSUBSCRIBED;
};

subProto._isSubscribing = function () {
    return this._status === _STATE_SUBSCRIBING;
};

subProto._isReady = function () {
    return this._status === _STATE_SUCCESS || this._status === _STATE_ERROR;
};

subProto._isSuccess = function () {
    return this._status === _STATE_SUCCESS;
};

subProto._isError = function () {
    return this._status === _STATE_ERROR;
};

subProto._setNew = function () {
    this._status = _STATE_NEW;
};

subProto._setSubscribing = function () {
    if (this._ready === true) {
        // new promise for this subscription
        this._initializePromise();
        this._isResubscribe = true;
    }
    this._status = _STATE_SUBSCRIBING;
};

subProto._setSubscribeSuccess = function (recovered) {
    if (this._status === _STATE_SUCCESS) {
        return;
    }
    this._recovered = recovered;
    this._status = _STATE_SUCCESS;
    var successContext = this._getSubscribeSuccessContext(recovered);
    this.trigger('subscribe', [successContext]);
    this._resolve(successContext);
};

subProto._setSubscribeError = function (err) {
    if (this._status === _STATE_ERROR) {
        return;
    }
    this._status = _STATE_ERROR;
    this._error = err;
    var errContext = this._getSubscribeErrorContext();
    this.trigger('error', [errContext]);
    this._reject(errContext);
};

subProto._triggerUnsubscribe = function () {
    this.trigger('unsubscribe', [{
        channel: this.channel
    }]);
};

subProto._setUnsubscribed = function (noResubscribe) {
    if (this._status === _STATE_UNSUBSCRIBED) {
        return;
    }
    this._status = _STATE_UNSUBSCRIBED;
    if (noResubscribe === true) {
        this._noResubscribe = true;
    }
    this._triggerUnsubscribe();
};

subProto._shouldResubscribe = function () {
    return !this._noResubscribe;
};

subProto._getSubscribeSuccessContext = function () {
    return {
        channel: this.channel,
        isResubscribe: this._isResubscribe,
        recovered: this._recovered
    };
};

subProto._getSubscribeErrorContext = function () {
    var subscribeErrorContext = this._error;
    subscribeErrorContext.channel = this.channel;
    subscribeErrorContext.isResubscribe = this._isResubscribe;
    return subscribeErrorContext;
};

subProto.ready = function (callback, errback) {
    if (this._ready) {
        if (this._isSuccess()) {
            callback(this._getSubscribeSuccessContext());
        } else {
            errback(this._getSubscribeErrorContext());
        }
    }
};

subProto.subscribe = function () {
    if (this._status === _STATE_SUCCESS) {
        return;
    }
    this._centrifuge._subscribe(this);
    return this;
};

subProto.unsubscribe = function () {
    this._setUnsubscribed(true);
    this._centrifuge._unsubscribe(this);
};

subProto.publish = function (data) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: commandMethods.PUBLISH,
                params: {
                    channel: self.channel,
                    data: data
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

subProto.presence = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: commandMethods.PRESENCE,
                params: {
                    channel: self.channel
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

subProto.history = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._isUnsubscribed()) {
            reject(self._centrifuge._createErrorObject('subscription unsubscribed'));
            return;
        }
        self._promise.then(function () {
            if (!self._centrifuge.isConnected()) {
                reject(self._centrifuge._createErrorObject('disconnected'));
                return;
            }
            var uid = self._centrifuge._addMessage({
                method: commandMethods.HISTORY,
                params: {
                    channel: self.channel
                }
            });
            self._centrifuge._registerCall(uid, resolve, reject);
        }, function (err) {
            reject(err);
        });
    });
};

module.exports = Centrifuge;
