
import _ from 'lodash';

import Tyr from '../tyr';
import Collection from '../core/collection';



/*

   TODO

   /. client

   /. log level to show to console

   /. log event?  some sort of categorization system

      "_id"      is DbMongoId         is 'id;
      "e"        is DbLink(Event)     as "Event";
      "du"       is DbLong            as "Duration in MS";
      "ct"       is DbInt             as "Count";
      "ex"       is DbText            as "Stack Trace";
      "sid"      is DbChar(64)        as "Session ID";
      "d"        is DbLink(DnsDomain) as "Domain";
      "ua"       is DbLink(UserAgent) as "User Agent";
      "ip"       is DbChar(32)        as "IP";
      "p"        is DbChar(128)       as "Path";
      "bid"      is DbChar(10)        as "Browser ID";
      "sv"       is DbChar(32)        as "Server ID";

   /. user

   /. session

   /. user agent

   /. path / route

   /. OS

   /. IP

   /. domain

   /. durationMs

   /. server ID

   /. additional log options

      /. class / file / line number?

   /. make sure log saves everything, even properties it doesn't know about

   /. need ability for client to add new metadata so that they can add custom fields like "org"

 */

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
    _id: { is: 'mongoid' },
    l:   { link: 'tyrLogLevel', label: 'Level'       },
    m:   { is: 'string',        label: 'Message'     },
    u:   { link: 'user',        label: 'User'        },
    st:  { is: 'string',        label: 'Stack Trace' },
    on:  { is: 'date',          label: 'On'          },
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
