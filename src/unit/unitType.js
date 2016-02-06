
import Tyr from '../tyr';
import Collection from '../classes/Collection';


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
    [     1, 'length',                 null,            { abbreviation: 'l', normal: 'm', note: 'Length.' } ],
    [     2, 'mass',                   null,            { abbreviation: 'm', normal: 'g', note: 'Mass.' } ],
    [     3, 'duration',               null,            { abbreviation: 's', normal: 's', note: 'Time.' } ],
    [     4, 'current',                null,            { abbreviation: 'cur', normal: 'A', note: 'Electric current.' } ],
    [     5, 'temperature',            null,            { abbreviation: 't', normal: 'K', note: 'Thermodynamic temperature.' } ],
    [     6, 'substance',              null,            { abbreviation: 'sub', normal: 'mol', note: 'Amount of substance.' } ],
    [     7, 'luminosity',             null,            { abbreviation: 'lum', normal: 'cd', note: 'Luminous intensity.' } ],
    [     8, 'currency',               null,            { abbreviation: 'c', note: '' } ],
    [     9, 'area',                   'l2',            ],
    [    10, 'volume',                 'l3',            ],
    [    11, 'velocity',               'l/s',           ],
    [    12, 'acceleration',           'l/s2',          ],
    [    13, 'waveNumber',             'l-1',           ],
    [    14, 'density',                'm/l3',          ],
    [    15, 'specificVolume',         'l3/m',          ],
    [    16, 'currentDensity',         'cur/l2',        ],
    [    17, 'magneticFieldStrength',  'cur/l',         ],
    [    18, 'concentration',          'sub/l3',        ],
    [    19, 'luminance',              'lum/l2',        ],
    [    20, 'planeAngle',             'l/l',           ],
    [    21, 'solidAngle',             'l2/l2',         ],
    [    22, 'frequency',              's-1',           ],
    [    23, 'force',                  'l1m1/s2',       ],
    [    24, 'pressure',               'm1/l1s2',       { note: 'Pressure, stress.' } ],
    [    25, 'energy',                 'l2m1/s2',       { note: 'Energy, work, quantity of heat.' } ],
    [    26, 'power',                  'l2m1/s3',       { note: 'Power, radiant flux.' } ],
    [    27, 'electricCharge',         's1cur1',        { note: 'Electric charge, quantity of electricity.' } ],
    [    28, 'voltage',                'l2m1/s3cur1',   { note: 'Voltage, electric tension, electric potential difference, electromotive force.' } ],
    [    29, 'capacitance',            's4cur2/m1l2',   ],
    [    30, 'electricResistance',     'l2m1/s3cur2',   ],
    [    31, 'electricConductance',    's3cur2/l2m1',   ],
    [    32, 'magneticFlux',           'l2m1/s2cur1',   ],
    [    33, 'magneticFluxDensity',    'm/s2cur1',      ],
    [    34, 'inductance',             'l2m1/s2cur2',   ],
    [    35, 'luminousFlux',           'l2lum1/l2',     ],
    [    36, 'illuminance',            'l2lum1/l4',     ],
    [    37, 'activity',               's-1',           { note: 'Activity (referred to a radionuclide).' } ],
    [    38, 'absorbedDose',           'l2/s2',         { note: 'Absorbed dose, specific energy (imparted), kerma.' } ],
    [    39, 'doseEquivalent',         'l2/s2',         { note: 'Dose equivalent, ambient dose equivalent, directional dose equivalent, personal dose equivalent, organ dose equivalent.' } ],
    [    40, 'catalyticActivity',      'sub/s',         ],
    [    41, 'dynamicViscosity',       'm1/l1s1',       ],
    [    42, 'momentOfForce',          'l2m1/s2',       ],
    [    43, 'surfaceTension',         'm1/s2',         ],
    [    44, 'angularVelocity',        'l1/l1s1',       ],
    [    45, 'angularAcceleration',    'l1/l1s2',       ],
    [    46, 'irradiance',             'm1/s3',         { note: 'Heat flux density, irradiance.' } ],
    [    47, 'entropy',                'l2m1/s2t1',     { note: 'Heat capacity, entropy.' } ],
    [    48, 'specificEntropy',        'l2/s2t1',       { note: 'Specific heat capacity, specific entropy.' } ],
    [    49, 'specificEnergy',         'l2/s2',         ],
    [    50, 'thermalConductivity',    'l1m1/s3t1',     ],
    [    51, 'energyDensity',          'm1/l1s2',       ],
    [    52, 'electricFieldStrength',  'l1m1/s3cur1',   ],
    [    53, 'electricChargeDensity',  's1cur1/l3',     ],
    [    54, 'electricFluxDensity',    's1cur1/l2',     ],
    [    55, 'permittivity',           's4cur2/m1l3',   ],
    [    56, 'permeability',           'l1m1/s2cur2',   ],
    [    57, 'molarEnergy',            'l2m1/s2sub1',   ],
    [    58, 'molarEntropy',           'l2m1/s2t1sub1', { note: 'Molar entropy, molar heat capacity.' } ],
    [    59, 'exposure',               's1cur1/m1',     ],
    [    60, 'absorbedDoseRate',       'l2/s3',         ],
    [    61, 'radiantIntensity',       'l4m1/l2s3',     ],
    [    62, 'radiance',               'l2m1/l2s3',     ],
    [    63, 'catalyticConcentration', 'sub1/l3s1',     { note: 'Catalytic (activity) concentration.' } ],
    [    64, 'bit',                    null,            { abbreviation: 'bit', normal: 'bit', note: 'Binary digit.' } ],
    [    65, 'bitRate',                'bit/s' ],
    [    66, 's/l',                    's/l' ],
    [    67, 'none',                   null,            { abbreviation: 'none', normal: 'none', note: 'No units.' } ],
    [    68, 'l1t',                    'l1t' ],
    [    69, 'm/cur1l1s2',             'm/cur1l1s2' ],
    [    70, 'cur1s2',                 'cur1s2' ],
    [    71, 'm/cur1s4',               'm/cur1s4' ],
    [    72, 'l1s',                    'l1s' ],
    [    73, 'l1m/s3',                 'l1m/s3' ],
    [    74, 'm1s2',                   'm1s2' ],
    [    75, 'm1s4',                   'm1s4' ],
    [    76, 's/m',                    's/m' ],
    [    77, 'm1s/l',                  'm1s/l' ],
    [    78, 's3',                     's3' ],
    [    79, 'm1s3',                   'm1s3' ],
    [    80, 'm/s',                    'm/s' ]
  ]
});

Tyr.UnitType = UnitType;
export default UnitType;
