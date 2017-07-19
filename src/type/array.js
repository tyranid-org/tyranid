
import * as _          from 'lodash';

import Tyr        from '../tyr';
import Type       from '../core/type';
import Population from '../core/population';
import Populator  from '../core/populator';

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

    let values = where.filter($ => $ !== '- None -');
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
 *
 * TODO:  there is still some cases to support still ... see:
 *        https://docs.mongodb.com/manual/reference/method/cursor.sort/#cursor.sort
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

  if (_.isObject(a) && !_.isDate(a)) {
    if (_.isObject(b) && !_.isDate(b)) {
      if (_.isEmpty(a)) {
        return _.isEmpty(b) ? 0 : -1;
      } else if (_.isEmpty(b)) {
        return 1;
      }

      for (const key of _.union(_.keys(a), _.keys(b)).sort()) {
        const av = a[key],
              bv = b[key];

        if (av === undefined) {
          return 1;
        } else if (bv === undefined) {
          return -1;
        }

        const v = mongoCompare(av, bv);

        if (v) {
          return v;
        }
      }

      return 0;
    }

    return -1;
  } else if (_.isObject(b) && !_.isDate(b)) {
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

  // TODO:  what other cases are not being handled?
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  }

  return 0;
}

Tyr.mongoCompare = mongoCompare;

function inverseMongoCompare(a, b) {
  return -1 * mongoCompare(a, b);
}

Tyr.arraySort = function(array, sortObj) {
  const sortProps = [];

  for (const key in sortObj) {
    if (sortObj.hasOwnProperty(key)) {
      // TODO:  use NamePath here to deal with compound property names?
      const v = sortObj[key];

      if (v > 0) {
        sortProps.push({ key, fn: mongoCompare });
      } else if (v < 0) {
        sortProps.push({ key, fn: inverseMongoCompare });
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
    }

    return 0;
  });

  return array;
};

Tyr._slice = async function(doc, path, opts) {
  const col   = doc.$model,
        field = col.paths[path],
        np    = field.namePath;

  const { skip, limit, sort, where, populate } = opts || {};

  const arrDoc = await col.byId(doc.$id, { fields: { [path]: 1 } });
  let arr = np.get(arrDoc);

  if (populate) {
    const populator  = new Populator(false /* TODO: ??? */),
          population = Population.parse(populator, np, populate);

    await population.populate(populator, arr);
  }

  if (where) {
    arr = arr.filter(where);
  }

  if (sort) {
    Tyr.arraySort(arr, sort);
  }

  let docArr = np.get(doc);
  if (!docArr) {
    docArr = [];
    np.set(doc, docArr);
  }

  const begin = skip || 0,
        end = limit ? Math.min(begin + limit, arr.length) : arr.length;
  for (let i = begin; i < end; i++) {
    docArr[i] = arr[i];
  }
};

export default ArrayType;
