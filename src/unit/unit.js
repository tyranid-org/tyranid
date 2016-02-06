
import Tyr from '../tyr';
import Collection from '../classes/Collection';


const Unit = new Collection({
  id: '_u2',
  name: 'unit',
  enum: true,
  client: false,
  fields: {
    _id:              { is: 'integer' },
    sid:              { is: 'string', label: 'String ID', note: 'a unique id like _id, used when integers cannot be used' },
    name:             { is: 'string', labelField: true },
    abbreviation:     { is: 'string' },
    factor:           { is: 'string' },
    formula:          { is: 'string' },
    type:             { link: 'unitType' },
    system:           { link: 'unitSystem' },
    label:            { is: 'string' },
    baseMultiplier:   { is: 'double' },
    baseAdditive:     { is: 'double' },
    note:             { is: 'string' }
  },
  values: [
    [ '_id', 'name',                   'abbreviation',    'formula',       'type',                   'system' ],
    [ 1,     'meter',                       'm',          null,            'length',                 'metric' ],
    [ 3,     'second',                      's',          null,            'duration',               'metric' ],
    [ 4,     'ampere',                      'A',          null,            'current',                'metric' ],
    [ 5,     'kelvin',                      'K',          null,            'temperature',            'metric' ],
    [ 6,     'mole',                        'mol',        null,            'substance',              'metric' ],
    [ 7,     'candela',                     'cd',         null,            'luminosity',             'metric' ],
    [ 8,     'dollar',                      'USD',        null,            'currency',               'metric' ],
    [ 9,     'squareMeter',                 null,         'm2',            'area',                   'metric' ],
    [ 10,    'cubicMeter',                  null,         'm3',            'volume',                 'metric' ],
    [ 11,    'meterPerSecond',              null,         'm/s',           'velocity',               'metric' ],
    [ 12,    'meterPerSecondSquared',       null,         'm/s2',          'acceleration',           'metric' ],
    [ 13,    'reciprocalMeter',             null,         'm-1',           'waveNumber',             'metric' ],
    [ 14,    'kilogramPerCubicMeter',       null,         'kg/m3',         'density',                'metric' ],
    [ 15,    'cubicMeterPerKilogram',       null,         'm3/kg',         'specificVolume',         'metric' ],
    [ 16,    'amperePerSquareMeter',        null,         'A/m2',          'currentDensity',         'metric' ],
    [ 17,    'amperePerMeter',              null,         'A/m',           'magneticFieldStrength',  'metric' ],
    [ 18,    'molePerCubicMeter',           null,         'mol/m3',        'concentration',          'metric' ],
    [ 19,    'candelaPerSquareMeter',       null,         'cd/m2',         'luminance',              'metric' ],
    [ 21,    'radian',                      'rad',        'm/m',           'planeAngle',             'metric' ],
    [ 22,    'steradian',                   'sr',         'm2/m2',         'solidAngle',             'metric' ],
    [ 23,    'hertz',                       'Hz',         's-1',           'frequency',              'metric' ],
    [ 24,    'newton',                      'N',          'm1kg1/s2',      'force',                  'metric' ],
    [ 25,    'pascal',                      'Pa',         'N/m2',          'pressure',               'metric' ],
    [ 26,    'joule',                       'J',          'N1m1',          'energy',                 'metric' ],
    [ 27,    'watt',                        'W',          'J/s',           'power',                  'metric' ],
    [ 28,    'coulomb',                     'C',          's1A1',          'electricCharge',         'metric' ],
    [ 29,    'volt',                        'V',          'W/A',           'voltage',                'metric' ],
    [ 30,    'farad',                       'F',          'C/V',           'capacitance',            'metric' ],
    [ 31,    'ohm',                         'OHM',        'V/A',           'electricResistance',     'metric' ],
    [ 32,    'siemens',                     'S',          'A/V',           'electricConductance',    'metric' ],
    [ 33,    'weber',                       'Wb',         'V*s',           'magneticFlux',           'metric' ],
    [ 34,    'tesla',                       'T',          'Wb/m2',         'magneticFluxDensity',    'metric' ],
    [ 35,    'henry',                       'H',          'Wb/A',          'inductance',             'metric' ],
    [ 37,    'lumen',                       'lm',         'cd1sr1',        'luminousFlux',           'metric' ],
    [ 38,    'lux',                         'lx',         'lm/m2',         'illuminance',            'metric' ],
    [ 39,    'becquerel',                   'Bq',         's-1',           'activity',               'metric' ],
    [ 40,    'gray',                        'Gy',         'J/kg',          'absorbedDose',           'metric' ],
    [ 41,    'sievert',                     'Sv',         'J/kg',          'doseEquivalent',         'metric' ],
    [ 42,    'katal',                       'kat',        'mol/s',         'catalyticActivity',      'metric' ],
    [ 43,    'pascalSecond',                null,         'Pa1s1',         'dynamicViscosity',       'metric' ],
    [ 44,    'newtonMeter',                 null,         'N1m1',          'momentOfForce',          'metric' ],
    [ 45,    'newtonPerMeter',              null,         'N/m',           'surfaceTension',         'metric' ],
    [ 46,    'radianPerSecond',             null,         'rad/s',         'angularVelocity',        'metric' ],
    [ 47,    'radianPerSecondSquared',      null,         'rad/s2',        'angularAcceleration',    'metric' ],
    [ 48,    'wattPerSquareMeter',          null,         'W/m2',          'irradiance',             'metric' ],
    [ 49,    'joulePerKelvin',              null,         'J/K',           'entropy',                'metric' ],
    [ 50,    'joulePerKilogramKelvin',      null,         'J/kg1K1',       'specificEntropy',        'metric' ],
    [ 51,    'joulePerKilogram',            null,         'J/kg',          'specificEnergy',         'metric' ],
    [ 52,    'wattPerMeterKelvin',          null,         'W/m1K1',        'thermalConductivity',    'metric' ],
    [ 53,    'joulePerCubicMeter',          null,         'J/m3',          'energyDensity',          'metric' ],
    [ 54,    'voltPerMeter',                null,         'V/m',           'electricFieldStrength',  'metric' ],
    [ 55,    'coulombPerCubicMeter',        null,         'C/m3',          'electricChargeDensity',  'metric' ],
    [ 56,    'coulombPerSquareMeter',       null,         'C/m2',          'electricFluxDensity',    'metric' ],
    [ 57,    'faradPerMeter',               null,         'F/m',           'permittivity',           'metric' ],
    [ 58,    'henryPerMeter',               null,         'H/m',           'permeability',           'metric' ],
    [ 59,    'joulePerMole',                null,         'J/mol',         'molarEnergy',            'metric' ],
    [ 60,    'joulePerMoleKelvin',          null,         'J/mol1K1',      'molarEntropy',           'metric' ],
    [ 61,    'coulombPerKilogram',          null,         'C/kg',          'exposure',               'metric' ],
    [ 62,    'grayPerSecond',               null,         'Gy/s',          'absorbedDoseRate',       'metric' ],
    [ 63,    'wattPerSteradian',            null,         'W/sr',          'radiantIntensity',       'metric' ],
    [ 64,    'wattPerSquareMeterSteradian', null,         'W/m2sr1',       'radiance',               'metric' ],
    [ 65,    'katalPerCubicMeter',          null,         'kat/m3',        'catalyticConcentration', 'metric' ],
    [ 66,    'inch',                        'in',         null,            'length',                 'english',  { baseMultiplier: 0.0254 } ],
    [ 67,    'foot',                        'ft',         null,            'length',                 'english',  { baseMultiplier: 0.3048 } ],
    [ 68,    'cubit',                       'cubit',      null,            'length',                 'english',  { baseMultiplier: 0.4572 } ],
    [ 69,    'yard',                        'yd',         null,            'length',                 'english',  { baseMultiplier: 0.9144 } ],
    [ 70,    'furlong',                     'furlong',    null,            'length',                 'english',  { baseMultiplier: 201.168 } ],
    [ 71,    'mile',                        'mi',         null,            'length',                 'english',  { baseMultiplier: 1609.344 } ],
    [ 72,    'league',                      'league',     null,            'length',                 'english',  { baseMultiplier: 5556 } ],
    [ 73,    'acre',                        'acre',       'chain*furlong', 'area',                   'english'],
    [ 74,    'celsius',                     'degC',       null,            'temperature',            'metric',   { baseAdditive: 273.15 } ],
    [ 75,    'fahrenheit',                  'degF',       null,            'temperature',            'english',  { baseMultiplier: 0.555555556, baseAdditive: 255.372222222 } ],
    [ 76,    'rod',                         'rod',        null,            'length',                 'english',  { baseMultiplier: 5.0292 } ],
    [ 77,    'chain',                       'chain',      null,            'length',                 'english',  { baseMultiplier: 20.1168 } ],
    [ 78,    'gram',                        'g',          null,            'mass',                   'metric' ],
    [ 79,    'ton',                         't',          null,            'mass',                   'metric',   { baseMultiplier: 10000000 } ],
    [ 80,    'minute',                      'min',        null,            'duration',               'metric',   { baseMultiplier: 60 } ],
    [ 81,    'hour',                        'h',          null,            'duration',               'metric',   { baseMultiplier: 3600 } ],
    [ 82,    'day',                         'day',        null,            'duration',               'metric',   { baseMultiplier: 86400 } ],
    [ 83,    'week',                        'week',       null,            'duration',               'metric',   { baseMultiplier: 604800 } ],
    [ 84,    'month',                       'mon',        null,            'duration',               'metric',   { baseMultiplier: 2419200 } ],
    [ 85,    'year',                        'Yr',         null,            'duration',               'metric',   { baseMultiplier: 31449600 } ],
    [ 86,    'grain',                       'gr',         null,            'mass',                   'english',  { baseMultiplier: 0.06479891 } ],
    [ 87,    'dram',                        'dr',         null,            'mass',                   'english',  { baseMultiplier: 1.7718452 } ],
    [ 88,    'ounce',                       'oz',         null,            'mass',                   'english',  { baseMultiplier: 28.3495231 } ],
    [ 89,    'pound',                       'lb',         null,            'mass',                   'english',  { baseMultiplier: 453.59237 } ],
    [ 90,    'hundredweight',               'cwt',        null,            'mass',                   'english',  { baseMultiplier: 453.59237 } ],
    [ 91,    'shortTon',                    'shortTon',   null,            'mass',                   'english',  { baseMultiplier: 907184.74 } ],
    [ 92,    'longTon',                     'longTon',    null,            'mass',                   'english',  { baseMultiplier: 1016046.91 } ],
    [ 93,    'liter',                       'L',          null,            'volume',                 'metric',   { baseMultiplier: 0.001 } ],
    [ 94,    'teaspoon',                    'tsp',        null,            'volume',                 'metric',   { baseMultiplier: 0.000004929 } ],
    [ 95,    'tablespoon',                  'tbsp',       null,            'volume',                 'metric',   { baseMultiplier: 0.000014787 } ],
    [ 96,    'fluidOunce',                  'floz',       null,            'volume',                 'metric',   { baseMultiplier: 0.000029574 } ],
    [ 97,    'cup',                         'cp',         null,            'volume',                 'metric',   { baseMultiplier: 0.000236588 } ],
    [ 98,    'pint',                        'pt',         null,            'volume',                 'metric',   { baseMultiplier: 0.000473176 } ],
    [ 99,    'quart',                       'qt',         null,            'volume',                 'metric',   { baseMultiplier: 0.000946353 } ],
    [ 100,   'gallon',                      'gal',        null,            'volume',                 'metric',   { baseMultiplier: 0.003785412 } ],
    [ 101,   'void',                        'void',       null,            'none',                   null ],
    [ 102,   'nauticalMile',                'nautmi',     null,            'length',                 'english',  { baseMultiplier: 1852 } ],
    [ 103,   'knot',                        'knot',       'nautmi/h',      'velocity',               'english'],
    [ 104,   'bit',                         'bit',        null,            'bit',                    'metric' ],
    [ 105,   'crumb',                       'crumb',      null,            'bit',                    'metric',   { baseMultiplier: 2 } ],
    [ 106,   'nibble',                      'nibble',     null,            'bit',                    'metric',   { baseMultiplier: 4 } ],
    [ 107,   'byte',                        'B',          null,            'bit',                    'metric',   { baseMultiplier: 8 } ]
  ]
});

const bySid    = Unit.bySid    = {};
const bySymbol = Unit.bySymbol = {};

Unit.boot = function(stage, pass) {
  if (stage === 'compile' && pass === 1) {
    for (const value of Unit.def.values) {
      value.sid = value.abbreviation || value.formula.replace('/', '_');

      bySid[value.sid] = value;

      if (value.abbreviation) {
        bySymbol[value.abbreviation] = value;
      }

      bySymbol[value.name] = value;
    }
  }
}

Tyr.Unit = Unit;
export default Unit;
