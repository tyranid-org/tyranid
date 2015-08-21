import _ from 'lodash';
import fs from 'fs';


/*

   TODO:

   * server inherits client objects

   * validation (server vs. client)

   * authorized methods + filtering attributes to the client

   * offline support

   * store cache on client

   * link ownership

   * how do we share code between server and client from the same source .js file ?

   * database integrity analysis (find orphans, bad links, etc.)

   * pre-calc aggregation


  Collection Schema BNF:

  <field def>: {
    is:    <string, a field type>,
    as:    <string, a label>,
    help:  <string, end-user notes>,
    notes: <string, developer notes>,
    link:  <string, a collection name ... is is implied for this>
    ...
  }

  <field>:
      <field def>
    | [ <field> ]
    | <field object>

  <field object>:
    { ( <field name>: <field> )* }

  <schema>: {
    name:  <string>,
    id:    <3-character alphanum beginning with a non-hex alphanum character>,
    db:    <mongodb database>, // optional, if not present will default to config.db
    fields: <field object>
  }

*/

// immutables
const collections     = [],
      collectionsById = {},
      typesByName     = {},
      $all            = '$all',
      metaRegex       = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

// mutables
let   config          = {},
      ObjectType;


function escapeRegex(str) {
  return str.replace(metaRegex, '\\$&');
}


// NamePath
// ==========
class NamePath {

  constructor(collection, pathName) {
    this.col = collection;
    this.name = pathName;

    let path = this.path = pathName.length ? pathName.split('.') : [],
        plen = path.length,
        defs = this.defs = new Array(plen),
        def = collection.def;

    for (let pi=0; pi<plen; pi++) {
      let name = path[pi];

      if (!def.fields && def.link) {
        throw new Error(
          '"' + name + '" in "' + pathName +
          '" is not a contained within the collection "' + collection.def.name +
          '" (maybe need advanced population syntax)'
        );
      }

      def = def.fields[name];
      while (def.is.def.name === 'array') {
        def = def.of;
      }

      if (!def) {
        throw new Error(
          'Cannot find field "' + this.pathName(pi) +
          '" in ' + collection.def.name
        );
      }

      defs[pi] = def;
    }
  }


  /**
   * TODO:  make this a configurable Tyranid option as to how populated entries should be named
   *
   *    1. organizationId -> organization
   *    2. organization   -> organization$
   *    3. organization   -> organization
   */
  static populateNameFor(name) {
    let l = name.length;

    if (name.substring(l-2) === 'Id') {
      return name.substring(0, l-2);
    } else {
      return name + '$';
    }
  }

  pathName(pi) {
    return this.path.length === 1 ?
      this.name :
      this.path.slice(0, pi).join('.') + ' in ' + this.name;
  }

  toString() {
    return this.col.def.name + ':' + this.name;
  }

  tailDef() {
    let def = this.defs[this.defs.length-1];
    while (def.is.def.name === 'array') {
      def = def.of;
    }
    return def;
  }

  getUniq(obj) {
    let np = this,
        path = np.path,
        plen = path.length;

    let values = [];

    function getInner(pi, obj) {
      if (Array.isArray(obj)) {
        for (let ai=0, alen=obj.length; ai<alen; ai++ ) {
          getInner(pi, obj[ai]);
        }
      } else if (pi === plen) {
        values.push(obj);
      } else if (obj === undefined || obj === null) {
        return;
      } else if (!_.isObject(obj)) {
        throw new Error('Expected an object or array at ' + np.pathName(pi) + ', but got ' + obj);
      } else {
        getInner(pi+1, obj[path[pi]]);
      }
    }

    getInner(0, obj);
    return _.uniq(values);
  }


}



// Population
// ==========
class Population {


  constructor(namePath, projection) {
    if (!(namePath instanceof NamePath)) {
      throw new Error('parameter namePath is not an instanceof NamePath, got: ' + namePath);
    }

    this.namePath = namePath;
    this.projection = projection;
  }


  static parse(rootCollection, fields) {
    if (_.isString(fields)) {
      // process the really simple format -- a simple path name
      fields = [ fields ];
    }

    if (Array.isArray(fields)) {
      // process simplified array of pathnames format
      return new Population(
        new NamePath(rootCollection, ''),
        fields.map(function(field) {
          if (!_.isString(field)) {
            throw new Error('The simplified array format must contain an array of strings that contain pathnames.  Use the object format for more advanced queries.');
          }

          return new Population( new NamePath(rootCollection, field), [ $all ] );
        })
      );
    }

    if (_.isObject(fields)) {
      // process advanced object format which supports nested populations and projections

      let parseProjection = function(collection, fields) {
        let projection = [];

        _.each(fields, function(value, key) {
          if (key === $all) {
            projection.push($all);
          } else {
            let namePath = new NamePath(collection, key);

            if (value === 0 || value === false) {
              projection.push(new Population(namePath, false));
            } else if (value === 1 || value === true) {
              projection.push(new Population(namePath, true));
            } else {
              let link = namePath.tailDef().link;

              if (!link) {
                throw new Error('Cannot populate ' + collection.def.name + '.' + namePath + ' -- it is not a link');
              }

              if (value === $all) {
                projection.push(new Population(namePath, $all));
              } else if (!_.isObject(value)) {
                throw new Error('Invalid populate syntax at ' + collection.def.name + '.' + namePath + ': ' + value);
              } else {
                projection.push(new Population(namePath, parseProjection(collectionsById[link.id], value)));
              }
            }
          }
        });

        return projection;
      };

      return new Population(new NamePath(rootCollection, ''), parseProjection(rootCollection, fields));
    }

    throw new Error('missing opts.fields option to populate()');
  }


  hasNestedPopulations() {
    let proj = this.projection;
    if (Array.isArray(proj)) {
      return this.projection.some(function(population) { return population instanceof Population; });
    } else {
      return false;
    }
  }


  /*
   * TODO:  should we mark populated values as enumerable: false ?
   */
  populate(populator, documents) {
    let population = this;

    population.projection.forEach(function(population) {
      if (population instanceof Population) {
        populator.addIds(population, documents);
      }
    });

    // TODO:  PROJECTION-
    //        need to look at the projection and figure out some way to tell queryMissingIds which fields to query
    //        it should also do some sort of superset analysis across the population tree
    //        (i.e. if one population on org needs name and another needs permissions, we need to query name + permissions

    return populator.queryMissingIds()
      .then(function() {
        return Promise.all(
          population.projection.map(function(population) {
            if (!(population instanceof Population)) {
              return;
            }

            let nestedDocs;
            if (population.hasNestedPopulations()) {
              nestedDocs = [];
            }

            let namePath = population.namePath;
            documents.forEach(function(obj) {
              let cache = populator.cacheFor(namePath.tailDef().link.id),
                  path  = namePath.path,
                  plen  = path.length;

              function mapIdsToObjects(obj) {
                if (Array.isArray(obj)) {
                  let arr = new Array(obj.length);

                  for (let ai=0, alen=obj.length; ai<alen; ai++ ) {
                    arr[ai] = mapIdsToObjects(obj[ai]);
                  }

                  return arr;
                } else if (_.isObject(obj) && !(obj instanceof ObjectId)) {
                  throw new Error('Got object when expected a link value');
                } else if (!obj) {
                  return obj;
                } else {
                  obj = cache[obj.toString()];
                  if (nestedDocs) {
                    nestedDocs.push(obj);
                  }
                  return obj;
                }
              }

              function walkToEndOfPath(pi, obj) {
                let name = path[pi];

                if (Array.isArray(obj)) {
                  for (let ai=0, alen=obj.length; ai<alen; ai++ ){
                    walkToEndOfPath(pi, obj[ai]);
                  }
                } else if (obj === undefined || obj === null) {
                  return;
                } else if (pi === plen - 1) {
                  let pname = NamePath.populateNameFor(name);
                  obj[pname] = mapIdsToObjects(obj[name]);
                } else if (!_.isObject(obj)) {
                  throw new Error('Expected an object or array at ' + namePath.pathName(pi) + ', but got ' + obj);
                } else {
                  walkToEndOfPath(pi+1, obj[path[pi]]);
                }
              }

              walkToEndOfPath(0, obj);
            });

            if (nestedDocs) {
              return population.populate(populator, nestedDocs);
            } else {
              return Promise.resolve();
            }
          })
        );
      });
  };

}


// Populator
// =========

class Populator {

  constructor() {
    this.cachesByColId = {};
  }

  /**
   * cache maps ids to:
   *
   *   undefined:  this id has not been requested yet
   *   null:       this id has been requested but we don't have a doc for it yet
   *   document:   this id has been requested and we have a doc for it
   */
  cacheFor(colId) {
    let cache = this.cachesByColId[colId];

    if (!cache) {
      this.cachesByColId[colId] = cache = {};
    }

    return cache;
  }

  addIds(population, documents) {
    let namePath = population.namePath;
    let link = namePath.tailDef().link;

    if (!link) {
      throw new Error('Cannot populate ' + namePath + ' -- it is not a link');
    }

    let linkId = link.id,
        cache = this.cacheFor(linkId);

    documents.forEach(function(doc) {
      _.each(namePath.getUniq(doc), function(id) {
        if (id) {
          let v = cache[id];
          if (v === undefined) {
            cache[id] = null;
          }
        }
      });
    });
  }

  async queryMissingIds() {

    return await* _.map(this.cachesByColId, async(cache, colId) => {
      let collection = collectionsById[colId],
          idType = collection.def.fields._id.is;

      let ids = [];
      _.each(cache, (v, k) => {
        if (v === null) {
          // TODO:  once we can use ES6 Maps we can get rid of
          // this string conversion -- due to keys having to be
          // strings on regular objects
          ids.push(idType.fromString(k));
        }
      });

      if (!ids.length) return;

      let linkDocs = await collection.find({ _id: { $in: ids }});

      linkDocs.forEach(doc => {
        cache[doc._id] = doc;
      });

    });

  }

}



// Schema
// ======

function pathAdd(path, add) {
  return path ? path + '.' + add : add;
}

function setFalse(v) {
  return v !== undefined && !v;
}

function validateType(type) {
  let def = type.def;

  if (!def) {
    throw new Error('Missing schema definition.');
  }

  if (!def.name) {
    throw new Error('Missing "name" field in schema definition.');
  }

  if (!_.isString(def.name)) {
    throw new Error('"name" should be a string in schema definition.');
  }

  if (typesByName[def.name]) {
    throw new Error('Type ' + def.name + ' redefined.');
  }

  typesByName[def.name] = type;
}



// Validation
// ==========

class ValidationError {

  constructor(path, reason) {
    this.path = path;
    this.reason = reason;
  }

  get message() {
    return 'The value at ' + this.path + ' ' + this.reason;
  }

  toString() {
    return this.message;
  }

}



// Type
// ====

class Type {

  constructor(def) {
    this.def = def;
    validateType(this);
  }

  validateSchema(validator, path, field) {
    let v = this.def.validateSchema;
    if (v) {
      v(validator, path, field);
    }
  }

  validate(path, field, value) {
    if (field.required && value === undefined) {
      return new ValidationError(path, 'is required');
    }

    let f = this.def.validate;
    return f ? f(path, field, value) : undefined;
  }

  fromString(s) {
    let f = this.def.fromString;
    return f ? f(s) : s;
  }

  fromClient(field, value) {
    let f = this.def.fromClient;
    return f ? f(field, value) : value;
  }

  toClient(field, value, data) {

    let def = this.def,
        dClient = def.client,
        fClient = field.client;

    if (_.isFunction(dClient) && !dClient.call(data, value)) {
      return undefined;
    }

    if (_.isFunction(fClient) && !fClient.call(data, value)) {
      return undefined;
    }

    if (setFalse(dClient) || setFalse(fClient)) {
      return undefined;
    }

    let f = def.toClient;
    return f ? f(field, value) : value;

  }

}




// Document
// ========

let documentPrototype = {

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

  $populate(opts) {
    return this.$model.populate(opts, this);
  },

  $validate() {
    return ObjectType.validate('', this.$model.def, this);
  }

};

function defineDocumentProperties(dp) {
  Object.defineProperties(dp, {
    $label: {
      get: function() {
        return this.$model.labelFor(this);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    },

    $uid: {
      get: function() {
        return this.$model.idToUid(this._id);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    }
  });
}




// Collection
// ==========

class Collection {

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

    validateType(CollectionInstance);

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


  async save(obj) {
    let col = this;

    if (Array.isArray(obj)) {
      return await* obj.map(::col.save);
    } else {
      if (obj._id) {
        if (col.def.timestamps) {
          obj.updatedAt = new Date();
        }

        // the mongo driver only saves properties on the object directly, prototype values will not be recorded
        return col.db.save(obj);
      } else {
        return col.insert(obj);
      }
    }
  }


  insert(obj) {
    let col  = this,
        insertObj;

    if (Array.isArray(obj)) {
      insertObj = _.map(obj, el => parseInsertObj(col, el));
    } else {
      insertObj = parseInsertObj(col, obj);
    }

    return this.db.insert(insertObj);
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
  populate(opts, documents) {
    let collection = this,

        population = Population.parse(collection, opts),
        populator  = new Populator();

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
          return fieldsBy(path, val.fields);

        } else if (val.is.def.name === 'array') {
          return fieldsBy(path, val.of);

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
      _.each(fields, function(field) {
        if (field.db !== false) {
          fieldsObj[field] = 1;
        }
      });

      let values = [];
      col.db.find({}, fieldsObj).forEach(function(err, doc) {
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
  fromClient(pojo,path) {
    let col = this;
    let fields = col.def.fields;

    let namePath = path ? new NamePath(this, path) : null;

    if (Array.isArray(pojo)) {
      return pojo.map(function(doc) {
        return col.fromClient(doc,path);
      });
    }

    if (namePath) {
      let tailDef = namePath.tailDef();
      col = tailDef.id ? collectionsById[tailDef.id] : null;
      fields = tailDef.fields;
    }

    let obj = {}; // TODO:  create a new instance of this record-class?

    _.each(pojo, function(v, k) {
      let field = fields[k];

      if (field) {
        if (!field.is ) {
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
      err: function err(path, msg) {
        return new Error('Tyranid Schema Error| ' + def.name + (path ? path : '') + ': ' + msg);
      },

      field: function(path, field) {
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
      },

      fields: function(path, val) {
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




function parseInsertObj(col, obj) {
  let def       = col.def,
      fields    = def.fields,
      insertObj = {};

  _.each(fields, function(field, name) {
    if (field.db !== false) {
      if (obj[name] === undefined && field.defaultValue !== undefined) {
        insertObj[name] = field.defaultValue;
      } else {
        insertObj[name] = obj[name];
      }
    }
  });

  if (def.timestamps) {
    let now = new Date();
    insertObj.createdAt = now;
    insertObj.updatedAt = now;
  }

  return insertObj;
}







function toClient(col, data) {

  if (Array.isArray(data)) {
    return data.map(function(doc) {
      return toClient(col, doc);
    });
  }

  let obj = {};

  let fields = col ? col.def.fields : null;
  _.each(data, function(v, k) {
    let field;

    if (fields && (field=fields[k])) {
      v = field.is.toClient(field, v, data);

      if (v !== undefined) {
        obj[k] = v;
      }
    } else if (v && v.$toClient) {
      obj[k] = v.$toClient();
    } else if (Array.isArray(v)) {
      // TODO:  we can figure out the type of k using metadata to make this work for the case when
      //        we have an array of pojos instead of instances
      obj[k] = toClient(null, v);
    } else if (v instanceof ObjectId) {
      obj[k] = v.toString();
    } else {
      // TODO:  right now we're sending down everything we don't have metadata for ...
      //        for example, populated values ... we probably need a more comprehensive solution here, not sure
      //        what it would be yet
      obj[k] = v;
    }
  });

  // send down computed fields ... maybe move everything into this so we only send down what we know about ... can also calculate populated names to send
  _.each(fields, function(field, name) {
    let value, client;
    if (field.get && (client = field.client)) {
      value = data[name];
      if ( !_.isFunction(client) || client.call(data, value) ) {
        obj[name] = value;
      }
    }
  });

  return obj;
}



const Tyranid = {


  /**
   * Properties
   */
  Type,
  ValidationError,
  $all,
  Collection,
  collections,


  /**
   * Methods
   */
  config(opts) {
    config = opts;

    if (!opts.db)
      throw new Error('Missing "db" in config.');

    this.db = opts.db;

    if (opts.validate) {
      if (!Array.isArray(opts.validate))
        throw new Error('Validate options must be an array of objects of "dir" and "fileMatch".');

      this.validate(opts.validate);
    }
  },

  validate(opts) {
    if (opts) {
      _.forEach(opts, function(opt) {
        if (!opt.dir)
          throw new Error('dir not specified in validate option.');

        let fileRe = opt.fileMatch ? new RegExp(opt.fileMatch) : undefined;

        fs
          .readdirSync(opt.dir)
          .filter(function(file) {
            return !fileRe || fileRe.test(file);
          })
          .forEach(function(file) {
            require(opt.dir + '/' + file);
          });
      });
    }

    collections.forEach(function(col) {
      col.validateSchema();
    });
  },

  valuesBy(comparable) {

    return Promise.all(
      _.map(Tyranid.collections, function(c) {
        return c.valuesFor(c.fieldsBy(comparable));
      })
    ).then(function(arrs) {
      return _.union.apply(null, arrs);
    });
  },

  parseUid(uid) {
    let colId = uid.substring(0, 3);

    let col = collectionsById[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    let strId = uid.substring(3);

    let idType = col.def.fields._id.is;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  },

  byUid(uid) {
    let p = Tyranid.parseUid(uid);
    return p.collection.byId(p.id);
  },

  byName(name) {
    let nameLower = name.toLowerCase();

    return _.find(collections, function(c) {
      return c.def.name.toLowerCase() === nameLower;
    });
  },

  /**
   * Mostly just used by tests.
   */
  reset() {
    collections.length = 0;
    for (let id in collectionsById) {
      delete collectionsById[id];
    }
    for (let name in typesByName) {
      let type = typesByName[name];
      if (type instanceof Collection) {
        delete typesByName[name];
      }
    }
  }

};


// Built-in Types
// ==============

new Type({
  name: 'link',
  fromClient(field, value) {
    let linkField = field.link.def.fields._id;
    return linkField.is.def.fromClient(linkField, value);
  },
  toClient(field, value) {
    return value ? (value instanceof ObjectId ? value.toString() : value) : value;
  }
});

function validateUidCollection(validator, path, collection) {
  let unknownTypeErrMsg = 'Unknown Collection for uid "of".';
  if (collection instanceof Collection) {
    if (!collectionsById[collection.id]) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else if (typeof collection === 'string') {
    collection = Tyranid.byName(collection);
    if (!collection) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else {
    throw validator.err(path, unknownTypeErrMsg);
  }
}

new Type({
  name: 'uid',
  validateSchema (validator, path, field) {
    let of = field.of;

    if (!of) {
      return;
    }

    if (Array.isArray(of)) {
      _.each(of, function(v /*,k*/ ) {
        validateUidCollection(validator, path, v);
      });
    } else {
      validateUidCollection(validator, path, of);
    }
  }
});

new Type({ name: 'boolean' });
new Type({
  name: 'integer',
  fromString(s) {
    return parseInt(s, 10);
  },
  fromClient(field, value) {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    } else {
      return value;
    }
  },
  validate(path, field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new ValidationError(path, 'is not an integer');
    }
  }
});
new Type({ name: 'string' });
new Type({ name: 'double' });

new Type({
  name: 'array',
  fromClient(field, value) {
    if (Array.isArray(value)) {
      let ofField = field.of;
      return value.map(function(v) {
        return ofField.is.fromClient(ofField, v);
      });
    } else {
      return value;
    }
  },
  validateSchema(validator, path, field) {
    let of = field.of;

    if (!of) {
      throw validator.err(path, 'Missing "of" property on array definition');
    }

    if (_.isPlainObject(of)) {
      validator.field(path, of);
    } else {
      of = typesByName[of];
      if (!of) {
        throw validator.err(path, 'Unknown type for "of".');
      }

      field.of = { is: of.def.name };
      validator.field(path, field.of);
    }
  }
});

ObjectType = new Type({
  name: 'object',
  validate(path, def, obj) {
    let errors = [];

    if (obj) {
      _.each(def.fields, function(field, fieldName) {
        if (!field.get) {
          let error = field.is.validate(path + '.' + fieldName, field, obj[fieldName]);

          if (error instanceof ValidationError) {
            errors.push(error);
          } else if (Array.isArray(error)) {
            Array.prototype.push.apply(errors, error);
          }
        }
      });
    }

    return errors;
  }
});

new Type({
  name: 'mongoid',
  fromString(str) {
    return ObjectId(str);
  },
  fromClient(field, value) {
    return ObjectId(value);
  },
  toClient(field, value) {
    return value ? value.toString() : value;
  }
});

new Type({ name: 'email' });
new Type({ name: 'url' });
new Type({ name: 'password', client: false });
new Type({ name: 'image' });

new Type({
  name: 'date',
  fromString(s) {
    return s ? new Date(s) : s;
  },
  fromClient(field, value) {
    if (typeof value === 'string') {
      return new Date(value);
    }

    return value;
  },
  validate(path, field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(path, 'is not a date');
    }
  }
});


export default Tyranid;
