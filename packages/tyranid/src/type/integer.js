import Tyr from '../tyr';
import Type from '../core/type';
import { UserError } from '../core/userError';

const IntegerType = new Type({
  name: 'integer',

  typescript: 'number',

  compare(field, a, b) {
    return a - b;
  },

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const unit = field.def.in;
      if (unit) {
        field.in = Tyr.Units.parse(unit);
      }
    }
  },

  fromString(s) {
    return s !== undefined && s !== '' ? parseInt(s, 10) : undefined;
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      if (!value.length) return undefined;

      const v = parseInt(value, 10);

      if (v.toString() !== value)
        throw new UserError(`Invalid integer on field ${field.name}: ${value}`);

      return v;
    } else {
      return value;
    }
  },

  format(field, value) {
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

  validate(field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new UserError({ field, suffix: 'is not an integer' });
    }
  },

  width: 80,
});

export default IntegerType;
