
import Type from '../core/type';


const BooleanType = new Type({
  name: 'boolean',

  query(namePath, where, query) {
    switch (where) {
    case true:
      query[namePath.name] = true;
      break;
    case false:
      query[namePath.name] = { $ne: true };
      break;
    }
  },

  matches(namePath, where, doc) {
    if (where !== undefined) {
      const value = namePath.get(doc);
      return !where === !value;
    } else {
      return true;
    }
  },

  format(field, value) {
    return value ? 'Yes' : 'No';
  }
});

export default BooleanType;
