import Type from '../core/type';

function fromString(s) {
  if (s && s.length) {
    if (/^(f|n|false|no|off|null|0)$/i.test(s)) {
      return false;
    }

    if (/^(t|y|true|yes|on|1)$/i.test(s)) {
      return true;
    }

    /*
    // NOTE:  not sure how "intelligent" we want to be here?
    //        if a valid use case comes through where it makes sense to be more aggressive in boolean conversion
    //        probably makes sense to go ahead and implement it

    const f = parseFloat(s);
    if (!isNaN(f)) {
      return !!f;
    }
    */

    throw new Error(`Invalid boolean: ${s}`);
  }

  if (s === true || s === false) {
    return s;
  }

  return undefined;
}

const BooleanType = new Type({
  name: 'boolean',

  typescript: 'boolean',

  fromString,

  fromClient(field, value) {
    switch (typeof value) {
      case 'string':
        try {
          return fromString(value);
        } catch (err) {
          // rethrowing a more specific error below
        }

        break;

      case 'boolean':
        return value;

      case 'number':
        if (value === 1) {
          return true;
        } else if (value === 0) {
          return false;
        }

        // NOTE:  see "intelligent" above
        break;

      case 'object':
        if (value === null) {
          return false;
        }

        break;
    }

    throw new Error(`Invalid boolean on field ${field.name}: ${value}`);
  },

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
  },

  width: 80
});

export default BooleanType;
