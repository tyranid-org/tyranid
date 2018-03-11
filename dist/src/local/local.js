"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
let initialized = false, cls, ns, local;
function init() {
    if (tyr_1.default.options.cls !== false) {
        cls = require('continuation-local-storage');
        ns = cls.createNamespace('tyranid');
    }
    else {
        ns = {
            _data: {},
            set(name, value) {
                this._data[name] = value;
                return this;
            },
            get(name) {
                return this._data[name];
            }
        };
    }
    /**
     * Wrap all access to underlying local storage mechanism to shield users since it will likely change.
     */
    local = {
        define(name) {
            if (name === 'define') {
                throw new Error('You cannot redefine define()');
            }
            Object.defineProperty(local, name, {
                get: () => ns.get(name),
                set: value => ns.set(name, value),
                enumerable: true,
                configurable: false
            });
        }
    };
    local.define('user');
    local.define('req');
    local.define('res');
    tyr_1.default.local = local;
    initialized = true;
}
Object.defineProperty(tyr_1.default, 'local', {
    value: function () {
        if (!initialized) {
            init();
        }
        return local;
    }
});
const api = {
    express(req, res, next) {
        const local = tyr_1.default.local;
        if (cls) {
            ns.bindEmitter(req);
            ns.bindEmitter(res);
            ns.run(() => {
                local.req = req;
                local.res = res;
                local.user = req.user;
                tyr_1.default.Log.request(req, res);
                next();
            });
        }
        else {
            tyr_1.default.Log.request(req, res);
            next();
        }
    }
};
exports.default = api;
//# sourceMappingURL=local.js.map