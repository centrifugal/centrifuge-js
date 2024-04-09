import { Subscription } from './subscription';
import {
  errorCodes, disconnectedCodes,
  connectingCodes, subscribingCodes
} from './codes';

import { SockjsTransport } from './transport_sockjs';
import { WebsocketTransport } from './transport_websocket';
import { HttpStreamTransport } from './transport_http_stream';
import { SseTransport } from './transport_sse';
import { WebtransportTransport } from './transport_webtransport';

import { JsonCodec } from './json';

import {
  isFunction, log, startsWith, errorExists,
  backoff, ttlMilliseconds
} from './utils';

import {
  State, Options, SubscriptionState, ClientEvents,
  TypedEventEmitter, RpcResult, SubscriptionOptions,
  HistoryOptions, HistoryResult, PublishResult,
  PresenceResult, PresenceStatsResult, SubscribedContext,
  TransportEndpoint,
} from './types';

import EventEmitter from 'events';

const defaults: Options = {
  token: '',
  getToken: null,
  data: null,
  getData: null,
  debug: false,
  name: 'js',
  version: '',
  fetch: null,
  readableStream: null,
  websocket: null,
  eventsource: null,
  sockjs: null,
  sockjsOptions: {},
  emulationEndpoint: '/emulation',
  minReconnectDelay: 500,
  maxReconnectDelay: 20000,
  timeout: 5000,
  maxServerPingDelay: 10000,
  networkEventTarget: null,
}

interface serverSubscription {
  offset: number;
  epoch: string;
  recoverable: boolean;
}

export class UnauthorizedError extends Error {
  constructor(message: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Centrifuge is a Centrifuge/Centrifugo bidirectional client. */
export class Centrifuge extends (EventEmitter as new () => TypedEventEmitter<ClientEvents>) {
  state: State;
  private _transportIsOpen: boolean;
  private _endpoint: string | Array<TransportEndpoint>;
  private _emulation: boolean;
  private _transports: any[];
  private _currentTransportIndex: number;
  private _triedAllTransports: boolean;
  private _transportWasOpen: boolean;
  private _transport?: any;
  private _transportId: number;
  private _deviceWentOffline: boolean;
  private _transportClosed: boolean;
  private _reconnecting: boolean;
  private _reconnectTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _reconnectAttempts: number;
  private _client: null;
  private _session: string;
  private _node: string;
  private _subs: Record<string, Subscription>;
  private _serverSubs: Record<string, serverSubscription>;
  private _commandId: number;
  private _commands: any[];
  private _batching: boolean;
  private _refreshRequired: boolean;
  private _refreshTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _callbacks: Record<number, any>;
  private _token: string;
  private _data: any;
  private _dispatchPromise: Promise<void>;
  private _serverPing: number;
  private _serverPingTimeout?: null | ReturnType<typeof setTimeout> = null;
  private _sendPong: boolean;
  private _promises: Record<number, any>;
  private _promiseId: number;
  private _networkEventsSet: boolean;

  private _debugEnabled: boolean;
  private _config: Options;
  protected _codec: any;

  static SubscriptionState: typeof SubscriptionState;
  static State: typeof State;
  static UnauthorizedError: typeof UnauthorizedError;

  /** Constructs Centrifuge client. Call connect() method to start connecting. */
  constructor(endpoint: string | Array<TransportEndpoint>, options?: Partial<Options>) {
    super();
    this.state = State.Disconnected;
    this._transportIsOpen = false;
    this._endpoint = endpoint;
    this._emulation = false;
    this._transports = [];
    this._currentTransportIndex = 0;
    this._triedAllTransports = false;
    this._transportWasOpen = false;
    this._transport = null;
    this._transportId = 0;
    this._deviceWentOffline = false;
    this._transportClosed = true;
    this._codec = new JsonCodec();
    this._reconnecting = false;
    this._reconnectTimeout = null;
    this._reconnectAttempts = 0;
    this._client = null;
    this._session = '';
    this._node = '';
    this._subs = {};
    this._serverSubs = {};
    this._commandId = 0;
    this._commands = [];
    this._batching = false;
    this._refreshRequired = false;
    this._refreshTimeout = null;
    this._callbacks = {};
    this._token = '';
    this._data = null;
    this._dispatchPromise = Promise.resolve();
    this._serverPing = 0;
    this._serverPingTimeout = null;
    this._sendPong = false;
    this._promises = {};
    this._promiseId = 0;
    this._debugEnabled = false;
    this._networkEventsSet = false;

    this._config = { ...defaults, ...options };
    this._configure();

    if (this._debugEnabled) {
      this.on('state', (ctx) => {
        this._debug('client state', ctx.oldState, '->', ctx.newState);
      });
      this.on('error', (ctx) => {
        this._debug('client error', ctx);
      });
    } else {
      // Avoid unhandled exception in EventEmitter for non-set error handler.
      this.on('error', function () { Function.prototype(); });
    }
  }

  /** newSubscription allocates new Subscription to a channel. Since server only allows 
   * one subscription per channel per client this method throws if client already has 
   * channel subscription in internal registry.
   * */
  newSubscription(channel: string, options?: Partial<SubscriptionOptions>): Subscription {
    if (this.getSubscription(channel) !== null) {
      throw new Error('Subscription to the channel ' + channel + ' already exists');
    }
    const sub = new Subscription(this, channel, options);
    this._subs[channel] = sub;
    return sub;
  }

  /** getSubscription returns Subscription if it's registered in the internal 
   * registry or null. */
  getSubscription(channel: string): Subscription | null {
    return this._getSub(channel);
  }

  /** removeSubscription allows removing Subcription from the internal registry. Subscrption 
   * must be in unsubscribed state. */
  removeSubscription(sub: Subscription | null) {
    if (!sub) {
      return;
    }
    if (sub.state !== SubscriptionState.Unsubscribed) {
      sub.unsubscribe();
    }
    this._removeSubscription(sub);
  }

  /** Get a map with all current client-side subscriptions. */
  subscriptions(): Record<string, Subscription> {
    return this._subs;
  }

  /** ready returns a Promise which resolves upon client goes to Connected 
   * state and rejects in case of client goes to Disconnected or Failed state.
   * Users can provide optional timeout in milliseconds. */
  ready(timeout?: number): Promise<void> {
    if (this.state === State.Disconnected) {
      return Promise.reject({ code: errorCodes.clientDisconnected, message: 'client disconnected' });
    }
    if (this.state === State.Connected) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      const ctx: any = {
        resolve: res,
        reject: rej
      };
      if (timeout) {
        ctx.timeout = setTimeout(function () {
          rej({ code: errorCodes.timeout, message: 'timeout' });
        }, timeout);
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
    this._debug('connect called');
    this._reconnectAttempts = 0;
    this._startConnecting();
  }

  /** disconnect from a server. */
  disconnect() {
    this._disconnect(disconnectedCodes.disconnectCalled, 'disconnect called', false);
  }

  /** setToken allows setting connection token. Or resetting used token to be empty.  */
  setToken(token: string) {
    this._token = token;
  }

  /** send asynchronous data to a server (without any response from a server 
   * expected, see rpc method if you need response). */
  send(data: any): Promise<void> {
    const cmd = {
      send: {
        data: data
      }
    };

    const self = this;

    return this._methodCall().then(function () {
      const sent = self._transportSendCommands([cmd]); // can send message to server without id set
      if (!sent) {
        return Promise.reject(self._createErrorObject(errorCodes.transportWriteError, 'transport write error'));
      }
      return Promise.resolve();
    });
  }

  /** rpc to a server - i.e. a call which waits for a response with data. */
  rpc(method: string, data: any): Promise<RpcResult> {
    const cmd = {
      rpc: {
        method: method,
        data: data
      }
    };

    const self = this;

    return this._methodCall().then(function () {
      return self._callPromise(cmd, function (reply: any) {
        return {
          'data': reply.rpc.data
        };
      });
    });
  }

  /** publish data to a channel. */
  publish(channel: string, data: any): Promise<PublishResult> {
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
  }

  /** history for a channel. By default it does not return publications (only current
   *  StreamPosition data) – provide an explicit limit > 0 to load publications.*/
  history(channel: string, options?: HistoryOptions): Promise<HistoryResult> {
    const cmd = {
      history: this._getHistoryRequest(channel, options)
    };

    const self = this;

    return this._methodCall().then(function () {
      return self._callPromise(cmd, function (reply: any) {
        const result = reply.history;
        const publications: any[] = [];
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
  }

  /** presence for a channel. */
  presence(channel: string): Promise<PresenceResult> {
    const cmd = {
      presence: {
        channel: channel
      }
    };

    const self = this;

    return this._methodCall().then(function () {
      return self._callPromise(cmd, function (reply: any) {
        const clients = reply.presence.presence;
        for (const clientId in clients) {
          if (clients.hasOwnProperty(clientId)) {
            const connInfo = clients[clientId]['conn_info'];
            const chanInfo = clients[clientId]['chan_info'];
            if (connInfo) {
              clients[clientId].connInfo = connInfo;
            }
            if (chanInfo) {
              clients[clientId].chanInfo = chanInfo;
            }
          }
        }
        return {
          'clients': clients
        };
      });
    });
  }

  /** presence stats for a channel. */
  presenceStats(channel: string): Promise<PresenceStatsResult> {
    const cmd = {
      'presence_stats': {
        channel: channel
      }
    };

    const self = this;

    return this._methodCall().then(function () {
      return self._callPromise(cmd, function (reply: any) {
        const result = reply.presence_stats;
        return {
          'numUsers': result.num_users,
          'numClients': result.num_clients
        };
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

  /** stop batching commands and flush collected commands to the 
   * network (all in one request/frame).*/
  stopBatching() {
    const self = this;
    // Why so nested? Two levels here requred to deal with promise resolving queue.
    // In Subscription case we wait 2 futures before sending data to connection.
    // Otherwise _batching becomes false before batching decision has a chance to be executed.
    Promise.resolve().then(function () {
      Promise.resolve().then(function () {
        self._batching = false;
        self._flush();
      })
    })
  }

  private _debug(...args: any[]) {
    if (!this._debugEnabled) {
      return;
    }
    log('debug', args);
  }

  /** @internal */
  protected _formatOverride() {
    return;
  }

  private _configure() {
    if (!('Promise' in globalThis)) {
      throw new Error('Promise polyfill required');
    }

    if (!this._endpoint) {
      throw new Error('endpoint configuration required');
    }

    if (this._config.token !== null) {
      this._token = this._config.token;
    }

    if (this._config.data !== null) {
      this._data = this._config.data;
    }

    this._codec = new JsonCodec();
    this._formatOverride();

    if (this._config.debug === true ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('centrifuge.debug'))) {
      this._debugEnabled = true;
    }

    this._debug('config', this._config);

    if (typeof this._endpoint === 'string') {
      // Single address.
    } else if (typeof this._endpoint === 'object' && this._endpoint instanceof Array) {
      this._transports = this._endpoint;
      this._emulation = true;
      for (const i in this._transports) {
        if (this._transports.hasOwnProperty(i)) {
          const transportConfig = this._transports[i];
          if (!transportConfig.endpoint || !transportConfig.transport) {
            throw new Error('malformed transport configuration');
          }
          const transportName = transportConfig.transport;
          if (['websocket', 'http_stream', 'sse', 'sockjs', 'webtransport'].indexOf(transportName) < 0) {
            throw new Error('unsupported transport name: ' + transportName);
          }
        }
      }
    } else {
      throw new Error('unsupported url configuration type: only string or array of objects are supported');
    }
  }

  private _setState(newState: State) {
    if (this.state !== newState) {
      this._reconnecting = false;
      const oldState = this.state;
      this.state = newState;
      this.emit('state', { newState, oldState });
      return true;
    }
    return false;
  }

  private _isDisconnected() {
    return this.state === State.Disconnected;
  }

  private _isConnecting() {
    return this.state === State.Connecting;
  }

  private _isConnected() {
    return this.state === State.Connected;
  }

  private _nextCommandId() {
    return ++this._commandId;
  }

  private _setNetworkEvents() {
    if (this._networkEventsSet) {
      return;
    }
    let eventTarget: EventTarget | null = null;
    if (this._config.networkEventTarget !== null) {
      eventTarget = this._config.networkEventTarget;
    } else if (typeof globalThis.addEventListener !== 'undefined') {
      eventTarget = globalThis as EventTarget;
    }
    if (eventTarget) {
      eventTarget.addEventListener('offline', () => {
        this._debug('offline event triggered');
        if (this.state === State.Connected || this.state === State.Connecting) {
          this._disconnect(connectingCodes.transportClosed, 'transport closed', true);
          this._deviceWentOffline = true;
        }
      });
      eventTarget.addEventListener('online', () => {
        this._debug('online event triggered');
        if (this.state !== State.Connecting) {
          return;
        }
        if (this._deviceWentOffline && !this._transportClosed) {
          // This is a workaround for mobile Safari where close callback may be
          // not issued upon device going to the flight mode. We know for sure
          // that transport close was called, so we start reconnecting. In this
          // case if the close callback will be issued for some reason after some
          // time – it will be ignored due to transport ID mismatch.
          this._deviceWentOffline = false;
          this._transportClosed = true;
        }
        this._clearReconnectTimeout();
        this._startReconnecting();
      });
      this._networkEventsSet = true;
    }
  }

  private _getReconnectDelay() {
    const delay = backoff(this._reconnectAttempts, this._config.minReconnectDelay, this._config.maxReconnectDelay);
    this._reconnectAttempts += 1;
    return delay;
  }

  private _clearOutgoingRequests() {
    // fire errbacks of registered outgoing calls.
    for (const id in this._callbacks) {
      if (this._callbacks.hasOwnProperty(id)) {
        const callbacks = this._callbacks[id];
        clearTimeout(callbacks.timeout);
        const errback = callbacks.errback;
        if (!errback) {
          continue;
        }
        errback({ error: this._createErrorObject(errorCodes.connectionClosed, 'connection closed') });
      }
    }
    this._callbacks = {};
  }

  private _clearConnectedState() {
    this._client = null;
    this._clearServerPingTimeout();
    this._clearRefreshTimeout();

    // fire events for client-side subscriptions.
    for (const channel in this._subs) {
      if (!this._subs.hasOwnProperty(channel)) {
        continue;
      }
      const sub = this._subs[channel];
      if (sub.state === SubscriptionState.Subscribed) {
        // @ts-ignore – we are hiding some symbols from public API autocompletion.
        sub._setSubscribing(subscribingCodes.transportClosed, 'transport closed');
      }
    }

    // fire events for server-side subscriptions.
    for (const channel in this._serverSubs) {
      if (this._serverSubs.hasOwnProperty(channel)) {
        this.emit('subscribing', { channel: channel });
      }
    }
  }

  private _handleWriteError(commands: any[]) {
    for (const command of commands) {
      const id = command.id;
      if (!(id in this._callbacks)) {
        continue;
      }
      const callbacks = this._callbacks[id];
      clearTimeout(this._callbacks[id].timeout);
      delete this._callbacks[id];
      const errback = callbacks.errback;
      errback({ error: this._createErrorObject(errorCodes.transportWriteError, 'transport write error') });
    }
  }

  private _transportSendCommands(commands: any[]) {
    if (!commands.length) {
      return true;
    }
    if (!this._transport) {
      return false
    }
    try {
      this._transport.send(this._codec.encodeCommands(commands), this._session, this._node);
    } catch (e) {
      this._debug('error writing commands', e);
      this._handleWriteError(commands);
      return false;
    }
    return true;
  }

  private _initializeTransport() {
    let websocket: any;
    if (this._config.websocket !== null) {
      websocket = this._config.websocket;
    } else {
      if (!(typeof globalThis.WebSocket !== 'function' && typeof globalThis.WebSocket !== 'object')) {
        websocket = globalThis.WebSocket;
      }
    }

    let sockjs = null;
    if (this._config.sockjs !== null) {
      sockjs = this._config.sockjs;
    } else {
      if (typeof globalThis.SockJS !== 'undefined') {
        sockjs = globalThis.SockJS;
      }
    }

    let eventsource: any = null;
    if (this._config.eventsource !== null) {
      eventsource = this._config.eventsource;
    } else {
      if (typeof globalThis.EventSource !== 'undefined') {
        eventsource = globalThis.EventSource;
      }
    }

    let fetchFunc: any = null;
    if (this._config.fetch !== null) {
      fetchFunc = this._config.fetch;
    } else {
      if (typeof globalThis.fetch !== 'undefined') {
        fetchFunc = globalThis.fetch;
      }
    }

    let readableStream: any = null;
    if (this._config.readableStream !== null) {
      readableStream = this._config.readableStream;
    } else {
      if (typeof globalThis.ReadableStream !== 'undefined') {
        readableStream = globalThis.ReadableStream;
      }
    }

    if (!this._emulation) {
      if (startsWith(this._endpoint, 'http')) {
        throw new Error('Provide explicit transport endpoints configuration in case of using HTTP (i.e. using array of TransportEndpoint instead of a single string), or use ws(s):// scheme in an endpoint if you aimed using WebSocket transport');
      } else {
        this._debug('client will use websocket');
        this._transport = new WebsocketTransport(this._endpoint as string, {
          websocket: websocket
        });
        if (!this._transport.supported()) {
          throw new Error('WebSocket not available');
        }
      }
    } else {
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
          this._transport = new WebsocketTransport(transportEndpoint, {
            websocket: websocket
          });
          if (!this._transport.supported()) {
            this._debug('websocket transport not available');
            this._currentTransportIndex++;
            count++;
            continue;
          }
        } else if (transportName === 'webtransport') {
          this._debug('trying webtransport transport');
          this._transport = new WebtransportTransport(transportEndpoint, {
            webtransport: globalThis.WebTransport,
            decoder: this._codec,
            encoder: this._codec
          });
          if (!this._transport.supported()) {
            this._debug('webtransport transport not available');
            this._currentTransportIndex++;
            count++;
            continue;
          }
        } else if (transportName === 'http_stream') {
          this._debug('trying http_stream transport');
          this._transport = new HttpStreamTransport(transportEndpoint, {
            fetch: fetchFunc,
            readableStream: readableStream,
            emulationEndpoint: this._config.emulationEndpoint,
            decoder: this._codec,
            encoder: this._codec
          });
          if (!this._transport.supported()) {
            this._debug('http_stream transport not available');
            this._currentTransportIndex++;
            count++;
            continue;
          }
        } else if (transportName === 'sse') {
          this._debug('trying sse transport');
          this._transport = new SseTransport(transportEndpoint, {
            eventsource: eventsource,
            fetch: fetchFunc,
            emulationEndpoint: this._config.emulationEndpoint,
          });
          if (!this._transport.supported()) {
            this._debug('sse transport not available');
            this._currentTransportIndex++;
            count++;
            continue;
          }
        } else if (transportName === 'sockjs') {
          this._debug('trying sockjs');
          this._transport = new SockjsTransport(transportEndpoint, {
            sockjs: sockjs,
            sockjsOptions: this._config.sockjsOptions
          });
          if (!this._transport.supported()) {
            this._debug('sockjs transport not available');
            this._currentTransportIndex++;
            count++;
            continue;
          }
        } else {
          throw new Error('unknown transport ' + transportName);
        }
        break;
      }
    }

    const self = this;
    const transport = this._transport;
    const transportId = this._nextTransportId();
    self._debug("id of transport", transportId);
    let wasOpen = false;
    const initialCommands: any[] = [];

    if (this._transport.emulation()) {
      const connectCommand = self._sendConnect(true);
      initialCommands.push(connectCommand);
    }

    this._setNetworkEvents();

    const initialData = this._codec.encodeCommands(initialCommands);

    this._transportClosed = false;

    let connectTimeout: any;
    connectTimeout = setTimeout(function () {
      transport.close();
    }, this._config.timeout);

    this._transport.initialize(this._codec.name(), {
      onOpen: function () {
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        if (self._transportId != transportId) {
          self._debug('open callback from non-actual transport');
          transport.close();
          return;
        }
        wasOpen = true;
        self._debug(transport.subName(), 'transport open');
        if (transport.emulation()) {
          return;
        }
        self._transportIsOpen = true;
        self._transportWasOpen = true;
        self.startBatching();
        self._sendConnect(false);
        self._sendSubscribeCommands();
        self.stopBatching();
        //@ts-ignore must be used only for debug and test purposes. Exposed only for non-emulation transport.
        self.emit('__centrifuge_debug:connect_frame_sent', {})
      },
      onError: function (e: any) {
        if (self._transportId != transportId) {
          self._debug('error callback from non-actual transport');
          return;
        }
        self._debug('transport level error', e);
      },
      onClose: function (closeEvent) {
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        if (self._transportId != transportId) {
          self._debug('close callback from non-actual transport');
          return;
        }
        self._debug(transport.subName(), 'transport closed');
        self._transportClosed = true;
        self._transportIsOpen = false;

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
          } catch (e) {
            reason = closeEvent.reason;
            if ((code >= 3500 && code < 4000) || (code >= 4500 && code < 5000)) {
              needReconnect = false;
            }
          }
        }

        if (code < 3000) {
          if (code === 1009) {
            code = disconnectedCodes.messageSizeLimit;
            reason = 'message size limit exceeded';
            needReconnect = false;
          } else {
            code = connectingCodes.transportClosed;
            reason = 'transport closed';
          }
          if (self._emulation && !self._transportWasOpen) {
            self._currentTransportIndex++;
            if (self._currentTransportIndex >= self._transports.length) {
              self._triedAllTransports = true;
              self._currentTransportIndex = 0;
            }
          }
        } else {
          // Codes >= 3000 are sent from a server application level.
          self._transportWasOpen = true;
        }

        if (self._isConnecting() && !wasOpen) {
          self.emit('error', {
            type: 'transport',
            error: {
              code: errorCodes.transportClosed,
              message: 'transport closed'
            },
            transport: transport.name()
          });
        }

        self._reconnecting = false;
        self._disconnect(code, reason, needReconnect);
      },
      onMessage: function (data) {
        self._dataReceived(data);
      }
    }, initialData);
    //@ts-ignore must be used only for debug and test purposes.
    self.emit('__centrifuge_debug:transport_initialized', {})
  }

  private _sendConnect(skipSending: boolean): any {
    const connectCommand = this._constructConnectCommand();
    const self = this;
    this._call(connectCommand, skipSending).then(resolveCtx => {
      // @ts-ignore = improve later.
      const result = resolveCtx.reply.connect;
      self._connectResponse(result);
      // @ts-ignore - improve later.
      if (resolveCtx.next) {
        // @ts-ignore - improve later.
        resolveCtx.next();
      }
    }, rejectCtx => {
      self._connectError(rejectCtx.error);
      if (rejectCtx.next) {
        rejectCtx.next();
      }
    });
    return connectCommand;
  }

  private _startReconnecting() {
    this._debug('start reconnecting');
    if (!this._isConnecting()) {
      this._debug('stop reconnecting: client not in connecting state');
      return;
    }
    if (this._reconnecting) {
      this._debug('reconnect already in progress, return from reconnect routine');
      return;
    }
    if (this._transportClosed === false) {
      this._debug('waiting for transport close');
      return;
    }

    this._reconnecting = true;
    const self = this;
    const emptyToken = this._token === '';
    const needTokenRefresh = this._refreshRequired || (emptyToken && this._config.getToken !== null);
    if (!needTokenRefresh) {
      if (this._config.getData) {
        this._config.getData().then(function (data: any) {
          if (!self._isConnecting()) {
            return;
          }
          self._data = data;
          self._initializeTransport();
        })
      } else {
        this._initializeTransport();
      }
      return;
    }

    this._getToken().then(function (token: string) {
      if (!self._isConnecting()) {
        return;
      }
      if (token == null || token == undefined) {
        self._failUnauthorized();
        return;
      }
      self._token = token;
      self._debug('connection token refreshed');
      if (self._config.getData) {
        self._config.getData().then(function (data: any) {
          if (!self._isConnecting()) {
            return;
          }
          self._data = data;
          self._initializeTransport();
        })
      } else {
        self._initializeTransport();
      }
    }).catch(function (e) {
      if (!self._isConnecting()) {
        return;
      }
      if (e instanceof UnauthorizedError) {
        self._failUnauthorized();
        return;
      }
      self.emit('error', {
        'type': 'connectToken',
        'error': {
          code: errorCodes.clientConnectToken,
          message: e !== undefined ? e.toString() : ''
        }
      });
      const delay = self._getReconnectDelay();
      self._debug('error on connection token refresh, reconnect after ' + delay + ' milliseconds', e);
      self._reconnecting = false;
      self._reconnectTimeout = setTimeout(() => {
        self._startReconnecting();
      }, delay);
    });
  }

  private _connectError(err: any) {
    if (this.state !== State.Connecting) {
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
      this._debug('closing transport due to connect error');
      this._disconnect(err.code, err.message, true);
    } else {
      this._disconnect(err.code, err.message, false);
    }
  }

  private _scheduleReconnect() {
    if (!this._isConnecting()) {
      return;
    }
    let isInitialHandshake = false;
    if (this._emulation && !this._transportWasOpen && !this._triedAllTransports) {
      isInitialHandshake = true;
    }
    let delay = this._getReconnectDelay();
    if (isInitialHandshake) {
      delay = 0;
    }
    this._debug('reconnect after ' + delay + ' milliseconds');
    this._clearReconnectTimeout();
    this._reconnectTimeout = setTimeout(() => {
      this._startReconnecting();
    }, delay);
  }

  private _constructConnectCommand(): any {
    const req: any = {};

    if (this._token) {
      req.token = this._token;
    }
    if (this._data) {
      req.data = this._data;
    }
    if (this._config.name) {
      req.name = this._config.name;
    }
    if (this._config.version) {
      req.version = this._config.version;
    }

    const subs = {};
    let hasSubs = false;
    for (const channel in this._serverSubs) {
      if (this._serverSubs.hasOwnProperty(channel) && this._serverSubs[channel].recoverable) {
        hasSubs = true;
        const sub = {
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

  private _getHistoryRequest(channel: string, options?: HistoryOptions) {
    const req: any = {
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
      if (options.limit !== undefined) {
        req.limit = options.limit;
      }
      if (options.reverse === true) {
        req.reverse = true;
      }
    }
    return req;
  }

  private _methodCall(): any {
    if (this._isConnected()) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      const timeout = setTimeout(function () {
        rej({ code: errorCodes.timeout, message: 'timeout' });
      }, this._config.timeout);
      this._promises[this._nextPromiseId()] = {
        timeout: timeout,
        resolve: res,
        reject: rej
      };
    });
  }

  private _callPromise(cmd: any, resultCB: any): any {
    return new Promise((resolve, reject) => {
      this._call(cmd, false).then(resolveCtx => {
        // @ts-ignore - improve later.
        resolve(resultCB(resolveCtx.reply));
        // @ts-ignore - improve later.
        if (resolveCtx.next) {
          // @ts-ignore - improve later.
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

  private _dataReceived(data) {
    if (this._serverPing > 0) {
      this._waitServerPing();
    }
    const replies = this._codec.decodeReplies(data);
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

  private _dispatchSynchronized(replies: any[], finishDispatch: any) {
    let p: Promise<unknown> = Promise.resolve();
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

  private _dispatchReply(reply: any) {
    let next: any;
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
    } else {
      if (!reply.push) {
        this._handleServerPing(next);
      } else {
        this._handlePush(reply.push, next);
      }
    }

    return p;
  }

  private _call(cmd: any, skipSending: boolean) {
    return new Promise((resolve, reject) => {
      cmd.id = this._nextCommandId();
      this._registerCall(cmd.id, resolve, reject);
      if (!skipSending) {
        this._addCommand(cmd);
      }
    });
  }

  private _startConnecting() {
    this._debug('start connecting');
    if (this._setState(State.Connecting)) {
      this.emit('connecting', { code: connectingCodes.connectCalled, reason: 'connect called' });
    }
    this._client = null;
    this._startReconnecting();
  }

  private _disconnect(code: number, reason: string, reconnect: boolean) {
    if (this._isDisconnected()) {
      return;
    }
    // we mark transport is closed right away, because _clearConnectedState will move subscriptions to subscribing state
    // if transport will still be open at this time, subscribe frames will be sent to closing transport
    this._transportIsOpen = false;
    const previousState = this.state;
    this._reconnecting = false;

    const ctx = {
      code: code,
      reason: reason
    };

    let needEvent = false;

    if (reconnect) {
      needEvent = this._setState(State.Connecting);
    } else {
      needEvent = this._setState(State.Disconnected);
      this._rejectPromises({ code: errorCodes.clientDisconnected, message: 'disconnected' });
    }

    this._clearOutgoingRequests();

    if (previousState === State.Connecting) {
      this._clearReconnectTimeout();
    }
    if (previousState === State.Connected) {
      this._clearConnectedState();
    }

    if (needEvent) {
      if (this._isConnecting()) {
        this.emit('connecting', ctx);
      } else {
        this.emit('disconnected', ctx);
      }
    }

    if (this._transport) {
      this._debug("closing existing transport");
      const transport = this._transport;
      this._transport = null;
      transport.close(); // Close only after setting this._transport to null to avoid recursion when calling transport close().
      // Need to mark as closed here, because connect call may be sync called after disconnect,
      // transport onClose callback will not be called yet
      this._transportClosed = true;
      this._nextTransportId();
    } else {
      this._debug("no transport to close");
    }
    this._scheduleReconnect();
  }

  private _failUnauthorized() {
    this._disconnect(disconnectedCodes.unauthorized, 'unauthorized', false);
  }

  private _getToken(): Promise<string> {
    this._debug('get connection token');
    if (!this._config.getToken) {
      this.emit('error', {
        type: 'configuration',
        error: {
          code: errorCodes.badConfiguration,
          message: 'token expired but no getToken function set in the configuration'
        }
      });
      throw new UnauthorizedError('');
    }
    return this._config.getToken({});
  }

  private _refresh() {
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

      self._call(cmd, false).then(resolveCtx => {
        // @ts-ignore - improve later.
        const result = resolveCtx.reply.refresh;
        self._refreshResponse(result);
        // @ts-ignore - improve later.
        if (resolveCtx.next) {
          // @ts-ignore - improve later.
          resolveCtx.next();
        }
      }, rejectCtx => {
        self._refreshError(rejectCtx.error);
        if (rejectCtx.next) {
          rejectCtx.next();
        }
      });
    }).catch(function (e) {
      if (!self._isConnected()) {
        return;
      }
      if (e instanceof UnauthorizedError) {
        self._failUnauthorized();
        return;
      }
      self.emit('error', {
        type: 'refreshToken',
        error: {
          code: errorCodes.clientRefreshToken,
          message: e !== undefined ? e.toString() : ''
        }
      });
      self._refreshTimeout = setTimeout(() => self._refresh(), self._getRefreshRetryDelay());
    });
  }

  private _refreshError(err: any) {
    if (err.code < 100 || err.temporary === true) {
      this.emit('error', {
        type: 'refresh',
        error: err
      });
      this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
    } else {
      this._disconnect(err.code, err.message, false);
    }
  }

  private _getRefreshRetryDelay() {
    return backoff(0, 5000, 10000);
  }

  private _refreshResponse(result: any) {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (result.expires) {
      this._client = result.client;
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }
  }

  private _removeSubscription(sub: Subscription | null) {
    if (sub === null) {
      return;
    }
    delete this._subs[sub.channel];
  }

  protected _unsubscribe(sub: Subscription) {
    if (!this._transportIsOpen) {
      return;
    }
    const req = {
      channel: sub.channel
    };
    const cmd = { unsubscribe: req };

    const self = this;

    this._call(cmd, false).then(resolveCtx => {
      // @ts-ignore - improve later.
      if (resolveCtx.next) {
        // @ts-ignore - improve later.
        resolveCtx.next();
      }
    }, rejectCtx => {
      if (rejectCtx.next) {
        rejectCtx.next();
      }
      self._disconnect(connectingCodes.unsubscribeError, 'unsubscribe error', true);
    });
  }

  private _getSub(channel: string) {
    const sub = this._subs[channel];
    if (!sub) {
      return null;
    }
    return sub;
  }

  private _isServerSub(channel: string) {
    return this._serverSubs[channel] !== undefined;
  }

  private _sendSubscribeCommands(): any[] {
    const commands: any[] = [];
    for (const channel in this._subs) {
      if (!this._subs.hasOwnProperty(channel)) {
        continue;
      }
      const sub = this._subs[channel];
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      if (sub._inflight === true) {
        continue;
      }
      if (sub.state === SubscriptionState.Subscribing) {
        // @ts-ignore – we are hiding some symbols from public API autocompletion.
        const cmd = sub._subscribe();
        if (cmd) {
          commands.push(cmd);
        }
      }
    }
    return commands;
  }

  private _connectResponse(result: any) {
    this._transportIsOpen = true;
    this._transportWasOpen = true;
    this._reconnectAttempts = 0;
    this._refreshRequired = false;

    if (this._isConnected()) {
      return;
    }

    this._client = result.client;
    this._setState(State.Connected);

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }
    if (result.expires) {
      this._refreshTimeout = setTimeout(() => this._refresh(), ttlMilliseconds(result.ttl));
    }

    this._session = result.session;
    this._node = result.node;

    this.startBatching();
    this._sendSubscribeCommands();
    this.stopBatching();

    const ctx: any = {
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
    } else {
      this._serverPing = 0;
    }
  }

  private _processServerSubs(subs: Record<string, any>) {
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
        const pubs = sub.publications;
        if (pubs && pubs.length > 0) {
          for (const i in pubs) {
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

  private _clearRefreshTimeout() {
    if (this._refreshTimeout !== null) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
  }

  private _clearReconnectTimeout() {
    if (this._reconnectTimeout !== null) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
  }

  private _clearServerPingTimeout() {
    if (this._serverPingTimeout !== null) {
      clearTimeout(this._serverPingTimeout);
      this._serverPingTimeout = null;
    }
  }

  private _waitServerPing() {
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
      this._disconnect(connectingCodes.noPing, 'no ping', true);
    }, this._serverPing + this._config.maxServerPingDelay);
  }

  private _getSubscribeContext(channel: string, result: any): SubscribedContext {
    const ctx: any = {
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

  private _handleReply(reply: any, next: any) {
    const id = reply.id;
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
      callback({ reply, next });
    } else {
      const errback = callbacks.errback;
      if (!errback) {
        next();
        return;
      }
      const error = reply.error;
      errback({ error, next });
    }
  }

  private _handleJoin(channel: string, join: any) {
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        const ctx = { channel: channel, info: this._getJoinLeaveContext(join.info) };
        this.emit('join', ctx);
      }
      return;
    }
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    sub._handleJoin(join);
  }

  private _handleLeave(channel: string, leave: any) {
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        const ctx = { channel: channel, info: this._getJoinLeaveContext(leave.info) };
        this.emit('leave', ctx);
      }
      return;
    }
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    sub._handleLeave(leave);
  }

  private _handleUnsubscribe(channel: string, unsubscribe: any) {
    const sub = this._getSub(channel);
    if (!sub) {
      if (this._isServerSub(channel)) {
        delete this._serverSubs[channel];
        this.emit('unsubscribed', { channel: channel });
      }
      return;
    }
    if (unsubscribe.code < 2500) {
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      sub._setUnsubscribed(unsubscribe.code, unsubscribe.reason, false);
    } else {
      // @ts-ignore – we are hiding some symbols from public API autocompletion.
      sub._setSubscribing(unsubscribe.code, unsubscribe.reason);
    }
  }

  private _handleSubscribe(channel: string, sub: any) {
    this._serverSubs[channel] = {
      'offset': sub.offset,
      'epoch': sub.epoch,
      'recoverable': sub.recoverable || false
    };
    this.emit('subscribed', this._getSubscribeContext(channel, sub));
  }

  private _handleDisconnect(disconnect: any) {
    const code = disconnect.code;
    let reconnect = true;
    if ((code >= 3500 && code < 4000) || (code >= 4500 && code < 5000)) {
      reconnect = false;
    }
    this._disconnect(code, disconnect.reason, reconnect);
  }

  private _getPublicationContext(channel: string, pub: any) {
    const ctx: any = {
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

  private _getJoinLeaveContext(clientInfo: any) {
    const info: any = {
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

  private _handlePublication(channel: string, pub: any) {
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
    // @ts-ignore – we are hiding some symbols from public API autocompletion.
    sub._handlePublication(pub);
  }

  private _handleMessage(message: any) {
    this.emit('message', { data: message.data });
  }

  private _handleServerPing(next: any) {
    if (this._sendPong) {
      const cmd = {};
      this._transportSendCommands([cmd]);
    }
    next();
  }

  private _handlePush(data: any, next: any) {
    const channel = data.channel;
    if (data.pub) {
      this._handlePublication(channel, data.pub);
    } else if (data.message) {
      this._handleMessage(data.message);
    } else if (data.join) {
      this._handleJoin(channel, data.join);
    } else if (data.leave) {
      this._handleLeave(channel, data.leave);
    } else if (data.unsubscribe) {
      this._handleUnsubscribe(channel, data.unsubscribe);
    } else if (data.subscribe) {
      this._handleSubscribe(channel, data.subscribe);
    } else if (data.disconnect) {
      this._handleDisconnect(data.disconnect);
    }
    next();
  }

  private _flush() {
    const commands = this._commands.slice(0);
    this._commands = [];
    this._transportSendCommands(commands);
  }

  private _createErrorObject(code: number, message: string, temporary?: boolean) {
    const errObject: any = {
      code: code,
      message: message
    };
    if (temporary) {
      errObject.temporary = true;
    }
    return errObject;
  }

  private _registerCall(id: number, callback: any, errback: any) {
    this._callbacks[id] = {
      callback: callback,
      errback: errback,
      timeout: null
    };
    this._callbacks[id].timeout = setTimeout(() => {
      delete this._callbacks[id];
      if (isFunction(errback)) {
        errback({ error: this._createErrorObject(errorCodes.timeout, 'timeout') });
      }
    }, this._config.timeout);
  }

  private _addCommand(command: any) {
    if (this._batching) {
      this._commands.push(command);
    } else {
      this._transportSendCommands([command]);
    }
  }

  private _nextPromiseId() {
    return ++this._promiseId;
  }

  private _nextTransportId() {
    return ++this._transportId;
  }

  private _resolvePromises() {
    for (const id in this._promises) {
      if (!this._promises.hasOwnProperty(id)) {
        continue;
      }
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].resolve();
      delete this._promises[id];
    }
  }

  private _rejectPromises(err: any) {
    for (const id in this._promises) {
      if (!this._promises.hasOwnProperty(id)) {
        continue;
      }
      if (this._promises[id].timeout) {
        clearTimeout(this._promises[id].timeout);
      }
      this._promises[id].reject(err);
      delete this._promises[id];
    }
  }
}

Centrifuge.SubscriptionState = SubscriptionState;
Centrifuge.State = State
Centrifuge.UnauthorizedError = UnauthorizedError;
