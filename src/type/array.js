
import Tyr from '../tyr';
import Type from '../core/type';


const ArrayType = new Type({
  name: 'array',

  compile(compiler, field) {
    compiler.type(field, 'of', true);
  },

  fromClient(field, value) {
    if (Array.isArray(value)) {
      const ofField = field.of,
            ofFieldType = ofField.type;
      return value.map(v => ofFieldType.fromClient(ofField, v));
    } else {
      return value;
    }
  },

  async query(namePath, where, query) {
    if (!where.length) {
      // TODO:  need to figure out a cleaner way to handle this case?
      query.__foo__ = true;
      return;
    }

    let values = where.filter($=> $ !== '- None -');
    let or;

    if (values.length !== where.length) {
      or = query.$or = query.$or || [];
      or.push({ [namePath.name]: { $size: 0 } });
      or.push({ [namePath.name]: { $exists: false } });
    }

    if (values.length) {
      const of = namePath.tail.of;

      const link = of.link;
      if (link) {
        values = await Promise.all(values.map(async v => (await link.byLabel(v)).$id));
      }

      if (or) {
        or.push({ [namePath.name]: { $in: values } });
      } else {
        query[namePath.name] = { $in: values };
      }
    }
  },

  format(field, value) {
    return (value && value.length) || '';
  },

  sortValue(field, value) {
    return (value && value.length) || 0;
  }
});


//
// Array sorting
//

/*
 * Mongo sorts:
 *   undefined values first, then
 *   nulls, then
 *   numbers, then
 *   strings, then
 *   objects, then
 *   dates.
 */
function mongoCompare(a, b) {

  // TODO:  maybe faster to write this as a switch off of "typeof a/b" ?

  if (a === undefined) {
    if (b === undefined) {
      return 0;
    }

    return -1;
  } else if (b === undefined) {
    return 1;
  }

  if (a === null ) {
    if (b === null) {
      return 0;
    }

    return -1;
  } else if (b === null) {
    return 1;
  }

  if (_.isNumber(a)) {
    if (_.isNumber(b)) {
      return a - b;
    }

    return -1;
  } else if (_.isNumber(b)) {
    return 1;
  }

  if (_.isString(a)) {
    if (_.isString(b)) {
      return a.localeCompare(b);
    }

    return -1;
  } else if (_.isString(b)) {
    return 1;
  }

  if (_.isObject(a)) {
    if (_.isObject(b)) {
      // TODO:  need to iterate through both arrays at the same time

    }

    return -1;
  } else if (_.isObject(b)) {
    return 1;
  }

  if (_.isDate(a)) {
    if (_.isDate(b)) {
      return a.valueOf() - b.valueOf();
    }

    return -1;
  } else if (_.isDate(b)) {
    return 1;
  }


  // TODO:  what here ?  etc.
}

function neg1(a, b, key) {
  return -1 * mongoCompare(a[key], b[key]);
}

function pos1(a, b, key) {
  return mongoCompare(a[key], b[key]);
}


Tyr.prototype.arraySort = function(array, sortObj) {
  const sortProps = [];

  for (const key in sortObj) {
    if (array.isOwnProperty(key)) {
      // TODO:  use NamePath here to deal with compound property names?
      const v = sortObj[key];

      if (v > 0) {
        sortProps.push({ key, fn: pos1 });
      } else if (v < 1) {
        sortProps.push({ key, fn: neg1 });
      //} else {
        // ignore
      }
    }
  }

  array.sort((a, b) => {
    for (const { key, fn } of sortProps) {
      const v = fn(a[key], b[key]);
      if (v) {
        return v;
      }

      return 0;
    }
  });
};

export default ArrayType;
