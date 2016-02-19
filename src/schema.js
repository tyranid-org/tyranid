
import _ from 'lodash';

import Collection from './classes/Collection';

import {
  collectionsById
} from './common';

export const SchemaType = new Collection({
  id: '_t0',
  name: 'tyrSchemaType',
  enum: true,
  client: false,
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
  client: false,
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

// TODO:  add some sort of event bus so we can notify when schema has been changed?
Collection.prototype.invalidateSchemaCache = function() {
  schemaCache = null;
}

Collection.prototype.fieldsFor = async function(obj) {

  // TODO:  schema invalidation
  if (!schemaCache) {
    schemaCache = await Schema.db.find();

    schemaCache.forEach(schema => {
      const collection = collectionsById[schema.collection],
            def        = schema.def;

      this.createCompiler(collection, def, 'compile').fields('', def.fields);
      this.createCompiler(collection, def, 'link').fields('', def.fields);

      schema.objMatcher = _.matches(schema.match);
    });
  }

  const fields = {};

  _.assign(fields, this.def.fields);

  schemaCache.forEach(schema => {
    if (schema.collection === this.id && schema.objMatcher(obj)) {
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
