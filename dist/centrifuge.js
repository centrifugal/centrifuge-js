(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("Centrifuge", [], factory);
	else if(typeof exports === 'object')
		exports["Centrifuge"] = factory();
	else
		root["Centrifuge"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 33);
/******/ })
/************************************************************************/
/******/ ({

/***/ 11:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Centrifuge = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _json = __webpack_require__(12);

var _utils = __webpack_require__(6);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = __webpack_require__(7);
var Promise = __webpack_require__(8);
var Subscription = __webpack_require__(14);

var _errorTimeout = 'timeout';

var Centrifuge = exports.Centrifuge = function (_EventEmitter) {
  _inherits(Centrifuge, _EventEmitter);

  function Centrifuge(url, options) {
    _classCallCheck(this, Centrifuge);

    var _this = _possibleConstructorReturn(this, (Centrifuge.__proto__ || Object.getPrototypeOf(Centrifuge)).call(this));

    _this._url = url;
    _this._sockjs = null;
    _this._isSockjs = false;
    _this._binary = false;
    _this._methodType = null;
    _this._messageType = null;
    _this._encoder = null;
    _this._decoder = null;
    _this._status = 'disconnected';
    _this._reconnect = true;
    _this._reconnecting = false;
    _this._transport = null;
    _this._transportName = null;
    _this._transportClosed = true;
    _this._messageId = 0;
    _this._clientID = null;
    _this._subs = {};
    _this._lastPubUID = {};
    _this._messages = [];
    _this._isBatching = false;
    _this._isAuthBatching = false;
    _this._authChannels = {};
    _this._numRefreshFailed = 0;
    _this._refreshTimeout = null;
    _this._pingInterval = null;
    _this._pongTimeout = null;
    _this._retries = 0;
    _this._callbacks = {};
    _this._latency = null;
    _this._latencyStart = null;
    _this._credentials = null;
    _this._config = {
      debug: false,
      sockjs: null,
      retry: 1000,
      maxRetry: 20000,
      timeout: 5000,
      resubscribe: true,
      ping: true,
      pingInterval: 30000,
      pongWaitTimeout: 5000,
      privateChannelPrefix: '$',
      onTransportClose: null,
      sockjsServer: null,
      sockjsTransports: ['websocket', 'xdr-streaming', 'xhr-streaming', 'eventsource', 'iframe-eventsource', 'iframe-htmlfile', 'xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling'],
      refreshEndpoint: '/centrifuge/refresh',
      refreshHeaders: {},
      refreshParams: {},
      refreshData: {},
      refreshAttempts: null,
      refreshInterval: 3000,
      onRefreshFailed: null,
      onRefresh: null,
      authEndpoint: '/centrifuge/auth',
      authHeaders: {},
      authParams: {},
      onAuth: null
    };
    _this._configure(options);
    return _this;
  }

  _createClass(Centrifuge, [{
    key: 'setCredentials',
    value: function setCredentials(credentials) {
      this._credentials = credentials;
    }
  }, {
    key: '_ajax',
    value: function _ajax(url, params, headers, data, callback) {
      var self = this;
      var query = '';

      self._debug('sending AJAX request to', url);

      var xhr = global.XMLHttpRequest ? new global.XMLHttpRequest() : new global.ActiveXObject('Microsoft.XMLHTTP');

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
            var _data = void 0,
                parsed = false;

            try {
              _data = JSON.parse(xhr.responseText);
              parsed = true;
            } catch (e) {
              callback(true, 'JSON returned was invalid, yet status code was 200. Data was: ' + xhr.responseText);
            }
            if (parsed) {
              // prevents double execution.
              callback(false, _data);
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
    }
  }, {
    key: '_log',
    value: function _log() {
      (0, _utils.log)('info', arguments);
    }
  }, {
    key: '_debug',
    value: function _debug() {
      if (this._config.debug === true) {
        (0, _utils.log)('debug', arguments);
      }
    }
  }, {
    key: '_websocketSupported',
    value: function _websocketSupported() {
      return !(typeof WebSocket !== 'function' && (typeof WebSocket === 'undefined' ? 'undefined' : _typeof(WebSocket)) !== 'object');
    }
  }, {
    key: '_setFormat',
    value: function _setFormat(format) {
      if (this._formatOverride(format)) {
        return;
      }
      if (format === 'protobuf') {
        throw new Error('not implemented by JSON only Centrifuge client – use client with Protobuf');
      }
      this._binary = false;
      this._methodType = _json.JsonMethodType;
      this._messageType = _json.JsonMessageType;
      this._encoder = new _json.JsonEncoder();
      this._decoder = new _json.JsonDecoder();
    }
  }, {
    key: '_formatOverride',
    value: function _formatOverride(format) {
      return false;
    }
  }, {
    key: '_configure',
    value: function _configure(configuration) {
      Object.assign(this._config, configuration || {});
      this._debug('centrifuge config', this._config);

      if (!this._url) {
        throw new Error('url required');
      }

      if (this._url.indexOf('format=protobuf') > -1) {
        this._setFormat('protobuf');
      } else {
        this._setFormat('json');
      }

      if (this._credentials !== null) {
        if (!this._credentials.user && this._credentials.user !== '') {
          this._debug('user not set in credentials');
        }

        if (!this._credentials.exp) {
          this._debug('exp not set in credentials');
        }

        if (!this._credentials.info) {
          this._debug('info not set in credentials');
          this._credentials.info = '';
        }

        if (!this._credentials.sign) {
          this._debug('sign not set in credentials');
        }
      }

      if ((0, _utils.startsWith)(this._url, 'http')) {
        this._debug('client will try to connect to SockJS endpoint');
        if (this._config.sockjs !== null) {
          this._debug('SockJS explicitly provided in options');
          this._sockjs = this._config.sockjs;
        } else {
          if (typeof global.SockJS === 'undefined') {
            throw new Error('SockJS not found, use ws:// in url or include SockJS');
          }
          this._debug('use globally defined SockJS');
          this._sockjs = global.SockJS;
        }
      } else {
        this._debug('client will connect to websocket endpoint');
      }
    }
  }, {
    key: '_setStatus',
    value: function _setStatus(newStatus) {
      if (this._status !== newStatus) {
        this._debug('Status', this._status, '->', newStatus);
        this._status = newStatus;
      }
    }
  }, {
    key: '_isDisconnected',
    value: function _isDisconnected() {
      return this._status === 'disconnected';
    }
  }, {
    key: '_isConnecting',
    value: function _isConnecting() {
      return this._status === 'connecting';
    }
  }, {
    key: '_isConnected',
    value: function _isConnected() {
      return this._status === 'connected';
    }
  }, {
    key: '_nextMessageId',
    value: function _nextMessageId() {
      return ++this._messageId;
    }
  }, {
    key: '_resetRetry',
    value: function _resetRetry() {
      this._debug('reset retries count to 0');
      this._retries = 0;
    }
  }, {
    key: '_getRetryInterval',
    value: function _getRetryInterval() {
      var interval = (0, _utils.backoff)(this._retries, this._config.retry, this._config.maxRetry);

      this._retries += 1;
      return interval;
    }
  }, {
    key: '_clearConnectedState',
    value: function _clearConnectedState(reconnect) {
      this._clientID = null;

      // fire errbacks of registered outgoing calls.
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
    }
  }, {
    key: '_send',
    value: function _send(commands) {
      if (!commands.length) {
        return;
      }
      this._transport.send(this._encoder.encodeCommands(commands));
    }
  }, {
    key: '_setupTransport',
    value: function _setupTransport() {
      var self = this;
      this._isSockjs = false;

      // detect transport to use - SockJS or Websocket
      if (this._sockjs !== null) {
        var sockjsOptions = {
          transports: this._config.sockjsTransports
        };

        if (this._config.sockjsServer !== null) {
          sockjsOptions.server = this._config.sockjsServer;
        }
        this._isSockjs = true;
        this._transport = new this._sockjs(this._url, null, sockjsOptions);
      } else {
        if (!this._websocketSupported()) {
          this._debug('No Websocket support and no SockJS configured, can not connect');
          return;
        }
        this._transport = new WebSocket(this._url);
        if (this._binary === true) {
          this._transport.binaryType = 'arraybuffer';
        }
      }

      this._transport.onopen = function () {
        self._transportClosed = false;
        self._reconnecting = false;
        if (self._isSockjs) {
          self._transportName = 'sockjs-' + self._transport.transport;
          self._transport.onheartbeat = function () {
            self._restartPing();
          };
        } else {
          self._transportName = 'websocket';
        }

        self._resetRetry();

        // Can omit method here due to zero value.
        var msg = {
          // method: self._methodType.CONNECT
        };

        if (self._credentials) {
          msg.params = self._credentials;
        }

        self._latencyStart = new Date();
        self._call(msg).then(function (result) {
          self._connectResponse(self._decoder.decodeCommandResult(self._methodType.CONNECT, result));
        }, function () {
          self._disconnect('connect error', true);
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
        var replies = self._decoder.decodeReplies(event.data);
        for (var i in replies) {
          if (replies.hasOwnProperty(i)) {
            self._debug('Received reply', replies[i]);
            self._dispatchReply(replies[i]);
          }
        }
        self._restartPing();
      };
    }
  }, {
    key: 'rpc',
    value: function rpc(data) {
      var self = this;
      var msg = {
        method: self._methodType.RPC,
        params: {
          data: data
        }
      };
      var promise = this._call(msg);

      return new Promise(function (resolve, reject) {
        promise.then(function (result) {
          resolve(self._decoder.decodeCommandResult(self._methodType.RPC, result));
        }, function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'send',
    value: function send(data) {
      var msg = {
        method: this._methodType.MESSAGE,
        params: {
          data: data
        }
      };

      return this._callAsync(msg);
    }
  }, {
    key: '_callAsync',
    value: function _callAsync(msg) {
      this._addMessage(msg, true);
    }
  }, {
    key: '_call',
    value: function _call(msg) {
      var self = this;

      return new Promise(function (resolve, reject) {
        var id = self._addMessage(msg);
        self._registerCall(id, resolve, reject);
      });
    }
  }, {
    key: '_connect',
    value: function _connect() {
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
      this._setupTransport();
    }
  }, {
    key: '_disconnect',
    value: function _disconnect(reason, shouldReconnect) {

      if (this._isDisconnected()) {
        return;
      }

      this._debug('disconnected:', reason, shouldReconnect);

      var reconnect = shouldReconnect || false;

      if (reconnect === false) {
        this._reconnect = false;
      }

      this._clearConnectedState(reconnect);

      if (!this._isDisconnected()) {
        this._setStatus('disconnected');
        if (this._refreshTimeout) {
          clearTimeout(this._refreshTimeout);
        }
        if (this._reconnecting === false) {
          this.emit('disconnect', {
            reason: reason,
            reconnect: reconnect
          });
        }
      }

      if (!this._transportClosed) {
        this._transport.close();
      }
    }
  }, {
    key: '_refreshFailed',
    value: function _refreshFailed() {
      this._numRefreshFailed = 0;
      if (!this._isDisconnected()) {
        this._disconnect('refresh failed', false);
      }
      if (this._config.onRefreshFailed !== null) {
        this._config.onRefreshFailed();
      }
    }
  }, {
    key: '_refresh',
    value: function _refresh() {
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

      var cb = function cb(error, data) {
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
        if (self._credentials === null) {
          return;
        }
        self._credentials.user = data.user;
        self._credentials.exp = data.exp;
        if ('info' in data) {
          self._credentials.info = data.info;
        }
        self._credentials.sign = data.sign;
        if (self._isDisconnected()) {
          self._debug('credentials refreshed, connect from scratch');
          self._connect();
        } else {
          self._debug('send refreshed credentials');

          var msg = {
            method: self._methodType.REFRESH,
            params: self._credentials
          };

          self._call(msg).then(function (result) {
            self._refreshResponse(self._decoder.decodeCommandResult(self._methodType.REFRESH, result));
          }, function () {
            self._disconnect('refresh error', true);
          });
        }
      };

      if (this._config.onRefresh !== null) {
        var context = {};
        this._config.onRefresh(context, cb);
      } else {
        this._ajax(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, this._config.refreshData, cb);
      }
    }
  }, {
    key: '_subscribe',
    value: function _subscribe(sub) {

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
        method: this._methodType.SUBSCRIBE,
        params: {
          channel: channel
        }
      };

      // If channel name does not start with privateChannelPrefix - then we
      // can just send subscription message to Centrifuge. If channel name
      // starts with privateChannelPrefix - then this is a private channel
      // and we should ask web application backend for permission first.
      if ((0, _utils.startsWith)(channel, this._config.privateChannelPrefix)) {
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

        this._call(msg).then(function (result) {
          self._subscribeResponse(channel, self._decoder.decodeCommandResult(self._methodType.SUBSCRIBE, result));
        }, function (err) {
          self._subscribeError(err);
        });
      }
    }
  }, {
    key: '_unsubscribe',
    value: function _unsubscribe(sub) {
      if (this.isConnected()) {
        // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
        this._addMessage({
          method: this._methodType.UNSUBSCRIBE,
          params: {
            channel: sub.channel
          }
        });
      }
    }
  }, {
    key: 'getSub',
    value: function getSub(channel) {
      return this._getSub(channel);
    }
  }, {
    key: '_getSub',
    value: function _getSub(channel) {
      var sub = this._subs[channel];
      if (!sub) {
        return null;
      }
      return sub;
    }
  }, {
    key: '_connectResponse',
    value: function _connectResponse(result) {
      if (this.isConnected()) {
        return;
      }

      if (this._latencyStart !== null) {
        this._latency = new Date().getTime() - this._latencyStart.getTime();
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
      this.emit('connect', {
        client: result.client,
        transport: this._transportName,
        latency: this._latency
      });
    }
  }, {
    key: '_stopPing',
    value: function _stopPing() {
      if (this._pongTimeout !== null) {
        clearTimeout(this._pongTimeout);
      }
      if (this._pingInterval !== null) {
        clearInterval(this._pingInterval);
      }
    }
  }, {
    key: '_startPing',
    value: function _startPing() {
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
    }
  }, {
    key: '_restartPing',
    value: function _restartPing() {
      this._stopPing();
      this._startPing();
    }
  }, {
    key: '_subscribeError',
    value: function _subscribeError(channel, error) {
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      if (!sub._isSubscribing()) {
        return;
      }
      if (error.code === 0 && error.message === _errorTimeout) {
        // client side timeout.
        this._disconnect('timeout', true);
        return;
      }
      sub._setSubscribeError(error);
    }
  }, {
    key: '_subscribeResponse',
    value: function _subscribeResponse(channel, result) {
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      if (!sub._isSubscribing()) {
        return;
      }

      var pubs = result.publications;

      if (pubs && pubs.length > 0) {
        // handle missed pubs.
        pubs = pubs.reverse();
        for (var i in pubs) {
          if (pubs.hasOwnProperty(i)) {
            this._handlePublication(channel, pubs[i]);
          }
        }
      } else {
        if ('last' in result) {
          // no missed messages found so set last message id from result.
          this._lastPubUID[channel] = result.last;
        }
      }

      var recovered = false;

      if ('recovered' in result) {
        recovered = result.recovered;
      }
      sub._setSubscribeSuccess(recovered);
    }
  }, {
    key: '_handleReply',
    value: function _handleReply(reply) {
      var id = reply.id;
      var result = reply.result;

      if (!(id in this._callbacks)) {
        return;
      }
      var callbacks = this._callbacks[id];
      delete this._callbacks[id];

      if (!(0, _utils.errorExists)(reply)) {
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
        errback(reply.error);
      }
    }
  }, {
    key: '_handleJoin',
    value: function _handleJoin(channel, join) {
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      sub.emit('join', join);
    }
  }, {
    key: '_handleLeave',
    value: function _handleLeave(channel, leave) {
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      sub.emit('leave', leave);
    }
  }, {
    key: '_handleUnsub',
    value: function _handleUnsub(channel) {
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      sub.unsubscribe();
    }
  }, {
    key: '_handlePublication',
    value: function _handlePublication(channel, pub) {
      // keep last uid received from channel.
      this._lastPubUID[channel] = pub.uid;
      var sub = this._getSub(channel);
      if (!sub) {
        return;
      }
      sub.emit('publication', pub);
    }
  }, {
    key: '_handlePush',
    value: function _handlePush(push) {
      this.emit('message', push.data);
    }
  }, {
    key: '_refreshResponse',
    value: function _refreshResponse(result) {
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
      }
      if (result.expires) {
        var self = this;
        var expired = result.expired;

        if (expired) {
          self._refreshTimeout = setTimeout(function () {
            self._refresh.call(self);
          }, self._config.refreshInterval + Math.round(Math.random() * 1000));
          return;
        }
        this._clientID = result.client;
        self._refreshTimeout = setTimeout(function () {
          self._refresh.call(self);
        }, result.ttl * 1000);
      }
    }
  }, {
    key: '_handleMessage',
    value: function _handleMessage(data) {
      var message = this._decoder.decodeMessage(data);
      var type = 0;
      if ('type' in message) {
        type = message['type'];
      }
      var channel = message.channel;

      if (type === this._messageType.PUBLICATION) {
        var pub = this._decoder.decodeMessageData(this._messageType.PUBLICATION, message.data);
        this._handlePublication(channel, pub);
      } else if (type === this._messageType.PUSH) {
        var push = this._decoder.decodeMessageData(this._messageType.PUSH, message.data);
        this._handlePush(push);
      } else if (type === this._messageType.JOIN) {
        var join = this._decoder.decodeMessageData(this._messageType.JOIN, message.data);
        this._handleJoin(channel, join);
      } else if (type === this._messageType.LEAVE) {
        var leave = this._decoder.decodeMessageData(this._messageType.LEAVE, message.data);
        this._handleLeave(channel, leave);
      } else if (type === this._messageType.UNSUB) {
        this._handleUnsub(channel);
      }
    }
  }, {
    key: '_dispatchReply',
    value: function _dispatchReply(reply) {
      if (reply === undefined || reply === null) {
        this._debug('dispatch: got undefined or null reply');
        return;
      }

      var id = reply.id;

      if (id && id > 0) {
        this._handleReply(reply);
      } else {
        this._handleMessage(reply.result);
      }
    }
  }, {
    key: '_flush',
    value: function _flush() {
      var messages = this._messages.slice(0);
      this._messages = [];
      this._send(messages);
    }
  }, {
    key: '_ping',
    value: function _ping() {
      this._addMessage({
        method: this._methodType.PING
      });
    }
  }, {
    key: '_recover',
    value: function _recover(channel) {
      return channel in this._lastPubUID;
    }
  }, {
    key: '_getLastID',
    value: function _getLastID(channel) {
      var lastUID = this._lastPubUID[channel];

      if (lastUID) {
        this._debug('last uid found and sent for channel', channel);
        return lastUID;
      }
      this._debug('no last uid found for channel', channel);
      return '';
    }
  }, {
    key: '_createErrorObject',
    value: function _createErrorObject(message, code) {
      var errObject = {
        message: message,
        code: code || 0
      };

      return errObject;
    }
  }, {
    key: '_registerCall',
    value: function _registerCall(id, callback, errback) {
      var self = this;

      this._callbacks[id] = {
        callback: callback,
        errback: errback
      };
      setTimeout(function () {
        delete self._callbacks[id];
        if ((0, _utils.isFunction)(errback)) {
          errback(self._createErrorObject(_errorTimeout));
        }
      }, this._config.timeout);
    }
  }, {
    key: '_addMessage',
    value: function _addMessage(message, async) {
      var id = void 0;
      if (!async) {
        id = this._nextMessageId();
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
    }
  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._isConnected();
    }
  }, {
    key: 'connect',
    value: function connect() {
      this._connect();
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      this._disconnect('client', false);
    }
  }, {
    key: 'ping',
    value: function ping() {
      return this._ping();
    }
  }, {
    key: 'startBatching',
    value: function startBatching() {
      // start collecting messages without sending them to Centrifuge until flush
      // method called
      this._isBatching = true;
    }
  }, {
    key: 'stopBatching',
    value: function stopBatching(flush) {
      // stop collecting messages
      flush = flush || false;
      this._isBatching = false;
      if (flush === true) {
        this.flush();
      }
    }
  }, {
    key: 'flush',
    value: function flush() {
      // send batched messages to Centrifuge
      this._flush();
    }
  }, {
    key: 'startAuthBatching',
    value: function startAuthBatching() {
      // start collecting private channels to create bulk authentication
      // request to authEndpoint when stopAuthBatching will be called
      this._isAuthBatching = true;
    }
  }, {
    key: 'stopAuthBatching',
    value: function stopAuthBatching() {
      var i, channel;

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
        client: this._clientID,
        channels: channels
      };

      var self = this;

      var cb = function cb(error, data) {
        if (error === true) {
          self._debug('authorization request failed');
          for (i in channels) {
            if (channels.hasOwnProperty(i)) {
              channel = channels[i];
              self._subscribeResponse({
                error: 'authorization request failed',
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
                body: {
                  channel: channel
                }
              });
              continue;
            }
            if (!channelResponse.status || channelResponse.status === 200) {
              var msg = {
                method: self._methodType.SUBSCRIBE,
                params: {
                  channel: channel,
                  client: self._clientID,
                  info: channelResponse.info,
                  sign: channelResponse.sign
                }
              };
              var recover = self._recover(channel);

              if (recover === true) {
                msg.params.recover = true;
                msg.params.last = self._getLastID(channel);
              }
              self._call(msg).then(function (result) {
                self._subscribeResponse(channel, self._decoder.decodeCommandResult(self._methodType.SUBSCRIBE, result));
              }, function (err) {
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

      if (this._config.onAuth !== null) {
        this._config.onAuth({
          data: data
        }, cb);
      } else {
        this._ajax(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
      }
    }
  }, {
    key: 'subscribe',
    value: function subscribe(channel, events) {
      if (arguments.length < 1) {
        throw new Error('Illegal arguments number: required 1, got ' + arguments.length);
      }
      if (!(0, _utils.isString)(channel)) {
        throw new Error('Illegal argument type: channel must be a string');
      }
      if (!this._config.resubscribe && !this.isConnected()) {
        throw new Error('Can not only subscribe in connected state when resubscribe option is off');
      }

      var currentSub = this._getSub(channel);

      if (currentSub !== null) {
        currentSub._setEvents(events);
        if (currentSub._isUnsubscribed()) {
          currentSub.subscribe();
        }
        return currentSub;
      }
      var sub = new Subscription(this, channel, events);
      this._subs[channel] = sub;
      sub.subscribe();
      return sub;
    }
  }]);

  return Centrifuge;
}(EventEmitter);
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ }),

/***/ 12:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsonMethodType = exports.JsonMethodType = {
  CONNECT: 0,
  SUBSCRIBE: 1,
  UNSUBSCRIBE: 2,
  PUBLISH: 3,
  PRESENCE: 4,
  PRESENCE_STATS: 5,
  HISTORY: 6,
  PING: 7,
  MESSAGE: 8,
  RPC: 9,
  REFRESH: 10
};

var JsonMessageType = exports.JsonMessageType = {
  PUBLICATION: 0,
  JOIN: 1,
  LEAVE: 2,
  UNSUB: 3,
  PUSH: 4
};

var JsonEncoder = exports.JsonEncoder = function () {
  function JsonEncoder() {
    _classCallCheck(this, JsonEncoder);
  }

  _createClass(JsonEncoder, [{
    key: 'encodeCommands',
    value: function encodeCommands(commands) {
      var encodedCommands = [];
      for (var i in commands) {
        if (commands.hasOwnProperty(i)) {
          encodedCommands.push(JSON.stringify(commands[i]));
        }
      }
      return encodedCommands.join('\n');
    }
  }]);

  return JsonEncoder;
}();

var JsonDecoder = exports.JsonDecoder = function () {
  function JsonDecoder() {
    _classCallCheck(this, JsonDecoder);
  }

  _createClass(JsonDecoder, [{
    key: 'decodeReplies',
    value: function decodeReplies(data) {
      var replies = [];
      var encodedReplies = data.split('\n');
      for (var i in encodedReplies) {
        if (encodedReplies.hasOwnProperty(i)) {
          if (!encodedReplies[i]) {
            continue;
          }
          var reply = JSON.parse(encodedReplies[i]);
          replies.push(reply);
        }
      }
      return replies;
    }
  }, {
    key: 'decodeCommandResult',
    value: function decodeCommandResult(methodType, data) {
      return data;
    }
  }, {
    key: 'decodeMessage',
    value: function decodeMessage(data) {
      return data;
    }
  }, {
    key: 'decodeMessageData',
    value: function decodeMessageData(messageType, data) {
      return data;
    }
  }]);

  return JsonDecoder;
}();

/***/ }),

/***/ 13:
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ 14:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = __webpack_require__(6);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = __webpack_require__(7);
var Promise = __webpack_require__(8);

var _STATE_NEW = 0;
var _STATE_SUBSCRIBING = 1;
var _STATE_SUCCESS = 2;
var _STATE_ERROR = 3;
var _STATE_UNSUBSCRIBED = 4;

var Subscription = function (_EventEmitter) {
  _inherits(Subscription, _EventEmitter);

  function Subscription(centrifuge, channel, events) {
    _classCallCheck(this, Subscription);

    var _this = _possibleConstructorReturn(this, (Subscription.__proto__ || Object.getPrototypeOf(Subscription)).call(this));

    _this.channel = channel;
    _this._centrifuge = centrifuge;
    _this._status = _STATE_NEW;
    _this._error = null;
    _this._isResubscribe = false;
    _this._recovered = false;
    _this._ready = false;
    _this._promise = null;
    _this._noResubscribe = false;
    _this._setEvents(events);
    _this._initializePromise();
    return _this;
  }

  _createClass(Subscription, [{
    key: '_initializePromise',
    value: function _initializePromise() {
      // this helps us to wait until subscription will successfully
      // subscribe and call actions such as presence, history etc in
      // synchronous way.
      var self = this;

      this._ready = false;

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
    }
  }, {
    key: '_setEvents',
    value: function _setEvents(events) {
      if (!events) {
        return;
      }
      if ((0, _utils.isFunction)(events)) {
        // events is just a function to handle publication received from channel.
        this.on('publication', events);
      } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
        var knownEvents = ['publication', 'join', 'leave', 'unsubscribe', 'subscribe', 'error'];
        for (var i = 0, l = knownEvents.length; i < l; i++) {
          var ev = knownEvents[i];
          if (ev in events) {
            this.on(ev, events[ev]);
          }
        }
      }
    }
  }, {
    key: '_isNew',
    value: function _isNew() {
      return this._status === _STATE_NEW;
    }
  }, {
    key: '_isUnsubscribed',
    value: function _isUnsubscribed() {
      return this._status === _STATE_UNSUBSCRIBED;
    }
  }, {
    key: '_isSubscribing',
    value: function _isSubscribing() {
      return this._status === _STATE_SUBSCRIBING;
    }
  }, {
    key: '_isReady',
    value: function _isReady() {
      return this._status === _STATE_SUCCESS || this._status === _STATE_ERROR;
    }
  }, {
    key: '_isSuccess',
    value: function _isSuccess() {
      return this._status === _STATE_SUCCESS;
    }
  }, {
    key: '_isError',
    value: function _isError() {
      return this._status === _STATE_ERROR;
    }
  }, {
    key: '_setNew',
    value: function _setNew() {
      this._status = _STATE_NEW;
    }
  }, {
    key: '_setSubscribing',
    value: function _setSubscribing() {
      if (this._ready === true) {
        // new promise for this subscription
        this._initializePromise();
        this._isResubscribe = true;
      }
      this._status = _STATE_SUBSCRIBING;
    }
  }, {
    key: '_setSubscribeSuccess',
    value: function _setSubscribeSuccess(recovered) {
      if (this._status === _STATE_SUCCESS) {
        return;
      }
      this._recovered = recovered;
      this._status = _STATE_SUCCESS;
      var successContext = this._getSubscribeSuccessContext(recovered);

      this.emit('subscribe', successContext);
      this._resolve(successContext);
    }
  }, {
    key: '_setSubscribeError',
    value: function _setSubscribeError(err) {
      if (this._status === _STATE_ERROR) {
        return;
      }
      this._status = _STATE_ERROR;
      this._error = err;
      var errContext = this._getSubscribeErrorContext();

      this.emit('error', errContext);
      this._reject(errContext);
    }
  }, {
    key: '_triggerUnsubscribe',
    value: function _triggerUnsubscribe() {
      this.emit('unsubscribe', {
        channel: this.channel
      });
    }
  }, {
    key: '_setUnsubscribed',
    value: function _setUnsubscribed(noResubscribe) {
      if (this._status === _STATE_UNSUBSCRIBED) {
        return;
      }
      var needTrigger = this._status === _STATE_SUCCESS;
      this._status = _STATE_UNSUBSCRIBED;
      if (noResubscribe === true) {
        this._noResubscribe = true;
      }
      if (needTrigger) {
        this._triggerUnsubscribe();
      }
    }
  }, {
    key: '_shouldResubscribe',
    value: function _shouldResubscribe() {
      return !this._noResubscribe;
    }
  }, {
    key: '_getSubscribeSuccessContext',
    value: function _getSubscribeSuccessContext() {
      return {
        channel: this.channel,
        isResubscribe: this._isResubscribe,
        recovered: this._recovered
      };
    }
  }, {
    key: '_getSubscribeErrorContext',
    value: function _getSubscribeErrorContext() {
      var subscribeErrorContext = this._error;
      subscribeErrorContext.channel = this.channel;
      subscribeErrorContext.isResubscribe = this._isResubscribe;
      return subscribeErrorContext;
    }
  }, {
    key: 'ready',
    value: function ready(callback, errback) {
      if (this._ready) {
        if (this._isSuccess()) {
          callback(this._getSubscribeSuccessContext());
        } else {
          errback(this._getSubscribeErrorContext());
        }
      }
    }
  }, {
    key: 'subscribe',
    value: function subscribe() {
      if (this._status === _STATE_SUCCESS) {
        return;
      }
      this._centrifuge._subscribe(this);
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe() {
      this._setUnsubscribed(true);
      this._centrifuge._unsubscribe(this);
    }
  }, {
    key: '_methodCall',
    value: function _methodCall(message, type) {
      var self = this;
      return new Promise(function (resolve, reject) {
        self._promise.then(function () {
          self._centrifuge._call(message).then(function (result) {
            resolve(self._centrifuge._decoder.decodeCommandResult(type, result));
          }, function (err) {
            reject(err);
          });
        }, function (err) {
          reject(err);
        });
      });
    }
  }, {
    key: 'publish',
    value: function publish(data) {
      return this._methodCall({
        method: this._centrifuge._methodType.PUBLISH,
        params: {
          channel: self.channel,
          data: data
        }
      }, this._centrifuge._methodType.PUBLISH);
    }
  }, {
    key: 'presence',
    value: function presence() {
      return this._methodCall({
        method: this._centrifuge._methodType.PRESENCE,
        params: {
          channel: self.channel
        }
      }, this._centrifuge._methodType.PRESENCE);
    }
  }, {
    key: 'presenceStats',
    value: function presenceStats() {
      return this._methodCall({
        method: this._centrifuge._methodType.PRESENCE_STATS,
        params: {
          channel: self.channel
        }
      }, this._centrifuge._methodType.PRESENCE_STATS);
    }
  }, {
    key: 'history',
    value: function history() {
      return this._methodCall({
        method: this._centrifuge._methodType.HISTORY,
        params: {
          channel: self.channel
        }
      }, this._centrifuge._methodType.HISTORY);
    }
  }]);

  return Subscription;
}(EventEmitter);

exports.default = Subscription;
module.exports = exports['default'];

/***/ }),

/***/ 3:
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ 33:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _centrifuge = __webpack_require__(11);

exports.default = _centrifuge.Centrifuge;
module.exports = exports['default'];

/***/ }),

/***/ 6:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
var startsWith = exports.startsWith = function startsWith(value, prefix) {
  return value.lastIndexOf(prefix, 0) === 0;
};

var isString = exports.isString = function isString(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'string' || value instanceof String;
};

var isFunction = exports.isFunction = function isFunction(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'function';
};

var log = exports.log = function log(level, args) {
  if (global.console) {
    var logger = global.console[level];

    if (isFunction(logger)) {
      logger.apply(global.console, args);
    }
  }
};

var backoff = exports.backoff = function backoff(step, min, max) {
  var jitter = 0.5 * Math.random();
  var interval = min * Math.pow(2, step + 1);

  if (interval > max) {
    interval = max;
  }
  return Math.floor((1 - jitter) * interval);
};

var errorExists = exports.errorExists = function errorExists(data) {
  return 'error' in data && data.error !== null;
};
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ }),

/***/ 7:
/***/ (function(module, exports) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}


/***/ }),

/***/ 8:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process, global) {/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.4+314e4831
 */

(function (global, factory) {
	 true ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && "function" === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));



//# sourceMappingURL=es6-promise.map

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13), __webpack_require__(3)))

/***/ })

/******/ });
});
//# sourceMappingURL=centrifuge.js.map