
import * as _   from 'lodash';
import Tyr from '../tyr';

const isArray = Array.isArray,

      O_DELETE = 0,
      O_TRUNCATE_ARRAY_BY_1 = 1,

      T_ARRAY  = 0,
      T_OBJECT = 1;

function badPatch() {
  return new Error('Bad patch');
}

// ***
// *** NOTE:  The patch format and all the methods are documented at http://tyranid.org/diff
// ***

//
// Objects
//

function diffObj(a, b, props) {
  const diffs = {};

  // TODO:  maybe implement two versions of this algo, one if props is present, one if it isn't,
  //        because it's probably faster to outerloop props if it is present

  for (const prop in a) {
    if (   !a.hasOwnProperty(prop)
        || (props && !props[prop])) {
      continue;
    }

    const av = a[prop],
          bv = b[prop];

    if (!Tyr.isEqual(av, bv)) {
      if (bv === undefined) {
        diffs[prop] = O_DELETE;
      } else {
        if (isArray(av)) {
          if (isArray(bv)) {
            diffs[prop] = [ T_ARRAY, diffArr(av, bv) ];
          } else {
            diffs[prop] = [ bv ];
          }
        } else if (isArray(bv)) {
          diffs[prop] = [ bv ];
        } else if (Tyr.isObject(av) && Tyr.isObject(bv)) {
          diffs[prop] = [ T_OBJECT, diffObj(av, bv) ];
        } else {
          diffs[prop] = [ bv ];
        }
      }
    }
  }

  for (const prop in b) {
    if (   !b.hasOwnProperty(prop)
        || (props && !props[prop])) {
      continue;
    }

    if (!(prop in a)) {
      const bv = b[prop];

      diffs[prop] = [ bv ];
    }
  }

  return diffs;
}

function patchObj(a, patch, props) {

  for (let prop in patch) {
    if (props && !props[prop]) {
      continue;
    }

    const pv = patch[prop];

    if (pv === O_DELETE) {
      delete a[prop];
      continue;
    } else if (pv === O_TRUNCATE_ARRAY_BY_1) {
      let arr;

      if (prop.indexOf('|')) {
        prop = Tyr.NamePath.decode(prop);
      }

      if (prop.indexOf('.') < 0) {
        arr = a[prop];
      } else {
        const collection = a.$model;
        if (!collection) {
          throw new Error('the patched document must be a tyranid document (not a pojo) for this type of patch');
        }

        arr = collection.parsePath(prop).get(a);
      }

      if (!_.isArray(arr)) {
        throw new Error('the value at path in the patch is not an array');
      }

      if (!arr.length) {
        Tyr.warn({ e: 'historical', m: `the array at path "${prop}" in the patch is already empty` }, new Error());
        continue;
      }

      arr.length--;
      continue;

    } else if (_.isArray(pv)) {
      switch (pv.length) {
      case 1:
        // these parseBson() calls are due to invalid bson data present due to earlier bug
        a[prop] = Tyr.cloneDeep(Tyr.parseBson(pv[0]));
        continue;

      case 2:
        const [ type, ipatch ] = pv;

        switch (type) {
        case T_ARRAY:
          patchArr(a[prop], ipatch);
          continue;

        case T_OBJECT:
          patchObj(a[prop], ipatch);
          continue;
        }

        throw badPatch();
      }
    }

    throw badPatch();
  }
}

//
// Arrays
//

// this value works because "$" properties cannot be stored in mongo
const USED = { $used_: 0 };

function diffArr(a, b) {

  const alen = a.length,
        blen = b.length,

        diff = {};

  a = _.clone(a);

  for (let bi = 0; bi < blen; bi++) {
    const bv = b[bi];

    // if the same object is in same place, skip to next one
    if (bi < alen && Tyr.isEqual(bv, a[bi])) {
      a[bi] = USED; // remove this value from consideration in future checks
      continue;
    }

    // try to find this object in the original array
    const ai = _.indexOf(a, bv);
    if (ai >= 0) {
      diff[bi] = ai;
      a[ai] = USED;
      continue;
    }

    // new addition
    diff[bi] = [ bv ];
  }

  if (blen < alen) {
    // truncate the array
    diff.n = blen;
  }

  // compress runs
  let offset, runLen = 0, bi = 0;

  /*
    transform things like:

    {
      0: 1,
      1: 2,
      2: 3,
      3: 4,
      n: 4
    }

    into things like:

    {
      0: [ 1, 4 ],   // targetIndex: [ offset, runLength ]
      n: 4
    }

   */
  function compressRun() {
    if (runLen > 1 && offset) {
      let ri = bi - runLen;
      diff[ri] = [ offset, runLen ];
      for (ri++; ri < bi; ri++) {
        delete diff[ri];
      }
    }
  }

  for (; bi < blen; bi++) {
    const bv = diff[bi];
    const cOffset = Number.isInteger(bv) ? bv - bi : undefined;

    if (cOffset === offset) {
      runLen++;
      continue;
    }

    compressRun();
    runLen = 1;
    offset = cOffset;
  }

  compressRun();

  return diff;
}

function patchArr(a, patch) {
  const orig = _.clone(a);
  let n;

  for (const pn in patch) {
    const pi = parseInt(pn, 10),
          pv = patch[pn];

    if (isNaN(pi)) {
      if (pn === 'n') {
        n = pv;
      } else {
        throw badPatch();
      }
    } else {
      if (isArray(pv)) {
        switch (pv.length) {
        case 1:
          a[pi] = Tyr.cloneDeep(Tyr.parseBson(pv[0]));
          continue;

        case 2:
          const [ offset, len ] = pv;
          const plen = pi + len;

          for (let i = pi; i < plen; i++) {
            a[i] = orig[i + offset];
          }

          continue;
        }

        throw badPatch();
      }

      const fi = parseInt(pv, 10);

      if (isNaN(fi)) {
        throw badPatch();

      } else {
        a[pi] = orig[fi];
      }
    }
  }

  if (n !== undefined) {
    a.length = n;
  }
}

const ns = {
  diffObj,
  patchObj,

  diffArr,
  patchArr
};

Tyr.diff = ns;

export default ns;
