
import _          from 'lodash';
import util       from 'util';
import moment     from 'moment';
import chalk      from 'chalk';

//import onHeaders  from 'on-headers';
import onFinished from 'on-finished';

import Tyr from '../tyr';
import Collection from '../core/collection';
import UserAgent from './userAgent';


/*
    TODO:

      /. server ID (32 digit string, "sv")

      /. browser ID (10 digit string, "bid")

         ... accomplished by creating a bid cookie

      /. keep track of the "parent log" id on local storage

         /. if it is present, log only the differences (can omit most request-derived props)

         +. this will save space

         -. this will require ui to use aggregation/$lookup/etc.



 */

const LogLevel = new Collection({
  id: '_l1',
  name: 'tyrLogLevel',
  client: false,
  enum: true,
  fields: {
    _id:  { is: 'integer' },
    name: { is: 'string', labelField: true },
    code: { is: 'string' }
  },
  values: [
    [ '_id', 'name',  'code' ],
    [     1, 'trace', 'T' ],
    [     2, 'debug', 'D' ],
    [     3, 'info',  'I' ],
    [     4, 'warn',  'W' ],
    [     5, 'error', 'E' ],
    [     6, 'fatal', 'F' ]
  ]
});

const LogEvent = new Collection({
  id: '_l2',
  name: 'tyrLogEvent',
  client: false,
  enum: true,
  fields: {
    _id:   { is: 'string' },
    label: { is: 'string', labelField: true }
  },
  values: [
    [ '_id',  'label'        ],
    [ 'http', 'HTTP Request' ]
  ]
});

const Log = new Collection({
  id: '_l0',
  name: 'tyrLog',
  client: false,
  fields: {
    _id:   { is: 'mongoid' },
    l:     { link: 'tyrLogLevel',  label: 'Level'       },
    e:     { link: 'tyrLogEvent',  label: 'Event'       },
    m:     { is: 'string',         label: 'Message'     },
    u:     { link: 'user',         label: 'User'        },
    st:    { is: 'string',         label: 'Stack Trace' },
    on:    { is: 'date',           label: 'On'          },
    du:    { is: 'integer',        label: 'Duration',   in: 'ns' },
    r:     { is: 'object',         label: 'Request', fields: {
      p:   { is: 'string',         label: 'Path'        },
      m:   { is: 'string',         label: 'Method'      },
      ip:  { is: 'string',         label: 'IP'          },
      ua:  { link: 'tyrUserAgent', label: 'User Agent'  },
      q:   { is: 'object',         label: 'Query'       },
      sid: { is: 'string',         label: 'Session ID'  },
      h:   { is: 'string',         label: 'Host Domain' },
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

  const event = obj.e;
  if (event && !LogEvent.byId(event)) {
    throw new Error(`Invalid event type "${event}"`);
  }


  obj.on = new Date();

  const local = Tyr.local,
        req   = local.req,
        res   = local.res,
        user  = local.user;

  if (user) {
    obj.u = user.$id;
  }

  let r;
  if (req) {
    const ua = await UserAgent.by(req.headers['user-agent']);

    r = obj.r = {
      p:  req.path,
      m:  req.method,
      ip: req.ip || req._remoteAddress || (req.connection && req.connection.remoteAddress) || undefined,
      ua: ua._id,
      q:  req.query
    };

    const sid = req.cookies && req.cookies['connect.sid'];
    if (sid) {
      r.sid = sid;
    }

    const host = req.socket.remoteAddress;
    if (host) {
      r.h = host;
    }
  }

  const config = Tyr.config(),
        consoleLogLevel = config.consoleLogLevel || config.logLevel || LogLevel.INFO,
        dbLogLevel      = config.dbLogLevel      || config.logLevel || LogLevel.INFO;

  if (level._id >= consoleLogLevel._id) {
    let str = (level._id >= LogLevel.WARN ? chalk.red(level.code) : level.code);
    str +=' ' + chalk.yellow(moment(obj.on).format('YYYY.M.D HH:mm:ss'));
    if (obj.e) {
      str += '|' + obj.e;
    }
    if (obj.m) {
      str += ' ' + obj.m;
    } else if (r) {
      str += ' ' + r.m + ' ' + chalk.bold(r.p);
      if (_.size(r.q)) {
        str += '?' + util.inspect(r.q, { depth: null, colors: true });
      }
      if (res) {
        const sc = res.statusCode;
        str += ' ' + (sc === 200 ? chalk.green('200') : chalk.red(sc));
      }
      str += ' ' + Tyr.U`ns`.convert(obj.du, Tyr.U`ms`).toFixed(2) + 'ms';
    }

    console.log(str);

    if (obj.st) {
      console.log(obj.st);
    }
  }

  if (level._id >= dbLogLevel._id) {
    return Log.db.save(obj);
  }
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

Log.addEvent = function(name, label) {
  if (LogEvent.byId(name)) {
    throw new Error(`Event "${name}" already exists.`);
  }

  LogEvent.addValue(new LogEvent({ _id: name, label: label }));
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
      e:  'http',
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
