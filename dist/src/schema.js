"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("./tyr");
const collection_1 = require("./core/collection");
const field_1 = require("./core/field");
exports.SchemaType = new collection_1.default({
    id: '_t0',
    name: 'tyrSchemaType',
    enum: true,
    client: false,
    internal: true,
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string', labelField: true }
    },
    values: [
        ['_id', 'name'],
        [1, 'Full'],
        [2, 'Partial']
    ]
});
const Schema = new collection_1.default({
    id: '_t1',
    name: 'tyrSchema',
    client: false,
    internal: true,
    fields: {
        _id: { is: 'mongoid' },
        collection: { is: 'string' },
        type: { link: 'tyrSchemaType' },
        match: { is: 'object' },
        def: { is: 'object' },
        src: { is: 'string' }
    },
    timestamps: true
});
let schemaCache;
Schema.on({
    type: 'change',
    when: 'post',
    handler: () => {
        Schema.fire({ type: 'tyrSchemaInvalidate', broadcast: true });
    }
});
Schema.on({
    type: 'tyrSchemaInvalidate',
    handler: () => {
        // TODO:  analyze the event and only invalidate part of the schema ?
        schemaCache = null;
    }
});
collection_1.default.prototype.invalidateSchemaCache = function () {
    schemaCache = null;
};
function schemaCloneCustomizer(obj) {
    if (obj instanceof field_1.default) {
        const ofield = obj, cfield = new field_1.default(ofield.def);
        for (const name in ofield) {
            if (ofield.hasOwnProperty(name)) {
                const v = ofield[name];
                switch (name) {
                    case 'collection':
                    case 'parent':
                    case 'type':
                        cfield[name] = v;
                        break;
                    default:
                        cfield[name] = cloneSchema(v);
                }
            }
        }
        return cfield;
    }
    //return undefined;
}
function cloneSchema(obj) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.cloneDeepWith ? _.cloneDeepWith(obj, schemaCloneCustomizer) : _.cloneDeep(obj, schemaCloneCustomizer);
}
function mergeSchema(fields, name, field) {
    let existingField = fields[name];
    if (existingField) {
        if (existingField.def.is === 'object' && field.def.is === 'object') {
            existingField = fields[name] = cloneSchema(existingField);
            const existingFields = existingField.def.fields;
            _.each(field.def.fields, (nestedField, nestedName) => {
                mergeSchema(existingFields, nestedName, nestedField);
            });
            existingField.fields = Object.assign({}, existingField.fields, field.fields);
            return true;
        }
        // couldn't merge, fall through and let latest match override, maybe issue a warning here?
    }
    fields[name] = field;
    return false;
}
collection_1.default.prototype.fieldsFor = async function (obj) {
    let missing = false;
    if (!schemaCache) {
        schemaCache = await (await Schema.db.find()).toArray();
        schemaCache.forEach(schema => {
            const collection = tyr_1.default.byId[schema.collection], def = schema.def;
            if (!collection) {
                missing = true;
                return;
            }
            // TODO:  this is affecting Collection.fields and Collection.paths ...
            //        maybe pass in a "dynamic" flag to createCompiler() to not set those?
            this.createCompiler(collection, def, 'compile').fields('', collection, def.fields);
            this.createCompiler(collection, def, 'link').fields('', collection, def.fields);
            schema.objMatcher = tyr_1.default.isCompliant(schema.match);
        });
    }
    const fields = {};
    _.assign(fields, this.def.fields);
    schemaCache.forEach(schema => {
        if (schema.collection === this.id && schema.objMatcher(obj)) {
            _.each(schema.def.fields, (field, name) => {
                mergeSchema(fields, name, field);
            });
        }
    });
    if (missing) {
        schemaCache = null;
    }
    return fields;
};
collection_1.default.prototype.mixin = function (def) {
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
exports.default = Schema;
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
//# sourceMappingURL=schema.js.map