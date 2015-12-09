import _ from 'lodash';
import hooker from 'hooker';
import faker from 'faker';

import Type from './Type';
import { ObjectType } from '../builtins';
import Population from './Population';
import Populator from './Populator';
import NamePath from './NamePath';

// variables shared between classes
import {
  config          ,
  collections     ,
  collectionsById ,
  typesByName     ,
  escapeRegex     ,
  pathAdd         ,
  parseInsertObj  ,
  parseProjection ,
  toClient
} from '../common';


// Document
// ========

const documentPrototype = {

  $save() {
    return this.$model.save(this);
  },

  $insert() {
    return this.$model.insert(this);
  },

  $update() {
    return this.$model.updateDoc(this);
  },

  $toClient() {
    return this.$model.toClient(this);
  },

  $populate(fields, denormal) {
    return this.$model.populate(fields, this, denormal);
  },

  $validate() {
    return ObjectType.validate('', this.$model.def, this);
  }

};

function defineDocumentProperties(dp) {
  Object.defineProperties(dp, {
    $label: {
      get() {
        return this.$model.labelFor(this);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    },

    $uid: {
      get() {
        return this.$model.idToUid(this[this.def.primaryKey.field]);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    }
  });
}


function denormalPopulate(collection, obj, denormalAlreadyDone) {
  const denormal = !denormalAlreadyDone && collection.denormal;
  return denormal ? collection.populate(denormal, obj, true) : Promise.resolve();
}



/**
 * Recurse into schema and populate fake document
 */
function fakeField(field) {
  const def = _.get(field, 'is.def') || field.def;

  if (!def) throw new Error('No field.def property to fake on! ' + JSON.stringify(field));

  switch (def.name) {
  case 'integer':
  case 'float':
  case 'double':
  case 'number':
    return faker.random.number();

  case 'email':
    return faker.internet.email();

  case 'url':
    return faker.internet.url();

  case 'date':
    const date = faker.date.past();
    date.setMilliseconds(0);
    return date;

  case 'image':
    return faker.image.avatar();

  case 'link':
  case 'mongoid':
    let i = 24,
        s = '';
    while(i--) s += faker.random.number(15).toString(16);
    return ObjectId(s);

  case 'boolean':
    return faker.random.boolean();

  case 'array':
    return _.range(2).map(() => fakeField(field.of));

  case 'object':
    const key = def.name === 'link'
      ? 'link.def.fields'
      : 'fields';

    return _.reduce(_.get(field, key), (out, value, key) => {
      out[key] = fakeField(value);
      return out;
    }, {});

  // default to string
  default: return faker.name.lastName();
  }
}


function fakeDocument(schema) {
  const doc = {};
  _.each(schema, (field, name) => {
    doc[name] = fakeField(field);
  });
  return doc;
}


export default class Collection {

  constructor(def) {

    const colId = def.id;
    if (!colId) {
      throw new Error('The "id" for the collection was not specified.');
    }

    if (colId.length !== 3) {
      throw new Error('The collection "id" should be three characters long.');
    }

    if (collectionsById[colId]) {
      throw new Error('The collection "id" is already in use by ' + collectionsById[colId].name + '.');
    }

    //
    // instances of Collection are functions so that you can go "const User = ...; const user = new User();"
    //
    // i.e.  instances of Collection are collections
    //       instances of instances of Collection are documents (collection instances)
    //

    const dp = {};
    _.assign(dp, documentPrototype);

    const CollectionInstance = function(data) {
      this.__proto__ = dp;

      if (data) {
        _.assign(this, data);
      }
    };

    dp.constructor = dp.$model = CollectionInstance;
    dp.__proto__ = CollectionInstance.prototype;
    dp.$name = def.name;

    CollectionInstance.constructor = Collection;
    CollectionInstance.__proto__ = Collection.prototype;
    CollectionInstance.def = def;
    CollectionInstance.id = colId;

    // add apply back to proto, for class inheritance...
    CollectionInstance.__proto__.apply = Function.prototype.apply;

    Type.validateType(CollectionInstance);

    if (!def.dbName) {
      def.dbName = def.name;
    }

    if (!def.primaryKey) {
      def.primaryKey = {
        field: '_id'
      };
    } else if(_.isString(def.primaryKey)) {
      def.primaryKey = {
        field: def.primaryKey
      };
    } else if(!_.isObject(def.primaryKey)) {
      throw new Error('Invalid `primaryKey` parameter');
    }

    const db = def.db || config.db;

    if (db) {
      CollectionInstance.db = db.collection(CollectionInstance.def.dbName);
    }


    collections.push(CollectionInstance);

    collectionsById[def.id] = CollectionInstance;

    for (const key in dp) {
      if (key.substring(0,1) === '$' && key !== '$label') {
        Object.defineProperty(dp, key, {
          enumerable:   false,
          writeable:    false,
          configurable: false
        });
      }
    }

    defineDocumentProperties(dp);

    _.each(def.fields, function(field, name) {
      const get  = field.get,
            set  = field.set,
            isDb = field.db;

      if (get || set) {
        const prop = {
          enumerable:   isDb !== undefined ? isDb : false,
          writeable:    false,
          configurable: false
        };

        if (get) {
          prop.get = get;
        }

        if (set) {
          prop.set = set;
        }

        Object.defineProperty(dp, name, prop);

        if (isDb === undefined) {
          field.db = false;
        }
      }
    });

    return CollectionInstance;
  }

  async fake({ n, schemaOpts, seed } = {}) {
    // get doc schema
    const collection = this,
          schema = await collection.fieldsFor(schemaOpts);

    // seed if provided, else reset
    faker.seed(seed);

    if (n === undefined) {
      return new collection(fakeDocument(schema));
    } else {
      const out = [];
      while (n--) out.push(new collection(fakeDocument(schema)));
      return out;
    }
  }


  idToUid(id) {
    return this.id + id;
  }

  isStatic() {
    return this.def.enum;
  }


  byId(id) {
    if (this.isStatic()) {
      return Promise.resolve(this.byIdIndex[id]);

    } else {
      if (typeof id === 'string') {
        id = this.def.fields[this.def.primaryKey.field].is.fromString(id);
      }

      return this.findOne({ [this.def.primaryKey.field]: id });
    }
  }

  byIds(ids) {
    const collection = this;

    if (collection.isStatic()) {
      return Promise.resolve(ids.map(id => collection.byIdIndex[id]));
    } else {
      return collection.find({ [this.def.primaryKey.field]: { $in: ids }});
    }
  }

  byLabel(n, forcePromise) {
    const collection = this,
          findName = collection.labelField,
          matchLower = n.toLowerCase();

    if (collection.isStatic()) {
      const value = _.find(collection.def.values, function(v) {
        const name = v[findName];
        return name && name.toLowerCase() === matchLower;
      });

      return forcePromise ? Promise.resolve(value) : value;
    } else {
      const query = {};
      query[findName] = {$regex: escapeRegex(matchLower), $options : 'i'};
      return collection.db.findOne(query);
    }
  }

  labelFor(doc) {
    const collection = this,
          labelField = collection.labelField;

    // TODO:  have this use path finder to walk the object in case the label is stored in an embedded object
    // TODO:  support computed properties
    return doc[labelField];
  }


  /**
   * Behaves like promised-mongo's find() method except that the results are mapped to collection instances.
   */
  find(...args) {
    const collection = this,
          db         = collection.db,
          projection = args[1];

    if (projection) {
      args[1] = parseProjection(collection, projection);
    }

    const cursor = db.find(...args);

    hooker.hook(cursor, 'next', {
      post(promise) {
        const modified = promise.then(doc => doc ? new collection(doc) : null);
        return hooker.override(modified);
      }
    });

    return cursor;
  }

  /**
   * Behaves like promised-mongo's findOne() method except that the results are mapped to collection instances.
   */
  async findOne(...args) {
    const collection = this,
          db         = collection.db,
          projection = args[1];

    if (projection) {
      args[1] = parseProjection(collection, projection);
    }

    const doc = await db.findOne(...args);

    return doc ? new collection(doc) : null;
  }

  /**
   * Behaves like promised-mongo's findAndModify() method except that the results are mapped to collection instances.
   */
  async findAndModify(opts) {
    const collection = this,
          db         = collection.db;

    let update = opts.update;

    if (update) {
      // Check for whether update param is all field:value expressions.
      // If so, we should replace the entire doc (per Mongo api docs)
      let replaceEntireDoc = true;

      // Use Array.prototype.every() since it can break early
      Object.keys(update).every(el => {
        return (replaceEntireDoc = !el.startsWith('$'));
      });

      if (collection.def.timestamps) {
        if (replaceEntireDoc) {
          update.updatedAt = new Date();
        } else {
          update.$set = update.$set || {};
          update.$set.updatedAt = new Date();
        }
      }

      if (opts.upsert) {
        const setOnInsertSrc = replaceEntireDoc ? update : update.$setOnInsert,
              $setOnInsert = parseInsertObj(collection, _.merge(_.cloneDeep(opts.query), setOnInsertSrc));

        if (replaceEntireDoc) {
          update = $setOnInsert;
        } else {
          update.$setOnInsert = _.omit($setOnInsert, (v,k) => {
            return update.$set && update.$set[k] || v === undefined;
          });
        }
      }
    }

    if (opts.fields) {
      opts.fields = parseProjection(collection, opts.fields);
    }

    const result = await db.findAndModify(opts);

    if (result && result.value) {
      result.value = new collection(result.value);
    }

    return result;
  }


  async save(obj, denormalAlreadyDone) {
    const collection = this;

    await denormalPopulate(collection, obj, denormalAlreadyDone);

    if (Array.isArray(obj)) {
      return await* obj.map(doc => collection.save(doc, true));
    } else {
      if (obj[collection.def.primaryKey.field]) {
        if (collection.def.timestamps) {
          obj.updatedAt = new Date();
        }

        // Mongo error if _id is present in findAndModify and doc exists. Note this slightly
        // changes save() semantics. See https://github.com/tyranid-org/tyranid/issues/29
        const update = _.omit(obj, '_id');

        const result = await collection.findAndModify({
          query: { [collection.def.primaryKey.field]: obj[collection.def.primaryKey.field] },
          update: update,
          upsert: true,
          new: true
        });
        return result.value;
      } else {
        return collection.insert(obj, true);
      }
    }
  }


  async insert(obj, denormalAlreadyDone) {
    const collection  = this;
    let insertObj;

    await denormalPopulate(collection, obj, denormalAlreadyDone);

    if (Array.isArray(obj)) {
      insertObj = _.map(obj, el => parseInsertObj(collection, el));
    } else {
      insertObj = parseInsertObj(collection, obj);
    }

    return collection.db.insert(insertObj);
  }

  /**
   * Behaves like promised-mongo's update().
   */
  async update(query, update, opts) {
    const collection = this;

    if (collection.def.timestamps) {
      update.$set = update.$set || {};
      update.$set.updatedAt = new Date();
    }

    return await collection.db.update(query, update, opts);
  }


  /**
   * Updates a single document.  Used to implement document.$update() for example. @see update() for regular mongodb update()
   */
  updateDoc(obj) {
    const def    = this.def,
          fields = this.def.fields;
    const setObj = {};

    _.each(fields, (field, name) => {
      if (field.db !== false) {
        if (obj[name] !== undefined && name !== '_id' && name !== def.primaryKey.field) {
          setObj[name] = obj[name];
        }
      }
    });

    if (def.timestamps) {
      setObj.updatedAt = new Date();
    }

    return this.db.update(
      { [def.primaryKey.field] : obj[def.primaryKey.field] },
      { $set : setObj }
    );
  }

  /**
   * Behaves like promised-mongo's remove().
   */
  async remove(query, justOne) {
    return await this.db.remove(query, justOne);
  }

  /**
   * Register a plugin for this Collection. Similar API to Mongoose plugins:
   * http://mongoosejs.com/docs/plugins.html
   *
   * Note that the hooks API *does* differ from Mongoose's
   *
   * @see hook
   * @param  {Function} fn plugin callback
   * @param  {Object} [opts]
   * @return {Collection} self for chaining
   */
  plugin(fn, opts) {
    fn(this, opts);
    return this;
  }

  /**
   * Add a pre hook
   *
   * @param {string|Array} methods method name or array of method names to add pre hook
   * @param {Function(next, ...args)} cb hook callback
   * @param {Function} cb.next if modifying arguments, return next(modifiedArgs)
   * @param {Array} cb.args original method args
   * @return {Collection} self for chaining
   */
  pre(methods, cb) {
    hooker.hook(this, methods, {
      pre(...args) {
        const next = (...cbArgs) => {
          // hooker.filter() takes an args array (it uses Function.apply()
          // behind the scenes)
          return hooker.filter(this, cbArgs);
        };
        return this::cb(next, ...args);
      }
    });
    return this;
  }

  /**
   * Add a post hook
   *
   * @param {string|Array} methods method name or array of method names to add post hook
   * @param {Function(next, result)} cb hook callback
   * @param {Function} cb.next if modifying result, return next(modifiedResult)
   * @param {Array} cb.result original method result
   * @return {Collection} self for chaining
   */
  post(methods, cb) {
    hooker.hook(this, methods, {
      post(result) {
        const next = (result) => {
          return hooker.override(result);
        };
        return this::cb(next, result);
      }
    });
    return this;
  }

  /**
   * Remove hooks for a particular method. Needs to
   * be called once per pre/post() call.
   *
   * @param  {tring|Array} [methods] Method or methods. Unhooks all methods if unspecified.
   * @return {Collection} self for chaining
   */
  unhook(methods) {
    hooker.unhook(this, methods);
    return this;
  }

  /**
   * @opts: options ... options are:
   *   string | array<string>;   a property name or an array of property names
   *
   *   TODO: @only: array<string>;        list of fields in linked-to collections to query
   *
   * @documents: array<document>;       an array of documents
   *
   * If documents is not provided, this function will return a curried version of this function that takes a single array
   * of documents.  This allows populate to be fed into a promise chain.
   */
  populate(fields, documents, denormal) {
    const collection = this,
          population = Population.parse(collection, fields),
          populator  = new Populator(denormal);

    async function populatorFunc(documents) {
      const isArray = documents && Array.isArray(documents);
      documents = isArray ? documents : [documents];

      await population.populate(populator, documents);

      return isArray ? documents : documents[0];
    }

    return documents ? populatorFunc(documents) : populatorFunc;
  }

  fieldsBy(comparable) {
    const results = [];

    const cb = _.callback(comparable);

    function fieldsBy(path, val) {

      if (val.is) {
        if (val.is.def.name === 'object') {
          const fields = val.fields;
          if (fields) {
            fieldsBy(path, fields);
          }

        } else if (val.is.def.name === 'array') {
          fieldsBy(path, val.of);

        } else if (val.is.def){
          if (cb(val.is.def)) {
            results.push(path);
          }
        }
      } else {
        _.each( val, function(field, name) {
          fieldsBy(pathAdd(path, name), field);
        });
      }
    }

    fieldsBy('', this.def.fields);
    return results;
  }

  async valuesFor(fields) {
    const collection = this;

    const fieldsObj = { _id: 0 };

    _.each(fields, field => {
      if (field.db !== false) {
        fieldsObj[field] = 1;
      }
    });

    const values = [];

    const extractValues = val => {

      if (!val) {
        return;
      }

      if (_.isObject(val)) {
        _.each(val, extractValues);
      } else {
        values.push(val);
      }

    };

    await collection.db
      .find({}, fieldsObj)
      .forEach(extractValues);

    return _.uniq(values);
  }

  /**
   * This creates a new record instance out of a POJO.  Values are copied by reference (not deep-cloned!).
   */
  fromClient(pojo, path) {
    let collection = this,
        fields = collection.def.fields;

    const namePath = path ? new NamePath(this, path) : null;

    if (Array.isArray(pojo)) {
      return pojo.map(doc => collection.fromClient(doc, path));
    }

    if (namePath) {
      const tailDef = namePath.tailDef();
      collection = tailDef.id ? collectionsById[tailDef.id] : null;
      fields = tailDef.fields;
    }

    const obj = {}; // TODO:  create a new instance of this record-class?

    _.each(pojo, (v, k) => {
      const field = fields[k];

      if (field) {
        if (!field.is) {
          throw new Error('collection missing type ("is"), missing from schema?');
        }

        obj[k] = field.is.fromClient(field, v);
      }
    });

    return collection ? new collection(obj) : obj;
  }


  /**
   * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
   */
  toClient(data) {
    return toClient(this, data);
  }

  createValidator(collection, def) {
    const validator = {
      err(path, msg) {
        return new Error('Tyranid Schema Error| ' + def.name + (path ? path : '') + ': ' + msg);
      },

      field(path, field) {
        if (!_.isObject(field)) {
          throw validator.err('Invalid field definition, expected an object, got: ' + field);
        }

        if (field.label) {
          collection.labelField = path.substring(1);
        }

        let type;
        if (field.is) {
          if (_.isString(field.is)) {
            type = typesByName[field.is];

            if (!type) {
              throw validator.err(path, 'Unknown type ' + field.is);
            }

            if (type instanceof Collection) {
              throw validator.err(path, 'Trying to "is" a collection -- ' + field.is + ', either make it a "link" or a metadata snippet');
            }

            field.is = type;

            type.validateSchema(validator, path, field);

            if (type.def.name === 'object' && field.fields) {
              validator.fields(path, field.fields);
            }
          } else if (!_.isObject(field.is) || !field.is.def) {
            throw validator.err(path, 'Expected field.is to be a string or a type, got: ' + field.is);
          }
        } else if (field.link) {
          type = typesByName[field.link];

          if (!type) {
            throw validator.err(path, 'Unknown type ' + field.link);
          }

          if (!(type instanceof Collection)) {
            throw validator.err(path, 'Links must link to a collection, instead linked to ' + field.link);
          }

          field.is = typesByName.link;
          field.link = type;

        } else {
          throw validator.err('Unknown field definition at ' + path);
        }

        if (field.denormal) {
          if (!field.link) {
            throw validator.err(path, '"denormal" is only a valid option on links');
          }

          const denormal = collection.denormal = collection.denormal || {};
          denormal[path.substring(1)] = field.denormal;
        }

      },

      fields(path, val) {
        if (!val) {
          throw validator.err(path, 'Missing "fields"');
        }

        if (!_.isObject(val)) {
          throw validator.err(path, '"fields" should be an object, got: ' + val);
        }

        _.each(val, function(field, name) {
          if (_.isString(field)) {
            val[name] = field = { is: field };
          }

          return validator.field(path + '.' + name, field);
        });

      }
    };

    return validator;
  }

  validateSchema() {
    const collection = this;

    const validator = collection.createValidator(collection, collection.def);
    validator.fields('', collection.def.fields);

    if (!collection.def.fields[collection.def.primaryKey.field]) {
      throw new Error('Collection ' + collection.def.name + ' is missing a "' + collection.def.primaryKey.field + '" primary key field.');
    }

    if (collection.def.enum && !collection.labelField) {
      throw new Error('Some string field must have the label property set if the collection is an enumeration.');
    }

    this.validateValues();
  }

  validateValues() {
    const collection  = this,
          def  = collection.def,
          rows = def.values;

    if (!rows) {
      return;
    }

    if (!Array.isArray(rows)) {
      throw new Error('Expected values for collection ' + def.name + ' to be an array');
    }

    const rlen = rows.length
    let ri;

    if (!rlen) {
      return;
    }

    if (Array.isArray(rows[0])) {
      // array format

      for (ri=0; ri<rlen; ri++) {
        if (!Array.isArray(rows[ri])) {
          throw new Error('Expected value on row ' + ri + ' to be an array for collection ' + def.name);
        }
      }

      const header = rows[0],
            hlen = header.length,
            newValues = [];
      let hi,
          name;

      for (hi=0; hi<hlen; hi++) {
        name = header[hi];

        if (!_.isString(name)) {
          throw new Error('Expected value ' + hi + ' in the values header for collection ' + def.name + ' to be a string');
        }

        if (!def.fields[name]) {
          throw new Error('Field ' + name + ' does not exist on collection ' + def.name);
        }
      }

      for (ri=1; ri<rlen; ri++) {
        const orow = rows[ri],
              nrow = {};
        let v;

        if (orow.length !== hlen && orow.length !== hlen+1) {
          throw new Error('Incorrect number of values on row ' + ri + ' in collection ' + def.name);
        }

        for (hi=0; hi<hlen; hi++) {
          v = orow[hi];
          nrow[header[hi]] = v;
        }

        if (orow.length > hlen) {
          const extraVals = orow[hi];

          _.each(extraVals, function(v, n) {
            if (!def.fields[n]) {
              throw new Error('Field ' + n + ' does not exist on collection ' + def.name + ' on row ' + ri);
            }

            nrow[n] = v;
          });
        }

        v = new collection(nrow);
        if (collection.def.enum) {
          name = v[collection.labelField];

          if (!name) {
            throw new Error('Static document missing label field: ' + collection.labelField);
          }

          collection[_.snakeCase(name).toUpperCase()] = v;
        }

        newValues.push(v);
      }

      def.values = newValues;
    } else {
      // object format

      for (ri=0; ri<rlen; ri++) {
        if (!_.isObject(rows[ri])) {
          throw new Error('Expected value on row ' + ri + ' to be an object for collection ' + def.name);
        }
      }

    }

    const byIdIndex = collection.byIdIndex = {};
    def.values.forEach(function(doc) {
      byIdIndex[doc[collection.def.primaryKey.field]] = doc;
    });
  }


}
