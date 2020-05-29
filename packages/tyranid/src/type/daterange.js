import Type from '../core/type';
import { UserError } from '../core/userError';

// cannot use import because compare and format are @isomorphic
const moment = require('moment');

const fromValue = val => {
  if (typeof val === 'string') {
    const [start, end] = val.split(',');
    if (start && end) return { start: new Date(start), end: new Date(end) };
  }

  return val;
};

export const DateRangeType = new Type({
  name: 'daterange',

  // @isomorphic
  compare(field, a, b) {
    const astart = a && a.start ? moment(a.start) : undefined;
    const bstart = b && b.start ? moment(b.start) : undefined;

    if (!astart && !bstart) return 0;
    if (!astart && bstart) return 1;
    if (astart && !bstart) return -1;
    if (astart === bstart) return 0;
    return astart > bstart ? 1 : -1;
  },

  fromString(s) {
    return fromValue(s);
  },

  fromClient(_, value) {
    return fromValue(value);
  },

  format(field, value) {
    if (!value) return '';

    const { start, end } = value;
    return [moment(start).toISOString(), moment(end).toISOString()].toString();
  },

  query(namePath, where, query) {
    throw new Error(`Query method not implemented for 'daterange'`);
  },

  matches() {
    return true;
  },

  validate(field, value) {
    if (value !== undefined && !(value instanceof Object))
      return new UserError({ field, suffix: 'is not a date range' });

    const { start, end } = value;
    if (!start)
      return new UserError({ field, suffix: 'date range missing start' });

    if (start && !(start instanceof Date || start instanceof moment.Moment))
      return new UserError({
        field,
        suffix: 'date range start is not an instance of Date or Moment',
      });

    if (!end) return new UserError({ field, suffix: 'date range missing end' });

    if (end && !(end instanceof Date || end instanceof moment.Moment))
      return new UserError({
        field,
        suffix: 'date range end is not an instance of Date or Moment',
      });
  },
});

export default DateRangeType;
