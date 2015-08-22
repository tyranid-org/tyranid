import _ from 'lodash';

import Type from './Type.js';
import { ObjectType } from '../builtins.js';
import Population from './Population.js';
import Populator from './Populator.js';
import NamePath from './NamePath.js';

// variables shared between classes
import {
  config          ,
  collections     ,
  collectionsById ,
  typesByName     ,
  $all            ,
  escapeRegex     ,
  pathAdd         ,
  parseInsertObj  ,
  toClient
} from '../common.js';


function denormalPopulate(col, obj) {
  let denormal = col.denormal;
  return denormal ? col.populate(denormal, obj, true) : Promise.resolve();
}


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
        return this.$model.idToUid(this._id);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    }
  });
}


export default class Collection {

  constructor(def) {

    let colId = def.id;
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
    // instances of Collection are functions so that you can go "let User = ...; let user = new User();"
    //
    // i.e.  instances of Collection are collections
    //       instances of instances of Collection are documents (collection instances)
    //

    let dp = {};
    _.assign(dp, documentPrototype);

    let CollectionInstance = function(data) {
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

    let db = def.db || config.db;

    if ( !db ) {
      throw new Error('The "db" parameter must be specified either in the Collection schema or in the Tyranid.config().');
    }

    CollectionInstance.db = db.collection(CollectionInstance.def.dbName);

    collections.push(CollectionInstance);

    collectionsById[def.id] = CollectionInstance;

    for (let key in dp) {
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
      let get  = field.get,
          set  = field.set,
          isDb = field.db;

      if (get || set) {
        let prop = {
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

  //Collection.prototype = Object.create( null );

  idToUid(id) {
    return this.id + id;
  }

  isStatic() {
    return this.def.enum;
  }

  byId(id) {
    if (typeof id === 'string') {
      id = this.def.fields._id.is.fromString(id);
    }

    return this.findOne({ _id: id });
  }

  byLabel(n, forcePromise) {
    let col = this,
        findName = col.labelField,
        matchLower = n.toLowerCase();

    if (col.isStatic()) {
      let value = _.find(col.def.values, function(v) {
        let name = v[findName];
        return name && name.toLowerCase() === matchLower;
      });

      return forcePromise ? new Promise.resolve(value) : value;
    } else {
      let query = {};
      query[findName] = {$regex: escapeRegex(matchLower), $options : 'i'};
      return col.db.findOne(query);
    }
  }

  labelFor(doc) {
    let col = this,
        labelField = col.labelField;

    // TODO:  have this use path finder to walk the object in case the label is stored in an embedded object
    // TODO:  support computed properties
    return doc[labelField];
  }


  /**
   * Behaves like promised-mongo's find() method except that the results are mapped to collection instances.
   */
  async find(...args) {
    let collection = this,
        db         = collection.db;

    let documents = await db.find(...args);

    return _(documents)
      .map(doc => doc ? new collection(doc) : null)
      .compact()
      .value();
  }

  /**
   * Behaves like promised-mongo's findOne() method except that the results are mapped to collection instances.
   */
  async findOne(...args) {
    let collection = this,
        db         = collection.db;

    let doc = await db.findOne(...args);

    return doc ? new collection(doc) : null;
  }

  /**
   * Behaves like promised-mongo's findAndModify() method except that the results are mapped to collection instances.
   */
  async findAndModify(opts) {
    let collection = this,
        db         = collection.db,
        update;

    if ((update=opts.update) && collection.def.timestamps) {
      let $set = update.$set;
      if (!$set) {
        $set = update.$set = {};
      }
      $set.updatedAt = new Date();
    }

    let result = await db.findAndModify(opts);

    let doc = result[0];

    if (doc) {
      result[0] = new collection(doc);
    }

    return result;
  }


  async save(obj, denormalAlreadyDone) {
    let col = this;

    await denormalPopulate(col, obj, denormalAlreadyDone);

    if (Array.isArray(obj)) {
      return await* obj.map(doc => col.save(doc, true));
    } else {
      if (obj._id) {
        if (col.def.timestamps) {
          obj.updatedAt = new Date();
        }

        // the mongo driver only saves properties on the object directly, prototype values will not be recorded
        return col.db.save(obj);
      } else {
        return col.insert(obj, true);
      }
    }
  }


  insert(obj, denormalAlreadyDone) {
    let col  = this,
        insertObj;

    await denormalPopulate(col, obj, denormalAlreadyDone);

    if (Array.isArray(obj)) {
      insertObj = _.map(obj, el => parseInsertObj(col, el));
    } else {
      insertObj = parseInsertObj(col, obj);
    }

    return col.db.insert(insertObj);
  }

  update(obj) {
    let def    = this.def,
        fields = this.def.fields;
    let setObj = {};

    _.each(fields, (field, name) => {
      if (field.db !== false) {
        if (obj[name] !== undefined && name !== '_id') {
          setObj[name] = obj[name];
        }
      }
    });

    if (def.timestamps) {
      setObj.updatedAt = new Date();
    }

    return this.db.update(
      { _id : obj._id },
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
    let collection = this,
        population = Population.parse(collection, fields),
        populator  = new Populator(denormal);

    async function populatorFunc(documents) {
      let isArray = documents && Array.isArray(documents);
      documents = isArray ? documents : [documents];

      await population.populate(populator, documents);

      return isArray ? documents : documents[0];
    }

    return documents ? populatorFunc(documents) : populatorFunc;
  }

  fieldsBy(comparable) {
    let results = [];

    let cb = _.callback(comparable);

    function fieldsBy(path, val) {

      if (val.is) {
        if (val.is.def.name === 'object') {
          let fields = val.fields;
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
    let col = this;

    return new Promise(function(resolve, reject) {
      let fieldsObj = { _id: 0 };
      _.each(fields, field => {
        if (field.db !== false) {
          fieldsObj[field] = 1;
        }
      });

      let values = [];
      col.db.find({}, fieldsObj).forEach((err, doc) => {
        if (err) {
          reject(err);
          return;
        }

        if (doc) {
          let extractValues = function(val) {
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
    let col = this;
    let fields = col.def.fields;

    let namePath = path ? new NamePath(this, path) : null;

    if (Array.isArray(pojo)) {
      return pojo.map(doc => col.fromClient(doc, path));
    }

    if (namePath) {
      let tailDef = namePath.tailDef();
      col = tailDef.id ? collectionsById[tailDef.id] : null;
      fields = tailDef.fields;
    }

    let obj = {}; // TODO:  create a new instance of this record-class?

    _.each(pojo, (v, k) => {
      let field = fields[k];

      if (field) {
        if (!field.is) {
          throw new Error('collection missing type ("is"), missing from schema?');
        }

        obj[k] = field.is.fromClient(field, v);
      }
    });

    return col ? new col(obj) : obj;
  }


  /**
   * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
   */
  toClient(data) {
    return toClient(this, data);
  }

  validateSchema() {
    let col = this,
        def = col.def;

    let validator = {
      err(path, msg) {
        return new Error('Tyranid Schema Error| ' + def.name + (path ? path : '') + ': ' + msg);
      },

      field(path, field) {
        if (!_.isObject(field)) {
          throw validator.err('Invalid field definition, expected an object, got: ' + field);
        }

        if (field.label) {
          col.labelField = path.substring(1);
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

          let denormal = col.denormal = col.denormal || {};
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

    validator.fields('', col.def.fields);

    if (!col.def.fields._id) {
      throw new Error('Collection ' + col.def.name + ' is missing an _id field.');
    }

    if (col.def.enum && !col.labelField) {
      throw new Error('Some string field must have the label property set if the collection is an enumeration.');
    }

    this.validateValues();
  }

  validateValues() {
    let col  = this,
        def  = col.def,
        rows = def.values;

    if (!rows) {
      return;
    }

    if (!Array.isArray(rows)) {
      throw new Error('Expected values for collection ' + def.name + ' to be an array');
    }

    let ri,
        rlen = rows.length;
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

      let header = rows[0],
          hi,
          hlen = header.length,
          newValues = [],
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
        let orow = rows[ri],
            nrow = {},
            v;

        if (orow.length !== hlen && orow.length !== hlen+1) {
          throw new Error('Incorrect number of values on row ' + ri + ' in collection ' + def.name);
        }

        for (hi=0; hi<hlen; hi++) {
          v = orow[hi];
          nrow[header[hi]] = v;
        }

        if (orow.length > hlen) {
          let extraVals = orow[hi];

          _.each(extraVals, function(v, n) {
            if (!def.fields[n]) {
              throw new Error('Field ' + n + ' does not exist on collection ' + def.name + ' on row ' + ri);
            }

            nrow[n] = v;
          });
        }

        v = new col(nrow);
        if (col.def.enum) {
          name = v[col.labelField];

          if (!name) {
            throw new Error('Static document missing label field: ' + col.labelField);
          }

          col[_.snakeCase(name).toUpperCase()] = v;
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
  }


}
