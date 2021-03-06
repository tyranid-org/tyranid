import * as _ from 'lodash';

import Tyr from '../tyr';

import * as Uu from './unitUtil';
import { getExchangeRate } from './exchangeRate';

//
//  Unit Degrees
//

class UnitDegree {
  constructor(unit, degree) {
    this.unit = unit;
    this.degree = degree;
  }
}

function sortByAbbrev(ud1, ud2) {
  return ud1.unit.abbreviation.localeCompare(ud2.unit.abbreviation);
}

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
      for (var i = 0; i < next; i++) {
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
  Uu.compact(base);
  base.sort(sortByAbbrev);
  return make(base);
}

//
//  Units
//

class Units {
  constructor(sid, components) {
    Object.defineProperty(this, 'sid', { value: sid });
    Object.defineProperty(this, 'components', { value: components });
    Object.defineProperty(this, 'conversions', { value: {} });

    let complex = false;
    for (const comp of components) {
      const u = comp.unit;
      if (u.units) {
        complex = true;
      }

      this[u.sid] = comp.degree;
    }

    const base = complex ? deriveBase(components) : this;
    Object.defineProperty(this, 'base', { value: base });

    const typeComponents = base.components.map(comp => ({
      type: comp.unit.type,
      degree: comp.degree,
    }));

    Uu.merge('type', typeComponents);

    Object.defineProperty(this, 'type', {
      value: Tyr.UnitType.byComponents(typeComponents),
    });
  }

  isCompatibleWith(units) {
    return this.type === units.type;
  }
}

const bySid = {};

//
//  Unit Parsing
//

function make(unitDegrees) {
  Uu.compact(unitDegrees);
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

Units.parse = function (text) {
  if (!text) {
    return; // undefined
  }

  // this method can be used as a tagged template string
  const r = text.raw;
  if (r) {
    text = r[0];
  }

  const compCount = Uu.countComponents(text);
  if (!compCount) {
    return; // undefined
  }

  const len = text.length,
    components = new Array(compCount);

  let multiplier = 1,
    pos = 0,
    nextComp = 0;

  //console.log(`parsing unit ${text}:`);
  while (pos < len) {
    let ch = text.charCodeAt(pos);

    if (ch === Uu.slash) {
      multiplier *= -1;
      pos++;
    } else if (ch === Uu.asterisk) {
      pos++;
    }

    let s = pos;
    for (; pos < len; pos++) {
      ch = text.charCodeAt(pos);

      if (!Uu.isLetter(ch)) {
        break;
      }
    }

    const name = text.substring(s, pos);
    const unit = Tyr.Unit.parse(name);
    if (!unit) {
      throw new Error(`Unknown unit "${name}" in "${text}"`);
    }

    if (pos < len && text.charCodeAt(pos) === Uu.caret) {
      pos++;
    }

    s = pos;
    if (pos < len && text.charCodeAt(pos) === Uu.minus) {
      pos++;
    }

    while (pos < len && Uu.isDigit(text.charCodeAt(pos))) {
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
    for (; ci < nextComp; ci++) {
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
};

Tyr.U = Units.parse.bind(Units);

//
//  Unit Conversion
//

class UnitConversionError {
  constructor(fromValue, from, to) {
    this.fromValue = fromValue;
    this.from = from;
    this.to = to;
  }

  get message() {
    return `Cannot convert "${this.fromValue}" from ${this.from} to ${this.to}`;
  }

  toString() {
    return this.message;
  }
}

const INCOMPATIBLE = 'INCOMPATIBLE',
  MANUAL = 'MANUAL';

Units.prototype.convert = function (value, targetUnit) {
  if (targetUnit === this) {
    return value;
  }

  const existingConversion = this.conversions[targetUnit.sid];

  if (_.isNumber(existingConversion)) {
    return value * existingConversion;
  }

  const Unit = Tyr.Unit;

  let conversion = existingConversion;

  if (!existingConversion && !this.isCompatibleWith(targetUnit)) {
    conversion = INCOMPATIBLE;
  }

  OUTER: if (conversion !== INCOMPATIBLE) {
    while (true) {
      // example:  5 m/s to x ft/s

      const sbc = this.base.components;
      const tbc = targetUnit.base.components;

      const difference = new Array(sbc.length + tbc.length);
      let next = 0;

      // Step 1:  Subtract the old units from the new ones

      let spos = 0;
      let tpos = 0;

      //console.log(`s=${sbc.length} t=${tbc.length}`);

      while (true) {
        if (spos >= sbc.length || tpos >= tbc.length) {
          break;
        }

        const sud = sbc[spos];
        const tud = tbc[tpos];

        const sabbrev = sud.unit.abbreviation;
        const tabbrev = tud.unit.abbreviation;
        //console.log(sabbrev + ' versus ' + tabbrev);

        const diff = tabbrev.localeCompare(sabbrev);

        if (!diff) {
          const degree = sud.degree - tud.degree;

          if (degree) {
            difference[next++] = new UnitDegree(sud.unit, degree);
          }

          spos++;
          tpos++;
        } else if (diff < 0) {
          difference[next++] = new UnitDegree(tud.unit, -tud.degree);
          tpos++;
        } else {
          difference[next++] = new UnitDegree(sud.unit, sud.degree);
          spos++;
        }
      }

      while (spos < sbc.length) {
        const sud = sbc[spos++];
        difference[next++] = new UnitDegree(sud.unit, sud.degree);
      }

      while (tpos < tbc.length) {
        const tud = tbc[tpos++];
        difference[next++] = new UnitDegree(tud.unit, -tud.degree);
      }

      {
        // Handle Temperature Conversions Manually

        let temperatures = 0;
        let additive = 0;
        for (let i = 0; i < next; i++) {
          const ud = difference[i];
          const u = ud.unit;

          if (
            u === Unit.KELVIN ||
            u === Unit.CELSIUS ||
            u === Unit.FAHRENHEIT
          ) {
            temperatures++;
            additive += ud.degree;

            if (ud.degree !== 1 && ud.degree !== -1) {
              conversion = INCOMPATIBLE;
              break OUTER;
            }
          }
        }

        if (temperatures > 0) {
          if (additive !== 0 || temperatures !== 2 || next !== 2) {
            conversion = INCOMPATIBLE;
            break OUTER;
          }

          let from, to;

          if (difference[0].degree === 1) {
            from = difference[0].unit;
            to = difference[1].unit;
          } else {
            from = difference[1].unit;
            to = difference[0].unit;
          }

          // Step 1:  convert to Kelvin to normalize it

          if (from === Unit.CELSIUS) {
            value = value + 273.15;
          } else if (from === Unit.FAHRENHEIT) {
            value = ((value - 32) * 5) / 9 + 273.15;
          }

          // Step 2:  convert from Kelvin to the target temperature if it's not Kelvin

          if (to === Unit.CELSIUS) {
            value -= 273.15;
          } else if (to === Unit.FAHRENHEIT) {
            value = ((value - 273.15) * 9) / 5 + 32;
          }

          conversion = MANUAL;
          break OUTER;
        }
      }

      //console.log( "next=" + next );
      let multiplier = 1.0,
        currencyFrom,
        currencyTo;
      for (let i = 0; i < next; i++) {
        const ud = difference[i];

        if (ud.unit.type.name === 'currency') {
          switch (ud.degree) {
            case -1:
              if (currencyTo) {
                conversion = INCOMPATIBLE;
                break OUTER;
              }

              currencyTo = ud;
              break;

            case 1:
              if (currencyFrom) {
                conversion = INCOMPATIBLE;
                break OUTER;
              }

              currencyFrom = ud;
              break;

            default:
              conversion = INCOMPATIBLE;
              break OUTER;
          }
        } else {
          //console.log(`${i}: ${ud.unit.abbreviation} ==> ${ud.degree}  mult: ${ud.unit.baseMultiplier}`);
          multiplier *= Math.pow(ud.unit.baseMultiplier, ud.degree);
        }
      }

      if (currencyFrom) {
        if (!currencyTo) {
          conversion = INCOMPATIBLE;
          break OUTER;
        }

        const exchangeRate = getExchangeRate(
          currencyFrom.unit.abbreviation,
          currencyTo.unit.abbreviation
        );

        if (exchangeRate === undefined) {
          conversion = INCOMPATIBLE;
          break OUTER;
        } else {
          multiplier *= exchangeRate;
        }
      } else if (currencyTo) {
        conversion = INCOMPATIBLE;
        break OUTER;
      }

      conversion = multiplier;
      value *= multiplier;
      break;
    }
  }

  if (!existingConversion) {
    this.conversions[targetUnit.sid] = conversion;
  }

  if (conversion === INCOMPATIBLE) {
    throw new UnitConversionError(value, this, targetUnit);
  }

  return value;
};

//
//  Unit Arithmetic
//

Units.prototype.add = function (value, addUnit, addValue) {
  addValue = addUnit.convert(addValue, this);
  return value + addValue;
};

Units.prototype.subtract = function (value, subUnit, subValue) {
  subValue = subUnit.convert(subValue, this);
  return value - subValue;
};

function multAdd(len, components, addComponents, mult) {
  for (const addComp of addComponents) {
    const addUnit = addComp.unit,
      addDegree = addComp.degree * mult;
    let ci = 0;

    for (; ci < len; ci++) {
      const comp = components[ci];

      if (comp.unit === addUnit) {
        comp.degree += addDegree;
        break;
      }
    }

    if (ci === len) {
      components[len++] = new UnitDegree(addUnit, addDegree);
    }
  }

  return len;
}

function mult(name, units, by) {
  let multipliers = units[name];
  if (!multipliers) {
    multipliers = {};
    Object.defineProperty(units, name, { value: multipliers });
  }

  let is = multipliers[by.sid];
  if (!is) {
    const components = new Array(
      units.components.length + by.components.length
    );
    let len = 0;

    len = multAdd(len, components, units.components, 1);
    len = multAdd(len, components, by.components, name === 'divisors' ? -1 : 1);
    components.length = len;

    multipliers[by.sid] = is = make(components);
  }

  return is;
}

Units.prototype.multiply = function (byUnits) {
  return mult('multipliers', this, byUnits);
};

Units.prototype.divide = function (byUnits) {
  return mult('divisors', this, byUnits);
};

Units.prototype.invert = function () {
  let inversion = this.inversion;
  if (!inversion) {
    const components = new Array(this.components.length);
    multAdd(0, components, this.components, -1);
    inversion = make(components);

    Object.defineProperty(this, 'inversion', { value: inversion });
  }

  return inversion;
};

//
// Normals
//

Units.prototype.normal = function () {
  const Unit = Tyr.Unit;
  let normal = this._normal;

  if (!normal) {
    const nuds = this.base.components.map(
      comp => new UnitDegree(Unit.bySid[comp.unit.type.normal], comp.degree)
    );
    Uu.merge('unit', nuds);
    normal = make(nuds);
    Object.defineProperty(this, '_normal', { value: normal });
  }

  return normal;
};

//
// Units formatting
//

Units.prototype.toString = function () {
  let str = '',
    positiveFound = false,
    inverse = false,
    floatingOne = false;

  for (const ud of this.components) {
    if (ud.degree > 0) {
      positiveFound = true;
    } else if (ud.degree < 0 && positiveFound && !inverse) {
      inverse = true;
      str += '/';
      floatingOne = false;
    }

    if (floatingOne) {
      str += '1';
      floatingOne = false;
    }

    str += ud.unit.abbreviation;

    const degree = inverse ? ud.degree * -1 : ud.degree;
    if (degree !== 1) {
      str += degree;
    } else {
      floatingOne = true;
    }
  }

  return str;
};

for (const prop of [
  'convert',
  'add',
  'subtract',
  'multiply',
  'divide',
  'invert',
  'normal',
  'toString',
]) {
  Object.defineProperty(Units.prototype, prop, { enumerable: false });
}

Tyr.UnitDegree = UnitDegree;
Tyr.Units = Units;
export default Units;
