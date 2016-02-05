
import Tyr from '../tyr';
import Collection from '../classes/Collection';


const UnitFactor = new Collection({
  id: '_u3',
  name: 'unitFactor',
  enum: true,
  client: false,
  fields: {
    _id:      { is: 'integer' },
    symbol:   { is: 'string' },
    prefix:   { is: 'string', labelField: true },
    factor:   { is: 'double' },
  },
  values: [
    [ '_id', 'symbol', 'prefix', 'factor' ],

		// Base 10 SI Units
		[ 1,     'Y',      'yotta',  1E24 ],
		[ 1,     'Z',      'zetta',  1E21 ],
		[ 1,     'E',      'exa',    1E18 ],
		[ 1,     'P',      'peta',   1E15 ],
		[ 1,     'T',      'tera',   1E12 ],
		[ 1,     'G',      'giga',   1E9 ],
		[ 1,     'M',      'mega',   1E6 ],
		[ 1,     'my',     'myria',  1E4 ],
		[ 1,     'k',      'kilo',   1E3 ],
		[ 1,     'h',      'hecto',  1E2 ],
		[ 1,     'da',     'deca',   1E1 ],
		[ 1,     'd',      'deci',   1E-1 ],
		[ 1,     'c',      'centi',  1E-2 ],
		[ 1,     'm',      'milli',  1E-3 ],
		[ 1,     'u',      'micro',  1E-6 ],
		[ 1,     'n',      'nano',   1E-9 ],
		[ 1,     'p',      'pico',   1E-12 ],
		[ 1,     'f',      'femto',  1E-15 ],
		[ 1,     'a',      'atto',   1E-18 ],
		[ 1,     'z',      'zepto',  1E-21 ],
		[ 1,     'y',      'yocto',  1E-24 ],

		// Base 2 IEC Units (i.e. kibi = kilobinary)
		[ 1,     'Ki',     'kibi',   Math.pow( 2, 10 ) ],
		[ 1,     'Mi',     'mebi',   Math.pow( 2, 20 ) ],
		[ 1,     'Gi',     'gibi',   Math.pow( 2, 30 ) ],
		[ 1,     'Ti',     'tebi',   Math.pow( 2, 40 ) ],
		[ 1,     'Pi',     'pebi',   Math.pow( 2, 50 ) ],
		[ 1,     'Ei',     'exbi',   Math.pow( 2, 60 ) ],
		[ 1,     'Zi',     'zebi',   Math.pow( 2, 70 ) ],
		[ 1,     'Yi',     'yobi',   Math.pow( 2, 80 ) ]
  ]
});

UnitFactor.factor = function(name) {
  for (const f of this.def.values) {
    let sname;
    if (name.startsWith(f.prefix)) {
      sname = name.substring(f.prefix.length);
    } else if (name.startsWith(f.symbol)) {
      sname = name.substring(f.symbol.length);
    } else {
      continue;
    }

    const u = Tyr.UnitBase.bySymbol(sname);
    if (!u) {
      continue;
    }

    const fu = new Tyr.Unit();
    fu.abbreviation = f.symbol + u.abbreviation;
    fu.name = f.prefix + u.name;
    fu.factor = f;
    fu.type = u.type;
    fu.baseMultiplier = ( u.baseMultiplier ? u.baseMultiplier * f.factor : f.factor );
    fu.system = u.system;

  	//if ( u.components != null ) {
  		//fu.componentText = u.componentText;
  		//fu.components = Unit.analyze( fu.componentText );
  	//}

    return fu;
  }

  //return undefined;
};

Tyr.UnitFactor = UnitFactor;
export default UnitFactor;
