"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = exports.subscriptionState = void 0;
const tslib_1 = require("tslib");
const events_1 = tslib_1.__importDefault(require("events"));
const codes_1 = require("./codes");
const utils_1 = require("./utils");
exports.subscriptionState = {
    // Unsubscribed is an initial state, also state when unsubscribe called from client,
    // also state when server called unsubscribe for a channel.
    Unsubscribed: 'unsubscribed',
    // Subscribing to a channel in progress.
    Subscribing: 'subscribing',
    // Sussessfully subscribed to a channel.
    Subscribed: 'subscribed'
};
class Subscription extends events_1.default {
    constructor(centrifuge, channel, options) {
        super();
        // @ts-ignore
        this.channel = channel;
        // @ts-ignore
        this.state = exports.subscriptionState.Unsubscribed;
        // @ts-ignore
        this._centrifuge = centrifuge;
        // @ts-ignore
        this._token = null;
        // @ts-ignore
        this._getToken = null;
        // @ts-ignore
        this._data = null;
        // @ts-ignore
        this._recover = false;
        // @ts-ignore
        this._offset = null;
        // @ts-ignore
        this._epoch = null;
        // @ts-ignore
        this._recoverable = false;
        // @ts-ignore
        this._positioned = false;
        // @ts-ignore
        this._minResubscribeDelay = 500;
        // @ts-ignore
        this._maxResubscribeDelay = 20000;
        // @ts-ignore
        this._resubscribeTimeout = null;
        // @ts-ignore
        this._resubscribeAttempts = 0;
        // @ts-ignore
        this._promises = {};
        // @ts-ignore
        this._promiseId = 0;
        // @ts-ignore
        this._refreshTimeout = null;
        this._setOptions(options);
        // @ts-ignore
        if (this._centrifuge._debugEnabled) {
            this.on('state', function (ctx) {
                // @ts-ignore
                this._centrifuge._debug('subscription state', channel, ctx.oldState, '->', ctx.newState);
            });
            this.on('error', function (ctx) {
                // @ts-ignore
                this._centrifuge._debug('subscription error', channel, ctx);
            });
        }
    }
    // ready returns a Promise which resolves upon subscription goes to Subscribed
    // state and rejects in case of subscription goes to Unsubscribed state.
    // Optional timeout can be passed.
    ready(timeout) {
        // @ts-ignore
        if (this.state === exports.subscriptionState.Unsubscribed) {
            // @ts-ignore
            return Promise.reject({ code: codes_1.errorCodes.subscriptionUnsubscribed, message: this.state });
        }
        ;
        // @ts-ignore
        if (this.state === exports.subscriptionState.Subscribed) {
            return Promise.resolve();
        }
        ;
        return new Promise((res, rej) => {
            let ctx = {
                resolve: res,
                reject: rej
            };
            if (timeout) {
                // @ts-ignore
                ctx.timeout = setTimeout(function () {
                    rej({ code: codes_1.errorCodes.timeout, message: 'timeout' });
                }, timeout);
            }
            // @ts-ignore
            this._promises[this._nextPromiseId()] = ctx;
        });
    }
    // subscribe to a channel.
    subscribe() {
        if (this._isSubscribed()) {
            return;
        }
        // @ts-ignore
        this._resubscribeAttempts = 0;
        this._setSubscribing(codes_1.subscribingCodes.subscribeCalled, 'subscribe called');
    }
    ;
    // unsubscribe from a channel, keeping position state.
    unsubscribe() {
        this._setUnsubscribed(codes_1.unsubscribedCodes.unsubscribeCalled, 'unsubscribe called', true);
    }
    ;
    // cancel Subscription – remove it from client's registry and
    // remove link to a client. Subscription is UNUSABLE after this.
    // Subscription must be in Unsubscribed state before calling this.
    cancel() {
        // @ts-ignore
        if (this.state !== exports.subscriptionState.Unsubscribed) {
            throw new Error('Subscription must be unsubscribed to cancel');
        }
        // @ts-ignore
        this._centrifuge._removeSubscription(this);
        // @ts-ignore
        this._centrifuge = undefined;
    }
    ;
    // publish data to a channel.
    publish(data) {
        const self = this;
        return this._methodCall().then(function () {
            // @ts-ignore
            return self._centrifuge.publish(self.channel, data);
        });
    }
    ;
    // presence for a channel.
    presence() {
        const self = this;
        return this._methodCall().then(function () {
            // @ts-ignore
            return self._centrifuge.presence(self.channel);
        });
    }
    ;
    // presence stats for a channel.
    presenceStats() {
        const self = this;
        return this._methodCall().then(function () {
            // @ts-ignore
            return self._centrifuge.presenceStats(self.channel);
        });
    }
    ;
    // history for a channel.
    history(opts) {
        const self = this;
        return this._methodCall().then(function () {
            // @ts-ignore
            return self._centrifuge.history(self.channel, opts);
        });
    }
    ;
    _methodCall() {
        if (this._isSubscribed()) {
            return Promise.resolve();
        }
        return new Promise((res, rej) => {
            const timeout = setTimeout(function () {
                rej({ code: codes_1.errorCodes.timeout, message: 'timeout' });
                // @ts-ignore
            }, this._centrifuge._config.timeout);
            // @ts-ignore
            this._promises[this._nextPromiseId()] = {
                timeout: timeout,
                resolve: res,
                reject: rej
            };
        });
    }
    _nextPromiseId() {
        // @ts-ignore
        return ++this._promiseId;
    }
    _needRecover() {
        // @ts-ignore
        return this._recover === true;
    }
    ;
    _isUnsubscribed() {
        // @ts-ignore
        return this.state === exports.subscriptionState.Unsubscribed;
    }
    _isSubscribing() {
        // @ts-ignore
        return this.state === exports.subscriptionState.Subscribing;
    }
    _isSubscribed() {
        // @ts-ignore
        return this.state === exports.subscriptionState.Subscribed;
    }
    _setState(newState) {
        // @ts-ignore
        if (this.state !== newState) {
            // @ts-ignore
            const oldState = this.state;
            // @ts-ignore
            this.state = newState;
            // @ts-ignore
            this.emit('state', { 'newState': newState, 'oldState': oldState, channel: this.channel });
            return true;
        }
        return false;
    }
    ;
    _usesToken() {
        // @ts-ignore
        return this._token !== null || this._getToken !== null;
    }
    _clearSubscribingState() {
        // @ts-ignore
        this._resubscribeAttempts = 0;
        this._clearResubscribeTimeout();
    }
    _clearSubscribedState() {
        this._clearRefreshTimeout();
    }
    _setSubscribed(result) {
        if (!this._isSubscribing()) {
            return;
        }
        this._clearSubscribingState();
        if (result.recoverable) {
            // @ts-ignore
            this._recover = true;
            // @ts-ignore
            this._offset = result.offset || 0;
            // @ts-ignore
            this._epoch = result.epoch || '';
        }
        this._setState(exports.subscriptionState.Subscribed);
        // @ts-ignore
        const ctx = this._centrifuge._getSubscribeContext(this.channel, result);
        this.emit('subscribed', ctx);
        this._resolvePromises();
        const pubs = result.publications;
        if (pubs && pubs.length > 0) {
            for (let i in pubs) {
                if (!pubs.hasOwnProperty(i)) {
                    continue;
                }
                this._handlePublication(pubs[i]);
            }
        }
        if (result.expires === true) {
            // @ts-ignore
            this._refreshTimeout = setTimeout(() => this._refresh(), (0, utils_1.ttlMilliseconds)(result.ttl));
        }
    }
    ;
    _setSubscribing(code, reason) {
        if (this._isSubscribing()) {
            return;
        }
        if (this._isSubscribed()) {
            this._clearSubscribedState();
        }
        if (this._setState(exports.subscriptionState.Subscribing)) {
            // @ts-ignore
            this.emit('subscribing', { channel: this.channel, code: code, reason: reason });
        }
        // @ts-ignore
        this._centrifuge._subscribe(this);
    }
    ;
    _setUnsubscribed(code, reason, sendUnsubscribe) {
        if (this._isUnsubscribed()) {
            return;
        }
        if (this._isSubscribed()) {
            if (sendUnsubscribe) {
                // @ts-ignore
                this._centrifuge._unsubscribe(this);
            }
            this._clearSubscribedState();
        }
        if (this._isSubscribing()) {
            this._clearSubscribingState();
        }
        if (this._setState(exports.subscriptionState.Unsubscribed)) {
            // @ts-ignore
            this.emit('unsubscribed', { channel: this.channel, code: code, reason: reason });
        }
        this._rejectPromises({ code: codes_1.errorCodes.subscriptionUnsubscribed, message: 'unsubscribed' });
    }
    ;
    _handlePublication(pub) {
        // @ts-ignore
        const ctx = this._centrifuge._getPublicationContext(this.channel, pub);
        this.emit('publication', ctx);
        if (pub.offset) {
            // @ts-ignore
            this._offset = pub.offset;
        }
    }
    _handleJoin(join) {
        // @ts-ignore
        this.emit('join', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(join.info) });
    }
    _handleLeave(leave) {
        // @ts-ignore
        this.emit('leave', { channel: this.channel, info: this._centrifuge._getJoinLeaveContext(leave.info) });
    }
    _resolvePromises() {
        // @ts-ignore
        for (const id in this._promises) {
            // @ts-ignore
            if (this._promises[id].timeout) {
                // @ts-ignore
                clearTimeout(this._promises[id].timeout);
            }
            // @ts-ignore
            this._promises[id].resolve();
            // @ts-ignore
            delete this._promises[id];
        }
    }
    _rejectPromises(err) {
        // @ts-ignore
        for (const id in this._promises) {
            // @ts-ignore
            if (this._promises[id].timeout) {
                // @ts-ignore
                clearTimeout(this._promises[id].timeout);
            }
            // @ts-ignore
            this._promises[id].reject(err);
            // @ts-ignore
            delete this._promises[id];
        }
    }
    _scheduleResubscribe() {
        const self = this;
        const delay = this._getResubscribeDelay();
        // @ts-ignore
        this._resubscribeTimeout = setTimeout(function () {
            if (self._isSubscribing()) {
                // @ts-ignore
                self._centrifuge._subscribe(self);
            }
        }, delay);
    }
    _subscribeError(err) {
        if (!this._isSubscribing()) {
            return;
        }
        if (err.code < 100 || err.code === 109 || err.temporary === true) {
            if (err.code === 109) { // Token expired error.
                // @ts-ignore
                this._token = null;
            }
            const errContext = {
                // @ts-ignore
                channel: this.channel,
                type: 'subscribe',
                error: err
            };
            this.emit('error', errContext);
            this._scheduleResubscribe();
        }
        else {
            this._setUnsubscribed(err.code, err.message, false);
        }
    }
    ;
    _getResubscribeDelay() {
        // @ts-ignore
        const delay = (0, utils_1.backoff)(this._resubscribeAttempts, this._minResubscribeDelay, this._maxResubscribeDelay);
        // @ts-ignore
        this._resubscribeAttempts++;
        return delay;
    }
    _clearPositionState() {
        // @ts-ignore
        this._recover = false;
        // @ts-ignore
        this._offset = null;
        // @ts-ignore
        this._epoch = null;
    }
    _setOptions(options) {
        if (!options) {
            return;
        }
        if ('since' in options) {
            // @ts-ignore
            this._offset = options.since.offset;
            // @ts-ignore
            this._epoch = options.since.epoch;
            // @ts-ignore
            this._recover = true;
        }
        if ('data' in options) {
            // @ts-ignore
            this._data = options.data;
        }
        if ('minResubscribeDelay' in options) {
            // @ts-ignore
            this._minResubscribeDelay = options.minResubscribeDelay;
        }
        if ('maxResubscribeDelay' in options) {
            // @ts-ignore
            this._maxResubscribeDelay = options.maxResubscribeDelay;
        }
        if ('token' in options) {
            // @ts-ignore
            this._token = options.token;
        }
        if ('getToken' in options) {
            // @ts-ignore
            this._getToken = options.getToken;
        }
        if (options.positioned === true) {
            // @ts-ignore
            this._positioned = true;
        }
        if (options.recoverable === true) {
            // @ts-ignore
            this._recoverable = true;
        }
    }
    _getOffset() {
        // @ts-ignore
        const offset = this._offset;
        if (offset !== null) {
            return offset;
        }
        return 0;
    }
    ;
    _getEpoch() {
        // @ts-ignore
        const epoch = this._epoch;
        if (epoch !== null) {
            return epoch;
        }
        return '';
    }
    ;
    _clearRefreshTimeout() {
        // @ts-ignore
        if (this._refreshTimeout !== null) {
            // @ts-ignore
            clearTimeout(this._refreshTimeout);
            // @ts-ignore
            this._refreshTimeout = null;
        }
    }
    _clearResubscribeTimeout() {
        // @ts-ignore
        if (this._resubscribeTimeout !== null) {
            // @ts-ignore
            clearTimeout(this._resubscribeTimeout);
            // @ts-ignore
            this._resubscribeTimeout = null;
        }
    }
    _getSubscriptionToken() {
        // @ts-ignore
        this._centrifuge._debug('get subscription token for channel', this.channel);
        const ctx = {
            // @ts-ignore
            channel: this.channel
        };
        // @ts-ignore
        const getToken = this._getToken;
        if (getToken === null) {
            throw new Error('provide a function to get channel subscription token');
        }
        return getToken(ctx);
    }
    _refresh() {
        this._clearRefreshTimeout();
        const self = this;
        this._getSubscriptionToken().then(function (token) {
            if (!self._isSubscribed()) {
                return;
            }
            if (!token) {
                self._failUnauthorized();
                return;
            }
            // @ts-ignore
            self._token = token;
            const req = {
                // @ts-ignore
                channel: self.channel,
                token: token
            };
            const msg = {
                'sub_refresh': req
            };
            // @ts-ignore
            self._centrifuge._call(msg).then(resolveCtx => {
                const result = resolveCtx.reply.sub_refresh;
                self._refreshResponse(result);
                if (resolveCtx.next) {
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
                // @ts-ignore
                channel: self.channel,
                error: {
                    code: codes_1.errorCodes.subscriptionRefreshToken,
                    message: e !== undefined ? e.toString() : ''
                }
            });
            // @ts-ignore
            self._refreshTimeout = setTimeout(() => self._refresh(), self._getRefreshRetryDelay());
        });
    }
    _refreshResponse(result) {
        // @ts-ignore
        this._centrifuge._debug('subscription token refreshed, channel', this.channel);
        this._clearRefreshTimeout();
        if (result.expires === true) {
            // @ts-ignore
            this._refreshTimeout = setTimeout(() => this._refresh(), (0, utils_1.ttlMilliseconds)(result.ttl));
        }
    }
    ;
    _refreshError(err) {
        if (err.code < 100 || err.temporary === true) {
            this.emit('error', {
                type: 'refresh',
                // @ts-ignore
                channel: this.channel,
                error: err
            });
            // @ts-ignore
            this._refreshTimeout = setTimeout(() => this._refresh(), this._getRefreshRetryDelay());
        }
        else {
            this._setUnsubscribed(err.code, err.message, true);
        }
    }
    _getRefreshRetryDelay() {
        return (0, utils_1.backoff)(0, 10000, 20000);
    }
    _failUnauthorized() {
        this._setUnsubscribed(codes_1.unsubscribedCodes.unauthorized, 'unauthorized', true);
    }
    ;
}
exports.Subscription = Subscription;
//# sourceMappingURL=subscription.js.map