import Tyr from '../tyr';
import Collection from '../core/collection';

const UnitFactor = new Collection({
  id: '_u3',
  name: 'unitFactor',
  enum: true,
  client: false,
  internal: true,
  fields: {
    _id: { is: 'integer' },
    symbol: { is: 'string' },
    prefix: { is: 'string', labelField: true },
    factor: { is: 'double' }
  },
  values: [
    ['_id', 'symbol', 'prefix', 'factor'],

    // Base 10 SI Units
    [1, 'Y', 'yotta', 1e24],
    [1, 'Z', 'zetta', 1e21],
    [1, 'E', 'exa', 1e18],
    [1, 'P', 'peta', 1e15],
    [1, 'T', 'tera', 1e12],
    [1, 'G', 'giga', 1e9],
    [1, 'M', 'mega', 1e6],
    [1, 'my', 'myria', 1e4],
    [1, 'k', 'kilo', 1e3],
    [1, 'h', 'hecto', 1e2],
    [1, 'da', 'deca', 1e1],
    [1, 'd', 'deci', 1e-1],
    [1, 'c', 'centi', 1e-2],
    [1, 'm', 'milli', 1e-3],
    [1, 'u', 'micro', 1e-6],
    [1, 'n', 'nano', 1e-9],
    [1, 'p', 'pico', 1e-12],
    [1, 'f', 'femto', 1e-15],
    [1, 'a', 'atto', 1e-18],
    [1, 'z', 'zepto', 1e-21],
    [1, 'y', 'yocto', 1e-24],

    // Base 2 IEC Units (i.e. kibi = kilobinary)
    [1, 'Ki', 'kibi', Math.pow(2, 10)],
    [1, 'Mi', 'mebi', Math.pow(2, 20)],
    [1, 'Gi', 'gibi', Math.pow(2, 30)],
    [1, 'Ti', 'tebi', Math.pow(2, 40)],
    [1, 'Pi', 'pebi', Math.pow(2, 50)],
    [1, 'Ei', 'exbi', Math.pow(2, 60)],
    [1, 'Zi', 'zebi', Math.pow(2, 70)],
    [1, 'Yi', 'yobi', Math.pow(2, 80)]
  ]
});

Tyr.UnitFactor = UnitFactor;
export default UnitFactor;
