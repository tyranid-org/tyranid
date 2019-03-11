import Type from '../core/type';
import ValidationError from '../core/validationError';

// cannot use import because compare and format are @isomorphic
const moment = require('moment');
const Tyr = require('../tyr').default;

const DateTimeType = new Type({
  name: 'datetime',

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
          (Tyr.options.formats && Tyr.options.formats.datetime) ||
            'DD-MM-YYYY HH:mm:SS Z'
        )
      : '';
  },

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = {
        $gte: new Date(where.startDate),
        $lte: new Date(where.endDate)
      };
    }
  },

  matches(/*namePath, where, doc*/) {
    // TODO
    return true;
  },

  validate(field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(field, 'is not a date');
    }
  }
});

export default DateTimeType;
