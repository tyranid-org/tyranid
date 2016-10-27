
import _ from 'lodash';

const isArray = Array.isArray,

      T_ARRAY  = 0,
      T_OBJECT = 1;

function badPatch() {
  return new Error('Bad patch');
}


//
// Objects
//

/**
 * Returns the differences to transform a into b
 *
 * {
 *   <prop>: 0            // prop was removed
 *   <prop>: [ <value> ]  // prop changed to <value>
 * }
 *
 *
 */
function diffObj(a, b) {
  const diffs = {};

  for (const prop in a) {
    const av = a[prop],
          bv = b[prop];

    if (!_.isEqual(av, bv)) {
      if (bv === undefined) {
        diffs[prop] = 0;
      } else {
        if (isArray(av)) {
          if (isArray(bv)) {
            diffs[prop] = [ T_ARRAY, diffArr(av, bv) ];
          } else {
            diffs[prop] = [ bv ];
          }
        } else if (isArray(bv)) {
          diffs[prop] = [ bv ];
        } else if (_.isObject(av) && _.isObject(bv)) {
          diffs[prop] = [ T_OBJECT, diffObj(av, bv) ];
        } else {
          diffs[prop] = [ bv ];
        }
      }
    }
  }

  for (const prop in b) {
    if (!(prop in a)) {
      const bv = b[prop];

      diffs[prop] = [ bv ];
    }
  }

  return diffs;
}

function patchObj(a, patch) {

  for (const prop in patch) {
    const pv = patch[prop];

    if (pv === 0) {
      delete a[prop];
      continue;
    } else if (_.isArray(pv)) {
      switch (pv.length) {
      case 1:
        a[prop] = _.cloneDeep(pv[0]);
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

/*
   Generates a patch of the format:

    [1, 2, 3]       => [1, 3]       = { 2: 1 }
    [1, 2, 3, 4, 5] => [2, 3, 4, 5] = { 0: [ 1, 4 ], n: 4 }

 */
function diffArr(a, b) {

  const alen = a.length,
        blen = b.length,

        diff = {};

  a = _.clone(a);

  for (let bi=0; bi<blen; bi++) {
    const bv = b[bi];

    // if the same object is in same place, skip to next one
    if (bi < alen && _.isEqual(bv, a[bi])) {
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
      for (ri++; ri<bi; ri++) {
        delete diff[ri];
      }
    }
  }

  for (; bi<blen; bi++) {
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
    const pi = parseInt(pn),
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
          a[pi] = _.cloneDeep(pv[0]);
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

      const fi = parseInt(pv);

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

// /* eslint eqeqeq: 0 */
/* eslint-disable */
/*
export function diffArr(a, b) {

  var as = {};
  var bs = {};

  for ( var i = 0; i < a.length; i++ ) {
    if ( as[ a[i] ] == null )
      as[ a[i] ] = { rows: [], b: null };
    as[ a[i] ].rows.push( i );
  }

  for ( var i = 0; i < b.length; i++ ) {
    if ( bs[ b[i] ] == null )
      bs[ b[i] ] = { rows: [], a: null };
    bs[ b[i] ].rows.push( i );
  }

  console.log('\nas', as, '\n\nbs', bs);

  for ( var i in as ) {
    if ( as[i].rows.length == 1 && typeof(bs[i]) !== 'undefined' && bs[i].rows.length == 1 ) {
      console.log('here');
      a[ as[i].rows[0] ] = { text: a[ as[i].rows[0] ], row: bs[i].rows[0] };
      b[ bs[i].rows[0] ] = { text: b[ bs[i].rows[0] ], row: as[i].rows[0] };
    }
  }

  for ( var i = 0; i < a.length - 1; i++ ) {
    if ( a[i].text != null && a[i+1].text == null && a[i].row + 1 < b.length && b[ a[i].row + 1 ].text == null &&
         a[i+1] == b[ a[i].row + 1 ] ) {
      a[i+1] = { text: a[i+1], row: a[i].row + 1 };
      b[a[i].row+1] = { text: b[a[i].row+1], row: i + 1 };
    }
  }

  for ( var i = a.length - 1; i > 0; i-- ) {
    if ( a[i].text != null && a[i-1].text == null && a[i].row > 0 && b[ a[i].row - 1 ].text == null &&
         a[i-1] == b[ a[i].row - 1 ] ) {
      a[i-1] = { text: a[i-1], row: a[i].row - 1 };
      b[a[i].row-1] = { text: b[a[i].row-1], row: i - 1 };
    }
  }

  console.log('\na', a, '\n\nb', b);
  return { b: b, a: a };
}
*/
/* eslint eqeqeq: 1 */

//export function patch(a, delta) {

//}

export default {
  diffObj,
  patchObj,

  diffArr,
  patchArr
};
