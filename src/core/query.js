
import _            from 'lodash';
import { ObjectId } from 'promised-mongo';

import Tyr          from '../tyr';


//
// Detection and Validation
//

function isValue(v) {
  return !_.isObject(v) || (v instanceof ObjectId);
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

function validateInArray(arr) {
  if (!_.isArray(arr)) {
    throw new Error(`Invalid query, $in did not contain an array: "${v}"`);
  }

  return true;
}


//
// ObjectId-safe Operations
//

// _.include() doesn't work with ObjectIds
function includes(arr, v) {
  for (let i=0, len=arr.length; i<len; i++) {
    const av = arr[i];

    if (_.isEqual(av, v)) {
      return true;
    }
  }

  return false;
}

// _.intersection doesn't work with ObjectIds, TODO: replace with _.intersectionWith(..., _.isEqual) when lodash upgraded
function intersection(arr1, arr2) {
  if (_.isEqual(arr1, arr2)) {
    return arr1;
  }

  return arr1.filter(v => includes(arr2, v));
}

// _.union doesn't work with ObjectIds, TODO: replace with _.unionWith(..., _.isEqual) when lodash upgraded
function union(arr1, arr2) {
  if (_.isEqual(arr1, arr2)) {
    return arr1;
  }

  const arr = arr1.slice();
  for (const v of arr2) {
    if (!includes(arr, v)) {
      arr.push(v);
    }
  }

  return arr;
}


//
// Merging
//

function mergeOpObject(v1, v2) {
  let o = {};

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

        const iarr = intersection(v1, v2);
        switch (iarr.length) {
        case 0:  return false;
        default: o.$in = iarr;
        }

        break;

      case '$nin':
        validateInArray(v1);
        validateInArray(v2);

        const uarr = union(v1, v2);
        switch (uarr.length) {
        case 0:  break;
        default: addToNin(uarr);
        }

        break;

      case '$eq':
        if (_.isEqual(v1, v2)) {
          o.$eq = v1;
        } else {
          return false;
        }

        break;

      case '$ne':
        if (_.isEqual(v1, v2)) {
          o.$ne = v1;
        } else {
          addToNin([ v1, v2 ]);
        }

        break;

      case '$lt':
        o.$lt = Math.min(v1, v2);
        break;

      case '$ge':
        o.$ge = Math.max(v1, v2);
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

  return simplifyOpObject(o);
}

function simplifyOpObject(o) {

  //
  // Simplify and check for contradictions
  //

  let inv = o.$in,
      eqv = o.$eq,
      nev = o.$ne;
  if (inv) {
    validateInArray(inv);

    if (eqv) {
      if (!includes(inv, eqv)) {
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
    if (_.isEqual(eqv, nev)) {
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

  if (_.isEqual(query1, query2)) {
    return simplify(query1);
  }

  let query = {},
      canMerge = true;

  for (const n in query1) {
    const v1 = query1[n],
          v2 = query2[n];

    if (!v2 || _.isEqual(v1, v2)) {
      query[n] = simplify(v1);
      continue;
    } else if (!v1) {
      query[n] = v2;
      continue;
    } else {
      const v = mergeOpObject(v1, v2);

      if (v === false) {
        query = false;
      } else if (v === null) {
        canMerge = false;
      } else {
        query[n] = v;
      }
    }

    if (!canMerge) {
      return { $and: [ query1, query2 ] };
    } else if (!query) {
      return query;
    }
  }

  for (const n in query2) {
    const v1 = query1[n],
          v2 = query2[n];

    if (!v1) {
      query[n] = v2;
    }
  }

  return query;
};

const query = {
  merge
};

Tyr.query = query;

export default query;
