
import _          from 'lodash';
//import onHeaders  from 'on-headers';
import onFinished from 'on-finished';

import Tyr from '../tyr';
import Collection from '../core/collection';
import UserAgent from './userAgent';


const LogLevel = new Collection({
  id: '_l1',
  name: 'tyrLogLevel',
  client: false,
  enum: true,
  fields: {
    _id:  { is: 'integer' },
    name: { is: 'string', labelField: true }
  },
  values: [
    [ '_id', 'name'  ],
    [     1, 'trace' ],
    [     2, 'debug' ],
    [     3, 'info'  ],
    [     4, 'warn'  ],
    [     5, 'error' ],
    [     6, 'fatal' ]
  ]
});

const Log = new Collection({
  id: '_l0',
  name: 'tyrLog',
  client: false,
  fields: {
    _id:  { is: 'mongoid' },
    l:    { link: 'tyrLogLevel',  label: 'Level'       },
    m:    { is: 'string',         label: 'Message'     },
    u:    { link: 'user',         label: 'User'        },
    st:   { is: 'string',         label: 'Stack Trace' },
    on:   { is: 'date',           label: 'On'          },
    du:   { is: 'integer',        label: 'Duration',   in: 'ns' },
    r:    { is: 'object',         label: 'Request', fields: {
      p:  { is: 'string',         label: 'Path'        },
      m:  { is: 'string',         label: 'Method'      },
      ip: { is: 'string',         label: 'IP'          },
      ua: { link: 'tyrUserAgent', label: 'User Agent'  },
    }}
  },
});

async function log(level, ...opts) {
  const obj = {};

  for (const opt of opts) {
    if (opt instanceof Error) {
      obj.st = opt.stack;
      if (!obj.m) {
        obj.m = opt.message;
      }
    } else if (_.isString(opt)) {
      obj.m = opt;
    } else if (_.isObject(opt)) {
      _.assign(obj, opt);
    } else {
      throw new Error(`Invalid option "${opt}"`);
    }
  }

  if (level) {
    obj.l = level._id;
  }

  obj.on = new Date();

  const local = Tyr.local,
        req   = local.req,
        user  = local.user;

  if (user) {
    obj.u = user.$id;
  }

  if (req) {
    const ua = await UserAgent.by(req.headers['user-agent']);

    obj.r = {
      p:  req.path,
      m:  req.method,
      ip: req.ip || req._remoteAddress || (req.connection && req.connection.remoteAddress) || undefined,
      ua: ua._id
    };
  }

  return Log.db.save(obj);
};

Log.log = async function(level, ...opts) {
  log(level, ...opts);
};

Log.trace = async function() {
  return log(LogLevel.TRACE, ...arguments);
};

Log.debug = async function() {
  return log(LogLevel.DEBUG, ...arguments);
};

Log.info = async function() {
  return log(LogLevel.INFO, ...arguments);
};

Log.warn = async function() {
  return log(LogLevel.WARN, ...arguments);
};

Log.error = async function() {
  return log(LogLevel.ERROR, ...arguments);
};

Log.fatal = async function() {
  return log(LogLevel.FATAL, ...arguments);
};


//
// Express Request Logging (adapted from morgan)
//

function recordStartTime() {
  this._startAt = process.hrtime();
}

/** @private */
Log.request = function(req, res) {
  recordStartTime.call(req);

  //res._startAt = undefined;
  //onHeaders(res, recordStartTime);

  onFinished(res, function() {

    const diff = process.hrtime(req._startAt);
    Log.info({
      du: diff[0] * 1e9 + diff[1]
    });
  });
}


_.assign(Tyr, {
  Log,
  log:    ::Log.log,
  trace:  ::Log.trace,
  debug:  ::Log.debug,
  info:   ::Log.info,
  warn:   ::Log.warn,
  error:  ::Log.error,
  fatal:  ::Log.fatal,
});

export default Log;
