
import Tyr from '../tyr';
import Collection from '../classes/Collection';


const UnitSystem = new Collection({
  id: '_u0',
  name: 'unitSystem',
  enum: true,
  client: false,
  fields: {
    _id:              { is: 'integer' },
    name:             { is: 'string', labelField: true },
  },
  values: [
    [ '_id', 'name' ],

    [     1, 'metric' ],
    [     2, 'english' ]
  ]
});

Tyr.UnitSystem = UnitSystem;
export default UnitSystem;
