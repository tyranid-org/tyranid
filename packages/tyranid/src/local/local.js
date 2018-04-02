import Tyr from '../tyr';

let initialized = false,
  cls,
  ns,
  local;

function init() {
  if (Tyr.options.cls !== false) {
    cls = require('continuation-local-storage');
    ns = cls.createNamespace('tyranid');
  } else {
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

  Tyr.local = local;

  initialized = true;
}

Object.defineProperty(Tyr, 'local', {
  value: function() {
    if (!initialized) {
      init();
    }

    return local;
  }
});

const api = {
  express(req, res, next) {
    const local = Tyr.local;

    if (cls) {
      ns.bindEmitter(req);
      ns.bindEmitter(res);

      ns.run(() => {
        local.req = req;
        local.res = res;
        local.user = req.user;
        Tyr.Log.request(req, res);
        next();
      });
    } else {
      Tyr.Log.request(req, res);
      next();
    }
  }
};

export default api;
