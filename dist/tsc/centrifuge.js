"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Centrifuge = void 0;
const tslib_1 = require("tslib");
const subscription_1 = require("./subscription");
const codes_1 = require("./codes");
const transport_sockjs_1 = require("./transport_sockjs");
const transport_websocket_1 = require("./transport_websocket");
const transport_http_stream_1 = require("./transport_http_stream");
const transport_sse_1 = require("./transport_sse");
const json_1 = require("./json");
const utils_1 = require("./utils");
const types_1 = require("./types");
const events_1 = tslib_1.__importDefault(require("events"));
const defaults = {
    protocol: 'json',
    token: null,
    getToken: null,
    data: null,
    debug: false,
    name: 'js',
    version: '',
    fetch: null,
    readableStream: null,
    websocket: null,
    eventsource: null,
    sockjs: null,
    sockjsServer: null,
    sockjsTimeout: null,
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
    httpStreamRequestMode: 'cors',
    emulationEndpoint: '/emulation',
    emulationRequestMode: 'cors',
    minReconnectDelay: 500,
    maxReconnectDelay: 20000,
    timeout: 5000,
    maxServerPingDelay: 10000,
};
/** Centrifuge is a Centrifuge/Centrifugo bidirectional client. */
class Centrifuge extends events_1.default {
    /** Constructs Centrifuge client. Call connect() method to start connecting. */
    constructor(endpoint, options) {
        super();
        this._reconnectTimeout = null;
        this._refreshTimeout = null;
        this._serverPingTimeout = null;
        this.state = types_1.State.Disconnected;
        this._endpoint = endpoint;
        this._emulation = false;
        this._transports = [];
        this._currentTransportIndex = 0;
        this._triedAllTransports = false;
        this._transportWasOpen = false;
        this._transport = null;
        this._transportClosed = true;
        this._encoder = null;
        this._decoder = null;
        this._reconnectTimeout = null;
        this._reconnectAttempts = 0;
        this._client = null;
        this._session = '';
        this._node = '';
        this._subs = new Map();
        this._serverSubs = new Map();
        this._commandId = 0;
        this._commands = [];
        this._batching = false;
        this._refreshRequired = false;
        this._refreshTimeout = null;
        this._callbacks = {};
        this._token = undefined;
        this._dispatchPromise = Promise.resolve();
        this._serverPing = 0;
        this._serverPingTimeout = null;
        this._sendPong = false;
        this._promises = {};
        this._promiseId = 0;
        this._debugEnabled = false;
        this._config = Object.assign(Object.assign({}, defaults), options);
        this._configure();
        if (this._debugEnabled) {
            this.on('state', (ctx) => {
                this._debug('client state', ctx.oldState, '->', ctx.newState);
            });
            this.on('error', (ctx) => {
                this._debug('client error', ctx);
            });
        }
    }
    /** newSubscription allocates new Subscription to a channel. Since server only allows
     * one subscription per channel per client this method throws if client already has
     * channel subscription in internal registry.
     * */
    newSubscription(channel, options) {
        if (this.getSubscription(channel) !== null) {
            throw new Error('Subscription to the channel ' + channel + ' already exists');
        }
        const sub = new subscription_1.Subscription(this, channel, options);
        this._subs[channel] = sub;
        return sub;
    }
    /** getSubscription returns Subscription if it's registered in the internal
     * registry or null. */
    getSubscription(channel) {
        return this._getSub(channel);
    }
    /** removeSubscription allows removing Subcription from the internal registry. Subscrption
     * must be in unsubscribed state. */
    removeSubscription(sub) {
        if (!sub) {
            return;
        }
        if (sub.state !== types_1.SubscriptionState.Unsubscribed) {
            sub.unsubscribe();
        }
        this._removeSubscription(sub);
    }
    /** Get a map with all current client-side subscriptions. */
    subscriptions() {
        return this._subs;
    }
    /** ready returns a Promise which resolves upon client goes to Connected
     * state and rejects in case of client goes to Disconnected or Failed state.
     * Users can provide optional timeout in milliseconds. */
    ready(timeout) {
        if (this.state === types_1.State.Disconnected) {
            return Promise.reject({ code: codes_1.errorCodes.clientDisconnected, message: 'client disconnected' });
        }
        ;
        if (this.state === types_1.State.Connected) {
            return Promise.resolve();
        }
        ;
        return new Promise((res, rej) => {
            let ctx = {
                resolve: res,
                reject: rej
            };
            if (timeout) {
                ctx.timeout = setTimeout(function () {
                    rej({ code: codes_1.errorCodes.timeout, message: 'timeout' });
                }, timeout);
                ;
            }
            this._promises[this._nextPromiseId()] = ctx;
        });
    }
    /** connect to a server. */
    connect() {
        if (this._isConnected()) {
            this._debug('connect called when already connected');
            return;
        }
        if (this._isConnecting()) {
            this._debug('connect called when already connecting');
            return;
        }
        this._reconnectAttempts = 0;
        this._startConnecting();
    }
    ;
    /** disconnect from a server. */
    disconnect() {
        this._disconnect(codes_1.disconnectedCodes.disconnectCalled, 'disconnect called', false);
    }
    ;
    /** send asynchronous data to a server (without any response from a server
     * expected, see rpc method if you need response). */
    send(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                send: {
                    data: data
                }
            };
            const self = this;
            return this._methodCall().then(function () {
                const sent = self._transportSendCommands([cmd]); // can send async message to server without id set
                if (!sent) {
                    return Promise.reject(self._createErrorObject(codes_1.errorCodes.transportWriteError, 'transport write error'));
                }
                ;
                return Promise.resolve();
            });
        });
    }
    /** rpc to a server - i.e. a call which waits for a response with data. */
    rpc(method, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                rpc: {
                    method: method,
                    data: data
                }
            };
            const self = this;
            return this._methodCall().then(function () {
                return self._callPromise(cmd, function (reply) {
                    return {
                        'data': reply.rpc.data
                    };
                });
            });
        });
    }
    /** publish data to a channel. */
    publish(channel, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                publish: {
                    channel: channel,
                    data: data
                }
            };
            const self = this;
            return this._methodCall().then(function () {
                return self._callPromise(cmd, function () {
                    return {};
                });
            });
        });
    }
    /** history of a channel. */
    history(channel, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                history: this._getHistoryRequest(channel, options)
            };
            const self = this;
            return this._methodCall().then(function () {
                return self._callPromise(cmd, function (reply) {
                    const result = reply.history;
                    const publications = [];
                    if (result.publications) {
                        for (let i = 0; i < result.publications.length; i++) {
                            publications.push(self._getPublicationContext(channel, result.publications[i]));
                        }
                    }
                    return {
                        'publications': publications,
                        'epoch': result.epoch || '',
                        'offset': result.offset || 0
                    };
                });
            });
        });
    }
    /** presence for a channel. */
    presence(channel) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                presence: {
                    channel: channel
                }
            };
            const self = this;
            return this._methodCall().then(function () {
                return self._callPromise(cmd, function (reply) {
                    return {
                        'clients': reply.presence.presence
                    };
                });
            });
        });
    }
    /** presence stats for a channel. */
    presenceStats(channel) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cmd = {
                'presence_stats': {
                    channel: channel
                }
            };
            const self = this;
            return this._methodCall().then(function () {
                return self._callPromise(cmd, function (reply) {
                    const result = reply.presence_stats;
                    return {
                        'numUsers': result.num_users,
                        'numClients': result.num_clients
                    };
                });
            });
        });
    }
    /** start command batching (collect into temporary buffer without sending to a server)
     * until stopBatching called.*/
    startBatching() {
        // start collecting messages without sending them to Centrifuge until flush
        // method called
        this._batching = true;
    }
    ;
    /** stop batching commands and flush collected commands to the
     * network (all in one request/frame).*/
    stopBatching() {
        this._batching = false;
        this._flush();
    }
    ;
    /** @internal */
    _debug(...args) {
        if (!this._debugEnabled) {
            return;
        }
        (0, utils_1.log)('debug', args);
    }
    ;
    /** @internal */
    _setFormat(format) {
        if (this._formatOverride(format)) {
            return;
        }
        if (format === 'protobuf') {
            throw new Error('not implemented by JSON-only Centrifuge client, use client with Protobuf support');
        }
        this._encoder = new json_1.JsonEncoder();
        this._decoder = new json_1.JsonDecoder();
    }
    /** @internal */
    _formatOverride(_format) {
        return false;
    }
    _configure() {
        if (!('Promise' in global)) {
            throw new Error('Promise polyfill required');
        }
        if (!this._endpoint) {
            throw new Error('endpoint configuration required');
        }
        if (this._config.protocol !== 'json' && this._config.protocol !== 'protobuf') {
            throw new Error('unsupported protocol ' + this._config.protocol);
        }
        if (this._config.token !== null) {
            this._token = this._config.token;
        }
        this._setFormat('json');
        if (this._config.protocol === 'protobuf') {
            this._setFormat('protobuf');
        }
        if (this._config.debug === true ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('centrifuge.debug'))) {
            this._debugEnabled = true;
        }
        this._debug('config', this._config);
        if (typeof this._endpoint === 'string') {
            // Single address.
        }
        else if (typeof this._endpoint === 'object' && this._endpoint instanceof Array) {
            this._transports = this._endpoint;
            this._emulation = true;
            for (const i in this._transports) {
                const transportConfig = this._transports[i];
                if (!transportConfig.endpoint || !transportConfig.transport) {
                    throw new Error('malformed transport configuration');
                }
                const transportName = transportConfig.transport;
                if (['websocket', 'http_stream', 'sse', 'sockjs'].indexOf(transportName) < 0) {
                    throw new Error('unsupported transport name: ' + transportName);
                }
            }
        }
        else {
            throw new Error('unsupported url configuration type: only string or array of objects are supported');
        }
    }
    ;
    _setState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.emit('state', { newState, oldState });
            return true;
        }
        return false;
    }
    ;
    _isDisconnected() {
        return this.state === types_1.State.Disconnected;
    }
    ;
    _isConnecting() {
        return this.state === types_1.State.Connecting;
    }
    ;
    _isConnected() {
        return this.state === types_1.State.Connected;
    }
    ;
    _nextCommandId() {
        return ++this._commandId;
    }
    ;
    _getReconnectDelay() {
        const delay = (0, utils_1.backoff)(this._reconnectAttempts, this._config.minReconnectDelay, this._config.maxReconnectDelay);
        this._reconnectAttempts += 1;
        return delay;
    }
    ;
    _clearOutgoingRequests() {
        // fire errbacks of registered outgoing calls.
        for (const id in this._callbacks) {
            if (this._callbacks.hasOwnProperty(id)) {
                const callbacks = this._callbacks[id];
                clearTimeout(callbacks.timeout);
                const errback = callbacks.errback;
                if (!errback) {
                    continue;
                }
                errback({ error: this._createErrorObject(codes_1.errorCodes.connectionClosed, 'connection closed') });
            }
        }
        this._callbacks = {};
    }
    _clearConnectedState() {
        this._client = null;
        this._clearServerPingTimeout();
        this._clearRefreshTimeout();
        // fire events for client-side subscriptions.
        for (const channel in this._subs) {
            if (!this._subs.hasOwnProperty(channel)) {
                continue;
            }
            const sub = this._subs[channel];
            if (sub._isSubscribed()) {
                sub._setSubscribing(codes_1.subscribingCodes.transportClosed, 'transport closed');
            }
        }
        // fire events for server-side subscriptions.
        for (const channel in this._serverSubs) {
            if (this._serverSubs.hasOwnProperty(channel)) {
                this.emit('subscribing', { channel: channel });
            }
        }
    }
    ;
    _handleWriteError(commands) {
        for (let command of commands) {
            let id = command.id;
            if (!(id in this._callbacks)) {
                continue;
            }
            const callbacks = this._callbacks[id];
            clearTimeout(this._callbacks[id].timeout);
            delete this._callbacks[id];
            const errback = callbacks.errback;
            errback({ error: this._createErrorObject(codes_1.errorCodes.transportWriteError, 'transport write error') });
        }
    }
    _transportSendCommands(commands) {
        if (!commands.length) {
            return true;
        }
        if (!this._transport) {
            return false;
        }
        try {
            this._transport.send(this._encoder.encodeCommands(commands), this._session, this._node);
        }
        catch (e) {
            this._debug('error writing commands', e);
            this._handleWriteError(commands);
            return false;
        }
        return true;
    }
    _initializeTransport() {
        let websocket;
        if (this._config.websocket !== null) {
            websocket = this._config.websocket;
        }
        else {
            if (!(typeof global.WebSocket !== 'function' && typeof global.WebSocket !== 'object')) {
                websocket = global.WebSocket;
            }
        }
        let sockjs = null;
        if (this._config.sockjs !== null) {
            sockjs = this._config.sockjs;
        }
        else {
            if (typeof global.SockJS !== 'undefined') {
                sockjs = global.SockJS;
            }
        }
        let eventsource = null;
        if (this._config.eventsource !== null) {
            eventsource = this._config.eventsource;
        }
        else {
            if (typeof global.EventSource !== 'undefined') {
                eventsource = global.EventSource;
            }
        }
        let fetchFunc = null;
        if (this._config.fetch !== null) {
            fetchFunc = this._config.fetch;
        }
        else {
            if (typeof global.fetch !== 'undefined') {
                fetchFunc = global.fetch;
            }
        }
        let readableStream = null;
        if (this._config.readableStream !== null) {
            readableStream = this._config.readableStream;
        }
        else {
            if (typeof global.ReadableStream !== 'undefined') {
                readableStream = global.ReadableStream;
            }
        }
        if (!this._emulation) {
            if ((0, utils_1.startsWith)(this._endpoint, 'http')) {
                this._debug('client will use sockjs');
                this._transport = new transport_sockjs_1.SockjsTransport(this._endpoint, {
                    sockjs: sockjs,
                    transports: this._config.sockjsTransports,
                    server: this._config.sockjsServer,
                    timeout: this._config.sockjsTimeout
                });
                if (!this._transport.supported()) {
                    throw new Error('SockJS not available, use ws(s):// in url or include SockJS');
                }
            }
            else {
                this._debug('client will use websocket');
                this._transport = new transport_websocket_1.WebsocketTransport(this._endpoint, {
                    websocket: websocket
                });
                if (!this._transport.supported()) {
                    throw new Error('WebSocket not available');
                }
            }
        }
        else {
            if (this._currentTransportIndex >= this._transports.length) {
                this._triedAllTransports = true;
                this._currentTransportIndex = 0;
            }
            let count = 0;
            while (true) {
                if (count >= this._transports.length) {
                    throw new Error('no supported transport found');
                }
                const transportConfig = this._transports[this._currentTransportIndex];
                const transportName = transportConfig.transport;
                const transportEndpoint = transportConfig.endpoint;
                if (transportName === 'websocket') {
                    this._debug('trying websocket transport');
                    this._transport = new transport_websocket_1.WebsocketTransport(transportEndpoint, {
                        websocket: websocket
                    });
                    if (!this._transport.supported()) {
                        this._debug('websocket transport not available');
                        this._currentTransportIndex++;
                        count++;
                        continue;
                    }
                }
                else if (transportName === 'http_stream') {
                    this._debug('trying http_stream transport');
                    this._transport = new transport_http_stream_1.HttpStreamTransport(transportEndpoint, {
                        fetch: fetchFunc,
                        readableStream: readableStream,
                        requestMode: this._config.httpStreamRequestMode,
                        emulationEndpoint: this._config.emulationEndpoint,
                        emulationRequestMode: this._config.emulationRequestMode,
                        decoder: this._decoder,
                        encoder: this._encoder
                    });
                    if (!this._transport.supported()) {
                        this._debug('http_stream transport not available');
                        this._currentTransportIndex++;
                        count++;
                        continue;
                    }
                }
                else if (transportName === 'sse') {
                    this._debug('trying sse transport');
                    this._transport = new transport_sse_1.SseTransport(transportEndpoint, {
                        eventsource: eventsource,
                        fetch: fetchFunc,
                        emulationEndpoint: this._config.emulationEndpoint,
                        emulationRequestMode: this._config.emulationRequestMode
                    });
                    if (!this._transport.supported()) {
                        this._debug('sse transport not available');
                        this._currentTransportIndex++;
                        count++;
                        continue;
                    }
                }
                else if (transportName === 'sockjs') {
                    this._debug('trying sockjs');
                    this._transport = new transport_sockjs_1.SockjsTransport(transportEndpoint, {
                        sockjs: sockjs,
                        transports: this._config.sockjsTransports,
                        server: this._config.sockjsServer,
                        timeout: this._config.sockjsTimeout
                    });
                    if (!this._transport.supported()) {
                        this._debug('sockjs transport not available');
                        this._currentTransportIndex++;
                        count++;
                        continue;
                    }
                }
                else {
                    throw new Error('unknown transport ' + transportName);
                }
                break;
            }
        }
        const connectCommand = this._constructConnectCommand();
        if (this._transport.emulation()) {
            connectCommand.id = this._nextCommandId();
            this._callConnectFake(connectCommand.id).then(resolveCtx => {
                // @ts-ignore
                const result = resolveCtx.reply.connect;
                this._connectResponse(result);
                // @ts-ignore
                if (resolveCtx.next) {
                    // @ts-ignore
                    resolveCtx.next();
                }
            }, rejectCtx => {
                if (rejectCtx.error.code >= 100) {
                    this._connectError(rejectCtx.error);
                }
                if (rejectCtx.next) {
                    rejectCtx.next();
                }
            });
        }
        const self = this;
        let transportName;
        let wasOpen = false;
        this._transport.initialize(this._config.protocol, {
            onOpen: function () {
                wasOpen = true;
                transportName = self._transport.subName();
                self._debug(transportName, 'transport open');
                self._transportWasOpen = true;
                self._transportClosed = false;
                if (self._transport.emulation()) {
                    return;
                }
                self._sendConnect();
            },
            onError: function (e) {
                self._debug('transport level error', e);
            },
            onClose: function (closeEvent) {
                self._debug(self._transport.name(), 'transport closed');
                self._transportClosed = true;
                let reason = 'connection closed';
                let needReconnect = true;
                let code = 0;
                if (closeEvent && 'code' in closeEvent && closeEvent.code) {
                    code = closeEvent.code;
                }
                if (closeEvent && closeEvent.reason) {
                    try {
                        const advice = JSON.parse(closeEvent.reason);
                        reason = advice.reason;
                        needReconnect = advice.reconnect;
                    }
                    catch (e) {
                        reason = closeEvent.reason;
                        if ((code >= 3500 && code < 4000) || (code >= 4500 && code < 5000)) {
                            needReconnect = false;
                        }
                    }
                }
                if (code < 3000) {
                    if (code === 1009) {
                        code = codes_1.disconnectedCodes.messageSizeLimit;
                        reason = 'message size limit exceeded';
                        needReconnect = false;
                    }
                    else {
                        code = codes_1.connectingCodes.transportClosed;
                        reason = 'transport closed';
                    }
                    if (self._emulation && !self._transportWasOpen) {
                        self._currentTransportIndex++;
                        if (self._currentTransportIndex >= self._transports.length) {
                            self._triedAllTransports = true;
                            self._currentTransportIndex = 0;
                        }
                    }
                }
                else {
                    // Codes >= 3000 are sent from a server application level.
                    self._transportWasOpen = true;
                }
                let isInitialHandshake = false;
                if (self._emulation && !self._transportWasOpen && !self._triedAllTransports) {
                    isInitialHandshake = true;
                }
                if (self._isConnecting() && !wasOpen) {
                    self.emit('error', {
                        type: 'transport',
                        error: {
                            code: codes_1.errorCodes.transportClosed,
                            message: 'transport closed'
                        },
                        transport: self._transport.name()
                    });
                }
                self._disconnect(code, reason, needReconnect);
                if (self._isConnecting()) {
                    let delay = self._getReconnectDelay();
                    if (isInitialHandshake) {
                        delay = 0;
                    }
                    self._debug('reconnect after ' + delay + ' milliseconds');
                    self._reconnectTimeout = setTimeout(() => {
                        self._startReconnecting();
                    }, delay);
                }
            },
            onMessage: function (data) {
                self._dataReceived(data);
            }
        }, this._encoder.encodeCommands([connectCommand]));
    }
    ;
    _sendConnect() {
        const connectCommand = this._constructConnectCommand();
        const self = this;
        this._call(connectCommand).then(resolveCtx => {
            // @ts-ignore
            const result = resolveCtx.reply.connect;
            self._connectResponse(result);
            // @ts-ignore
            if (resolveCtx.next) {
                // @ts-ignore
                resolveCtx.next();
            }
        }, rejectCtx => {
            self._connectError(rejectCtx.error);
            if (rejectCtx.next) {
                rejectCtx.next();
            }
        });
    }
    _startReconnecting() {
        if (!this._isConnecting()) {
            return;
        }
        const needTokenRefresh = this._refreshRequired || (!this._token && this._config.getToken !== null);
        if (!needTokenRefresh) {
            this._startConnecting();
            return;
        }
        const self = this;
        this._getToken().then(function (token) {
            if (!self._isConnecting()) {
                return;
            }
            if (!token) {
                self._failUnauthorized();
                return;
            }
            self._token = token;
            self._debug('connection token refreshed');
            self._startConnecting();
        }).catch(function (e) {
            if (!self._isConnecting()) {
                return;
            }
            self.emit('error', {
                'type': 'connectToken',
                'error': {
                    code: codes_1.errorCodes.clientConnectToken,
                    message: e !== undefined ? e.toString() : ''
                }
            });
            const delay = self._getReconnectDelay();
            self._debug('error on connection token refresh, reconnect after ' + delay + ' milliseconds', e);
            self._reconnectTimeout = setTimeout(() => {
                self._startReconnecting();
            }, delay);
        });
    }
    _connectError(err) {
        if (this.state !== types_1.State.Connecting) {
            return;
        }
        if (err.code === 109) { // token expired.
            // next connect attempt will try to refresh token.
            this._refreshRequired = true;
        }
        if (err.code < 100 || err.temporary === true || err.code === 109) {
            this.emit('error', {
                'type': 'connect',
                'error': err
            });
            // Not yet connected, closing transport is enough.
            if (this._transport && !this._transportClosed) {
                this._transportClosed = true;
                this._transport.close();
            }
        }
        else {
            this._disconnect(err.code, err.message, false);
        }
    }
    _constructConnectCommand() {
        const req = {};
        if (this._token) {
            req.token = this._token;
        }
        if (this._config.data) {
            req.data = this._config.data;
        }
        if (this._config.name) {
            req.name = this._config.name;
        }
        if (this._config.version) {
            req.version = this._config.version;
        }
        let subs = {};
        let hasSubs = false;
        for (const channel in this._serverSubs) {
            if (this._serverSubs.hasOwnProperty(channel) && this._serverSubs[channel].recoverable) {
                hasSubs = true;
                let sub = {
                    'recover': true
                };
                if (this._serverSubs[channel].offset) {
                    sub['offset'] = this._serverSubs[channel].offset;
                }
                if (this._serverSubs[channel].epoch) {
                    sub['epoch'] = this._serverSubs[channel].epoch;
                }
                subs[channel] = sub;
            }
        }
        if (hasSubs) {
            req.subs = subs;
        }
        return {
            connect: req
        };
    }
    _getHistoryRequest(channel, options) {
        let req = {
            channel: channel
        };
        if (options !== undefined) {
            if (options.since) {
                req.since = {
                    offset: options.since.offset
                };
                if (options.since.epoch) {
                    req.since.epoch = options.since.epoch;
                }
            }
            ;
            if (options.limit !== undefined) {
                req.limit = options.limit;
            }
            if (options.reverse === true) {
                req.reverse = true;
            }
        }
        ;
        return req;
    }
    _methodCall() {
        if (this._isConnected()) {
            return Promise.resolve();
        }
        return new Promise((res, rej) => {
            const timeout = setTimeout(function () {
                rej({ code: codes_1.errorCodes.timeout, message: 'timeout' });
            }, this._config.timeout);
            this._promises[this._nextPromiseId()] = {
                timeout: timeout,
                resolve: res,
                reject: rej
            };
        });
    }
    _callPromise(cmd, resultCB) {
        return new Promise((resolve, reject) => {
            this._call(cmd).then(resolveCtx => {
                // @ts-ignore
                resolve(resultCB(resolveCtx.reply));
                // @ts-ignore
                if (resolveCtx.next) {
                    // @ts-ignore
                    resolveCtx.next();
                }
            }, rejectCtx => {
                reject(rejectCtx.error);
                if (rejectCtx.next) {
                    rejectCtx.next();
                }
            });
        });
    }
    _dataReceived(data) {
        if (this._serverPing > 0) {
            this._waitServerPing();
        }
        const replies = this._decoder.decodeReplies(data);
        // We have to guarantee order of events in replies processing - i.e. start processing
        // next reply only when we finished processing of current one. Without syncing things in
        // this way we could get wrong publication events order as reply promises resolve
        // on next loop tick so for loop continues before we finished emitting all reply events.
        this._dispatchPromise = this._dispatchPromise.then(() => {
            let finishDispatch;
            this._dispatchPromise = new Promise(resolve => {
                finishDispatch = resolve;
            });
            this._dispatchSynchronized(replies, finishDispatch);
        });
    }
    _dispatchSynchronized(replies, finishDispatch) {
        let p = Promise.resolve();
        for (const i in replies) {
            if (replies.hasOwnProperty(i)) {
                p = p.then(() => {
                    return this._dispatchReply(replies[i]);
                });
            }
        }
        p = p.then(() => {
            finishDispatch();
        });
    }
    _dispatchReply(reply) {
        var next;
        const p = new Promise(resolve => {
            next = resolve;
        });
        if (reply === undefined || reply === null) {
            this._debug('dispatch: got undefined or null reply');
            next();
            return p;
        }
        const id = reply.id;
        if (id && id > 0) {
            this._handleReply(reply, next);
        }
        else {
            if (!reply.push) {
                this._handleServerPing(next);
            }
            else {
                this._handlePush(reply.push, next);
            }
        }
        return p;
    }
    ;
    /** @internal */
    _call(cmd) {
        return new Promise((resolve, reject) => {
            cmd.id = this._nextCommandId();
            this._registerCall(cmd.id, resolve, reject);
            this._addCommand(cmd);
        });
    }
    _callConnectFake(id) {
        return new Promise((resolve, reject) => {
            this._registerCall(id, resolve, reject);
        });
    }
    _startConnecting() {
        this._debug('start connecting');
        if (this._setState(types_1.State.Connecting)) {
            this.emit('connecting', { code: codes_1.connectingCodes.connectCalled, reason: 'connect called' });
        }
        ;
        this._client = null;
        this._initializeTransport();
    }
    _disconnect(code, reason, reconnect) {
        if (this._isDisconnected()) {
            return;
        }
        const previousState = this.state;
        const ctx = {
            code: code,
            reason: reason
        };
        let needEvent = false;
        if (reconnect) {
            needEvent = this._setState(types_1.State.Connecting);
        }
        else {
            needEvent = this._setState(types_1.State.Disconnected);
            this._rejectPromises({ code: codes_1.errorCodes.clientDisconnected, message: 'disconnected' });
        }
        this._clearOutgoingRequests();
        if (previousState === types_1.State.Connecting) {
            this._clearReconnectTimeout();
        }
        if (previousState === types_1.State.Connected) {
            this._clearConnectedState();
        }
        if (needEvent) {
            if (this._isConnecting()) {
                this.emit('connecting', ctx);
            }
            else {
                this.emit('disconnected', ctx);
            }
        }
        if (this._transport && !this._transportClosed) {
            this._transportClosed = true;
            this._transport.close();
        }
    }
    ;
    _failUnauthorized() {
        this._disconnect(codes_1.disconnectedCodes.unauthorized, 'unauthorized', false);
    }
    _getToken() {
        // ask application for new connection token.
        this._debug('get connection token');
        if (!this._config.getToken) {
            throw new Error('provide a function to get connection token');
        }
        return this._config.getToken({});
    }
    _refresh() {
        const clientId = this._client;
        const self = this;
        this._getToken().then(function (token) {
            if (clientId !== self._client) {
                return;
            }
            if (!token) {
                self._failUnauthorized();
                return;
            }
            self._token = token;
            self._debug('connection token refreshed');
            if (!self._isConnected()) {
                return;
            }
            const cmd = {
                refresh: { token: self._token }
            };
            self._call(cmd).then(resolveCtx => {
                // @ts-ignore
                const result = resolveCtx.reply.refresh;
                self._refreshResponse(result);
                // @ts-ignore
                if (resolveCtx.next) {
                    // @ts-ignore
                    resolveCtx.next();
                }
            }, rejectCtx => {
                self._refreshError(rejectCtx.error);
                if (rejectCtx.next) {
                    rejectCtx.next();
                }
            });
        }).catch(function (e) {
            self.emit('error', {
                type: 'refreshToken',
                error: {
                    code: codes_1.errorCodes.clientRefreshToken,
                    message: e !== undefined ? e.toString() : ''
                }
            });
            self._refreshTimeout = setTimeout(() => self._refresh(), self._getRefreshRetryDelay());
        });
    }
    ;
    _refreshError(err) {
        if (err.code < 100 || err.temporary === true) {
            this.emit('error', {
                type: 'refresh',
                error: err
            });
            this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
        }
        else {
            this._disconnect(err.code, err.message, false);
        }
    }
    _getRefreshRetryDelay() {
        return (0, utils_1.backoff)(0, 5000, 10000);
    }
    _refreshResponse(result) {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }
        if (result.expires) {
            this._client = result.client;
            this._refreshTimeout = setTimeout(() => this._refresh(), (0, utils_1.ttlMilliseconds)(result.ttl));
        }
    }
    ;
    /** @internal */
    _subscribe(sub) {
        this._debug('subscribing on', sub.channel);
        const channel = sub.channel;
        if (!(channel in this._subs)) {
            this._subs[channel] = sub;
        }
        if (!this._isConnected()) {
            this._debug('delay subscribe on', sub.channel, 'till connected');
            // subscribe will be called later automatically.
            return;
        }
        if (sub._usesToken()) {
            // token channel, need to get token before sending subscribe.
            const clientId = this._client;
            const self = this;
            if (sub._token) {
                this._sendSubscribe(sub, sub._token);
            }
            else {
                sub._getSubscriptionToken().then(function (token) {
                    if (clientId !== self._client) {
                        return;
                    }
                    if (!sub._isSubscribing()) {
                        return;
                    }
                    if (!token) {
                        sub._failUnauthorized();
                        return;
                    }
                    sub._token = token;
                    self._sendSubscribe(sub, token);
                }).catch(function (e) {
                    if (!sub._isSubscribing()) {
                        return;
                    }
                    sub.emit('error', {
                        type: 'subscribeToken',
                        channel: sub.channel,
                        error: {
                            code: codes_1.errorCodes.subscriptionSubscribeToken,
                            message: e !== undefined ? e.toString() : ''
                        }
                    });
                    sub._scheduleResubscribe();
                });
            }
        }
        else {
            this._sendSubscribe(sub, '');
        }
    }
    ;
    _sendSubscribe(sub, token) {
        const channel = sub.channel;
        const req = {
            channel: channel
        };
        if (token) {
            req.token = token;
        }
        if (sub._data) {
            req.data = sub._data;
        }
        if (sub._positioned) {
            req.positioned = true;
        }
        if (sub._recoverable) {
            req.recoverable = true;
        }
        if (sub._needRecover()) {
            req.recover = true;
            const offset = sub._getOffset();
            if (offset) {
                req.offset = offset;
            }
            const epoch = sub._getEpoch();
            if (epoch) {
                req.epoch = epoch;
            }
        }
        const cmd = { subscribe: req };
        this._call(cmd).then(resolveCtx => {
            // @ts-ignore
            const result = resolveCtx.reply.subscribe;
            this._subscribeResponse(channel, result);
            // @ts-ignore
            if (resolveCtx.next) {
                // @ts-ignore
                resolveCtx.next();
            }
        }, rejectCtx => {
            this._subscribeError(channel, rejectCtx.error);
            if (rejectCtx.next) {
                rejectCtx.next();
            }
        });
    }
    /** @internal */
    _sendSubRefresh(sub, token) {
        const req = {
            channel: sub.channel,
            token: token
        };
        const cmd = { 'sub_refresh': req };
        this._call(cmd).then(resolveCtx => {
            // @ts-ignore
            const result = resolveCtx.reply.sub_refresh;
            sub._refreshResponse(result);
            // @ts-ignore
            if (resolveCtx.next) {
                // @ts-ignore
                resolveCtx.next();
            }
        }, rejectCtx => {
            sub._refreshError(rejectCtx.error);
            if (rejectCtx.next) {
                rejectCtx.next();
            }
        });
    }
    _removeSubscription(sub) {
        if (sub === null) {
            return;
        }
        delete this._subs[sub.channel];
    }
    /** @internal */
    _unsubscribe(sub) {
        if (!this._isConnected()) {
            return;
        }
        const req = {
            channel: sub.channel
        };
        const cmd = { unsubscribe: req };
        const self = this;
        this._call(cmd).then(resolveCtx => {
            // @ts-ignore
            if (resolveCtx.next) {
                // @ts-ignore
                resolveCtx.next();
            }
        }, rejectCtx => {
            if (rejectCtx.next) {
                rejectCtx.next();
            }
            self._disconnect(codes_1.connectingCodes.unsubscribeError, 'unsubscribe error', true);
        });
    }
    ;
    _getSub(channel) {
        const sub = this._subs[channel];
        if (!sub) {
            return null;
        }
        return sub;
    }
    ;
    _isServerSub(channel) {
        return this._serverSubs[channel] !== undefined;
    }
    ;
    _connectResponse(result) {
        this._transportWasOpen = true;
        this._reconnectAttempts = 0;
        this._refreshRequired = false;
        if (this._isConnected()) {
            return;
        }
        this._client = result.client;
        this._setState(types_1.State.Connected);
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        if (result.expires) {
            this._refreshTimeout = setTimeout(() => this._refresh(), (0, utils_1.ttlMilliseconds)(result.ttl));
        }
        this._session = result.session;
        this._node = result.node;
        this.startBatching();
        for (const channel in this._subs) {
            if (this._subs.hasOwnProperty(channel)) {
                const sub = this._subs[channel];
                if (sub._isSubscribing()) {
                    this._subscribe(sub);
                }
            }
        }
        this.stopBatching();
        const ctx = {
            client: result.client,
            transport: this._transport.subName()
        };
        if (result.data) {
            ctx.data = result.data;
        }
        this.emit('connected', ctx);
        this._resolvePromises();
        this._processServerSubs(result.subs || {});
        if (result.ping && result.ping > 0) {
            this._serverPing = result.ping * 1000;
            this._sendPong = result.pong === true;
            this._waitServerPing();
        }
        else {
            this._serverPing = 0;
        }
    }
    ;
    _processServerSubs(subs) {
        for (const channel in subs) {
            if (!subs.hasOwnProperty(channel)) {
                continue;
            }
            const sub = subs[channel];
            this._serverSubs[channel] = {
                'offset': sub.offset,
                'epoch': sub.epoch,
                'recoverable': sub.recoverable || false
            };
            const subCtx = this._getSubscribeContext(channel, sub);
            this.emit('subscribed', subCtx);
        }
        for (const channel in subs) {
            if (!subs.hasOwnProperty(channel)) {
                continue;
            }
            const sub = subs[channel];
            if (sub.recovered) {
                let pubs = sub.publications;
                if (pubs && pubs.length > 0) {
                    for (let i in pubs) {
                        if (pubs.hasOwnProperty(i)) {
                            this._handlePublication(channel, pubs[i]);
                        }
                    }
                }
            }
        }
        for (const channel in this._serverSubs) {
            if (!this._serverSubs.hasOwnProperty(channel)) {
                continue;
            }
            if (!subs[channel]) {
                this.emit('unsubscribed', { channel: channel });
                delete this._serverSubs[channel];
            }
        }
    }
    ;
    _clearRefreshTimeout() {
        if (this._refreshTimeout !== null) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }
    }
    ;
    _clearReconnectTimeout() {
        if (this._reconnectTimeout !== null) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
    }
    ;
    _clearServerPingTimeout() {
        if (this._serverPingTimeout !== null) {
            clearTimeout(this._serverPingTimeout);
            this._serverPingTimeout = null;
        }
    }
    ;
    _waitServerPing() {
        if (this._config.maxServerPingDelay === 0) {
            return;
        }
        if (!this._isConnected()) {
            return;
        }
        this._clearServerPingTimeout();
        this._serverPingTimeout = setTimeout(() => {
            if (!this._isConnected()) {
                return;
            }
            this._disconnect(codes_1.connectingCodes.noPing, 'no ping', true);
        }, this._serverPing + this._config.maxServerPingDelay);
    }
    ;
    _subscribeError(channel, error) {
        const sub = this._getSub(channel);
        if (!sub) {
            return;
        }
        if (!sub._isSubscribing()) {
            return;
        }
        if (error.code === codes_1.errorCodes.timeout) {
            this._disconnect(codes_1.connectingCodes.subscribeTimeout, 'subscribe timeout', true);
            return;
        }
        sub._subscribeError(error);
    }
    ;
    /** @internal */
    _getSubscribeContext(channel, result) {
        const ctx = {
            channel: channel,
            positioned: false,
            recoverable: false,
            wasRecovering: false,
            recovered: false
        };
        if (result.recovered) {
            ctx.recovered = true;
        }
        if (result.positioned) {
            ctx.positioned = true;
        }
        if (result.recoverable) {
            ctx.recoverable = true;
        }
        if (result.was_recovering) {
            ctx.wasRecovering = true;
        }
        let epoch = '';
        if ('epoch' in result) {
            epoch = result.epoch;
        }
        let offset = 0;
        if ('offset' in result) {
            offset = result.offset;
        }
        if (ctx.positioned || ctx.recoverable) {
            ctx.streamPosition = {
                'offset': offset,
                'epoch': epoch
            };
        }
        if (result.data) {
            ctx.data = result.data;
        }
        return ctx;
    }
    _subscribeResponse(channel, result) {
        const sub = this._getSub(channel);
        if (!sub) {
            return;
        }
        if (!sub._isSubscribing()) {
            return;
        }
        sub._setSubscribed(result);
    }
    ;
    _handleReply(reply, next) {
        const id = reply.id;
        if (!(id in this._callbacks)) {
            next();
            return;
        }
        const callbacks = this._callbacks[id];
        clearTimeout(this._callbacks[id].timeout);
        delete this._callbacks[id];
        if (!(0, utils_1.errorExists)(reply)) {
            const callback = callbacks.callback;
            if (!callback) {
                return;
            }
            callback({ reply, next });
        }
        else {
            const errback = callbacks.errback;
            if (!errback) {
                next();
                return;
            }
            const error = reply.error;
            errback({ error, next });
        }
    }
    _handleJoin(channel, join) {
        const sub = this._getSub(channel);
        if (!sub) {
            if (this._isServerSub(channel)) {
                const ctx = { channel: channel, info: this._getJoinLeaveContext(join.info) };
                this.emit('join', ctx);
            }
            return;
        }
        sub._handleJoin(join);
    }
    ;
    _handleLeave(channel, leave) {
        const sub = this._getSub(channel);
        if (!sub) {
            if (this._isServerSub(channel)) {
                const ctx = { channel: channel, info: this._getJoinLeaveContext(leave.info) };
                this.emit('leave', ctx);
            }
            return;
        }
        sub._handleLeave(leave);
    }
    ;
    _handleUnsubscribe(channel, unsubscribe) {
        const sub = this._getSub(channel);
        if (!sub) {
            if (this._isServerSub(channel)) {
                delete this._serverSubs[channel];
                this.emit('unsubscribed', { channel: channel });
            }
            return;
        }
        if (unsubscribe.code < 2500) {
            sub._setUnsubscribed(unsubscribe.code, unsubscribe.reason, false);
        }
        else {
            sub._setSubscribing(unsubscribe.code, unsubscribe.reason);
        }
    }
    ;
    _handleSubscribe(channel, sub) {
        this._serverSubs[channel] = {
            'offset': sub.offset,
            'epoch': sub.epoch,
            'recoverable': sub.recoverable || false
        };
        this.emit('subscribed', this._getSubscribeContext(channel, sub));
    }
    ;
    _handleDisconnect(disconnect) {
        const code = disconnect.code;
        let reconnect = true;
        if ((code >= 3500 && code < 4000) || (code >= 4500 && code < 5000)) {
            reconnect = false;
        }
        this._disconnect(code, disconnect.reason, reconnect);
    }
    ;
    /** @internal */
    _getPublicationContext(channel, pub) {
        const ctx = {
            channel: channel,
            data: pub.data
        };
        if (pub.offset) {
            ctx.offset = pub.offset;
        }
        if (pub.info) {
            ctx.info = this._getJoinLeaveContext(pub.info);
        }
        if (pub.tags) {
            ctx.tags = pub.tags;
        }
        return ctx;
    }
    /** @internal */
    _getJoinLeaveContext(clientInfo) {
        const info = {
            client: clientInfo.client,
            user: clientInfo.user
        };
        if (clientInfo.conn_info) {
            info.connInfo = clientInfo.conn_info;
        }
        if (clientInfo.chan_info) {
            info.chanInfo = clientInfo.chan_info;
        }
        return info;
    }
    _handlePublication(channel, pub) {
        const sub = this._getSub(channel);
        if (!sub) {
            if (this._isServerSub(channel)) {
                const ctx = this._getPublicationContext(channel, pub);
                this.emit('publication', ctx);
                if (pub.offset !== undefined) {
                    this._serverSubs[channel].offset = pub.offset;
                }
            }
            return;
        }
        sub._handlePublication(pub);
    }
    ;
    _handleMessage(message) {
        this.emit('message', { data: message.data });
    }
    ;
    _handleServerPing(next) {
        if (this._sendPong) {
            const cmd = {};
            this._transportSendCommands([cmd]);
        }
        next();
    }
    _handlePush(data, next) {
        const channel = data.channel;
        if (data.pub) {
            this._handlePublication(channel, data.pub);
        }
        else if (data.message) {
            this._handleMessage(data.message);
        }
        else if (data.join) {
            this._handleJoin(channel, data.join);
        }
        else if (data.leave) {
            this._handleLeave(channel, data.leave);
        }
        else if (data.unsubscribe) {
            this._handleUnsubscribe(channel, data.unsubscribe);
        }
        else if (data.subscribe) {
            this._handleSubscribe(channel, data.subscribe);
        }
        else if (data.disconnect) {
            this._handleDisconnect(data.disconnect);
        }
        next();
    }
    _flush() {
        const commands = this._commands.slice(0);
        this._commands = [];
        this._transportSendCommands(commands);
    }
    ;
    _createErrorObject(code, message, temporary) {
        const errObject = {
            code: code,
            message: message
        };
        if (temporary) {
            errObject.temporary = true;
        }
        return errObject;
    }
    ;
    _registerCall(id, callback, errback) {
        this._callbacks[id] = {
            callback: callback,
            errback: errback,
            timeout: null
        };
        this._callbacks[id].timeout = setTimeout(() => {
            delete this._callbacks[id];
            if ((0, utils_1.isFunction)(errback)) {
                errback({ error: this._createErrorObject(codes_1.errorCodes.timeout, 'timeout') });
            }
        }, this._config.timeout);
    }
    ;
    _addCommand(command) {
        if (this._batching) {
            this._commands.push(command);
        }
        else {
            this._transportSendCommands([command]);
        }
    }
    ;
    _nextPromiseId() {
        return ++this._promiseId;
    }
    _resolvePromises() {
        for (const id in this._promises) {
            if (this._promises[id].timeout) {
                clearTimeout(this._promises[id].timeout);
            }
            this._promises[id].resolve();
            delete this._promises[id];
        }
    }
    _rejectPromises(err) {
        for (const id in this._promises) {
            if (this._promises[id].timeout) {
                clearTimeout(this._promises[id].timeout);
            }
            this._promises[id].reject(err);
            delete this._promises[id];
        }
    }
}
exports.Centrifuge = Centrifuge;
Centrifuge.SubscriptionState = types_1.SubscriptionState;
Centrifuge.State = types_1.State;
//# sourceMappingURL=centrifuge.js.map