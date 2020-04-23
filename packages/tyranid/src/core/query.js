import * as _ from 'lodash';
import { ObjectId } from 'mongodb';

import Tyr from '../tyr';
import Type from './type';
import Collection from './collection';

//
// Detection and Validation
//

function isValue(v) {
  return !_.isObject(v) || v instanceof ObjectId;
}

function isOpObject(obj) {
  if (isValue(obj)) {
    return false;
  }

  for (const n in obj) {
    if (!n.startsWith('$')) {
      return false;
    }
  }

  return true;
}

const queryPattern = /^\$/;

const isQuery = value => {
  if (true) return false;

  if (Tyr.isObject(value))
    for (const name in value)
      if (queryPattern.test(name) || isQuery(value[name])) return true;

  return false;
};

function validateInArray(arr) {
  if (!_.isArray(arr)) {
    throw new Error(`Invalid query, $in did not contain an array: "${arr}"`);
  }

  return true;
}

//
// ObjectId-safe Operations
//
// TODO:  move this stuff into Tyr ?
//

// _.include() doesn't work with ObjectIds
function arrayIncludes(arr, v) {
  for (let i = 0, len = arr.length; i < len; i++) {
    const av = arr[i];

    if (Tyr.isEqual(av, v)) {
      return true;
    }
  }

  return false;
}

// _.intersection doesn't work with ObjectIds, TODO: replace with _.intersectionWith(..., Tyr.isEqual) when lodash upgraded
function arrayIntersection(arr1, arr2) {
  if (Tyr.isEqual(arr1, arr2)) {
    return arr1;
  }

  return arr1.filter(v => arrayIncludes(arr2, v));
}

// _.union doesn't work with ObjectIds, TODO: replace with _.unionWith(..., Tyr.isEqual) when lodash upgraded
function union(arr1, arr2) {
  if (_.isEqual(arr1, arr2)) {
    return arr1;
  }

  const arr = arr1.slice();
  for (const v of arr2) {
    if (!arrayIncludes(arr, v)) {
      arr.push(v);
    }
  }

  return arr;
}

//
// Query Merging
//

function mergeOpObject(v1, v2) {
  const o = {};

  const o1 = isOpObject(v1) ? v1 : { $eq: v1 },
    o2 = isOpObject(v2) ? v2 : { $eq: v2 };

  //
  // Merge into single object
  //

  let nin;
  function addToNin(arr) {
    if (nin) {
      nin = union(nin, arr);
    } else {
      nin = arr;
    }
  }

  let and;
  function addToAnd(obj) {
    if (and) {
      and.push(obj);
    } else {
      and = [obj];
    }
  }

  for (const op in o1) {
    const v1 = o1[op],
      v2 = o2[op];

    if (v1 === undefined) {
      o[op] = v2;
    } else if (v2 === undefined) {
      o[op] = v1;
    } else {
      switch (op) {
        case '$in':
          validateInArray(v1);
          validateInArray(v2);

          const iarr = arrayIntersection(v1, v2);
          switch (iarr.length) {
            case 0:
              return false;
            default:
              o.$in = iarr;
          }

          break;

        case '$nin':
          validateInArray(v1);
          validateInArray(v2);

          const uarr = union(v1, v2);
          switch (uarr.length) {
            case 0:
              break;
            default:
              addToNin(uarr);
          }

          break;

        case '$eq':
          if (Tyr.isEqual(v1, v2)) {
            o.$eq = v1;
          } else {
            return false;
          }

          break;

        case '$ne':
          if (Tyr.isEqual(v1, v2)) {
            o.$ne = v1;
          } else {
            addToNin([v1, v2]);
          }

          break;

        case '$lt':
          o.$lt = Math.min(v1, v2);
          break;

        case '$ge':
          o.$ge = Math.max(v1, v2);
          break;

        case '$and':
          o.$and = v1.concat(v2);
          break;

        case '$or':
          addToAnd({ $or: v1 });
          addToAnd({ $or: v2 });
          break;

        default:
          throw new Error(`Unsupported operation "${op}" in query merging`);
      }

      if (!o) {
        return o;
      }
    }
  }

  for (const op in o2) {
    if (!o1[op]) {
      o[op] = o2[op];
    }
  }

  if (nin) {
    const onin = o.$nin;
    o.$nin = onin ? union(nin, onin) : nin;
  }

  if (and) {
    const oand = o.$and;
    o.$and = oand ? union(and, oand) : and;
  }

  return simplifyOpObject(o);
}

function simplifyOpObject(o) {
  //
  // Simplify and check for contradictions
  //

  const inv = o.$in,
    nev = o.$ne;
  let eqv = o.$eq;
  if (inv) {
    validateInArray(inv);

    if (eqv) {
      if (!arrayIncludes(inv, eqv)) {
        return false;
      } else {
        delete o.$in;
      }
    } else if (inv.length === 1) {
      if (_.size(o) === 1) {
        return inv[0];
      } else {
        eqv = o.$eq = inv[0];
        delete o.$in;
      }
    }
  }

  if (eqv && nev) {
    if (Tyr.isEqual(eqv, nev)) {
      return false;
    }

    delete o.$ne;
  }

  if (_.size(o) === 1 && eqv) {
    return eqv;
  }

  return o;
}

function simplify(v) {
  return isOpObject(v) ? simplifyOpObject(v) : v;
}

function merge(query1, query2) {
  if (!query1) {
    return query2;
  } else if (!query2) {
    return query1;
  }

  if (Tyr.isEqual(query1, query2)) {
    return simplify(query1);
  }

  if (isOpObject(query1) && isOpObject(query2)) {
    return mergeOpObject(query1, query2);
  }

  const query = {};
  const ands = [];

  for (const n in query1) {
    const v1 = query1[n],
      v2 = query2[n];

    if (!v2 || Tyr.isEqual(v1, v2)) {
      query[n] = simplify(v1);
      continue;
    } else if (!v1) {
      query[n] = v2;
      continue;
    } else {
      if (n !== '$or') {
        const v = mergeOpObject(v1, v2);

        if (v === false) {
          return false;
        } else if (v === null) {
          return { $and: [query1, query2] };
        } else {
          query[n] = v;
        }
      } else {
        ands.push({ [n]: v1 });
        ands.push({ [n]: v2 });
      }
    }
  }

  for (const n in query2) {
    const v1 = query1[n],
      v2 = query2[n];

    if (!v1) {
      query[n] = v2;
    }
  }

  if (ands.length) {
    const qAnds = query.$and;
    query.$and = qAnds ? union(qAnds, ands) : ands;
  }

  return query;
}

//
// Query Intersection
//

const NO_MATCH = '_no-match';

function _queryIntersection(a, b) {
  if (!a || !b) {
    throw NO_MATCH;
  }

  if (Tyr.isEqual(a, b)) {
    return a;
  }

  if (isOpObject(a) && isValue(b)) {
    b = { $eq: b };
  } else if (isOpObject(b) && isValue(a)) {
    a = { $eq: a };
  }

  if (isValue(a) || isValue(b) || Array.isArray(a) || Array.isArray(b)) {
    throw NO_MATCH;
  }

  const obj = {};

  for (const n in a) {
    const av = a[n],
      bv = b[n];

    if (av === undefined) {
      obj[n] = bv;
    } else if (bv === undefined) {
      obj[n] = av;
    } else {
      switch (n) {
        case '$in':
          if (Array.isArray(av)) {
            if (Array.isArray(bv)) {
              const rslt = arrayIntersection(av, bv);
              if (!rslt.length) throw NO_MATCH;
              obj[n] = rslt;
            } else if (arrayIncludes(av, bv)) {
              obj[n] = bv;
            } else {
              throw NO_MATCH;
            }
          }

          break;

        default:
          obj[n] = _queryIntersection(av, bv);
      }
    }
  }

  for (const n in b) {
    if (a[n] === undefined) {
      obj[n] = b[n];
    }
  }

  // simplification

  if (obj.$eq) {
    if (obj.$in) {
      if (arrayIncludes(obj.$in, obj.$eq)) {
        delete obj.$in;
      } else {
        throw NO_MATCH;
      }
    }

    if (obj.$lt) {
      if (obj.$eq < obj.$lt) {
        delete obj.$lt;
      } else {
        throw NO_MATCH;
      }
    }

    if (obj.$gt) {
      if (obj.$eq > obj.$gt) {
        delete obj.$gt;
      } else {
        throw NO_MATCH;
      }
    }

    if (obj.$lte) {
      if (obj.$eq <= obj.$lte) {
        delete obj.$lt;
      } else {
        throw NO_MATCH;
      }
    }

    if (obj.$gte) {
      if (obj.$eq >= obj.$gte) {
        delete obj.$gt;
      } else {
        throw NO_MATCH;
      }
    }
  }

  const objKeys = _.keys(obj);
  if (objKeys.length === 1) {
    switch (objKeys[0]) {
      case '$in':
        if (!Array.isArray(obj.$in)) {
          return obj.$in;
        }

        break;
      case '$eq':
        return obj.$eq;

        break;
    }
  }

  return obj;
}

function queryIntersection(a, b) {
  try {
    return _queryIntersection(a, b);
  } catch (err) {
    if (err === NO_MATCH) {
      return undefined;
    }

    throw err;
  }
}

//
// Query Matching
//

function arrayMatchesAny(arr, value) {
  return Array.isArray(value)
    ? !!arrayIntersection(arr, value).length
    : arrayIncludes(arr, value);
}
function arrayMatchesFull(arr, value) {
  return Array.isArray(value)
    ? arrayIntersection(arr, value).length === arr.length
    : arr.length === 1
    ? arrayIncludes(arr, value)
    : false;
}

function valueMatches(match, value) {
  if (isValue(match)) {
    return Tyr.isEqual(match, value);
  }

  if (Array.isArray(match)) {
    return arrayMatchesFull(match, value);
  }

  for (const op in match) {
    if (!op.startsWith('$')) {
      if (!value || !valueMatches(match[op], value[op])) {
        return false;
      }
    } else {
      switch (op) {
        case '$exists':
          const matchValue = match.$exists;

          if (matchValue) {
            return value !== undefined && value !== null;
          } else {
            return value === undefined || value === null;
          }

        //break;

        case '$eq':
          if (!Tyr.isEqual(match.$eq, value)) {
            return false;
          }
          break;

        case '$in':
          if (!value || !match.$in.length || !arrayMatchesAny(match.$in, value))
            return false;

          break;

        case '$bitsAllClear':
          if ((value & match.$bitsAllClear) !== 0x0) {
            return false;
          }

          break;

        case '$bitsAllSet': {
          const v = match.$bitsAllSet;
          if ((value & v) !== v) {
            return false;
          }

          break;
        }

        case '$bitsAnyClear': {
          const v = match.$bitsAnyClear;
          if ((value & v) === v) {
            return false;
          }

          break;
        }

        case '$bitsAnySet': {
          const v = match.$bitsAnySet;
          if ((value & v) === 0x0) {
            return false;
          }

          break;
        }

        default:
          throw new Error('op ' + op + ' not supported (yet)');
      }
    }
  }

  return true;
}

function queryMatches(query, doc) {
  for (const name in query) {
    if (name.startsWith('$')) {
      switch (name) {
        case '$and':
          if (!query.$and.every(q => queryMatches(q, doc))) {
            return false;
          }
          break;

        case '$or':
          if (!query.$or.some(q => queryMatches(q, doc))) {
            return false;
          }
          break;

        default:
          throw new Error('op ' + name + ' not supported (yet)');
      }
    } else {
      if (!valueMatches(_.get(query, name), _.get(doc, name))) {
        return false;
      }
    }
  }

  return true;
}

//
// fromClient Query Conversion
//

Collection.prototype.fromClientQuery = function (query) {
  const col = this;

  function convertValue(field, value) {
    if (_.isArray(value) && field.type.name !== 'array') {
      return value.map(v => field.type.fromClientQuery(field, v));
    } else {
      return field.type.fromClientQuery(field, value);
    }
  }

  function convert(col, path, client) {
    let field;
    if (path) {
      field = col.parsePath(path).tail;

      // i don't think this line is right, either remove it or update the path variable as well
      col = field.collection;
    }

    if (_.isArray(client) || !_.isObject(client)) {
      return convertValue(field, client);
    }

    const server = {};
    const names = Object.keys(client);
    for (const n of names) {
      const v = client[n];
      switch (n) {
        case '$and':
        case '$or':
          if (_.isArray(v)) {
            server[n] = v.map(cv => convert(col, path, cv));
          } else {
            server[n] = convert(col, path, v);
          }
          break;
        case '$in':
        case '$eq':
        case '$ne':
        case '$gt':
        case '$lt':
        case '$gte':
        case '$lte':
          server[n] = convertValue(field, v);
          break;
        case '$exists':
        case '$regex':
        case '$options':
          server[n] = v;
          break;
        default:
          if (_.isArray(v)) {
            server[n] = convertValue(field, v);
          } else {
            server[n] = convert(col, path ? path + '.' + n : n, v);
          }
      }
    }

    return server;
  }

  return convert(col, '', query);
};

//
// Query Type
//

new Type({
  name: 'query',

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const collectionName = field.def.collection;

      if (collectionName && typeof collectionName === 'string') {
        const collection = Type.byName[collection];

        if (!collection)
          throw compiler.err(
            field.pathName,
            `No collection named "${collectionName}" found`
          );

        field.def.collection = collection;
      }
    }
  },

  fromClient(field, value) {
    return (field.def.collection || field.collection).fromClientQuery(value);
  },

  //toClient(field, value) {
  // TODO:  maybe need a "toClientQuery" equivalent to "fromClientQuery"
  //return value;
  //}
});

const query = {
  isQuery,
  merge,
  intersection: queryIntersection,
  matches: queryMatches,
};

Tyr.query = query;

export default query;
