
import Tyr from '../tyr';

//import _   from 'lodash';


const _asterisk = 42;
const _minus    = 45;
const _slash    = 47;
const _0        = 48;
const _9        = 57;
const _A        = 64;
const _Z        = 90;
const _caret    = 94;
const _a        = 97;
const _z        = 122;

const isLetter = code => (code >= _A && code <= _Z) || (code >= _a && code <= _z);
const isDigit  = code => code >= _0 && code <= _9;



class UnitDegree {
  constructor(unit, degree) {
    this.unit   = unit;
    this.degree = degree;
  }
}

class Units {
  constructor(sid, comps) {

    Object.defineProperty(this, 'sid',   { value: sid });
    Object.defineProperty(this, 'comps', { value: comps });

    for (const comp of comps) {
      this[comp.unit.sid] = comp.degree;
    }
  }
};

const bySid = {};

function sortByDegreeThenAbbrev(ud1, ud2) {
  let d1 = ud1.degree;
  if ( d1 < 0 ) {
    // we want negative degrees at the end, with larger negatives further back
    d1 = 32768 - d1;
  }

  let d2 = ud2.degree;
  if ( d2 < 0 ) {
    d2 = 32768 - d2;
  }

  const diff = d1 - d2;
  if (diff) {
    return diff;
  }

  return ud1.unit.abbreviation.localeCompare(ud2.unit.abbreviation);
}

function make(unitDegrees) {
  unitDegrees.sort(sortByDegreeThenAbbrev);

  let sid = '';
  for (const ud of unitDegrees) {
    sid += ud.unit.sid;
    sid += ud.degree;
  }

  let units = bySid[sid];

  if (!units) {
    units = new Units(sid, unitDegrees);
    bySid[sid] = units;
  }

  return units;
}

/**
 * Given "a2b-3c2" this returns 3.
 */
function countComponents(components) {

  const len = components.length;
  let c = 0,
      identifier = false;

  for (let i=0; i<len; i++) {
    const ch = components.charCodeAt(i);

    if (isLetter(ch)) {
      if (!identifier) {
        identifier = true;
        c++;
      }
    } else if (ch === _minus || ch === _caret || isDigit(ch) || ch === _slash || ch === _asterisk) {
      if (!c) {
        throw new Error(`A units component clause must start with an identifier in "${components}"`);
      }

      identifier = false;
    } else {
      throw new Error(`Illegal character in unit components clause: ${ch} in "${components}"`);
    }
  }

  return c;
}

Units.parse = function(text) {

  if (!text) {
    return; // undefined
  }

  const compCount = countComponents(text);
  if (!compCount) {
    return; // undefined
  }

  const len   = text.length,
        comps = new Array(compCount);

  let multiplier = 1,
      pos = 0,
      nextComp = 0;


  //console.log(`parsing unit ${text}:`);
  while (pos < len) {
    let ch = text.charCodeAt(pos);

    if (ch === _slash) {
      multiplier *= -1;
      pos++;
    } else if (ch === _asterisk) {
      pos++;
    }

    let s = pos;
    for (; pos<len; pos++) {
      ch = text.charCodeAt(pos);

      if (!isLetter(ch)) {
        break;
      }
    }

    const name = text.substring(s, pos);
    const unit = Tyr.Unit.parse(name);
    if (!unit) {
      throw new Error(`Unknown unit "${name}" in "${text}"`);
    }

    if (pos<len && text.charCodeAt(pos) === _caret) {
      pos++;
    }

    s = pos;
    if (pos<len && text.charCodeAt(pos) === _minus) {
      pos++;
    }

    while (pos<len && isDigit(text.charCodeAt(pos))) {
      pos++;
    }

    const degreeText = text.substring(s, pos);

    let degree;
    if (!degreeText.length) {
      degree = 1;
    } else {
      degree = Number.parseInt(degreeText);
      if (isNaN(degree)) {
        throw new Error(`Illegal degree "${degreeText}" in "${text}"`);
      }
    }

    degree *= multiplier;

    let ci = 0;
    for (; ci<nextComp; ci++) {
      const comp = comps[ci];

      if (comp.unit === unit) {
        comp.degree += degree;
        break;
      }
    }

    if (ci >= nextComp) {
      comps[nextComp++] = new UnitDegree(unit, degree);
    }

    //console.log(` + ${name} ==> ${degree}`);
  }

  return make(comps);
}

Tyr.Units = Units;
export default Units;
