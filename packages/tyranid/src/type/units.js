import * as moment from 'moment';
import Type from '../core/type';
import ValidationError from '../core/validationError';
import { Units } from '../unit/units';

const UnitsType = new Type({
  name: 'units',

  fromString(s) {
    return s ? Units.parse(s) : undefined;
  },

  fromClient(field, value) {
    return typeof value === 'string' ? Units.parse(s) : value;
  },

  format(field, value) {
    return value ? value.toString() : '';
  },

  query(namePath, where, query) {
    if (where) {
      // is this right?
      query[namePath.name] = value.toString();
    }
  },

  matches(/*namePath, where, doc*/) {
    // TODO
    return true;
  },

  validate(field, value) {
    if (value !== undefined && !(value instanceof Units)) {
      return new ValidationError(field, 'is not a units');
    }
  }
});

export default UnitsType;
