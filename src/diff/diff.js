
import _ from 'lodash';

/*

    X. simple obj diff

    X. simple array diff

       X. array run compression

    /. composite differ that combines array/object differencing

    /. patching that undos differencing

 */


const isArray = Array.isArray;

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
function objDiff(a, b) {
  const diffs = {};

  for (const prop in a) {
    const av = a[prop],
          bv = b[prop];

    if (av !== bv) {
      if (bv === undefined) {
        diffs[prop] = 0;
      } else {
        if (isArray(av) && isArray(bv)) {
          diffs[prop] = [ 0, arrDiff(av, bv) ];
        } else {
          // TODO:  check for the case where av and bv are both objects

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

// this value works because "$" properties cannot be stored in mongo
const USED = { $used_: 0 };

/*

    [1, 2, 3]       => [1, 3]       = { 2: 1 }                         OR { 1: -1 }
    [1, 2, 3, 4, 5] => [2, 3, 4, 5] = { 0: 1, 1: 2, 2: 3, 3: 4, n: 4 } OR { 0: -1 }

    transform:

    {
      0: 1,
      1: 2,
      2: 3,
      3: 4,
      n: 4
    }

    into:

    {
      0: { s: 1, n: 4 },
      n: 4                 // should be able to detect that this was missing ?
    }

    ---

    {
      0: 1,
      1: 2,
      2: 3,
      3: 4,
      4: 0
    }

    {
      0: { s: 1, n: 4 },
      4: 0
    }




 */
function arrDiff(a, b) {

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


// /* eslint eqeqeq: 0 */
/* eslint-disable */
/*
export function arrDiff(a, b) {

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
  obj: objDiff,
  arr: arrDiff
};
