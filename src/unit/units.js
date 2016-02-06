
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


class Units {
};


/**
 * Given "a2b-3c2" this returns 3.
function countComponents(components) {

  let c = 0,
      identifier = false,
      len = components.length;

  for (let i=0; i<len; i++) {
    const ch = components.charCodeAt(i);

    if (isLetter(ch)) {
      if (!identifier) {
        identifier = true;
        c++;
      }
    } else if (ch == _minus || ch == _caret || isDigit(ch) || ch == _slash || ch == _asterisk) {
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
*/

Units.parse = function(text) {

  if (!text) {
    return; // undefined
  }

  let multiplier = 1;
  let pos = 0;

  const len = text.length,
        units = new Units();

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
    const unit = Tyr.Unit.bySymbol[name] || Tyr.UnitFactor.factor(name);
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
    const abbrev = unit.abbreviation;
    units[abbrev] = (units[abbrev] || 0) + degree;

    //console.log(` + ${name} ==> ${degree}`);
  }

  return units;
}

Tyr.Units = Units;
export default Units;
