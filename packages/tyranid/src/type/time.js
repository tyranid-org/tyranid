import Type from '../core/type';
import { UserError } from '../core/userError';

// cannot use import because compare and format are @isomorphic
const moment = require('moment');
const Tyr = require('../tyr').default;

const TimeType = new Type({
  name: 'time',

  // @isomorphic
  compare(field, a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  },

  fromString(s) {
    return s ? new Date(s) : s;
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      return new Date(value);
    }

    return value;
  },

  // @isomorphic
  format(field, value) {
    return value
      ? moment(value).format(
          (Tyr.options.formats && Tyr.options.formats.time) || 'HH:mm:SS'
        )
      : '';
  },

  query(path, where, query) {
    if (where) {
      query[path.name] = {
        $gte: new Date(where.startDate),
        $lte: new Date(where.endDate),
      };
    }
  },

  matches(/*path, where, doc*/) {
    // TODO
    return true;
  },

  validate(field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new UserError({ field, suffix: 'is not a date' });
    }
  },
});

export default TimeType;
