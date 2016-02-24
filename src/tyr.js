
import _ from 'lodash';

const Tyr = {
  collections: [],
  byId: {},
  byName: {},

  $all: '$all',

  labelize(name) {
    // TODO:  more cases to be added here later on
    return _.startCase(name);
  },

  parseUid(uid) {
    const colId = uid.substring(0, 3);

    const col = Tyr.byId[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    const strId = uid.substring(3);

    const idType = col.def.fields[col.def.primaryKey.field].type;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  },

  byUid(uid) {
    const p = Tyr.parseUid(uid);
    return p.collection.byId(p.id);
  },
  
  async valuesBy(filter) {
    const getValues = c => c.valuesFor(c.fieldsBy(filter));
    const arrs = await* Tyr.collections.map(getValues);
    return _.union.apply(null, arrs);
  },

};


export default Tyr;
