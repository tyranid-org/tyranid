
const moment = require('moment'); // moment

import Type from '../core/type';
import ValidationError from '../core/validationError';


const DateType = new Type({
  name: 'date',

  fromString(s) {
    return s ? new Date(s) : s;
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      return new Date(value);
    }

    return value;
  },

  format(field, value) {
    return value ? moment(value).format('DD-MM-YYYY') : '';
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

export default DateType;
