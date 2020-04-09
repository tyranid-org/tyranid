import * as _ from 'lodash';
import Type from '../core/type';

const TextType = new Type({
  name: 'text',
  typescript: 'string',
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
  },

  width: 200,
});

export default TextType;
