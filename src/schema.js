
import * as _ from 'lodash';

import Tyr        from './tyr';
import Collection from './core/collection';

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
    schemaCache = await (await Schema.db.find()).toArray();

    schemaCache.forEach(schema => {
      const collection = Tyr.byId[schema.collection],
            def        = schema.def;

      // TODO:  this is affecting Collection.fields and Collection.paths ...
      //        maybe pass in a "dynamic" flag to createCompiler() to not set those?
      this.createCompiler(collection, def, 'compile').fields('', collection, def.fields);
      this.createCompiler(collection, def, 'link').fields('', collection, def.fields);

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

Collection.prototype.mixin = function(def) {

  const collection = this;

  this.createCompiler(collection, def, 'compile').fields('', collection, def.fields);
  this.createCompiler(collection, def, 'link').fields('', collection, def.fields);

  const baseDefFields = collection.def.fields;

  _.each(def.fields, (fieldDef, name) => {
    // TODO:  once we stop storing Fields inside def, use the following line instead
    //baseDefFields[name] = fieldDef;
    baseDefFields[name] = collection.fields[name];
  });
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
