
import Tyr from '../tyr';
import Collection from '../core/collection';

const UnitSystem = new Collection({
  id: '_u0',
  name: 'unitSystem',
  enum: true,
  client: false,
  fields: {
    _id:     { is: 'integer' },
    name:    { is: 'string', labelField: true },
    url:     { is: 'url' },
  },
  values: [
    [ '_id', 'name',     'url' ],

    [     1, 'metric',   'https://en.wikipedia.org/wiki/International_System_of_Units' ],
    [     2, 'english',  'https://en.wikipedia.org/wiki/English_units' ],
    [     3, 'planck',   'https://en.wikipedia.org/wiki/Planck_units' ]
  ]
});

Tyr.UnitSystem = UnitSystem;
export default UnitSystem;
