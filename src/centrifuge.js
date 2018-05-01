import EventEmitter from 'events';
import Subscription from './subscription';

import {
  JsonEncoder,
  JsonDecoder,
  JsonMethodType,
  JsonPushType
} from './json';

import {
  isFunction,
  isString,
  log,
  startsWith,
  errorExists,
  backoff
} from './utils';

const _errorTimeout = 'timeout';

export class Centrifuge extends EventEmitter {

  constructor(url, options) {
    super();
    this._url = url;
    this._promise = null;
    this._sockjs = null;
    this._isSockjs = false;
    this._binary = false;
    this._methodType = null;
    this._pushType = null;
    this._encoder = null;
    this._decoder = null;
    this._status = 'disconnected';
    this._reconnect = true;
    this._reconnecting = false;
    this._transport = null;
    this._transportName = null;
    this._transportClosed = true;
    this._messageId = 0;
    this._clientID = null;
    this._subs = {};
    this._lastPubUID = {};
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
    this._connectData = null;
    this._credentials = null;
    this._config = {
      debug: false,
      sockjs: null,
      promise: null,
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
    this._configure(options);
  }

  setCredentials(credentials) {
    this._credentials = credentials;
  }

  setConnectData(data) {
    this._connectData = data;
  }

  _ajax(url, params, headers, data, callback) {
    var self = this;
    var query = '';

    self._debug('sending AJAX request to', url);

    const xhr = (global.XMLHttpRequest ? new global.XMLHttpRequest() : new global.ActiveXObject('Microsoft.XMLHTTP'));

    for (let i in params) {
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
    for (let headerName in headers) {
      if (headers.hasOwnProperty(headerName)) {
        xhr.setRequestHeader(headerName, headers[headerName]);
      }
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          let data, parsed = false;
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

  _log() {
    log('info', arguments);
  };

  _debug() {
    if (this._config.debug === true) {
      log('debug', arguments);
    }
  };

  _websocketSupported() {
    return !(typeof WebSocket !== 'function' && typeof WebSocket !== 'object');
  };

  _setFormat(format) {
    if (this._formatOverride(format)) {
      return;
    }
    if (format === 'protobuf') {
      throw new Error('not implemented by JSON only Centrifuge client – use client with Protobuf');
    }
    this._binary = false;
    this._methodType = JsonMethodType;
    this._pushType = JsonPushType;
    this._encoder = new JsonEncoder();
    this._decoder = new JsonDecoder();
  }

  _formatOverride(format) {
    return false;
  }

  _configure(configuration) {
    Object.assign(this._config, configuration || {});
    this._debug('centrifuge config', this._config);

    if (!this._url) {
      throw new Error('url required');
    }

    if (this._config.promise !== null) {
      this._promise = this._config.promise;
    } else {
      if (!global.Promise) {
        throw new Error('Promise polyfill required');
      }
      this._promise = global.Promise;
    }

    if (startsWith(this._url, 'ws') && this._url.indexOf('format=protobuf') > -1) {
      this._setFormat('protobuf');
    } else {
      this._setFormat('json');
    }

    if (startsWith(this._url, 'http')) {
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
  };

  _setStatus(newStatus) {
    if (this._status !== newStatus) {
      this._debug('Status', this._status, '->', newStatus);
      this._status = newStatus;
    }
  };

  _isDisconnected() {
    return this._status === 'disconnected';
  };

  _isConnecting() {
    return this._status === 'connecting';
  };

  _isConnected() {
    return this._status === 'connected';
  };

  _nextMessageId() {
    return ++this._messageId;
  };

  _resetRetry() {
    this._debug('reset retries count to 0');
    this._retries = 0;
  };

  _getRetryInterval() {
    var interval = backoff(this._retries, this._config.retry, this._config.maxRetry);

    this._retries += 1;
    return interval;
  };

  _clearConnectedState(reconnect) {
    this._clientID = null;

    // fire errbacks of registered outgoing calls.
    for (let uid in this._callbacks) {
      if (this._callbacks.hasOwnProperty(uid)) {
        const callbacks = this._callbacks[uid];
        const errback = callbacks.errback;
        if (!errback) {
          continue;
        }
        errback(this._createErrorObject('disconnected'));
      }
    }
    this._callbacks = {};

    // fire unsubscribe events
    for (let channel in this._subs) {
      if (this._subs.hasOwnProperty(channel)) {
        const sub = this._subs[channel];

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

  _transportSend(commands) {
    if (!commands.length) {
      return;
    }
    if (!this._transport) {
      throw new Error('transport not connected');
    }
    this._transport.send(this._encoder.encodeCommands(commands));
  }

  _setupTransport() {
    var self = this;
    this._isSockjs = false;

    // detect transport to use - SockJS or Websocket
    if (this._sockjs !== null) {
      const sockjsOptions = {
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
      let msg = {
        // method: self._methodType.CONNECT
      };

      if (self._credentials || self._connectData) {
        msg.params = {};
      }

      if (self._credentials) {
        msg.params.credentials = self._credentials;
      }

      if (self._connectData) {
        msg.params.data = self._connectData;
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
      let reason = 'connection closed';
      let needReconnect = true;

      if (closeEvent && 'reason' in closeEvent && closeEvent.reason) {
        try {
          const advice = JSON.parse(closeEvent.reason);

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
        const interval = self._getRetryInterval();

        self._debug('reconnect after ' + interval + ' milliseconds');
        setTimeout(function () {
          if (self._reconnect === true) {
            self._connect.call(self);
          }
        }, interval);
      }
    };

    this._transport.onmessage = function (event) {
      const replies = self._decoder.decodeReplies(event.data);
      for (let i in replies) {
        if (replies.hasOwnProperty(i)) {
          self._debug('Received reply', replies[i]);
          self._dispatchReply(replies[i]);
        }
      }
      self._restartPing();
    };
  };

  rpc(data) {
    const self = this;
    const msg = {
      method: self._methodType.RPC,
      params: {
        data: data
      }
    };
    const promise = this._call(msg);

    return new self._promise(function (resolve, reject) {
      promise.then(function (result) {
        resolve(self._decoder.decodeCommandResult(self._methodType.RPC, result));
      }, function (error) {
        reject(error);
      });
    });
  }

  send(data) {
    const msg = {
      method: this._methodType.SEND,
      params: {
        data: data
      }
    };

    return this._callAsync(msg);
  }

  _callAsync(msg) {
    this._addMessage(msg, true);
  }

  _call(msg) {
    var self = this;

    return new self._promise(function (resolve, reject) {
      const id = self._addMessage(msg);
      self._registerCall(id, resolve, reject);
    });
  }

  _connect() {
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
  };

  _disconnect(reason, shouldReconnect) {

    if (this._isDisconnected()) {
      return;
    }

    this._debug('disconnected:', reason, shouldReconnect);

    const reconnect = shouldReconnect || false;

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
  };

  _refreshFailed() {
    this._numRefreshFailed = 0;
    if (!this._isDisconnected()) {
      this._disconnect('refresh failed', false);
    }
    if (this._config.onRefreshFailed !== null) {
      this._config.onRefreshFailed();
    }
  };

  _refresh() {
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

    const cb = function (error, data) {
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

        const msg = {
          method: self._methodType.REFRESH,
          params: {
            credentials: self._credentials
          }
        };

        self._call(msg).then(function (result) {
          self._refreshResponse(self._decoder.decodeCommandResult(self._methodType.REFRESH, result));
        }, function () {
          self._disconnect('refresh error', true);
        });
      }
    };

    if (this._config.onRefresh !== null) {
      const context = {};
      this._config.onRefresh(context, cb);
    } else {
      this._ajax(
        this._config.refreshEndpoint,
        this._config.refreshParams,
        this._config.refreshHeaders,
        this._config.refreshData,
        cb
      );
    }
  };

  _subscribe(sub) {

    const channel = sub.channel;

    if (!(channel in this._subs)) {
      this._subs[channel] = sub;
    }

    if (!this.isConnected()) {
      // subscribe will be called later
      sub._setNew();
      return;
    }

    sub._setSubscribing();

    const msg = {
      method: this._methodType.SUBSCRIBE,
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
      const recover = this._recover(channel);

      if (recover === true) {
        msg.params.recover = true;
        msg.params.last = this._getLastID(channel);
      }
      const self = this;

      this._call(msg).then(function (result) {
        self._subscribeResponse(channel, self._decoder.decodeCommandResult(self._methodType.SUBSCRIBE, result));
      }, function (err) {
        self._subscribeError(err);
      });
    }
  };

  _unsubscribe(sub) {
    if (this.isConnected()) {
      // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
      this._addMessage({
        method: this._methodType.UNSUBSCRIBE,
        params: {
          channel: sub.channel
        }
      });
    }
  };

  getSub(channel) {
    return this._getSub(channel);
  }

  _getSub(channel) {
    const sub = this._subs[channel];
    if (!sub) {
      return null;
    }
    return sub;
  };

  _connectResponse(result) {
    if (this.isConnected()) {
      return;
    }

    if (this._latencyStart !== null) {
      this._latency = (new Date()).getTime() - this._latencyStart.getTime();
      this._latencyStart = null;
    }

    if (result.expires) {
      const isExpired = result.expired;

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

    const self = this;

    if (result.expires) {
      this._refreshTimeout = setTimeout(function () {
        self._refresh.call(self);
      }, result.ttl * 1000);
    }

    if (this._config.resubscribe) {
      this.startBatching();
      this.startAuthBatching();
      for (let channel in this._subs) {
        if (this._subs.hasOwnProperty(channel)) {
          const sub = this._subs[channel];
          if (sub._shouldResubscribe()) {
            this._subscribe(sub);
          }
        }
      }
      this.stopAuthBatching();
      this.stopBatching(true);
    }

    this._restartPing();

    const ctx = {
      client: result.client,
      transport: this._transportName,
      latency: this._latency
    };
    if (result.data) {
      ctx.data = result.data;
    }

    this.emit('connect', ctx);
  };

  _stopPing() {
    if (this._pongTimeout !== null) {
      clearTimeout(this._pongTimeout);
    }
    if (this._pingInterval !== null) {
      clearInterval(this._pingInterval);
    }
  };

  _startPing() {
    if (this._config.ping !== true || this._config.pingInterval <= 0) {
      return;
    }
    if (!this.isConnected()) {
      return;
    }

    const self = this;

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

  _restartPing() {
    this._stopPing();
    this._startPing();
  };

  _subscribeError(channel, error) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (!sub._isSubscribing()) {
      return;
    }
    if (error.code === 0 && error.message === _errorTimeout) { // client side timeout.
      this._disconnect('timeout', true);
      return;
    }
    sub._setSubscribeError(error);
  };

  _subscribeResponse(channel, result) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (!sub._isSubscribing()) {
      return;
    }

    let pubs = result.publications;

    if (pubs && pubs.length > 0) {
      // handle missed pubs.
      pubs = pubs.reverse();
      for (let i in pubs) {
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

    let recovered = false;

    if ('recovered' in result) {
      recovered = result.recovered;
    }
    sub._setSubscribeSuccess(recovered);
  };

  _handleReply(reply) {
    const id = reply.id;
    const result = reply.result;

    if (!(id in this._callbacks)) {
      return;
    }
    const callbacks = this._callbacks[id];
    delete this._callbacks[id];

    if (!errorExists(reply)) {
      const callback = callbacks.callback;
      if (!callback) {
        return;
      }
      callback(result);
    } else {
      const errback = callbacks.errback;
      if (!errback) {
        return;
      }
      errback(reply.error);
    }
  }

  _handleJoin(channel, join) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.emit('join', join);
  };

  _handleLeave(channel, leave) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.emit('leave', leave);
  };

  _handleUnsub(channel) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.unsubscribe();
  };

  _handlePublication(channel, pub) {
    // keep last uid received from channel.
    this._lastPubUID[channel] = pub.uid;
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.emit('publication', pub);
  };

  _handleMessage(message) {
    this.emit('message', message.data);
  };

  _refreshResponse(result) {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }
    if (result.expires) {
      const self = this;
      const expired = result.expired;

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
  };

  _handlePush(data) {
    const push = this._decoder.decodePush(data);
    let type = 0;
    if ('type' in push) {
      type = push['type'];
    }
    const channel = push.channel;

    if (type === this._pushType.PUBLICATION) {
      const pub = this._decoder.decodePushData(this._pushType.PUBLICATION, push.data);
      this._handlePublication(channel, pub);
    } else if (type === this._pushType.MESSAGE) {
      const message = this._decoder.decodePushData(this._pushType.MESSAGE, push.data);
      this._handleMessage(message);
    } else if (type === this._pushType.JOIN) {
      const join = this._decoder.decodePushData(this._pushType.JOIN, push.data);
      this._handleJoin(channel, join);
    } else if (type === this._pushType.LEAVE) {
      const leave = this._decoder.decodePushData(this._pushType.LEAVE, push.data);
      this._handleLeave(channel, leave);
    } else if (type === this._pushType.UNSUB) {
      this._handleUnsub(channel);
    }
  }

  _dispatchReply(reply) {
    if (reply === undefined || reply === null) {
      this._debug('dispatch: got undefined or null reply');
      return;
    }

    const id = reply.id;

    if (id && id > 0) {
      this._handleReply(reply);
    } else {
      this._handlePush(reply.result);
    }
  };

  _flush() {
    const messages = this._messages.slice(0);
    this._messages = [];
    this._transportSend(messages);
  };

  _ping() {
    this._addMessage({
      method: this._methodType.PING
    });
  };

  _recover(channel) {
    return channel in this._lastPubUID;
  };

  _getLastID(channel) {
    const lastUID = this._lastPubUID[channel];

    if (lastUID) {
      this._debug('last uid found and sent for channel', channel);
      return lastUID;
    }
    this._debug('no last uid found for channel', channel);
    return '';

  };

  _createErrorObject(message, code) {
    const errObject = {
      message: message,
      code: code || 0
    };

    return errObject;
  };

  _registerCall(id, callback, errback) {
    const self = this;

    this._callbacks[id] = {
      callback: callback,
      errback: errback
    };
    setTimeout(function () {
      delete self._callbacks[id];
      if (isFunction(errback)) {
        errback(self._createErrorObject(_errorTimeout));
      }
    }, this._config.timeout);
  };

  _addMessage(message, async) {
    let id;
    if (!async) {
      id = this._nextMessageId();
      message.id = id;
    }
    if (this._isBatching === true) {
      this._messages.push(message);
    } else {
      this._transportSend([message]);
    }
    if (!async) {
      return id;
    }
    return 0;
  };

  isConnected() {
    return this._isConnected();
  }

  connect() {
    this._connect();
  };

  disconnect() {
    this._disconnect('client', false);
  };

  ping() {
    return this._ping();
  }

  startBatching() {
    // start collecting messages without sending them to Centrifuge until flush
    // method called
    this._isBatching = true;
  };

  stopBatching(flush) {
    // stop collecting messages
    flush = flush || false;
    this._isBatching = false;
    if (flush === true) {
      this.flush();
    }
  };

  flush() {
    // send batched messages to Centrifuge
    this._flush();
  };

  startAuthBatching() {
    // start collecting private channels to create bulk authentication
    // request to authEndpoint when stopAuthBatching will be called
    this._isAuthBatching = true;
  };

  stopAuthBatching() {
    var i,
      channel;

    // create request to authEndpoint with collected private channels
    // to ask if this client can subscribe on each channel
    this._isAuthBatching = false;
    const authChannels = this._authChannels;

    this._authChannels = {};
    const channels = [];

    for (channel in authChannels) {
      if (authChannels.hasOwnProperty(channel)) {
        const sub = this._getSub(channel);

        if (!sub) {
          continue;
        }
        channels.push(channel);
      }
    }

    if (channels.length === 0) {
      return;
    }

    const data = {
      client: this._clientID,
      channels: channels
    };

    const self = this;

    const cb = function (error, data) {
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
      let batch = false;

      if (!self._isBatching) {
        self.startBatching();
        batch = true;
      }

      for (i in channels) {
        if (channels.hasOwnProperty(i)) {
          channel = channels[i];
          const channelResponse = data[channel];

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
            const msg = {
              method: self._methodType.SUBSCRIBE,
              params: {
                channel: channel,
                client: self._clientID,
                info: channelResponse.info,
                sign: channelResponse.sign
              }
            };
            const recover = self._recover(channel);

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
  };

  subscribe(channel, events) {
    if (arguments.length < 1) {
      throw new Error('Illegal arguments number: required 1, got ' + arguments.length);
    }
    if (!isString(channel)) {
      throw new Error('Illegal argument type: channel must be a string');
    }
    if (!this._config.resubscribe && !this.isConnected()) {
      throw new Error('Can not only subscribe in connected state when resubscribe option is off');
    }

    const currentSub = this._getSub(channel);

    if (currentSub !== null) {
      currentSub._setEvents(events);
      if (currentSub._isUnsubscribed()) {
        currentSub.subscribe();
      }
      return currentSub;
    }
    const sub = new Subscription(this, channel, events);
    this._subs[channel] = sub;
    sub.subscribe();
    return sub;
  };
}
