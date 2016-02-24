
const _ = require('lodash'); // client-side

import Tyr from '../tyr';
import Type from '../classes/Type';


const DoubleType = new Type({
  name: 'double',

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const unit = field.def.in;
      if (unit) {
        field.in = Tyr.Unit.parse(unit);
      }
    }
  },

  format(field, value) {
    if (_.isNumber(value) && value !== Math.round(value)) {
      value = value.toFixed(2);
    }

    return value;
  },

  matches(namePath, where, doc) {
    if (where !== undefined) {
      const value = namePath.get(doc);

      for (const op in where) {
        const v = where[op];
        switch (op) {
        case '$lt': return value < v;
        case '$gt': return value > v;
        case '$eq': return value === v;
        }
      }
    } else {
      return true;
    }
  },

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = where;
    }
  }
});

export default DoubleType;
