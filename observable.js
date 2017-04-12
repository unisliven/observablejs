/**
 * observable.js v1.0
 * author: liven
 * license: MIT
 */
(function(global, factory) {
    typeof module !== 'undefined' && typeof exports === 'object'
        ? module.exports = factory()
        : typeof define === 'function' && define.amd
        ? define('observable',[],factory)
        : (global.Observable = factory());
}(this, function() {
    'use strict';

    var version = '1.0';

    var
        _warn = function (msg) {
            msg = '[observable warn] '+ msg;
            console.warn(msg);
        },
        _error = function (msg) {
            msg = '[observable error] '+ msg;
            throw msg;
        };

    var
        objProto = Object.prototype,
        arrProto = Array.prototype,
        nativeForEach = arrProto.forEach,
        splice = arrProto.splice,
        slice = arrProto.slice,
        hasOwn = objProto.hasOwnProperty,
        objToString = objProto.toString,
        defineProp = Object.defineProperty;

    var
        isFunction = function util$isFunction(obj){
            return objToString.call(obj) === '[object Function]';
        },
        isRegExp = function util$isRegExp(obj) {
            return objToString.call(obj) === '[object RegExp]';
        },
        isArray = function util$isArray(obj){
            return objToString.call(obj) === '[object Array]';
        },
        idMaker = function util$idMaker() {
            return '' + (Date.now() + 1);
        },
        protoMixin  = function util$protoMixin(constuctor, protoObj) {
            constuctor.prototype = protoObj;
            defineProp(protoObj, 'constuctor', {
                enumerable: false,
                writable: true,
                configurable: true,
                value: constuctor
            });
            return constuctor;
        };

    var breaker = Object.create(null);
    var each = function util$each(obj, iterator, context) {
        if (!obj) {
            return obj;
        }
        if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            var i = 0, length = obj.length;
            for (; i < length; i++) {
                if (iterator.call(context, obj[i], i, obj) === breaker) {
                    return;
                }
            }
        } else {
            for (var key in obj) {
                if (hasOwn.call(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) {
                        return;
                    }
                }
            }
        }
        return obj;
    };

    function EHandler(name, handler){
        this.name = name;
        this._$handlers = [handler];
        this._$id = idMaker();
        this._$fireCount = 0;
    }

    protoMixin(EHandler, {
        _$handlers: [],
        fire: function () {
            try {
                var args = arguments,
                    handlers = this._$handlers;
                each(handlers, function (item, i) {
                    item.apply(null, args);
                });
                this._$fireCount += 1;
            } catch(e) {
                _error(e);
            }
        },
        addHandler: function(handler){
            this._$handlers.push(handler);
        },
        removeHandler: function(handler){
            try {
                var handlers = this._$handlers;
                each(handlers, function (item, i) {
                    if (handler === item) {
                        splice.call(handlers, i, 1);
                    }
                });
                return true;
            } catch(e) {
                _error(e);
               return false;
            }
        }
    });

    function Event(){}
    protoMixin(Event, {
        add: function (name, cb){
            if(this[name] instanceof EHandler){
                this[name].addHandler(cb);
            } else {
                this[name] = new EHandler(name, cb);
            }
        },
        remove: function (name, handler) {
            if(!(this[name] instanceof EHandler)){
                return;
            }
            if(!handler || !isFunction(handler)){
                delete this[name];
            } else {
                this[name].removeHandler(handler);
            }
        },
        trigger: function(name, param){
            if(this[name] instanceof EHandler){
                this[name].fire.apply(this[name], param);
            }
        }
    });

    function Observable(){
        if(!(this instanceof Observable)){
            _warn('Observable is a constructor and should be called with the `new` keyword');
            return;
        }
        this._$event = new Event();
    }

    Observable.$version = version;

    protoMixin(Observable, {
        _$blacklist: [],
        on: function (name, cb) {
            if(!name || !isFunction(cb)){
                return;
            }
            this._$event.add(name, cb);
        },
        off: function (name, handler) {
            if(!name){
                return;
            }
            this._$event.remove(name, handler);
        },
        trigger: function () {
            var args = arguments;
            if(!args.length){
                return;
            }
            var name = args[0],
                params = slice.call(args, 1);
            if(this.inBlacklist(name)){
                return;
            }
            this._$event.trigger(name, params);
        },
        inBlacklist: function(name){
            var i = 0,
                blacklist = this._$blacklist,
                len = blacklist.length;
            for(; i < len; i++){
                if(isRegExp(blacklist[i]) && blacklist[i].test(name)){
                    return true;
                } else if(name === blacklist[i]){
                    return true;
                }
            }
            return false;
        },
        blacklist: function (names) {
            if(!isArray(names) || !names.length){
                return;
            }
            return this['__proto__']._$blacklist = names;
        },
        clearBlacklist: function(){
            this['__proto__']._$blacklist = [];
        }
    });

    return Observable;

}));
