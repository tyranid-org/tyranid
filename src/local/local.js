
import cls from 'continuation-local-storage';

import Tyr from '../tyr';

const ns = cls.createNamespace('tyranid');

/**
 * Wrap all access to underlying local storage mechanism to shield users since it will likely change.
 */
const local = {
  define(name) {
    if (name === 'define') {
      throw new Error('You cannot redefine define()');
    }

    Object.defineProperty(local, name, {
      get:          ()    => ns.get(name),
      set:          value => ns.set(name, value),
      enumerable:   true,
      configurable: false
    });
  }
};

local.define('user');
local.define('req');
local.define('res');

Tyr.local = local;

const api = {
  express(req, res, next) {
    ns.bindEmitter(req);
    ns.bindEmitter(res);

    ns.run(() => {
      local.req = req;
      local.res = res;
      local.user = req.user;
      Tyr.Log.request(req, res);
      next();
    });
  }
};

export default api;
