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
  log,
  startsWith,
  errorExists,
  backoff,
  extend
} from './utils';

const _errorTimeout = 'timeout';
const _errorConnectionClosed = 'connection closed';

export class Centrifuge extends EventEmitter {

  constructor(url, options) {
    super();
    this._url = url;
    this._websocket = null;
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
    this._refreshRequired = false;
    this._subs = {};
    this._lastSeq = {};
    this._lastGen = {};
    this._lastEpoch = {};
    this._messages = [];
    this._isBatching = false;
    this._isSubscribeBatching = false;
    this._privateChannels = {};
    this._numRefreshFailed = 0;
    this._refreshTimeout = null;
    this._pingTimeout = null;
    this._pongTimeout = null;
    this._subRefreshTimeouts = {};
    this._retries = 0;
    this._callbacks = {};
    this._latency = null;
    this._latencyStart = null;
    this._connectData = null;
    this._token = null;
    this._xhrID = 0;
    this._xhrs = {};
    this._config = {
      debug: false,
      websocket: null,
      sockjs: null,
      promise: null,
      minRetry: 1000,
      maxRetry: 20000,
      timeout: 5000,
      ping: true,
      pingInterval: 25000,
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
      refreshInterval: 1000,
      onRefreshFailed: null,
      onRefresh: null,
      subscribeEndpoint: '/centrifuge/subscribe',
      subscribeHeaders: {},
      subscribeParams: {},
      subRefreshInterval: 1000,
      onPrivateSubscribe: null
    };
    this._configure(options);
  }

  setToken(token) {
    this._token = token;
  }

  setConnectData(data) {
    this._connectData = data;
  }

  setRefreshHeaders(headers) {
    this._config.refreshHeaders = headers;
  }
  setRefreshParams(params) {
    this._config.refreshParams = params;
  }
  setRefreshData(data) {
    this._config.refreshData = data;
  }

  setSubscribeHeaders(headers) {
    this._config.subscribeHeaders = headers;
  }
  setSubscribeParams(params) {
    this._config.subscribeParams = params;
  }

  _ajax(url, params, headers, data, callback) {
    let query = '';
    this._debug('sending AJAX request to', url, 'with data', JSON.stringify(data));

    const xhr = (global.XMLHttpRequest ? new global.XMLHttpRequest() : new global.ActiveXObject('Microsoft.XMLHTTP'));

    for (const i in params) {
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
    for (const headerName in headers) {
      if (headers.hasOwnProperty(headerName)) {
        xhr.setRequestHeader(headerName, headers[headerName]);
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          let data, parsed = false;
          try {
            data = JSON.parse(xhr.responseText);
            parsed = true;
          } catch (e) {
            callback({
              error: 'Invalid JSON. Data was: ' + xhr.responseText,
              status: 200,
              data: null
            });
          }
          if (parsed) { // prevents double execution.
            callback({
              data: data,
              status: 200
            });
          }
        } else {
          this._log('wrong status code in AJAX response', xhr.status);
          callback({
            status: xhr.status,
            data: null
          });
        }
      }
    };
    setTimeout(() => xhr.send(JSON.stringify(data)), 20);
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
    if (this._config.websocket !== null) {
      return true;
    }
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
    if (!('Promise' in global)) {
      throw new Error('Promise polyfill required');
    }

    extend(this._config, configuration || {});
    this._debug('centrifuge config', this._config);

    if (!this._url) {
      throw new Error('url required');
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
    const interval = backoff(this._retries, this._config.minRetry, this._config.maxRetry);

    this._retries += 1;
    return interval;
  };

  _abortInflightXHRs() {
    for (const xhrID in this._xhrs) {
      try {
        this._xhrs[xhrID].abort();
      } catch (e) {
        this._debug('error aborting xhr', e);
      }
      delete this._xhrs[xhrID];
    }
  };

  _clearConnectedState(reconnect) {
    this._clientID = null;
    this._stopPing();

    // fire errbacks of registered outgoing calls.
    for (const id in this._callbacks) {
      if (this._callbacks.hasOwnProperty(id)) {
        const callbacks = this._callbacks[id];
        clearTimeout(callbacks.timeout);
        const errback = callbacks.errback;
        if (!errback) {
          continue;
        }
        errback({error: this._createErrorObject('disconnected')});
      }
    }
    this._callbacks = {};

    // fire unsubscribe events
    for (const channel in this._subs) {
      if (this._subs.hasOwnProperty(channel)) {
        const sub = this._subs[channel];

        if (reconnect) {
          if (sub._isSuccess()) {
            sub._triggerUnsubscribe();
            sub._recover = true;
          }
          if (sub._shouldResubscribe()) {
            sub._setSubscribing();
          }
        } else {
          sub._setUnsubscribed();
        }
      }
    }

    this._abortInflightXHRs();

    // clear refresh timer
    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    // clear sub refresh timers
    for (const channel in this._subRefreshTimeouts) {
      if (this._subRefreshTimeouts.hasOwnProperty(channel) && this._subRefreshTimeouts[channel]) {
        this._clearSubRefreshTimeout(channel);
      }
    }
    this._subRefreshTimeouts = {};

    if (!this._reconnect) {
      // completely clear subscriptions
      this._subs = {};
    }
  };

  _isTransportOpen() {
    if (this._isSockjs) {
      return this._transport &&
        this._transport.transport &&
        this._transport.transport.readyState === this._transport.transport.OPEN;
    }
    return this._transport && this._transport.readyState === this._transport.OPEN;
  };

  _transportSend(commands) {
    if (!commands.length) {
      return true;
    }

    if (!this._isTransportOpen()) {
      // resolve pending commands with error if transport is not open
      for (let command in commands) {
        let id = command.id;
        if (!(id in this._callbacks)) {
          continue;
        }
        const callbacks = this._callbacks[id];
        clearTimeout(this._callbacks[id].timeout);
        delete this._callbacks[id];
        const errback = callbacks.errback;
        errback({error: this._createErrorObject(_errorConnectionClosed, 0)});
      }
      return false;
    }
    this._transport.send(this._encoder.encodeCommands(commands));
    return true;
  }

  _setupTransport() {
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
      if (this._config.websocket !== null) {
        this._websocket = this._config.websocket;
      } else {
        this._websocket = WebSocket;
      }
      this._transport = new this._websocket(this._url);
      if (this._binary === true) {
        this._transport.binaryType = 'arraybuffer';
      }
    }

    this._transport.onopen = () => {
      this._transportClosed = false;

      if (this._isSockjs) {
        this._transportName = 'sockjs-' + this._transport.transport;
        this._transport.onheartbeat = () => this._restartPing();
      } else {
        this._transportName = 'websocket';
      }

      // Can omit method here due to zero value.
      const msg = {
        // method: this._methodType.CONNECT
      };

      if (this._token || this._connectData) {
        msg.params = {};
      }

      if (this._token) {
        msg.params.token = this._token;
      }

      if (this._connectData) {
        msg.params.data = this._connectData;
      }

      this._latencyStart = new Date();
      this._call(msg).then(resolveCtx => {
        this._connectResponse(this._decoder.decodeCommandResult(this._methodType.CONNECT, resolveCtx.result));
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        const err = rejectCtx.error;
        if (err.code === 109) { // token expired.
          this._refreshRequired = true;
        }
        this._disconnect('connect error', true);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    };

    this._transport.onerror = error => {
      this._debug('transport level error', error);
    };

    this._transport.onclose = closeEvent => {
      this._transportClosed = true;
      let reason = _errorConnectionClosed;
      let needReconnect = true;

      if (closeEvent && 'reason' in closeEvent && closeEvent.reason) {
        try {
          const advice = JSON.parse(closeEvent.reason);
          this._debug('reason is an advice object', advice);
          reason = advice.reason;
          needReconnect = advice.reconnect;
        } catch (e) {
          reason = closeEvent.reason;
          this._debug('reason is a plain string', reason);
        }
      }

      // onTransportClose callback should be executed every time transport was closed.
      // This can be helpful to catch failed connection events (because our disconnect
      // event only called once and every future attempts to connect do not fire disconnect
      // event again).
      if (this._config.onTransportClose !== null) {
        this._config.onTransportClose({
          event: closeEvent,
          reason: reason,
          reconnect: needReconnect
        });
      }

      this._disconnect(reason, needReconnect);

      if (this._reconnect === true) {
        this._reconnecting = true;
        const interval = this._getRetryInterval();

        this._debug('reconnect after ' + interval + ' milliseconds');
        setTimeout(() => {
          if (this._reconnect === true) {
            if (this._refreshRequired) {
              this._refresh();
            } else {
              this._connect();
            }
          }
        }, interval);
      }
    };

    this._transport.onmessage = event => {
      this._dataReceived(event.data);
    };
  };

  rpc(data) {
    const msg = {
      method: this._methodType.RPC,
      params: {
        data: data
      }
    };

    if (!this.isConnected()) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    }

    return this._call(msg).then(resolveCtx => {
      if (resolveCtx.next) {
        resolveCtx.next();
      }
      return this._decoder.decodeCommandResult(this._methodType.RPC, resolveCtx.result);
    }, rejectCtx => {
      if (rejectCtx.next) {
        rejectCtx.next();
      }
      return Promise.reject(rejectCtx.error);
    });
  }

  send(data) {
    const msg = {
      method: this._methodType.SEND,
      params: {
        data: data
      }
    };

    if (!this.isConnected()) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    }

    const sent = this._transportSend([msg]); // can send async message to server without id set
    if (!sent) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    };
    return Promise.resolve({});
  }

  publish(channel, data) {
    const msg = {
      method: this._methodType.PUBLISH,
      params: {
        channel: channel,
        data: data
      }
    };

    if (!this.isConnected()) {
      return Promise.reject(this._createErrorObject(_errorConnectionClosed, 0));
    }

    return this._call(msg).then(result => {
      if (result.next) {
        result.next();
      }
      return {};
    });
  }

  _dataReceived(data) {
    const replies = this._decoder.decodeReplies(data);
    // we have to guarantee order of events in replies processing - i.e. start processing
    // next reply only when we finished processing of current one. Without syncing things in
    // this way we could get wrong publication events order as reply promises resolve
    // on next loop tick so for loop continues before we finished emitting all reply events.
    let p = Promise.resolve();
    for (const i in replies) {
      if (replies.hasOwnProperty(i)) {
        p = p.then(() => {
          return this._dispatchReply(replies[i]);
        });
      }
    }
    this._restartPing();
  }

  _call(msg) {
    return new Promise((resolve, reject) => {
      const id = this._addMessage(msg);
      this._registerCall(id, resolve, reject);
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

    const reconnect = shouldReconnect || false;
    if (reconnect === false) {
      this._reconnect = false;
    }

    if (this._isDisconnected()) {
      if (!reconnect) {
        this._clearConnectedState(reconnect);
      }
      return;
    }

    this._clearConnectedState(reconnect);
    this._debug('disconnected:', reason, shouldReconnect);
    this._setStatus('disconnected');

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (this._reconnecting === false) {
      this.emit('disconnect', {
        reason: reason,
        reconnect: reconnect
      });
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
    // ask application for new connection token.
    this._debug('refresh token');

    if (this._config.refreshAttempts === 0) {
      this._debug('refresh attempts set to 0, do not send refresh request at all');
      this._refreshFailed();
      return;
    }

    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (this._clientID !== clientID) {
        return;
      }
      if (resp.error || resp.status !== 200) {
        // We don't perform any connection status related actions here as we are
        // relying on server that must close connection eventually.
        if (resp.error) {
          this._debug('error refreshing connection token', resp.error);
        } else {
          this._debug('error refreshing connection token: wrong status code', resp.status);
        }
        this._numRefreshFailed++;
        if (this._refreshTimeout !== null) {
          clearTimeout(this._refreshTimeout);
          this._refreshTimeout = null;
        }
        if (this._config.refreshAttempts !== null && this._numRefreshFailed >= this._config.refreshAttempts) {
          this._refreshFailed();
          return;
        }
        const jitter = Math.round(Math.random() * 1000 * Math.max(this._numRefreshFailed, 20));
        const interval = this._config.refreshInterval + jitter;
        this._refreshTimeout = setTimeout(() => this._refresh(), interval);
        return;
      }
      this._numRefreshFailed = 0;
      this._token = resp.data.token;
      if (!this._token) {
        this._refreshFailed();
        return;
      }
      if (this._isDisconnected() && this._reconnect) {
        this._debug('token refreshed, connect from scratch');
        this._connect();
      } else {
        this._debug('send refreshed token');
        const msg = {
          method: this._methodType.REFRESH,
          params: {
            token: this._token
          }
        };
        this._call(msg).then(resolveCtx => {
          this._refreshResponse(this._decoder.decodeCommandResult(this._methodType.REFRESH, resolveCtx.result));
          if (resolveCtx.next) {
            resolveCtx.next();
          }
        }, rejectCtx => {
          this._refreshError(rejectCtx.error);
          if (rejectCtx.next) {
            rejectCtx.next();
          }
        });
      }
    };

    if (this._config.onRefresh !== null) {
      const context = {};
      this._config.onRefresh(context, cb);
    } else {
      const xhr = this._ajax(
        this._config.refreshEndpoint,
        this._config.refreshParams,
        this._config.refreshHeaders,
        this._config.refreshData,
        cb
      );
      this._xhrs[xhrID] = xhr;
    }
  };

  _refreshError(err) {
    this._debug('refresh error', err);
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    const interval = this._config.refreshInterval + Math.round(Math.random() * 1000);
    this._refreshTimeout = setTimeout(() => this._refresh(), interval);
  }

  _refreshResponse(result) {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (result.expires) {
      this._clientID = result.client;
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getTTLMilliseconds(result.ttl));
    }
  };

  _newXHRID() {
    this._xhrID++;
    return this._xhrID;
  }

  _subRefresh(channel) {
    this._debug('refresh subscription token for channel', channel);

    if (this._subRefreshTimeouts[channel] !== undefined) {
      this._clearSubRefreshTimeout(channel);
    } else {
      return;
    }

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (resp.error || resp.status !== 200 || this._clientID !== clientID) {
        return;
      }
      let channelsData = {};
      if (resp.data.channels) {
        for (const i in data.channels) {
          const channelData = resp.data.channels[i];
          if (!channelData.channel) {
            continue;
          }
          channelsData[channelData.channel] = channelData.token;
        }
      }

      const token = channelsData[channel];
      if (!token) {
        return;
      }
      const msg = {
        method: this._methodType.SUB_REFRESH,
        params: {
          channel: channel,
          token: token
        }
      };

      const sub = this._getSub(channel);
      if (sub === null) {
        return;
      }

      this._call(msg).then(resolveCtx => {
        this._subRefreshResponse(
          channel,
          this._decoder.decodeCommandResult(this._methodType.SUB_REFRESH, resolveCtx.result)
        );
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        this._subRefreshError(channel, rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    };

    const data = {
      client: this._clientID,
      channels: [channel]
    };

    if (this._config.onPrivateSubscribe !== null) {
      this._config.onPrivateSubscribe({
        data: data
      }, cb);
    } else {
      const xhr = this._ajax(
        this._config.subscribeEndpoint, this._config.subscribeParams, this._config.subscribeHeaders, data, cb);
      this._xhrs[xhrID] = xhr;
    }
  };

  _clearSubRefreshTimeout(channel) {
    if (this._subRefreshTimeouts[channel] !== undefined) {
      clearTimeout(this._subRefreshTimeouts[channel]);
      delete this._subRefreshTimeouts[channel];
    }
  }

  _subRefreshError(channel, err) {
    this._debug('subscription refresh error', channel, err);
    this._clearSubRefreshTimeout(channel);
    const sub = this._getSub(channel);
    if (sub === null) {
      return;
    }
    const jitter = Math.round(Math.random() * 1000);
    let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._config.subRefreshInterval + jitter);
    this._subRefreshTimeouts[channel] = subRefreshTimeout;
    return;
  }

  _subRefreshResponse(channel, result) {
    this._debug('subscription refresh success', channel);
    this._clearSubRefreshTimeout(channel);
    const sub = this._getSub(channel);
    if (sub === null) {
      return;
    }
    if (result.expires === true) {
      let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._getTTLMilliseconds(result.ttl));
      this._subRefreshTimeouts[channel] = subRefreshTimeout;
    }
    return;
  };

  _subscribe(sub, isResubscribe) {
    this._debug('subscribing on', sub.channel);
    const channel = sub.channel;

    if (!(channel in this._subs)) {
      this._subs[channel] = sub;
    }

    if (!this.isConnected()) {
      // subscribe will be called later
      sub._setNew();
      return;
    }

    sub._setSubscribing(isResubscribe);

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
      // private channel.
      if (this._isSubscribeBatching) {
        this._privateChannels[channel] = true;
      } else {
        this.startSubscribeBatching();
        this._subscribe(sub);
        this.stopSubscribeBatching();
      }
    } else {
      const recover = sub._needRecover();

      if (recover === true) {
        msg.params.recover = true;
        const seq = this._getLastSeq(channel);
        if (seq) {
          msg.params.seq = seq;
        }
        const gen = this._getLastGen(channel);
        if (gen) {
          msg.params.gen = gen;
        }
        const epoch = this._getLastEpoch(channel);
        if (epoch) {
          msg.params.epoch = epoch;
        }
      }

      this._call(msg).then(resolveCtx => {
        this._subscribeResponse(
          channel,
          recover,
          this._decoder.decodeCommandResult(this._methodType.SUBSCRIBE, resolveCtx.result)
        );
        if (resolveCtx.next) {
          resolveCtx.next();
        }
      }, rejectCtx => {
        this._subscribeError(channel, rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
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

  _getTTLMilliseconds(ttl) {
    // https://stackoverflow.com/questions/12633405/what-is-the-maximum-delay-for-setinterval
    return Math.min(ttl * 1000, 2147483647);
  }

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
    const wasReconnecting = this._reconnecting;
    this._reconnecting = false;
    this._resetRetry();
    this._refreshRequired = false;

    if (this.isConnected()) {
      return;
    }

    if (this._latencyStart !== null) {
      this._latency = (new Date()).getTime() - this._latencyStart.getTime();
      this._latencyStart = null;
    }

    this._clientID = result.client;
    this._setStatus('connected');

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }

    if (result.expires) {
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getTTLMilliseconds(result.ttl));
    }

    this.startBatching();
    this.startSubscribeBatching();
    for (const channel in this._subs) {
      if (this._subs.hasOwnProperty(channel)) {
        const sub = this._subs[channel];
        if (sub._shouldResubscribe()) {
          this._subscribe(sub, wasReconnecting);
        }
      }
    }
    this.stopSubscribeBatching();
    this.stopBatching();

    this._startPing();

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
      this._pongTimeout = null;
    }
    if (this._pingTimeout !== null) {
      clearTimeout(this._pingTimeout);
      this._pingTimeout = null;
    }
  };

  _startPing() {
    if (this._config.ping !== true || this._config.pingInterval <= 0) {
      return;
    }
    if (!this.isConnected()) {
      return;
    }

    this._pingTimeout = setTimeout(() => {
      if (!this.isConnected()) {
        this._stopPing();
        return;
      }
      this.ping();
      this._pongTimeout = setTimeout(() => {
        this._disconnect('no ping', true);
      }, this._config.pongWaitTimeout);
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

  _subscribeResponse(channel, isRecover, result) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (!sub._isSubscribing()) {
      return;
    }

    let recovered = false;
    if ('recovered' in result) {
      recovered = result.recovered;
    }
    sub._setSubscribeSuccess(recovered);

    let pubs = result.publications;
    if (pubs && pubs.length > 0) {
      pubs = pubs.reverse();
      for (let i in pubs) {
        if (pubs.hasOwnProperty(i)) {
          this._handlePublication(channel, pubs[i]);
        }
      }
    }

    if (result.recoverable && (!isRecover || !recovered)) {
      this._lastSeq[channel] = result.seq || 0;
      this._lastGen[channel] = result.gen || 0;
    }

    this._lastEpoch[channel] = result.epoch || '';

    if (result.recoverable) {
      sub._recoverable = true;
    }

    if (result.expires === true) {
      let subRefreshTimeout = setTimeout(() => this._subRefresh(channel), this._getTTLMilliseconds(result.ttl));
      this._subRefreshTimeouts[channel] = subRefreshTimeout;
    }
  };

  _handleReply(reply, next) {
    const id = reply.id;
    const result = reply.result;

    if (!(id in this._callbacks)) {
      next();
      return;
    }
    const callbacks = this._callbacks[id];
    clearTimeout(this._callbacks[id].timeout);
    delete this._callbacks[id];

    if (!errorExists(reply)) {
      const callback = callbacks.callback;
      if (!callback) {
        return;
      }
      callback({result, next});
    } else {
      const errback = callbacks.errback;
      if (!errback) {
        next();
        return;
      }
      const error = reply.error;
      errback({error, next});
    }
  }

  _handleJoin(channel, join) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.emit('join', {'info': join.info});
  };

  _handleLeave(channel, leave) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.emit('leave', {'info': leave.info});
  };

  _handleUnsub(channel, unsub) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    sub.unsubscribe();
    if (unsub.resubscribe === true) {
      sub.subscribe();
    }
  };

  _handlePublication(channel, pub) {
    const sub = this._getSub(channel);
    if (!sub) {
      return;
    }
    if (pub.seq !== undefined) {
      this._lastSeq[channel] = pub.seq;
    }
    if (pub.gen !== undefined) {
      this._lastGen[channel] = pub.gen;
    }
    sub.emit('publish', pub);
  };

  _handleMessage(message) {
    this.emit('message', message.data);
  };

  _handlePush(data, next) {
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
      const unsub = this._decoder.decodePushData(this._pushType.UNSUB, push.data);
      this._handleUnsub(channel, unsub);
    }
    next();
  }

  _dispatchReply(reply) {
    var next;
    const p = new Promise(resolve =>{
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
    } else {
      this._handlePush(reply.result, next);
    }

    return p;
  };

  _flush() {
    const messages = this._messages.slice(0);
    this._messages = [];
    this._transportSend(messages);
  };

  _ping() {
    const msg = {
      method: this._methodType.PING
    };
    this._call(msg).then(resolveCtx => {
      this._pingResponse(this._decoder.decodeCommandResult(this._methodType.PING, resolveCtx.result));
      if (resolveCtx.next) {
        resolveCtx.next();
      }
    }, rejectCtx => {
      this._debug('ping error', rejectCtx.error);
      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });
  };

  _pingResponse(result) {
    if (!this.isConnected()) {
      return;
    }
    this._stopPing();
    this._startPing();
  }

  _getLastSeq(channel) {
    const lastSeq = this._lastSeq[channel];
    if (lastSeq) {
      return lastSeq;
    }
    return 0;
  };

  _getLastGen(channel) {
    const lastGen = this._lastGen[channel];
    if (lastGen) {
      return lastGen;
    }
    return 0;
  };

  _getLastEpoch(channel) {
    const lastEpoch = this._lastEpoch[channel];
    if (lastEpoch) {
      return lastEpoch;
    }
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
    this._callbacks[id] = {
      callback: callback,
      errback: errback,
      timeout: null
    };
    this._callbacks[id].timeout = setTimeout(() => {
      delete this._callbacks[id];
      if (isFunction(errback)) {
        errback({error: this._createErrorObject(_errorTimeout)});
      }
    }, this._config.timeout);
  };

  _addMessage(message) {
    let id = this._nextMessageId();
    message.id = id;
    if (this._isBatching === true) {
      this._messages.push(message);
    } else {
      this._transportSend([message]);
    }
    return id;
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

  stopBatching() {
    this._isBatching = false;
    this._flush();
  };

  startSubscribeBatching() {
    // start collecting private channels to create bulk authentication
    // request to subscribeEndpoint when stopSubscribeBatching will be called
    this._isSubscribeBatching = true;
  };

  stopSubscribeBatching() {
    // create request to subscribeEndpoint with collected private channels
    // to ask if this client can subscribe on each channel
    this._isSubscribeBatching = false;
    const authChannels = this._privateChannels;
    this._privateChannels = {};

    const channels = [];

    for (const channel in authChannels) {
      if (authChannels.hasOwnProperty(channel)) {
        const sub = this._getSub(channel);
        if (!sub) {
          continue;
        }
        channels.push(channel);
      }
    }

    if (channels.length === 0) {
      this._debug('no private channels found, no need to make request');
      return;
    }

    const data = {
      client: this._clientID,
      channels: channels
    };

    const clientID = this._clientID;
    const xhrID = this._newXHRID();

    const cb = (resp) => {
      if (xhrID in this._xhrs) {
        delete this._xhrs[xhrID];
      }
      if (this._clientID !== clientID) {
        return;
      }
      if (resp.error || resp.status !== 200) {
        this._debug('authorization request failed');
        for (const i in channels) {
          if (channels.hasOwnProperty(i)) {
            const channel = channels[i];
            this._subscribeError(channel, this._createErrorObject('authorization request failed'));
          }
        }
        return;
      }

      let channelsData = {};
      if (resp.data.channels) {
        for (const i in resp.data.channels) {
          const channelData = resp.data.channels[i];
          if (!channelData.channel) {
            continue;
          }
          channelsData[channelData.channel] = channelData.token;
        }
      }

      // try to send all subscriptions in one request.
      let batch = false;

      if (!this._isBatching) {
        this.startBatching();
        batch = true;
      }

      for (const i in channels) {
        if (channels.hasOwnProperty(i)) {
          const channel = channels[i];
          const token = channelsData[channel];

          if (!token) {
            // subscription:error
            this._subscribeError(channel, this._createErrorObject('permission denied', 103));
            continue;
          } else {
            const msg = {
              method: this._methodType.SUBSCRIBE,
              params: {
                channel: channel,
                token: token
              }
            };

            const sub = this._getSub(channel);
            if (sub === null) {
              continue;
            }

            const recover = sub._needRecover();

            if (recover === true) {
              msg.params.recover = true;
              const seq = this._getLastSeq(channel);
              if (seq) {
                msg.params.seq = seq;
              }
              const gen = this._getLastGen(channel);
              if (gen) {
                msg.params.gen = gen;
              }
              const epoch = this._getLastEpoch(channel);
              if (epoch) {
                msg.params.epoch = epoch;
              }
            }
            this._call(msg).then(resolveCtx => {
              this._subscribeResponse(
                channel,
                recover,
                this._decoder.decodeCommandResult(this._methodType.SUBSCRIBE, resolveCtx.result)
              );
              if (resolveCtx.next) {
                resolveCtx.next();
              }
            }, rejectCtx => {
              this._subscribeError(channel, rejectCtx.error);
              if (rejectCtx.next) {
                rejectCtx.next();
              }
            });
          }
        }
      }

      if (batch) {
        this.stopBatching();
      }

    };

    if (this._config.onPrivateSubscribe !== null) {
      this._config.onPrivateSubscribe({
        data: data
      }, cb);
    } else {
      const xhr = this._ajax(
        this._config.subscribeEndpoint, this._config.subscribeParams, this._config.subscribeHeaders, data, cb);
      this._xhrs[xhrID] = xhr;
    }
  };

  subscribe(channel, events) {
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
