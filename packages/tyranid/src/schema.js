import * as _ from 'lodash';

import Tyr from './tyr';
import Collection from './core/collection';
import Field from './core/field';

export const SchemaType = new Collection({
  id: '_t0',
  name: 'tyrSchemaType',
  enum: true,
  client: false,
  internal: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true },
  },
  values: [
    ['_id', 'name'],
    [1, 'Full'],
    [2, 'Partial'],
  ],
});

const Schema = new Collection({
  id: '_t1',
  name: 'tyrSchema',
  client: false,
  internal: true,
  fields: {
    _id: { is: 'mongoid' },
    collection: { is: 'string' }, // this is the collection id, i.e. t01
    type: { link: 'tyrSchemaType' },
    match: { is: 'object' },
    def: { is: 'object' },
    src: { is: 'string' },
  },
  timestamps: true,
});

let schemaCache;

Schema.on({
  type: 'change',
  when: 'post',
  handler: (/*event*/) => {
    Schema.fire({ type: 'tyrSchemaInvalidate', broadcast: true });
  },
});

Schema.on({
  type: 'tyrSchemaInvalidate',
  handler: (/*event*/) => {
    // TODO:  analyze the event and only invalidate part of the schema ?
    schemaCache = null;
  },
});

Collection.prototype.invalidateSchemaCache = function () {
  // TODO:  only invalidate the cache for this collection
  schemaCache = null;
};

Tyr.invalidateSchemaCache = function () {
  schemaCache = null;
};

function schemaCloneCustomizer(obj) {
  if (obj instanceof Field) {
    const ofield = obj,
      cfield = new Field(ofield.def);

    for (const name in ofield) {
      if (ofield.hasOwnProperty(name)) {
        const v = ofield[name];

        switch (name) {
          case 'collection':
          case 'parent':
          case 'type':
          case 'schema':
            cfield[name] = v;
            break;
          case '_np':
            break;
          default:
            cfield[name] = cloneSchema(v);
        }
      }
    }

    return cfield;
  } else if (
    obj instanceof Collection ||
    (obj && obj.constructor.name === 'ObjectID')
  ) {
    return obj;
  }

  //return undefined;
}

function cloneSchema(obj) {
  // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
  return _.cloneDeepWith
    ? _.cloneDeepWith(obj, schemaCloneCustomizer)
    : _.cloneDeep(obj, schemaCloneCustomizer);
}

function mergeSchema(fields, name, field) {
  let existingField = fields[name];

  if (existingField) {
    if (existingField.def.is === 'object' && field.def.is === 'object') {
      existingField = fields[name] = cloneSchema(existingField);
      let existingFields = existingField.def.fields;
      if (!existingFields) {
        existingFields = existingField.def.fields = {};
      }

      _.each(field.def.fields, (nestedField, nestedName) => {
        mergeSchema(existingFields, nestedName, nestedField);
      });

      existingField.fields = { ...existingField.fields, ...field.fields };
      return true;
    }

    // couldn't merge, fall through and let latest match override, maybe issue a warning here?
  }

  fields[name] = field;
  return false;
}

async function ensureCache() {
  let missing = false;

  if (!schemaCache) {
    schemaCache = await (await Schema.db.find()).toArray();

    for (const schema of schemaCache) {
      const collection = Tyr.byId[schema.collection],
        def = schema.def;

      if (!collection) {
        missing = true;
        continue;
      }

      // DYNAMIC-FIELD-ROOT -- do we want to pass in something other than "def" as the parent?
      collection
        .createCompiler(def, 'compile', schema)
        .fields('', def, def.fields);
      collection
        .createCompiler(def, 'link', schema)
        .fields('', def, def.fields);

      schema.objMatcher = Tyr.isCompliant(schema.match);
    }
  }

  return missing;
}

// undocumented for now since this bypasses schema matching
Collection.prototype.findField = async function (pathName) {
  const missing = await ensureCache();

  for (const schema of schemaCache) {
    if (schema.collection === this.id) {
      const { fields } = schema.def;
      for (const name in fields) {
        const field = fields[name];
        if (pathName === field.pathName) return field;

        // TODO: rewrite this to use recursion
        if (pathName.startsWith(name)) {
          const nestedFields = field.def.fields;
          for (const nestedName in nestedFields) {
            const nestedField = nestedFields[nestedName];
            if (pathName === nestedField.pathName) return nestedField;
          }
        }
      }
    }
  }

  if (missing) schemaCache = null;
  //return undefined;
};

Collection.prototype.fieldsFor = async function (opts) {
  const missing = await ensureCache();
  const fields = {};

  if (opts.static) {
    _.assign(fields, this.def.fields);
  }

  const { match, query } = opts;
  const queryMatches = Tyr.query.matches;

  const test = query
    ? schema => queryMatches(query, schema.match)
    : schema => schema.objMatcher(match);

  if (schemaCache) {
    for (const schema of schemaCache) {
      if (schema.collection === this.id && test(schema)) {
        _.each(schema.def.fields, (field, name) => {
          if (opts.custom && !field.def.custom) return;
          mergeSchema(fields, name, field);
        });
      }
    }
  }

  if (missing) schemaCache = null;
  return fields;
};

Collection.prototype.mixin = function (def) {
  const collection = this;

  this.createCompiler(def, 'compile').fields('', collection, def.fields);
  this.createCompiler(def, 'link').fields('', collection, def.fields);

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
