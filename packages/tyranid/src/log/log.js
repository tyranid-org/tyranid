import * as os from 'os';

import * as _ from 'lodash';
import * as util from 'util';
import * as moment from 'moment';
import * as chalk from 'chalk';

//import onHeaders  from 'on-headers';
import * as onFinished from 'on-finished';

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

const logLevelValues = [
  [1, 'trace', 'T', 'trace'],
  [2, 'log', 'L', 'log'],
  [3, 'info', 'I', 'info'],
  [4, 'warn', 'W', 'warn'],
  [5, 'error', 'E', 'error'],
  [6, 'fatal', 'F', 'error'],
  [7, 'never', 'N', undefined]
];

const LogLevel = new Collection({
  id: '_l1',
  name: 'tyrLogLevel',
  client: true,
  internal: true,
  enum: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true },
    code: { is: 'string' },
    method: {
      is: 'string',
      help: 'The console.X() method to use when logging to the console.'
    }
  },
  values: [['_id', 'name', 'code', 'method'], ...logLevelValues]
});

const LogEvent = new Collection({
  id: '_l2',
  name: 'tyrLogEvent',
  client: false,
  internal: true,
  enum: true,
  fields: {
    _id: { is: 'string' },
    label: { is: 'string', labelField: true },
    notes: { is: 'string' }
  },
  values: [
    ['_id', 'label', 'notes'],
    ['http', 'HTTP', 'HTTP Requests'],
    ['db', 'Database', 'Database Requests'],
    ['historical', 'Historical', 'Historical diagnostics'],
    ['subscription', 'Subscriptions', 'Subscription diagnostics']
  ]
});

const Log = new Collection({
  id: '_l0',
  name: 'tyrLog',
  client: false,
  internal: true,
  fields: {
    _id: { is: 'mongoid' },
    l: { link: 'tyrLogLevel', label: 'Level' },
    i: { link: 'tyrInstance', label: 'Instance' },
    e: { link: 'tyrLogEvent', label: 'Event' },
    m: { is: 'string', label: 'Message' },
    u: { link: 'user?', label: 'User' },
    st: { is: 'string', label: 'Stack Trace' },
    on: { is: 'date', label: 'On' },
    du: { is: 'integer', label: 'Duration', in: 'ns' },
    hn: { is: 'string', label: 'Host Name' },
    r: {
      is: 'object',
      label: 'Request',
      fields: {
        p: { is: 'string', label: 'Path' },
        m: { is: 'string', label: 'Method' },
        ip: { is: 'string', label: 'Remote IP' },
        ua: { link: 'tyrUserAgent', label: 'User Agent' },
        q: { is: 'object', label: 'Query' },
        sid: { is: 'string', label: 'Session ID' },
        sc: { is: 'integer', label: 'Status Code' }
      }
    },
    c: { is: 'string', label: 'Collection ID' },
    q: { is: 'object', label: 'Query' },
    upd: { is: 'object', label: 'findAndModify update' }
  }
});

//
// Server-side Logging Methods
//

function error(msg) {
  console.log('Logging error: ' + msg);
  throw new Error(msg);
}

async function log(level, ...opts) {
  const logging = Tyr.logging,
    levelId = level._id;

  if (levelId < logging.min) return;

  const externalLevel = logging.external,
    consoleLevel = logging.console,
    dbLevel = logging.db;

  const local = Tyr.local;
  let req = local.req,
    res = local.res;

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
      if (opt.req) {
        req = opt.req;
        delete opt.req;
      }

      if (opt.res) {
        res = opt.res;
        delete opt.res;
      }

      _.assign(obj, Tyr.adaptIllegalKeyCharAndEliminateRecursion(opt));
    } else {
      error(`Invalid option "${opt}"`);
    }
  }

  obj.l = levelId;

  const event = obj.e;
  if (event && !LogEvent.byId(event)) {
    error(`Invalid event type "${event}"`);
  }

  obj.on = new Date();
  obj.hn = os.hostname();
  obj.i = Tyr.instanceId;

  if (Log.fields.u) {
    let user;
    if (obj.user) {
      user = obj.user;
      delete obj.user;
    } else if (req && req.user) {
      user = req.user;
    } else {
      user = local.user;
    }

    if (user) {
      obj.u = user.$id;
    }
  }

  let r;
  if (req) {
    const ua = await UserAgent.by(req.headers['user-agent']);

    r = obj.r = {
      p: req.path,
      m: req.method,
      ip:
        req.headers['X-Forwarded-For'] ||
        req.ip ||
        req._remoteAddress ||
        (req.connection && req.connection.remoteAddress) ||
        undefined,
      ua: ua._id,
      q: Tyr.adaptIllegalKeyCharAndEliminateRecursion(req.query)
    };

    const sid = req.cookies && req.cookies['connect.sid'];
    if (sid) {
      r.sid = sid;
    }

    if (res) {
      r.sc = res.statusCode;
    }
  }

  if (levelId >= consoleLevel) {
    let str = level._id >= LogLevel.WARN ? chalk.red(level.code) : level.code;
    str += ' ' + chalk.yellow(moment(obj.on).format('YYYY.M.D HH:mm:ss'));
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
      str +=
        ' ' + Log.fields.du.in.convert(obj.du, Tyr.U`ms`).toFixed(2) + 'ms';
    }

    console[level.method === 'trace' ? 'log' : level.method](str);

    if (obj.st) {
      console[level.method](obj.st);
    }
  }

  let result;

  const externalLogger = Tyr.options.externalLogger;
  if (externalLogger && levelId >= externalLevel) {
    result = externalLogger(obj);
  }

  if (levelId >= dbLevel) {
    const logResult = Log.db.insertOne(obj);
    result = result ? Promise.all([result, logResult]) : logResult;
  }

  return result;
}

Log.updateDuration = async function(logResultPromise) {
  let logResult = await logResultPromise;
  if (!logResult) return;

  if (Array.isArray(logResult)) {
    // last one in the array is the db log
    logResult = logResult[logResult.length - 1];
  }

  const logDoc = logResult.ops[0];

  return Log.db.findAndModify({ _id: logDoc._id }, undefined, {
    $set: { du: (Date.now() - logDoc.on.getTime()) * 1000 }
  });

  //const diff = process.hrtime(req._startAt);

  //Log.info({
  //e:    'http',
  //du:   diff[0] * 1e9 + diff[1],
  //req:  req,
  //res:  res
  //}).catch(err => {
  //console.error('Error when logging a request', err);
  //});
};

Log.trace = function() {
  return log(LogLevel.TRACE, ...arguments);
};

Log.log = function() {
  // TODO:  allow some way to specify the log level in opts ?
  //Log.log = function(level, ...opts) {

  return log(LogLevel.LOG, ...arguments);
};

Log.info = function() {
  return log(LogLevel.INFO, ...arguments);
};

Log.warn = function() {
  return log(LogLevel.WARN, ...arguments);
};

Log.error = function() {
  return log(LogLevel.ERROR, ...arguments);
};

Log.fatal = function() {
  return log(LogLevel.FATAL, ...arguments);
};

Log.addEvent = function(name, label, notes) {
  if (LogEvent.byId(name)) {
    throw new Error(`Event "${name}" already exists.`);
  }

  LogEvent.addValue(
    new LogEvent({ _id: name, label: label || name, notes: notes })
  );
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
      e: 'http',
      du: diff[0] * 1e9 + diff[1],
      req: req,
      res: res
    }).catch(err => {
      console.error('Error when logging a request', err);
    });
  });
};

//
// Express Routing
//

Log.routes = function(app, auth) {
  app
    .route('/api/log/_log')
    .all(auth)
    .get((req, res) => {
      try {
        const o = JSON.parse(req.query.o);
        log(LogLevel.INFO, o).catch(err =>
          console.error(
            'Error from /api/log/_log route, object=',
            o,
            'error=',
            err
          )
        );

        res.send(200);
      } catch (err) {
        console.log(err.stack);
        res.sendStatus(500);
      }
    });
};

//
// Client
//

Log.clientCode = function(file) {
  const config = Tyr.config(),
    clientLogLevel = config.clientLogLevel || LogLevel.ERROR,
    consoleLogLevel =
      config.consoleLogLevel || config.logLevel || LogLevel.INFO,
    dbLogLevel = config.dbLogLevel || config.logLevel || LogLevel.INFO,
    serverLogLevel =
      consoleLogLevel._id < dbLogLevel._id ? consoleLogLevel : dbLogLevel;

  file += `

var LL = Tyr.byName.tyrLogLevel;
function log() {

  var obj = {};

  var level = LL.INFO;

  function arg(opt) {
    if (opt instanceof Error) {
      obj.st = opt.stack;
      if (!obj.m) {
        obj.m = opt.message;
      }
    } else if (opt instanceof LL) {
      level = opt;
    } else if (_.isString(opt)) {
      obj.m = opt;
    } else if (opt.length) {
      for (var ai=0; ai<opt.length; ai++) {
        arg(opt[ai]);
      }
    } else if (_.isObject(opt)) {
      _.assign(obj, opt);
    } else {
      throw new Error('Invalid option "' + opt + '"');
    }
  }

  arg(arguments);

  obj.l = level._id;

  if (level._id >= ${clientLogLevel._id}) {
    var str = '';
    if (obj.e) {
      str += obj.e;
    }
    if (obj.m) {
      str += ' ' + obj.m;
    }

    console[level.method](str);

    if (obj.st) {
      console[level.method](obj.st);
    }
  }

  if (level._id >= ${serverLogLevel._id}) {
    return ajax({
      url: '/api/log/_log',
      data: { o: JSON.stringify(obj) }
    }).catch(function(err) {
      console.log(err);
    });
  }
}

Tyr.trace = function() { log(LL.byLabel('trace'), arguments); };
Tyr.log   = function() { log(LL.byLabel('log'), arguments); };
Tyr.info  = function() { log(LL.byLabel('info'), arguments); };
Tyr.warn  = function() { log(LL.byLabel('warn'), arguments); };
Tyr.error = function() { log(LL.byLabel('error'), arguments); };
Tyr.fatal = function() { log(LL.byLabel('fatal'), arguments); };

`;

  return file;
};

Log.boot = function(stage, pass) {
  if (stage === 'compile') {
    const config = Tyr.options;

    const getLogLevel = propName => {
      const level =
        propName in config
          ? config[propName]
          : config.logLevel || LogLevel.INFO;
      return typeof level === 'string' ? LogLevel.byLabel(level) : level;
    };

    const externalLogger = config.externalLogger,
      externalLogLevel =
        (externalLogger && getLogLevel('externalLogLevel')) || LogLevel.NEVER,
      consoleLogLevel = getLogLevel('consoleLogLevel') || LogLevel.NEVER,
      dbLogLevel = getLogLevel('dbLogLevel') || LogLevel.NEVER;

    const min = Math.min(
      externalLogLevel._id,
      consoleLogLevel._id,
      dbLogLevel._id
    );

    const logging = (Tyr.logging = Log.logging = {
      min,
      external: externalLogLevel._id,
      console: consoleLogLevel._id,
      db: dbLogLevel._id
    });

    for (const ll of logLevelValues) {
      const [_id, name] = ll;

      if (name !== 'never') {
        logging[name] = _id >= min;
      }
    }
  }

  //return undefined;
};

//
// Tyranid Namespacing
//

_.assign(Tyr, {
  Log,
  trace: Log.trace.bind(Log),
  log: Log.log.bind(Log),
  info: Log.info.bind(Log),
  warn: Log.warn.bind(Log),
  error: Log.error.bind(Log),
  fatal: Log.fatal.bind(Log)
});

export default Log;
