;(function () {
    'use strict';

    /*!
     * @overview es6-promise - a tiny implementation of Promises/A+.
     * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
     * @license   Licensed under MIT license
     *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
     * @version   3.0.2
     */
    (function(){"use strict";function lib$es6$promise$utils$$objectOrFunction(x){return typeof x==="function"||typeof x==="object"&&x!==null}function lib$es6$promise$utils$$isFunction(x){return typeof x==="function"}function lib$es6$promise$utils$$isMaybeThenable(x){return typeof x==="object"&&x!==null}var lib$es6$promise$utils$$_isArray;if(!Array.isArray){lib$es6$promise$utils$$_isArray=function(x){return Object.prototype.toString.call(x)==="[object Array]"}}else{lib$es6$promise$utils$$_isArray=Array.isArray}var lib$es6$promise$utils$$isArray=lib$es6$promise$utils$$_isArray;var lib$es6$promise$asap$$len=0;var lib$es6$promise$asap$$toString={}.toString;var lib$es6$promise$asap$$vertxNext;var lib$es6$promise$asap$$customSchedulerFn;var lib$es6$promise$asap$$asap=function asap(callback,arg){lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len]=callback;lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len+1]=arg;lib$es6$promise$asap$$len+=2;if(lib$es6$promise$asap$$len===2){if(lib$es6$promise$asap$$customSchedulerFn){lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush)}else{lib$es6$promise$asap$$scheduleFlush()}}};function lib$es6$promise$asap$$setScheduler(scheduleFn){lib$es6$promise$asap$$customSchedulerFn=scheduleFn}function lib$es6$promise$asap$$setAsap(asapFn){lib$es6$promise$asap$$asap=asapFn}var lib$es6$promise$asap$$browserWindow=typeof window!=="undefined"?window:undefined;var lib$es6$promise$asap$$browserGlobal=lib$es6$promise$asap$$browserWindow||{};var lib$es6$promise$asap$$BrowserMutationObserver=lib$es6$promise$asap$$browserGlobal.MutationObserver||lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;var lib$es6$promise$asap$$isNode=typeof process!=="undefined"&&{}.toString.call(process)==="[object process]";var lib$es6$promise$asap$$isWorker=typeof Uint8ClampedArray!=="undefined"&&typeof importScripts!=="undefined"&&typeof MessageChannel!=="undefined";function lib$es6$promise$asap$$useNextTick(){return function(){process.nextTick(lib$es6$promise$asap$$flush)}}function lib$es6$promise$asap$$useVertxTimer(){return function(){lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush)}}function lib$es6$promise$asap$$useMutationObserver(){var iterations=0;var observer=new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);var node=document.createTextNode("");observer.observe(node,{characterData:true});return function(){node.data=iterations=++iterations%2}}function lib$es6$promise$asap$$useMessageChannel(){var channel=new MessageChannel;channel.port1.onmessage=lib$es6$promise$asap$$flush;return function(){channel.port2.postMessage(0)}}function lib$es6$promise$asap$$useSetTimeout(){return function(){setTimeout(lib$es6$promise$asap$$flush,1)}}var lib$es6$promise$asap$$queue=new Array(1e3);function lib$es6$promise$asap$$flush(){for(var i=0;i<lib$es6$promise$asap$$len;i+=2){var callback=lib$es6$promise$asap$$queue[i];var arg=lib$es6$promise$asap$$queue[i+1];callback(arg);lib$es6$promise$asap$$queue[i]=undefined;lib$es6$promise$asap$$queue[i+1]=undefined}lib$es6$promise$asap$$len=0}function lib$es6$promise$asap$$attemptVertx(){try{var r=require;var vertx=r("vertx");lib$es6$promise$asap$$vertxNext=vertx.runOnLoop||vertx.runOnContext;return lib$es6$promise$asap$$useVertxTimer()}catch(e){return lib$es6$promise$asap$$useSetTimeout()}}var lib$es6$promise$asap$$scheduleFlush;if(lib$es6$promise$asap$$isNode){lib$es6$promise$asap$$scheduleFlush=lib$es6$promise$asap$$useNextTick()}else if(lib$es6$promise$asap$$BrowserMutationObserver){lib$es6$promise$asap$$scheduleFlush=lib$es6$promise$asap$$useMutationObserver()}else if(lib$es6$promise$asap$$isWorker){lib$es6$promise$asap$$scheduleFlush=lib$es6$promise$asap$$useMessageChannel()}else if(lib$es6$promise$asap$$browserWindow===undefined&&typeof require==="function"){lib$es6$promise$asap$$scheduleFlush=lib$es6$promise$asap$$attemptVertx()}else{lib$es6$promise$asap$$scheduleFlush=lib$es6$promise$asap$$useSetTimeout()}function lib$es6$promise$$internal$$noop(){}var lib$es6$promise$$internal$$PENDING=void 0;var lib$es6$promise$$internal$$FULFILLED=1;var lib$es6$promise$$internal$$REJECTED=2;var lib$es6$promise$$internal$$GET_THEN_ERROR=new lib$es6$promise$$internal$$ErrorObject;function lib$es6$promise$$internal$$selfFulfillment(){return new TypeError("You cannot resolve a promise with itself")}function lib$es6$promise$$internal$$cannotReturnOwn(){return new TypeError("A promises callback cannot return that same promise.")}function lib$es6$promise$$internal$$getThen(promise){try{return promise.then}catch(error){lib$es6$promise$$internal$$GET_THEN_ERROR.error=error;return lib$es6$promise$$internal$$GET_THEN_ERROR}}function lib$es6$promise$$internal$$tryThen(then,value,fulfillmentHandler,rejectionHandler){try{then.call(value,fulfillmentHandler,rejectionHandler)}catch(e){return e}}function lib$es6$promise$$internal$$handleForeignThenable(promise,thenable,then){lib$es6$promise$asap$$asap(function(promise){var sealed=false;var error=lib$es6$promise$$internal$$tryThen(then,thenable,function(value){if(sealed){return}sealed=true;if(thenable!==value){lib$es6$promise$$internal$$resolve(promise,value)}else{lib$es6$promise$$internal$$fulfill(promise,value)}},function(reason){if(sealed){return}sealed=true;lib$es6$promise$$internal$$reject(promise,reason)},"Settle: "+(promise._label||" unknown promise"));if(!sealed&&error){sealed=true;lib$es6$promise$$internal$$reject(promise,error)}},promise)}function lib$es6$promise$$internal$$handleOwnThenable(promise,thenable){if(thenable._state===lib$es6$promise$$internal$$FULFILLED){lib$es6$promise$$internal$$fulfill(promise,thenable._result)}else if(thenable._state===lib$es6$promise$$internal$$REJECTED){lib$es6$promise$$internal$$reject(promise,thenable._result)}else{lib$es6$promise$$internal$$subscribe(thenable,undefined,function(value){lib$es6$promise$$internal$$resolve(promise,value)},function(reason){lib$es6$promise$$internal$$reject(promise,reason)})}}function lib$es6$promise$$internal$$handleMaybeThenable(promise,maybeThenable){if(maybeThenable.constructor===promise.constructor){lib$es6$promise$$internal$$handleOwnThenable(promise,maybeThenable)}else{var then=lib$es6$promise$$internal$$getThen(maybeThenable);if(then===lib$es6$promise$$internal$$GET_THEN_ERROR){lib$es6$promise$$internal$$reject(promise,lib$es6$promise$$internal$$GET_THEN_ERROR.error)}else if(then===undefined){lib$es6$promise$$internal$$fulfill(promise,maybeThenable)}else if(lib$es6$promise$utils$$isFunction(then)){lib$es6$promise$$internal$$handleForeignThenable(promise,maybeThenable,then)}else{lib$es6$promise$$internal$$fulfill(promise,maybeThenable)}}}function lib$es6$promise$$internal$$resolve(promise,value){if(promise===value){lib$es6$promise$$internal$$reject(promise,lib$es6$promise$$internal$$selfFulfillment())}else if(lib$es6$promise$utils$$objectOrFunction(value)){lib$es6$promise$$internal$$handleMaybeThenable(promise,value)}else{lib$es6$promise$$internal$$fulfill(promise,value)}}function lib$es6$promise$$internal$$publishRejection(promise){if(promise._onerror){promise._onerror(promise._result)}lib$es6$promise$$internal$$publish(promise)}function lib$es6$promise$$internal$$fulfill(promise,value){if(promise._state!==lib$es6$promise$$internal$$PENDING){return}promise._result=value;promise._state=lib$es6$promise$$internal$$FULFILLED;if(promise._subscribers.length!==0){lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish,promise)}}function lib$es6$promise$$internal$$reject(promise,reason){if(promise._state!==lib$es6$promise$$internal$$PENDING){return}promise._state=lib$es6$promise$$internal$$REJECTED;promise._result=reason;lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection,promise)}function lib$es6$promise$$internal$$subscribe(parent,child,onFulfillment,onRejection){var subscribers=parent._subscribers;var length=subscribers.length;parent._onerror=null;subscribers[length]=child;subscribers[length+lib$es6$promise$$internal$$FULFILLED]=onFulfillment;subscribers[length+lib$es6$promise$$internal$$REJECTED]=onRejection;if(length===0&&parent._state){lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish,parent)}}function lib$es6$promise$$internal$$publish(promise){var subscribers=promise._subscribers;var settled=promise._state;if(subscribers.length===0){return}var child,callback,detail=promise._result;for(var i=0;i<subscribers.length;i+=3){child=subscribers[i];callback=subscribers[i+settled];if(child){lib$es6$promise$$internal$$invokeCallback(settled,child,callback,detail)}else{callback(detail)}}promise._subscribers.length=0}function lib$es6$promise$$internal$$ErrorObject(){this.error=null}var lib$es6$promise$$internal$$TRY_CATCH_ERROR=new lib$es6$promise$$internal$$ErrorObject;function lib$es6$promise$$internal$$tryCatch(callback,detail){try{return callback(detail)}catch(e){lib$es6$promise$$internal$$TRY_CATCH_ERROR.error=e;return lib$es6$promise$$internal$$TRY_CATCH_ERROR}}function lib$es6$promise$$internal$$invokeCallback(settled,promise,callback,detail){var hasCallback=lib$es6$promise$utils$$isFunction(callback),value,error,succeeded,failed;if(hasCallback){value=lib$es6$promise$$internal$$tryCatch(callback,detail);if(value===lib$es6$promise$$internal$$TRY_CATCH_ERROR){failed=true;error=value.error;value=null}else{succeeded=true}if(promise===value){lib$es6$promise$$internal$$reject(promise,lib$es6$promise$$internal$$cannotReturnOwn());return}}else{value=detail;succeeded=true}if(promise._state!==lib$es6$promise$$internal$$PENDING){}else if(hasCallback&&succeeded){lib$es6$promise$$internal$$resolve(promise,value)}else if(failed){lib$es6$promise$$internal$$reject(promise,error)}else if(settled===lib$es6$promise$$internal$$FULFILLED){lib$es6$promise$$internal$$fulfill(promise,value)}else if(settled===lib$es6$promise$$internal$$REJECTED){lib$es6$promise$$internal$$reject(promise,value)}}function lib$es6$promise$$internal$$initializePromise(promise,resolver){try{resolver(function resolvePromise(value){lib$es6$promise$$internal$$resolve(promise,value)},function rejectPromise(reason){lib$es6$promise$$internal$$reject(promise,reason)})}catch(e){lib$es6$promise$$internal$$reject(promise,e)}}function lib$es6$promise$enumerator$$Enumerator(Constructor,input){var enumerator=this;enumerator._instanceConstructor=Constructor;enumerator.promise=new Constructor(lib$es6$promise$$internal$$noop);if(enumerator._validateInput(input)){enumerator._input=input;enumerator.length=input.length;enumerator._remaining=input.length;enumerator._init();if(enumerator.length===0){lib$es6$promise$$internal$$fulfill(enumerator.promise,enumerator._result)}else{enumerator.length=enumerator.length||0;enumerator._enumerate();if(enumerator._remaining===0){lib$es6$promise$$internal$$fulfill(enumerator.promise,enumerator._result)}}}else{lib$es6$promise$$internal$$reject(enumerator.promise,enumerator._validationError())}}lib$es6$promise$enumerator$$Enumerator.prototype._validateInput=function(input){return lib$es6$promise$utils$$isArray(input)};lib$es6$promise$enumerator$$Enumerator.prototype._validationError=function(){return new Error("Array Methods must be provided an Array")};lib$es6$promise$enumerator$$Enumerator.prototype._init=function(){this._result=new Array(this.length)};var lib$es6$promise$enumerator$$default=lib$es6$promise$enumerator$$Enumerator;lib$es6$promise$enumerator$$Enumerator.prototype._enumerate=function(){var enumerator=this;var length=enumerator.length;var promise=enumerator.promise;var input=enumerator._input;for(var i=0;promise._state===lib$es6$promise$$internal$$PENDING&&i<length;i++){enumerator._eachEntry(input[i],i)}};lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry=function(entry,i){var enumerator=this;var c=enumerator._instanceConstructor;if(lib$es6$promise$utils$$isMaybeThenable(entry)){if(entry.constructor===c&&entry._state!==lib$es6$promise$$internal$$PENDING){entry._onerror=null;enumerator._settledAt(entry._state,i,entry._result)}else{enumerator._willSettleAt(c.resolve(entry),i)}}else{enumerator._remaining--;enumerator._result[i]=entry}};lib$es6$promise$enumerator$$Enumerator.prototype._settledAt=function(state,i,value){var enumerator=this;var promise=enumerator.promise;if(promise._state===lib$es6$promise$$internal$$PENDING){enumerator._remaining--;if(state===lib$es6$promise$$internal$$REJECTED){lib$es6$promise$$internal$$reject(promise,value)}else{enumerator._result[i]=value}}if(enumerator._remaining===0){lib$es6$promise$$internal$$fulfill(promise,enumerator._result)}};lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt=function(promise,i){var enumerator=this;lib$es6$promise$$internal$$subscribe(promise,undefined,function(value){enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED,i,value)},function(reason){enumerator._settledAt(lib$es6$promise$$internal$$REJECTED,i,reason)})};function lib$es6$promise$promise$all$$all(entries){return new lib$es6$promise$enumerator$$default(this,entries).promise}var lib$es6$promise$promise$all$$default=lib$es6$promise$promise$all$$all;function lib$es6$promise$promise$race$$race(entries){var Constructor=this;var promise=new Constructor(lib$es6$promise$$internal$$noop);if(!lib$es6$promise$utils$$isArray(entries)){lib$es6$promise$$internal$$reject(promise,new TypeError("You must pass an array to race."));return promise}var length=entries.length;function onFulfillment(value){lib$es6$promise$$internal$$resolve(promise,value)}function onRejection(reason){lib$es6$promise$$internal$$reject(promise,reason)}for(var i=0;promise._state===lib$es6$promise$$internal$$PENDING&&i<length;i++){lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]),undefined,onFulfillment,onRejection)}return promise}var lib$es6$promise$promise$race$$default=lib$es6$promise$promise$race$$race;function lib$es6$promise$promise$resolve$$resolve(object){var Constructor=this;if(object&&typeof object==="object"&&object.constructor===Constructor){return object}var promise=new Constructor(lib$es6$promise$$internal$$noop);lib$es6$promise$$internal$$resolve(promise,object);return promise}var lib$es6$promise$promise$resolve$$default=lib$es6$promise$promise$resolve$$resolve;function lib$es6$promise$promise$reject$$reject(reason){var Constructor=this;var promise=new Constructor(lib$es6$promise$$internal$$noop);lib$es6$promise$$internal$$reject(promise,reason);return promise}var lib$es6$promise$promise$reject$$default=lib$es6$promise$promise$reject$$reject;var lib$es6$promise$promise$$counter=0;function lib$es6$promise$promise$$needsResolver(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function lib$es6$promise$promise$$needsNew(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}var lib$es6$promise$promise$$default=lib$es6$promise$promise$$Promise;function lib$es6$promise$promise$$Promise(resolver){this._id=lib$es6$promise$promise$$counter++;this._state=undefined;this._result=undefined;this._subscribers=[];if(lib$es6$promise$$internal$$noop!==resolver){if(!lib$es6$promise$utils$$isFunction(resolver)){lib$es6$promise$promise$$needsResolver()}if(!(this instanceof lib$es6$promise$promise$$Promise)){lib$es6$promise$promise$$needsNew()}lib$es6$promise$$internal$$initializePromise(this,resolver)}}lib$es6$promise$promise$$Promise.all=lib$es6$promise$promise$all$$default;lib$es6$promise$promise$$Promise.race=lib$es6$promise$promise$race$$default;lib$es6$promise$promise$$Promise.resolve=lib$es6$promise$promise$resolve$$default;lib$es6$promise$promise$$Promise.reject=lib$es6$promise$promise$reject$$default;lib$es6$promise$promise$$Promise._setScheduler=lib$es6$promise$asap$$setScheduler;lib$es6$promise$promise$$Promise._setAsap=lib$es6$promise$asap$$setAsap;lib$es6$promise$promise$$Promise._asap=lib$es6$promise$asap$$asap;lib$es6$promise$promise$$Promise.prototype={constructor:lib$es6$promise$promise$$Promise,then:function(onFulfillment,onRejection){var parent=this;var state=parent._state;if(state===lib$es6$promise$$internal$$FULFILLED&&!onFulfillment||state===lib$es6$promise$$internal$$REJECTED&&!onRejection){return this}var child=new this.constructor(lib$es6$promise$$internal$$noop);var result=parent._result;if(state){var callback=arguments[state-1];lib$es6$promise$asap$$asap(function(){lib$es6$promise$$internal$$invokeCallback(state,child,callback,result)})}else{lib$es6$promise$$internal$$subscribe(parent,child,onFulfillment,onRejection)}return child},"catch":function(onRejection){return this.then(null,onRejection)}};function lib$es6$promise$polyfill$$polyfill(){var local;if(typeof global!=="undefined"){local=global}else if(typeof self!=="undefined"){local=self}else{try{local=Function("return this")()}catch(e){throw new Error("polyfill failed because global object is unavailable in this environment")}}var P=local.Promise;if(P&&Object.prototype.toString.call(P.resolve())==="[object Promise]"&&!P.cast){return}local.Promise=lib$es6$promise$promise$$default}var lib$es6$promise$polyfill$$default=lib$es6$promise$polyfill$$polyfill;var lib$es6$promise$umd$$ES6Promise={Promise:lib$es6$promise$promise$$default,polyfill:lib$es6$promise$polyfill$$default};if(typeof define==="function"&&define["amd"]){define(function(){return lib$es6$promise$umd$$ES6Promise})}else if(typeof module!=="undefined"&&module["exports"]){module["exports"]=lib$es6$promise$umd$$ES6Promise}else if(typeof this!=="undefined"){this["ES6Promise"]=lib$es6$promise$umd$$ES6Promise}lib$es6$promise$polyfill$$default()}).call(this);

    /*!
     * EventEmitter v4.2.11 - git.io/ee
     * Unlicense - http://unlicense.org/
     * Oliver Caldwell - http://oli.me.uk/
     * @preserve
     */
    (function(){"use strict";function t(){}function i(t,n){for(var e=t.length;e--;)if(t[e].listener===n)return e;return-1}function n(e){return function(){return this[e].apply(this,arguments)}}var e=t.prototype,r=this,s=r.EventEmitter;e.getListeners=function(n){var r,e,t=this._getEvents();if(n instanceof RegExp){r={};for(e in t)t.hasOwnProperty(e)&&n.test(e)&&(r[e]=t[e])}else r=t[n]||(t[n]=[]);return r},e.flattenListeners=function(t){var e,n=[];for(e=0;e<t.length;e+=1)n.push(t[e].listener);return n},e.getListenersAsObject=function(n){var e,t=this.getListeners(n);return t instanceof Array&&(e={},e[n]=t),e||t},e.addListener=function(r,e){var t,n=this.getListenersAsObject(r),s="object"==typeof e;for(t in n)n.hasOwnProperty(t)&&-1===i(n[t],e)&&n[t].push(s?e:{listener:e,once:!1});return this},e.on=n("addListener"),e.addOnceListener=function(e,t){return this.addListener(e,{listener:t,once:!0})},e.once=n("addOnceListener"),e.defineEvent=function(e){return this.getListeners(e),this},e.defineEvents=function(t){for(var e=0;e<t.length;e+=1)this.defineEvent(t[e]);return this},e.removeListener=function(r,s){var n,e,t=this.getListenersAsObject(r);for(e in t)t.hasOwnProperty(e)&&(n=i(t[e],s),-1!==n&&t[e].splice(n,1));return this},e.off=n("removeListener"),e.addListeners=function(e,t){return this.manipulateListeners(!1,e,t)},e.removeListeners=function(e,t){return this.manipulateListeners(!0,e,t)},e.manipulateListeners=function(r,t,i){var e,n,s=r?this.removeListener:this.addListener,o=r?this.removeListeners:this.addListeners;if("object"!=typeof t||t instanceof RegExp)for(e=i.length;e--;)s.call(this,t,i[e]);else for(e in t)t.hasOwnProperty(e)&&(n=t[e])&&("function"==typeof n?s.call(this,e,n):o.call(this,e,n));return this},e.removeEvent=function(e){var t,r=typeof e,n=this._getEvents();if("string"===r)delete n[e];else if(e instanceof RegExp)for(t in n)n.hasOwnProperty(t)&&e.test(t)&&delete n[t];else delete this._events;return this},e.removeAllListeners=n("removeEvent"),e.emitEvent=function(t,u){var n,e,r,i,o,s=this.getListenersAsObject(t);for(i in s)if(s.hasOwnProperty(i))for(n=s[i].slice(0),r=n.length;r--;)e=n[r],e.once===!0&&this.removeListener(t,e.listener),o=e.listener.apply(this,u||[]),o===this._getOnceReturnValue()&&this.removeListener(t,e.listener);return this},e.trigger=n("emitEvent"),e.emit=function(e){var t=Array.prototype.slice.call(arguments,1);return this.emitEvent(e,t)},e.setOnceReturnValue=function(e){return this._onceReturnValue=e,this},e._getOnceReturnValue=function(){return this.hasOwnProperty("_onceReturnValue")?this._onceReturnValue:!0},e._getEvents=function(){return this._events||(this._events={})},t.noConflict=function(){return r.EventEmitter=s,t},"function"==typeof define&&define.amd?define(function(){return t}):"object"==typeof module&&module.exports?module.exports=t:r.EventEmitter=t}).call(this);

    /**
     * Oliver Caldwell
     * http://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/
     */
    if (!Object.create) {
        Object.create = (function(){
            function F(){}
            return function(o){
                if (arguments.length != 1) {
                    throw new Error('Object.create implementation only accepts one parameter.');
                }
                F.prototype = o;
                return new F()
            }
        })()
    }

    function extend(destination, source) {
        destination.prototype = Object.create(source.prototype);
        destination.prototype.constructor = destination;
        return source.prototype;
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf=function(r){if(null==this)throw new TypeError;var t,e,n=Object(this),a=n.length>>>0;if(0===a)return-1;if(t=0,arguments.length>1&&(t=Number(arguments[1]),t!=t?t=0:0!=t&&1/0!=t&&t!=-1/0&&(t=(t>0||-1)*Math.floor(Math.abs(t)))),t>=a)return-1;for(e=t>=0?t:Math.max(a-Math.abs(t),0);a>e;e++)if(e in n&&n[e]===r)return e;return-1};
    }

    function fieldValue(object, name) {
        try {return object[name];} catch (x) {return undefined;}
    }

    /**
     * Mixes in the given objects into the target object by copying the properties.
     * @param deep if the copy must be deep
     * @param target the target object
     * @param objects the objects whose properties are copied into the target
     */
    function mixin(deep, target, objects) {
        var result = target || {};
        for (var i = 2; i < arguments.length; ++i) { // Skip first 2 parameters (deep and target), and loop over the others
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
        if (value.substring(value.length - 1) == "/") {
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
        if (window.console) {
            var logger = window.console[level];
            if (isFunction(logger)) {
                logger.apply(window.console, args);
            }
        }
    }

    function backoff(step, min, max) {
        var jitter = 0.5 * Math.random();
        var interval = min * Math.pow(2, step+1);
        if (interval > max) {
            interval = max
        }
        return Math.floor((1-jitter) * interval);
    }

    function errorExists(data) {
        return "error" in data && data.error !== null && data.error !== "";
    }

    function Centrifuge(options) {
        this._sockjs = false;
        this._sockjsVersion = null;
        this._status = 'disconnected';
        this._reconnect = true;
        this._transport = null;
        this._latency = null;
        this._latencyStart = null;
        this._messageId = 0;
        this._clientID = null;
        this._subs = {};
        this._lastMessageID = {};
        this._messages = [];
        this._isBatching = false;
        this._isAuthBatching = false;
        this._authChannels = {};
        this._refreshTimeout = null;
        this._retries = 0;
        this._callbacks = {};
        this._config = {
            retry: 1000,
            maxRetry: 20000,
            info: "",
            resubscribe: true,
            debug: false,
            insecure: false,
            server: null,
            privateChannelPrefix: "$",
            protocols_whitelist: [
                'websocket',
                'xdr-streaming',
                'xhr-streaming',
                'iframe-eventsource',
                'iframe-htmlfile',
                'xdr-polling',
                'xhr-polling',
                'iframe-xhr-polling',
                'jsonp-polling'
            ],
            transports: [
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
            refreshEndpoint: "/centrifuge/refresh",
            refreshHeaders: {},
            refreshParams: {},
            refreshTransport: "ajax",
            authEndpoint: "/centrifuge/auth",
            authHeaders: {},
            authParams: {},
            authTransport: "ajax"
        };
        if (options) {
            this.configure(options);
        }
    }

    extend(Centrifuge, EventEmitter);

    Centrifuge._authCallbacks = {};
    Centrifuge._nextAuthCallbackID = 1;

    var centrifugeProto = Centrifuge.prototype;

    centrifugeProto._jsonp = function (url, params, headers, data, callback) {
        if (headers.length > 0) {
            this._log("Only AJAX request allows to send custom headers, it's not possible with JSONP.");
        }
        self._debug("sending JSONP request to", url);

        var callbackName = Centrifuge._nextAuthCallbackID.toString();
        Centrifuge._nextAuthCallbackID++;

        var document = window.document;
        var script = document.createElement("script");
        Centrifuge._authCallbacks[callbackName] = function (data) {
            callback(false, data);
            delete Centrifuge[callbackName];
        };

        var query = "";
        for (var i in params) {
            if (query.length > 0) {
                query += "&";
            }
            query += encodeURIComponent(i) + "=" + encodeURIComponent(params[i]);
        }

        var callback_name = "Centrifuge._authCallbacks['" + callbackName + "']";
        script.src = this._config.authEndpoint +
            '?callback=' + encodeURIComponent(callback_name) +
            '&data=' + encodeURIComponent(JSON.stringify(data)) +
            '&' + query;

        var head = document.getElementsByTagName("head")[0] || document.documentElement;
        head.insertBefore(script, head.firstChild);
    };

    centrifugeProto._ajax = function (url, params, headers, data, callback) {
        var self = this;
        self._debug("sending AJAX request to", url);

        var xhr = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));

        var query = "";
        for (var i in params) {
            if (query.length > 0) {
                query += "&";
            }
            query += encodeURIComponent(i) + "=" + encodeURIComponent(params[i]);
        }
        if (query.length > 0) {
            query = "?" + query;
        }
        xhr.open("POST", url + query, true);

        // add request headers
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("Content-Type", "application/json");
        for (var headerName in headers) {
            xhr.setRequestHeader(headerName, headers[headerName]);
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var data, parsed = false;

                    try {
                        data = JSON.parse(xhr.responseText);
                        parsed = true;
                    } catch (e) {
                        callback(true, 'JSON returned from webapp was invalid, yet status code was 200. Data was: ' + xhr.responseText);
                    }

                    if (parsed) { // prevents double execution.
                        callback(false, data);
                    }
                } else {
                    self._log("Couldn't get auth info from your webapp", xhr.status);
                    callback(true, xhr.status);
                }
            }
        };

        setTimeout(function() {
            // method == 'get' ? self.xhr.send() : self.xhr.send(JSON.stringify(ops.data));
            xhr.send(JSON.stringify(data));
        }, 20);
        return xhr;
    };

    centrifugeProto._log = function () {
        log("info", arguments);
    };

    centrifugeProto._debug = function () {
        if (this._config.debug === true) {
            log("debug", arguments);
        }
    };

    centrifugeProto._configure = function (configuration) {
        this._debug('Configuring centrifuge object with', configuration);

        if (!configuration) {
            configuration = {};
        }

        this._config = mixin(false, this._config, configuration);

        if (!this._config.url) {
            throw 'Missing required configuration parameter \'url\' specifying server URL';
        }

        if (!this._config.user && this._config.user !== '') {
            if (!this._config.insecure) {
                throw 'Missing required configuration parameter \'user\' specifying user\'s unique ID in your application';
            } else {
                this._debug("user not found but this is OK for insecure mode - anonymous access will be used");
                this._config.user = "";
            }
        }

        if (!this._config.timestamp) {
            if (!this._config.insecure) {
                throw 'Missing required configuration parameter \'timestamp\'';
            } else {
                this._debug("token not found but this is OK for insecure mode");
            }
        }

        if (!this._config.token) {
            if (!this._config.insecure) {
                throw 'Missing required configuration parameter \'token\' specifying the sign of authorization request';
            } else {
                this._debug("timestamp not found but this is OK for insecure mode");
            }
        }

        this._config.url = stripSlash(this._config.url);

        if (endsWith(this._config.url, 'connection')) {
            this._debug("client will connect to SockJS endpoint");
            if (typeof SockJS === 'undefined') {
                throw 'include SockJS client library before Centrifuge javascript client library or use raw Websocket connection endpoint';
            }
            this._sockjs = true;
            this._sockjsVersion = SockJS.version;
        } else if (endsWith(this._config.url, 'connection/websocket')) {
            this._debug("client will connect to raw Websocket endpoint");
            this._config.url = this._config.url.replace("http://", "ws://");
            this._config.url = this._config.url.replace("https://", "wss://");
        } else {
            this._debug("client will detect connection endpoint itself");
            if (typeof SockJS === 'undefined') {
                this._debug("no SockJS found, client will connect to raw Websocket endpoint");
                this._config.url += "/connection/websocket";
                this._config.url = this._config.url.replace("http://", "ws://");
                this._config.url = this._config.url.replace("https://", "wss://");
            } else {
                this._debug("SockJS found, client will connect to SockJS endpoint");
                this._config.url += "/connection";
                this._sockjs = true;
                this._sockjsVersion = SockJS.version;
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
        return this._isConnected() === false;
    };

    centrifugeProto._isConnected = function () {
        return this._status === 'connected';
    };

    centrifugeProto._nextMessageId = function () {
        return ++this._messageId;
    };

    centrifugeProto._resetRetry = function() {
        this._debug("reset retries count to 0");
        this._retries = 0;
    };

    centrifugeProto._getRetryInterval = function() {
        var interval = backoff(this._retries, this._config.retry, this._config.maxRetry);
        this._retries += 1;
        return interval;
    };

    centrifugeProto._clearConnectedState = function () {
        this._fireUnsubscribeEvents();
        if (!this._config.resubscribe) {
            // completely clear connected state
            this._subs = {};
        }
    };

    centrifugeProto._send = function (messages) {
        if (messages.length === 0) {
            return;
        }
        this._debug('Send', messages);
        this._transport.send(JSON.stringify(messages));
    };

    centrifugeProto._connect = function (callback) {

        if (this.isConnected()) {
            this._debug("connect called when already connected");
            return;
        }

        this._setStatus('connecting');
        this._clientID = null;
        this._reconnect = true;

        var self = this;

        if (callback) {
            this.on('connect', callback);
        }

        // detect transport to use - SockJS or raw Websocket
        if (this._sockjs === true) {
            //noinspection JSUnresolvedFunction
            var sockjsOptions = {};
            if (startsWith(this._sockjsVersion, "1.")) {
                sockjsOptions["transports"] = this._config.transports;
            } else {
                this._log("SockJS <= 0.3.4 is deprecated, use SockJS >= 1.0.0 instead");
                sockjsOptions["protocols_whitelist"] = this._config.protocols_whitelist;
            }
            if (this._config.server !== null) {
                sockjsOptions['server'] = this._config.server;
            }
            this._transport = new SockJS(this._config.url, null, sockjsOptions);
        } else {
            this._transport = new WebSocket(this._config.url);
        }

        this._transport.onopen = function () {

            self._resetRetry();

            if (!isString(self._config.user)) {
                self._log("user expected to be string");
            }
            if (!isString(self._config.info)) {
                self._log("info expected to be string");
            }

            var msg = {
                'method': 'connect',
                'params': {
                    'user': self._config.user,
                    'info': self._config.info
                }
            };

            if (!self._config.insecure) {
                // in insecure client mode we don't need timestamp and token.
                msg["params"]["timestamp"] = self._config.timestamp;
                msg["params"]["token"] = self._config.token;
                if (!isString(self._config.timestamp)) {
                    self._log("timestamp expected to be string");
                }
                if (!isString(self._config.token)) {
                    self._log("token expected to be string");
                }
            }
            self._addMessage(msg);
            self._latencyStart = new Date();
        };

        this._transport.onerror = function (error) {
            self._debug("transport level error", error);
        };

        this._transport.onclose = function () {
            self._setStatus('disconnected');
            self._clearConnectedState();
            self.trigger('disconnect');
            if (self._reconnect === true) {
                var interval = self._getRetryInterval();
                self._debug("reconnect after " + interval + " milliseconds");
                window.setTimeout(function () {
                    if (self._reconnect === true) {
                        self._connect.call(self);
                    }
                }, interval);
            }
        };

        this._transport.onmessage = function (event) {
            var data;
            data = JSON.parse(event.data);
            self._debug('Received', data);
            self._receive(data);
        };
    };

    centrifugeProto._fireUnsubscribeEvents = function() {
        for (var channel in this._subs) {
            var sub = this._subs[channel];
            if (sub._isSuccess()) {
                sub._setUnsubscribed();
            }
        }
    };

    centrifugeProto._disconnect = function (shouldReconnect) {
        var reconnect = shouldReconnect || false;
        this._clearConnectedState();
        this._clientID = null;
        this._setStatus('disconnected');
        if (reconnect === false) {
            this._subs = {};
            this._reconnect = false;
        }
        this._transport.close();
    };

    centrifugeProto._refresh = function () {
        // ask web app for connection parameters - user ID,
        // timestamp, info and token
        var self = this;
        this._debug('refresh credentials');

        var cb = function(error, data) {
            if (error === true) {
                // 403 or 500 - does not matter - if connection check activated then Centrifugo
                // will disconnect client eventually
                self._debug("error getting connect parameters", data);
                if (self._refreshTimeout) {
                    window.clearTimeout(self._refreshTimeout);
                }
                self._refreshTimeout = window.setTimeout(function(){
                    self._refresh.call(self);
                }, 3000);
                return;
            }
            self._config.user = data.user;
            self._config.timestamp = data.timestamp;
            self._config.info = data.info;
            self._config.token = data.token;
            if (self.isDisconnected()) {
                self._debug("credentials refreshed, connect from scratch");
                self._connect();
            } else {
                self._debug("send refreshed credentials");
                var msg = {
                    "method": "refresh",
                    "params": {
                        'user': self._config.user,
                        'timestamp': self._config.timestamp,
                        'info': self._config.info,
                        'token': self._config.token
                    }
                };
                self._addMessage(msg);
            }
        };

        var transport = this._config.refreshTransport.toLowerCase();
        if (transport === "ajax") {
            this._ajax(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, {}, cb);
        } else if (transport === "jsonp") {
            this._jsonp(this._config.refreshEndpoint, this._config.refreshParams, this._config.refreshHeaders, {}, cb);
        } else {
            throw 'Unknown refresh transport ' + transport;
        }
    };

    centrifugeProto._subscribe = function(sub) {

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
            "method": "subscribe",
            "params": {
                "channel": channel
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
                msg["params"]["recover"] = true;
                msg["params"]["last"] = this._getLastID(channel);
            }
            this._addMessage(msg);
        }
    };

    centrifugeProto._unsubscribe = function(sub) {

        var channel = sub.channel;

        if (this.isConnected()) {
            // No need to unsubscribe in disconnected state - i.e. client already unsubscribed.
            var msg = {
                "method": "unsubscribe",
                "params": {
                    "channel": channel
                }
            };
            this._addMessage(msg);
        }
    };

    centrifugeProto._getSub = function(channel) {
        var sub = this._subs[channel];
        if (!sub) {
            return null;
        }
        return sub;
    };

    centrifugeProto._addSub = function (sub) {

        this._subscribe(sub);
    };

    centrifugeProto._removeSub = function (sub) {
        if (channel in this._subs) {
            delete this._subs[channel];
        }
        this._unsubscribe(sub);
    };

    centrifugeProto._connectResponse = function (message) {

        if (this.isConnected()) {
            return;
        }

        if (this._latencyStart !== null) {
            var latencyEnd = new Date();
            this._latency = latencyEnd.getTime() - this._latencyStart.getTime();
            this._latencyStart = null;
        }

        if (!errorExists(message)) {
            if (!message.body) {
                return;
            }
            if (message.body.expires) {
                var isExpired = message.body.expired;
                if (isExpired) {
                    this._refresh();
                    return;
                }
            }
            this._clientID = message.body.client;
            this._setStatus('connected');
            this.trigger('connect', [message.body]);
            if (this._refreshTimeout) {
                window.clearTimeout(this._refreshTimeout);
            }
            if (message.body.expires) {
                var self = this;
                this._refreshTimeout = window.setTimeout(function() {
                    self._refresh.call(self);
                }, message.body.ttl * 1000);
            }
        } else {
            this.trigger('error', [message]);
            this.trigger('connect:error', [this._createErrorObject(message.error)]);
        }

        if (this._config.resubscribe) {
            this.startBatching();
            this.startAuthBatching();
            for (var channel in this._subs) {
                var sub = this._subs[channel];
                this._subscribe(sub);
            }
            this.stopAuthBatching();
            this.stopBatching(true);
        }

    };

    centrifugeProto._disconnectResponse = function (message) {
        if (!errorExists(message)) {
            var shouldReconnect = false;
            if ("reconnect" in message.body) {
                shouldReconnect = message.body["reconnect"];
            }
            var reason = "";
            if ("reason" in message.body) {
                reason = message.body["reason"];
            }
            if (reason.length > 0) {
                this._debug("disconnected:", reason);
            }
            this.disconnect(shouldReconnect);
        } else {
            this.trigger('error', [message]);
        }
    };

    centrifugeProto._subscribeResponse = function (message) {
        var body = message.body;
        if (body === null) {
            return;
        }
        var channel = body.channel;

        var sub = this._getSub(channel);
        if (!sub) {
            return;
        }

        if (!sub._isSubscribing()) {
            return;
        }

        if (!errorExists(message)) {
            sub._setSubscribeSuccess();
            var messages = body["messages"];
            if (messages && messages.length > 0) {
                // handle missed messages
                for (var i in messages.reverse()) {
                    this._messageResponse({body: messages[i]});
                }
            } else {
                if ("last" in body) {
                    // no missed messages found so set last message id from body.
                    this._lastMessageID[channel] = body["last"];
                }
            }
        } else {
            this.trigger('error', [message]);
            sub._setSubscribeError(this._createErrorObject(message.error));
        }
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
            this.trigger('error', [message]);
        }
    };

    centrifugeProto._publishResponse = function (message) {
        var uid = message.uid;
        var body = message.body;
        if (!(uid in this._callbacks)) {
            return;
        }
        var callbacks = this._callbacks[uid];
        delete this._callbacks[uid];
        if (!errorExists(message)) {
            var callback = callbacks["callback"];
            if (!callback) {
                return;
            }
            callback(body);
        } else {
            var errback = callbacks["errback"];
            if (!errback) {
                return;
            }
            errback(this._createErrorObject(message.error));
            this.trigger('error', [message]);
        }
    };

    centrifugeProto._presenceResponse = function (message) {
        var uid = message.uid;
        var body = message.body;
        if (!(uid in this._callbacks)) {
            return;
        }
        var callbacks = this._callbacks[uid];
        delete this._callbacks[uid];
        if (!errorExists(message)) {
            var callback = callbacks["callback"];
            if (!callback) {
                return;
            }
            callback(body);
        } else {
            var errback = callbacks["errback"];
            if (!errback) {
                return;
            }
            errback(this._createErrorObject(message.error));
            this.trigger('error', [message]);
        }
    };

    centrifugeProto._historyResponse = function (message) {
        var uid = message.uid;
        var body = message.body;
        if (!(uid in this._callbacks)) {
            return;
        }
        var callbacks = this._callbacks[uid];
        delete this._callbacks[uid];
        if (!errorExists(message)) {
            var callback = callbacks["callback"];
            if (!callback) {
                return;
            }
            callback(body);
        } else {
            var errback = callbacks["errback"];
            if (!errback) {
                return;
            }
            errback(this._createErrorObject(message.error));
            this.trigger('error', [message]);
        }
    };

    centrifugeProto._joinResponse = function(message) {
        var body = message.body;
        var channel = body.channel;

        var sub = this._getSub(channel);
        if (!sub) {
            return;
        }
        sub.trigger('join', [body]);
    };

    centrifugeProto._leaveResponse = function(message) {
        var body = message.body;
        var channel = body.channel;

        var sub = this._getSub(channel);
        if (!sub) {
            return;
        }
        sub.trigger('leave', [body]);
    };

    centrifugeProto._messageResponse = function (message) {
        var body = message.body;
        var channel = body.channel;

        // keep last uid received from channel.
        this._lastMessageID[channel] = body["uid"];

        var sub = this._getSub(channel);
        if (!sub) {
            return;
        }
        sub.trigger('message', [body]);
    };

    centrifugeProto._refreshResponse = function (message) {
        if (this._refreshTimeout) {
            window.clearTimeout(this._refreshTimeout);
        }
        if (message.body.expires) {
            var self = this;
            var isExpired = message.body.expired;
            if (isExpired) {
                self._refreshTimeout = window.setTimeout(function(){
                    self._refresh.call(self);
                }, 3000 + Math.round(Math.random() * 1000));
                return;
            }
            this._clientID = message.body.client;
            self._refreshTimeout = window.setTimeout(function () {
                self._refresh.call(self);
            }, message.body.ttl * 1000);
        }
    };

    centrifugeProto._dispatchMessage = function(message) {
        if (message === undefined || message === null) {
            this._debug("dispatch: got undefined or null message");
            return;
        }

        var method = message.method;

        if (!method) {
            this._debug("dispatch: got message with empty method");
            return;
        }

        switch (method) {
            case 'connect':
                this._connectResponse(message);
                break;
            case 'disconnect':
                this._disconnectResponse(message);
                break;
            case 'subscribe':
                this._subscribeResponse(message);
                break;
            case 'unsubscribe':
                this._unsubscribeResponse(message);
                break;
            case 'publish':
                this._publishResponse(message);
                break;
            case 'presence':
                this._presenceResponse(message);
                break;
            case 'history':
                this._historyResponse(message);
                break;
            case 'join':
                this._joinResponse(message);
                break;
            case 'leave':
                this._leaveResponse(message);
                break;
            case 'ping':
                break;
            case 'refresh':
                this._refreshResponse(message);
                break;
            case 'message':
                this._messageResponse(message);
                break;
            default:
                this._debug("dispatch: got message with unknown method" + method);
                break;
        }
    };

    centrifugeProto._receive = function (data) {
        if (Object.prototype.toString.call(data) === Object.prototype.toString.call([])) {
            // array of responses received
            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    var msg = data[i];
                    this._dispatchMessage(msg);
                }
            }
        } else if (Object.prototype.toString.call(data) === Object.prototype.toString.call({})) {
            // one response received
            this._dispatchMessage(data);
        }
    };

    centrifugeProto._flush = function() {
        var messages = this._messages.slice(0);
        this._messages = [];
        this._send(messages);
    };

    centrifugeProto._ping = function () {
        var msg = {
            "method": "ping",
            "params": {}
        };
        this._addMessage(msg);
    };

    centrifugeProto._recover = function(channel) {
        return channel in this._lastMessageID;
    };

    centrifugeProto._getLastID = function(channel) {
        var lastUID = this._lastMessageID[channel];
        if (lastUID) {
            this._debug("last uid found and sent for channel", channel);
            return lastUID;
        } else {
            this._debug("no last uid found for channel", channel);
            return "";
        }
    };

    centrifugeProto._createErrorObject = function(text) {
        return {
            "error": text
        };
    };

    centrifugeProto._registerCall = function(uid, callback, errback) {
        var self = this;
        this._callbacks[uid] = {
            "callback": callback,
            "errback": errback
        };
        setTimeout(function() {
            delete self._callbacks[uid];
            if (isFunction(errback)) {
                errback(self._createErrorObject("timeout"));
            }
        }, 5000);
    };

    centrifugeProto._addMessage = function (message) {
        var uid = '' + this._nextMessageId();
        message.uid = uid;
        if (this._isBatching === true) {
            this._messages.push(message);
        } else {
            this._send([message]);
        }
        return uid;
    };

    centrifugeProto.getClientId = function () {
        return this._clientID;
    };

    centrifugeProto.isConnected = centrifugeProto._isConnected;

    centrifugeProto.isDisconnected = centrifugeProto._isDisconnected;

    centrifugeProto.configure = function (configuration) {
        this._configure.call(this, configuration);
    };

    centrifugeProto.connect = centrifugeProto._connect;

    centrifugeProto.disconnect = centrifugeProto._disconnect;

    centrifugeProto.ping = centrifugeProto._ping;

    centrifugeProto.startBatching = function () {
        // start collecting messages without sending them to Centrifuge until flush
        // method called
        this._isBatching = true;
    };

    centrifugeProto.stopBatching = function(flush) {
        // stop collecting messages
        flush = flush || false;
        this._isBatching = false;
        if (flush === true) {
            this.flush();
        }
    };

    centrifugeProto.flush = function() {
        // send batched messages to Centrifuge
        this._flush();
    };

    centrifugeProto.startAuthBatching = function() {
        // start collecting private channels to create bulk authentication
        // request to authEndpoint when stopAuthBatching will be called
        this._isAuthBatching = true;
    };

    centrifugeProto.stopAuthBatching = function(callback) {
        // create request to authEndpoint with collected private channels
        // to ask if this client can subscribe on each channel
        this._isAuthBatching = false;
        var authChannels = this._authChannels;
        this._authChannels = {};
        var channels = [];

        for (var channel in authChannels) {
            var sub = this._getSub(channel);
            if (!sub) {
                continue;
            }
            channels.push(channel);
        }

        if (channels.length == 0) {
            if (callback) {
                callback();
            }
            return;
        }

        var data = {
            "client": this.getClientId(),
            "channels": channels
        };

        var self = this;

        var cb = function(error, data) {
            if (error === true) {
                self._debug("authorization request failed");
                for (var i in channels) {
                    var channel = channels[i];
                    self._subscribeResponse({
                        "error": "authorization request failed",
                        "body": {
                            "channel": channel
                        }
                    });
                }
                if (callback) {
                    callback();
                }
                return;
            }
            for (var i in channels) {
                var channel = channels[i];
                var channelResponse = data[channel];
                if (!channelResponse) {
                    // subscription:error
                    self._subscribeResponse({
                        "error": 404,
                        "body": {
                            "channel": channel
                        }
                    });
                    continue;
                }
                if (!channelResponse.status || channelResponse.status === 200) {
                    var msg = {
                        "method": "subscribe",
                        "params": {
                            "channel": channel,
                            "client": self.getClientId(),
                            "info": channelResponse.info,
                            "sign": channelResponse.sign
                        }
                    };
                    var recover = self._recover(channel);
                    if (recover === true) {
                        msg["params"]["recover"] = true;
                        msg["params"]["last"] = self._getLastID(channel);
                    }
                    self._addMessage(msg);
                } else {
                    self._subscribeResponse({
                        "error": channelResponse.status,
                        "body": {
                            "channel": channel
                        }
                    });
                }
            }
            if (callback) {
                callback();
            }
        };

        var transport = this._config.authTransport.toLowerCase();
        if (transport === "ajax") {
            this._ajax(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else if (transport === "jsonp") {
            this._jsonp(this._config.authEndpoint, this._config.authParams, this._config.authHeaders, data, cb);
        } else {
            throw 'Unknown auth transport ' + transport;
        }
    };

    centrifugeProto.subscribe = function (channel, events) {
        if (arguments.length < 1) {
            throw 'Illegal arguments number: required 1, got ' + arguments.length;
        }
        if (!isString(channel)) {
            throw 'Illegal argument type: channel must be a string';
        }
        if (!this._config.resubscribe && this.isDisconnected()) {
            throw 'Can not subscribe in disconnected state when resubscribe option is off';
        }

        var currentSub = this._getSub(channel);

        if (currentSub !== null) {
            currentSub._setEvents(events);
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

        this._ready = false;
        var self = this;
        this.promise = new Promise(function(resolve, reject) {
            self._resolve = function(value) {
                self._ready = true;
                resolve(value);
            };
            self._reject = function(err) {
                self._ready = true;
                reject(err);
            };
        });
    }

    extend(Sub, EventEmitter);

    var subProto = Sub.prototype;

    subProto._setEvents = function(events) {
        if (isFunction(events)) {
            this.on("message", events);
        } else if (Object.prototype.toString.call(events) === Object.prototype.toString.call({})) {
            var knownEvents = [
                "message", "join", "leave",
                "subscribe", "resubscribe", "unsubscribe",
                "error", "subscribe:error", "resubscribe:error"
            ];
            for (var i in knownEvents) {
                var ev = knownEvents[i];
                if (ev in events) {
                    this.on(ev, events[ev]);
                }
            }
        }
    };

    subProto._isNew = function() {
        return this._status === _STATE_NEW;
    };

    subProto._isUnsubscribed = function() {
        return this._status === _STATE_UNSUBSCRIBED;
    };

    subProto._isSubscribing = function() {
        return this._status === _STATE_SUBSCRIBING;
    };

    subProto._isReady = function() {
        return this._status === _STATE_SUCCESS || this._status === _STATE_ERROR;
    };

    subProto._isSuccess = function() {
        return this._status === _STATE_SUCCESS;
    };

    subProto._isError = function() {
        return this._status === _STATE_ERROR;
    };

    subProto._setNew = function() {
        this._status = _STATE_NEW;
    };

    subProto._setSubscribing = function() {
        this._status = _STATE_SUBSCRIBING;
    };

    subProto._setSubscribeSuccess = function() {
        if (this._status == _STATE_SUCCESS) {
            return;
        }
        this._status = _STATE_SUCCESS;
        if (this._ready) {
            this.trigger("resubscribe:success", [this]);
        } else {
            this.trigger("subscribe:success", [this]);
        }
        this.trigger("subscribe", [this]);
        this._resolve(this);
    };

    subProto._setSubscribeError = function(err) {
        if (this._status == _STATE_ERROR) {
            return;
        }
        this._status = _STATE_ERROR;
        this._error = err;
        if (this._ready) {
            this.trigger("resubscribe:error", err);
        } else {
            this.trigger("subscribe:error", err);
        }
        this.trigger("error", err);
        this._reject(err);
    };

    subProto._setUnsubscribed = function() {
        if (this._status == _STATE_UNSUBSCRIBED) {
            return;
        }
        this._status = _STATE_UNSUBSCRIBED;
        this.trigger("unsubscribe", [this]);
    };

    subProto.ready = function() {
        if (this._isReady()) {
            if (this._isSuccess()) {
                return Promise.resolve(this);
            }
            return Promise.resolve(this._error);
        }
        return this.promise;
    };

    subProto.getStatus = function () {
        return this._status;
    };

    subProto.getError = function() {
        return this._error;
    };

    subProto.subscribe = function() {
        if (this._status == _STATE_SUCCESS) {
            return;
        }
        this._centrifuge._subscribe(this);
        return this;
    };

    subProto.unsubscribe = function () {
        this._setUnsubscribed();
        this._centrifuge._unsubscribe(this);
    };

    subProto.publish = function (data, callback, errback) {
        var msg = {
            "method": "publish",
            "params": {
                "channel": this.channel,
                "data": data
            }
        };
        var uid = this._centrifuge._addMessage(msg);
        this._centrifuge._registerCall(uid, callback, errback);
    };

    subProto.presence = function (callback, errback) {
        var msg = {
            "method": "presence",
            "params": {
                "channel": this.channel
            }
        };
        var uid = this._centrifuge._addMessage(msg);
        this._centrifuge._registerCall(uid, callback, errback);
    };

    subProto.history = function (callback, errback) {
        var msg = {
            "method": "history",
            "params": {
                "channel": this.channel
            }
        };
        var uid = this._centrifuge._addMessage(msg);
        this._centrifuge._registerCall(uid, callback, errback);
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return Centrifuge;
        });
    } else if (typeof module === 'object' && module.exports) {
        //noinspection JSUnresolvedVariable
        module.exports = Centrifuge;
    } else {
        //noinspection JSUnusedGlobalSymbols
        this.Centrifuge = Centrifuge;
    }

}.call(this));
