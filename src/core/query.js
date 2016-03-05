
import _            from 'lodash';
import { ObjectId } from 'promised-mongo';

import Tyr          from '../tyr';


function isValue(v) {
  return !_.isObject(v) || (v instanceof ObjectId);
}

function isIn(v) {
  if (_.isObject(v) && v.$in && _.size(v) === 1) {
    if (!_.isArray(v.$in)) {
      throw new Error(`Invalid query, $in did not contain an array: "${v}"`);
    }

    return true;
  }

  //return undefined;
}

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

function merge(query1, query2) {
  if (!query1) {
    return query2;
  } else if (!query2) {
    return query1;
  }

  if (_.isEqual(query1, query2)) {
    return query1;
  }

  let query = {},
      canMerge = true;

  const mergeIn = (n, inv, v) => {
    const arr = inv.$in;

    if (isIn(v)) {
      const iarr = intersection(arr, v.$in);

      switch (iarr.length) {
      case 0:
        query = false;
        return;
      case 1:
        query[n] = iarr[0];
        break;
      default:
        query[n] = { $in: iarr };
      }

    } else {
      if (includes(arr, v)) {
        query[n] = v;
      } else if (!isValue(v)) {
        canMerge = false;
      } else {
        query = false;
      }
    }
  };

  for (const n in query1) {
    const v1 = query1[n],
          v2 = query2[n];

    if (!v2 || _.isEqual(v1, v2)) {
      query[n] = v1;
      continue;
    } else if (!v1) {
      query[n] = v2;
      continue;
    } else if (isIn(v1)) {
      mergeIn(n, v1, v2);
    } else if (isIn(v2)) {
      mergeIn(n, v2, v1);
    } else {
      //console.log('v1', v1, 'v2', v2);
      canMerge = false;
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
