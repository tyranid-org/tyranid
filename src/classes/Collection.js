import _ from 'lodash';

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
    return this.$model.update(this);
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
        return this.$model.idToUid(this[this.def.primaryKey]);
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

    Type.validateType(CollectionInstance);

    if (!def.dbName) {
      def.dbName = def.name;
    }

    if (!def.primaryKey) {
      def.primaryKey = '_id';
    }

    const db = def.db || config.db;

    if ( !db ) {
      throw new Error('The "db" parameter must be specified either in the Collection schema or in the Tyranid.config().');
    }

    CollectionInstance.db = db.collection(CollectionInstance.def.dbName);

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
        id = this.def.fields[this.def.primaryKey].is.fromString(id);
      }

      return this.findOne({ [this.def.primaryKey]: id });
    }
  }

  byIds(ids) {
    const collection = this;

    if (collection.isStatic()) {
      return Promise.resolve(ids.map(id => collection.byIdIndex[id]));
    } else {
      return collection.find({ [this.def.primaryKey]: { $in: ids }});
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
  async find(...args) {
    const collection = this,
          db         = collection.db;

    const documents = await db.find(...args);

    return _(documents)
      .map(doc => doc ? new collection(doc) : null)
      .compact()
      .value();
  }

  /**
   * Behaves like promised-mongo's findOne() method except that the results are mapped to collection instances.
   */
  async findOne(...args) {
    const collection = this,
          db         = collection.db;

    const doc = await db.findOne(...args);

    return doc ? new collection(doc) : null;
  }

  /**
   * Behaves like promised-mongo's findAndModify() method except that the results are mapped to collection instances.
   */
  async findAndModify(opts) {
    const collection = this,
          db         = collection.db;

    let update;

    if ((update=opts.update) && collection.def.timestamps) {
      let $set = update.$set;
      if (!$set) {
        $set = update.$set = {};
      }
      $set.updatedAt = new Date();
    }

    if (opts.upsert) {
      opts.update = opts.update || {};
      const $setOnInsert = parseInsertObj(collection, _.merge(_.cloneDeep(opts.query), opts.update.$setOnInsert));
      opts.update.$setOnInsert = _.omit($setOnInsert, (v,k) => {
        return opts.update.$set && opts.update.$set[k] || v === undefined;
      });
    }

    const result = await db.findAndModify(opts);

    const doc = result[0];

    if (doc) {
      result[0] = new collection(doc);
    }

    return result;
  }


  async save(obj, denormalAlreadyDone) {
    const collection = this;

    await denormalPopulate(collection, obj, denormalAlreadyDone);

    if (Array.isArray(obj)) {
      return await* obj.map(doc => collection.save(doc, true));
    } else {
      if (obj[collection.def.primaryKey]) {
        if (collection.def.timestamps) {
          obj.updatedAt = new Date();
        }

        // the mongo driver only saves properties on the object directly, prototype values will not be recorded
        return collection.db.save(obj);
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

  update(obj) {
    const def    = this.def,
          fields = this.def.fields;
    const setObj = {};

    _.each(fields, (field, name) => {
      if (field.db !== false) {
        if (obj[name] !== undefined && name !== '_id' && name !== def.primaryKey) {
          setObj[name] = obj[name];
        }
      }
    });

    if (def.timestamps) {
      setObj.updatedAt = new Date();
    }

    return this.db.update(
      { [def.primaryKey] : obj[def.primaryKey] },
      { $set : setObj }
    );
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

  valuesFor(fields) {
    const collection = this;

    return new Promise(function(resolve, reject) {
      const fieldsObj = { _id: 0 };
      _.each(fields, field => {
        if (field.db !== false) {
          fieldsObj[field] = 1;
        }
      });

      const values = [];
      collection.db.find({}, fieldsObj).forEach((err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        if (doc) {
          const extractValues = function(val) {
            if (_.isObject(val) )
              _.each(val, extractValues);
            else
              values.push(val);
          };

          extractValues(doc);
        } else {
          resolve(_.uniq(values));
        }
      });
    });
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

  validateSchema() {
    const collection = this,
          def = collection.def;

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

    validator.fields('', collection.def.fields);

    if (!collection.def.fields[collection.def.primaryKey]) {
      throw new Error('Collection ' + collection.def.name + ' is missing a "' + collection.def.primaryKey + '" primary key field.');
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
      byIdIndex[doc[collection.def.primaryKey]] = doc;
    });
  }


}
