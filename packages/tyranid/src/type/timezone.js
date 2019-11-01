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

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = _.isArray(where) ? { $in: where } : where;
    }
  },

  matches(namePath, where, doc) {
    if (where) {
      let value = namePath.get(doc);
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