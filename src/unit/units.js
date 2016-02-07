
import Tyr from '../tyr';

//import _   from 'lodash';




class Units {
  constructor(sid, components) {

    Object.defineProperty(this, 'sid',         { value: sid });
    Object.defineProperty(this, 'components',  { value: components });
    Object.defineProperty(this, 'conversions', { value: {} });

    for (const comp of components) {
      this[comp.unit.sid] = comp.degree;
    }
  }
};


//
//  Unit Degrees
//

class UnitDegree {
  constructor(unit, degree) {
    this.unit   = unit;
    this.degree = degree;
  }
}

function sortByAbbrev(ud1, ud2) {
  return ud1.unit.abbreviation.localeCompare(ud2.unit.abbreviation);
};

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


//
//  Unit Parsing
//

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

const bySid = {};

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

  const len        = text.length,
        components = new Array(compCount);

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
      const comp = components[ci];

      if (comp.unit === unit) {
        comp.degree += degree;
        break;
      }
    }

    if (ci >= nextComp) {
      components[nextComp++] = new UnitDegree(unit, degree);
    }

    //console.log(` + ${name} ==> ${degree}`);
  }

  components.length = nextComp;
  return make(components);
}


//
//  Base Analysis
//

function addBase(next, base, add, degree) {

  for (const ud of add) {
    const units = ud.unit.units;
    if (units) {
      next = addBase(next, base, units.base.components, degree * ud.degree);
    } else {
      let i = 0;
      for ( ; i<next; i++) {
        const bud = base[i];

        if (bud.unit === ud.unit) {
          bud.degree += ud.degree * degree;
          break;
        }
      }

      if (i === next) {
        base[next++] = new UnitDegree(ud.unit, ud.degree * degree);
      }
    }
  }

  return next;
}

function deriveBase(components) {
  if (!components || !components.length) {
    return; // undefined
  }

  const base = new Array(components.length * 4);
  base.length = addBase(0, base, components, 1);
  base.sort(sortByAbbrev);
  return make(base);
}

Object.defineProperty(Units.prototype, 'base', {
  get: function() {
    if (!this._base) {
      const components = this.components;
      Object.defineProperty(this, '_base', { value: components ? deriveBase(components) : this });
    }

    return this._base;
  }
});


Tyr.Units = Units;
export default Units;
