import Type from '../core/type';

// cannot use import because compare and format are @isomorphic
//const moment = require('moment');

const TimeZone = new Type({
  name: 'timezone',

  typescript: 'string',

  // @isomorphic
  compare(field, a, b) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  },

  query(path, where, query) {
    if (where) {
      query[path.name] = _.isArray(where) ? { $in: where } : where;
    }
  },

  matches(path, where, doc) {
    if (where) {
      let value = path.get(doc);
      if (value) {
        if (!_.isString(value)) {
          value = '' + value;
        }

        if (_.isArray(where)) {
          return where.indexOf(value) >= 0;
        } else if (where instanceof RegExp) {
          return value.match(where);
        } else {
          return value === where;
        }
      }
    }

    return true;
  }
});

export default TimeZone;
