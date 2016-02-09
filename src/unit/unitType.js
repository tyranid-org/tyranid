
import Tyr from '../tyr';
import Collection from '../classes/Collection';

import * as U from './unitUtil';


const UnitType = new Collection({
  id: '_u1',
  name: 'unitType',
  enum: true,
  client: false,
  fields: {
    _id:              { is: 'integer' },
    name:             { is: 'string', labelField: true },
    abbreviation:     { is: 'string' },
    formula:          { is: 'string' },
    normal:           { is: 'string' },
    note:             { is: 'string' }
  },
  values: [
    [ '_id', 'name',                   'formula' ],
    [     1, 'none',                   null,            { abbreviation: 'none', normal: 'none', note: 'No units.' } ],
    [     2, 'length',                 null,            { abbreviation: 'l',    normal: 'm',    note: 'Length.' } ],
    [     3, 'mass',                   null,            { abbreviation: 'm',    normal: 'kg',   note: 'Mass.' } ],
    [     4, 'duration',               null,            { abbreviation: 's',    normal: 's',    note: 'Time.' } ],
    [     5, 'current',                null,            { abbreviation: 'cur',  normal: 'A',    note: 'Electric current.' } ],
    [     6, 'temperature',            null,            { abbreviation: 't',    normal: 'K',    note: 'Thermodynamic temperature.' } ],
    [     7, 'substance',              null,            { abbreviation: 'sub',  normal: 'mol',  note: 'Amount of substance.' } ],
    [     8, 'luminosity',             null,            { abbreviation: 'lum',  normal: 'cd',   note: 'Luminous intensity.' } ],
    [     9, 'currency',               null,            { abbreviation: 'c',                    note: '' } ],
    [    10, 'bit',                    null,            { abbreviation: 'bit',  normal: 'bit',  note: 'Binary digit.' } ],
    [    11, 'area',                   'l2',            ],
    [    12, 'volume',                 'l3',            ],
    [    13, 'velocity',               'l/s',           ],
    [    14, 'acceleration',           'l/s2',          ],
    [    15, 'waveNumber',             'l-1',           ],
    [    16, 'density',                'm/l3',          ],
    [    17, 'specificVolume',         'l3/m',          ],
    [    18, 'currentDensity',         'cur/l2',        ],
    [    19, 'magneticFieldStrength',  'cur/l',         ],
    [    20, 'concentration',          'sub/l3',        ],
    [    21, 'luminance',              'lum/l2',        ],
    [    22, 'planeAngle',             'l/l',           ],
    [    23, 'solidAngle',             'l2/l2',         ],
    [    24, 'frequency',              's-1',           ],
    [    25, 'force',                  'l1m1/s2',       ],
    [    26, 'pressure',               'm1/l1s2',       { note: 'Pressure, stress.' } ],
    [    27, 'momentOfForce',          'l2m1/s2',       ],
    [    28, 'energy',                 'l2m1/s2',       { note: 'Energy, work, quantity of heat.' } ],
    [    29, 'power',                  'l2m1/s3',       { note: 'Power, radiant flux.' } ],
    [    30, 'electricCharge',         's1cur1',        { note: 'Electric charge, quantity of electricity.' } ],
    [    31, 'voltage',                'l2m1/s3cur1',   { note: 'Voltage, electric tension, electric potential difference, electromotive force.' } ],
    [    32, 'capacitance',            's4cur2/m1l2',   ],
    [    33, 'electricResistance',     'l2m1/s3cur2',   ],
    [    34, 'electricConductance',    's3cur2/l2m1',   ],
    [    35, 'magneticFlux',           'l2m1/s2cur1',   ],
    [    36, 'magneticFluxDensity',    'm/s2cur1',      ],
    [    37, 'inductance',             'l2m1/s2cur2',   ],
    [    38, 'luminousFlux',           'l2lum1/l2',     ],
    [    39, 'illuminance',            'l2lum1/l4',     ],
    [    40, 'activity',               's-1',           { note: 'Activity (referred to a radionuclide).' } ],
    [    41, 'absorbedDose',           'l2/s2',         { note: 'Absorbed dose, specific energy (imparted), kerma.' } ],
    [    42, 'doseEquivalent',         'l2/s2',         { note: 'Dose equivalent, ambient dose equivalent, directional dose equivalent, personal dose equivalent, organ dose equivalent.' } ],
    [    43, 'catalyticActivity',      'sub/s',         ],
    [    44, 'dynamicViscosity',       'm1/l1s1',       ],
    [    45, 'surfaceTension',         'm1/s2',         ],
    [    46, 'angularVelocity',        'l1/l1s1',       ],
    [    47, 'angularAcceleration',    'l1/l1s2',       ],
    [    48, 'irradiance',             'm1/s3',         { note: 'Heat flux density, irradiance.' } ],
    [    49, 'entropy',                'l2m1/s2t1',     { note: 'Heat capacity, entropy.' } ],
    [    50, 'specificEntropy',        'l2/s2t1',       { note: 'Specific heat capacity, specific entropy.' } ],
    [    51, 'specificEnergy',         'l2/s2',         ],
    [    52, 'thermalConductivity',    'l1m1/s3t1',     ],
    [    53, 'energyDensity',          'm1/l1s2',       ],
    [    54, 'electricFieldStrength',  'l1m1/s3cur1',   ],
    [    55, 'electricChargeDensity',  's1cur1/l3',     ],
    [    56, 'electricFluxDensity',    's1cur1/l2',     ],
    [    57, 'permittivity',           's4cur2/m1l3',   ],
    [    58, 'permeability',           'l1m1/s2cur2',   ],
    [    59, 'molarEnergy',            'l2m1/s2sub1',   ],
    [    60, 'molarEntropy',           'l2m1/s2t1sub1', { note: 'Molar entropy, molar heat capacity.' } ],
    [    61, 'exposure',               's1cur1/m1',     ],
    [    62, 'absorbedDoseRate',       'l2/s3',         ],
    [    63, 'radiantIntensity',       'l4m1/l2s3',     ],
    [    64, 'radiance',               'l2m1/l2s3',     ],
    [    65, 'catalyticConcentration', 'sub1/l3s1',     { note: 'Catalytic (activity) concentration.' } ],
    [    66, 'bitRate',                'bit/s'          ],
  ]
});

const bySid = {};


//
// UnitTypeDegree
//

class UnitTypeDegree {
  constructor(type, degree) {
    this.type   = type;
    this.degree = degree;
  }
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

  return ud1.type.abbreviation.localeCompare(ud2.type.abbreviation);
}


//
// UnitType Parsing
//

function parse(text) {

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
    const unitType = bySid[name];
    if (!unitType) {
      throw new Error(`Unknown unit type "${name}" in "${text}"`);
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

      if (comp.unitType === unitType) {
        comp.degree += degree;
        break;
      }
    }

    if (ci >= nextComp) {
      components[nextComp++] = new UnitTypeDegree(unitType, degree);
    }

    //console.log(` + ${name} ==> ${degree}`);
  }

  components.length = nextComp;
  return parseComponents(components);
}

function parseComponents(components) {

  components.sort(sortByDegreeThenAbbrev);

  let sid = '';
  for (const ud of components) {
    sid += ud.type.abbreviation;
    sid += ud.degree;
  }

  return {
    sid: sid,
    components: components
  };
};

function addComponent(components, component) {
  const type = component.type,
        degree = component.degree;

  for (let i=0; i<components.length; i++) {
    const ci = components[i];
    if (ci.type === type) {
      ci.degree += degree;
      return;
    }
  }

  components.push(new UnitTypeDegree(type, degree));
}

function baseify(components) {
  for (let i=0; i<components.length; ) {
    const ci = components[i],
          cti = ci.type;

    if (!cti.abbreviation) {
      components.splice(i, 1);
      for (const baseComp of cti.components) {
        addComponent(components, baseComp);
      }
    } else {
      i++;
    }
  }
}

UnitType.byComponents = function(components) {

  baseify(components);

  const parsed = parseComponents(components);

  let ut = bySid[parsed.sid];

  if (!ut) {
    ut = new UnitType()
    ut.sid = parsed.sid;
    ut.components = parsed.components;
    bySid[parsed.sid] = ut;
  }

  return ut;
};

UnitType.parse = function(text) {
  if (!text) {
    return; // undefined
  }

  let ut = bySid[text];
  if (ut) {
    return ut;
  }

  const parsed = parse(text);
  ut = bySid[parsed.sid];

  if (!ut) {
    ut = new UnitType()
    ut.sid = parsed.sid;
    ut.components = parsed.components;
    bySid[parsed.sid] = ut;
  }

  bySid[text] = ut;
  return ut;
}

UnitType.boot = function(stage, pass) {
  if (stage === 'compile' && pass === 1) {
    //let baseCount = 0;

    const unitTypes = UnitType.def.values;
    for (const ut of unitTypes) {
      //ut.basePos = ut.formula ? baseCount++ : -1;

      if (ut.abbreviation) {
        ut.sid = ut.abbreviation;
        bySid[ut.abbreviation] = ut;
        bySid[ut.abbreviation + '1'] = ut;
      }
    }

    //UnitType.baseCount = baseCount;

    for (const ut of unitTypes) {
      const formula = ut.formula;
      if (formula) {
        const parsed = parse(formula);
        ut.components = parsed.components;
        ut.sid = parsed.sid;
        bySid[parsed.sid] = ut;
      }
    }
  }
}

Tyr.UnitType = UnitType;
export default UnitType;
