
import _ from 'lodash';

import Tyr from '../tyr';
import Collection from '../core/collection';



/*

   TODO

   /. client

   /. log level to show to console

   /. user

   /. additional log options

      /. class / file / line number?


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

Tyr.Log = Log;
export default Log;
