
//import _   from 'lodash';

import Tyr from '../tyr';

import * as U from './unitUtil';



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
  if (d1 < 0) {
    // we want negative degrees at the end, with larger negatives further back
    d1 = 32768 - d1;
  }

  let d2 = ud2.degree;
  if (d2 < 0) {
    d2 = 32768 - d2;
  }

  const diff = d1 - d2;
  if (diff) {
    return diff;
  }

  return ud1.unit.abbreviation.localeCompare(ud2.unit.abbreviation);
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
  U.compact(base);
  base.sort(sortByAbbrev);
  return make(base);
}


//
//  Units
//

class Units {
  constructor(sid, components) {
    Object.defineProperty(this, 'sid',         { value: sid });
    Object.defineProperty(this, 'components',  { value: components });
    Object.defineProperty(this, 'conversions', { value: {} });

    let complex = false;
    for (const comp of components) {
      const u = comp.unit;
      if (u.units) {
        complex = true;
      }

      this[u.sid] = comp.degree;
    }

    let base = complex ? deriveBase(components) : this;
    Object.defineProperty(this, 'base', { value: base });
    const Type = Tyr.UnitType;

    const typeComponents = base.components.map(comp => ({
      type:   comp.unit.type$,
      degree: comp.degree
    }));

    U.merge('type', typeComponents);

    Object.defineProperty(this, 'type', {
      value: Tyr.UnitType.byComponents(typeComponents)
    });
  }

  isCompatibleWith(units) {
    return this.type === units.type;
  }
};


//
//  Unit Parsing
//

const bySid = {};

function make(unitDegrees) {
  U.compact(unitDegrees);
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

Units.parse = function(text) {

  if (!text) {
    return; // undefined
  }

  const compCount = U.countComponents(text);
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

    if (ch === U.slash) {
      multiplier *= -1;
      pos++;
    } else if (ch === U.asterisk) {
      pos++;
    }

    let s = pos;
    for (; pos<len; pos++) {
      ch = text.charCodeAt(pos);

      if (!U.isLetter(ch)) {
        break;
      }
    }

    const name = text.substring(s, pos);
    const unit = Tyr.Unit.parse(name);
    if (!unit) {
      throw new Error(`Unknown unit "${name}" in "${text}"`);
    }

    if (pos<len && text.charCodeAt(pos) === U.caret) {
      pos++;
    }

    s = pos;
    if (pos<len && text.charCodeAt(pos) === U.minus) {
      pos++;
    }

    while (pos<len && U.isDigit(text.charCodeAt(pos))) {
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

Tyr.Units = Units;
export default Units;
