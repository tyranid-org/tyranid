import * as _ from 'lodash';
import Tyr from '../tyr';
import Type from '../core/type';

const DoubleType = new Type({
  name: 'double',

  typescript: 'number',

  compare(field, a, b) {
    return a - b;
  },

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const unit = field.def.in;
      if (unit) {
        field.in = Tyr.Unit.parse(unit);
      }
    }
  },

  fromString(s) {
    return parseFloat(s);
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      if (!value.length) {
        return undefined;
      }

      const v = parseFloat(value);

      if (isNaN(v))
        throw new Error(`Invalid double on field ${field.name}: ${value}`);

      return v;
    } else {
      return value;
    }
  },

  format(field, value) {
    if (_.isNumber(value) && value !== Math.round(value)) {
      value = value.toFixed(2);
    }

    return value;
  },

  matches(path, where, doc) {
    if (where !== undefined) {
      const value = path.get(doc);

      for (const op in where) {
        const v = where[op];
        switch (op) {
          case '$lt':
            return value < v;
          case '$gt':
            return value > v;
          case '$eq':
            return value === v;
        }
      }
    } else {
      return true;
    }
  },

  query(path, where, query) {
    if (where) {
      query[path.name] = where;
    }
  },

  width: 80,
});

export default DoubleType;
