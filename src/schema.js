
import _ from 'lodash';

import Collection from './classes/Collection';

import {
  collectionsById
} from './common';

export const SchemaType = new Collection({
  id: '_t0',
  name: 'tyrSchemaType',
  enum: true,
  fields: {
    _id:  { is: 'integer' },
    name: { is: 'string', labelField: true }
  },
  values: [
    [ '_id', 'name'    ],

    [     1, 'Full'    ],
    [     2, 'Partial' ]
  ]
});


const Schema = new Collection({
  id: '_t1',
  name: 'tyrSchema',
  fields: {
    _id:        { is:   'mongoid' },
    collection: { is:   'string' },
    type:       { link: 'tyrSchemaType' },
    match:      { is:   'object' },
    def:        { is:   'object' },
    src:        { is:   'string' }
  },
  timestamps: true
});


let schemaCache;

Collection.prototype.fieldsFor = async function(obj) {

  // TODO:  schema invalidation
  if (!schemaCache) {
    schemaCache = await Schema.db.find();

    schemaCache.forEach(schema => {
      const collection = collectionsById[schema.collection],
            def        = schema.def,
            validator  = this.createValidator(collection, def);

      validator.fields('', def.fields);
    });
  }

  const objMatch = _.matches(obj),
        fields = {};

  _.assign(fields, this.def.fields);

  schemaCache.forEach(schema => {
    if (schema.collection === this.id && objMatch(schema.match)) {
      _.each(schema.def.fields, (field, name) => {
        fields[name] = field;
      });
    }
  });

  return fields;
};

export default Schema;

/*

   X. come up with schema format

   /. implement Collection.getSchema

   /. write tests

   /. write documentation


{
  _id: 1111111,
  linkFields: {
    organizationId: "< mg's orgId >"
  },
  collectionId: "u00",
  modifications: {
    fields: {
      ext: {
        is: "object",
        fields: {
          flowerSales: { is: "number" }
        }
      }
    }
  }
}

*/
