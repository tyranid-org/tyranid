'use strict';

var _ = require( 'lodash'),
   fs = require('fs');

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

var collections     = [],
    collectionsById = {},
    typesByName     = {},
    config          = {},
    ObjectType,

    $all            = '$all';


function escapeRegex(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


// NamePath
// ========

function NamePath(collection, pathName) {
  this.col = collection;
  this.name = pathName;
  var path = this.path = pathName.length ? pathName.split('.') : [],
      plen = path.length;

  var defs = this.defs = new Array(plen);


  var def = collection.def;
  for (var pi=0; pi<plen; pi++) {
    var name = path[pi];

    if (!def.fields && def.link) {
      throw new Error('"' + name + '" in "' + pathName + '" is not a contained within the collection "' + collection.def.name + '" (maybe need advanced population syntax)');
    }

    def = def.fields[name];
    while (def.is.def.name === 'array') {
      def = def.of;
    }

    if (!def) {
      throw new Error('Cannot find field "' + this.pathName(pi) + '" in ' + collection.def.name);
    }

    defs[pi] = def;
  }
}

NamePath.prototype.pathName = function(pi) {
  return this.path.length === 1 ? this.name : this.path.slice(0, pi).join('.') + ' in ' + this.name;
};

NamePath.prototype.toString = function() {
  return this.col.def.name + ':' + this.name;
};

NamePath.prototype.tailDef = function() {
  var def = this.defs[this.defs.length-1];
  while (def.is.def.name === 'array') {
    def = def.of;
  }
  return def;
};

/**
 * TODO:  make this a configurable Tyranid option as to how populated entries should be named
 *
 *    1. organizationId -> organization
 *    2. organization   -> organization$
 *    3. organization   -> organization
 */
NamePath.populateNameFor = function(name, denormal) {
  var l = name.length;

  if (denormal) {
    return name + '_';
  } else if (name.substring(l-2) === 'Id') {
    return name.substring(0, l-2);
  } else {
    return name + '$';
  }
};

NamePath.prototype.getUniq = function(obj) {
  var np = this,
      path = np.path,
      plen = path.length;

  var values = [];

  function getInner(pi, obj) {
    if (Array.isArray(obj)) {
      for (var ai=0, alen=obj.length; ai<alen; ai++ ) {
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
};


// Population
// ==========

function Population(namePath, projection) {
  if (!(namePath instanceof NamePath)) {
    throw new Error('parameter namePath is not an instanceof NamePath, got: ' + namePath);
  }

  this.namePath = namePath;
  this.projection = projection;
}

Population.prototype.isSimple = function() {
  return _.isBoolean(this.projection);
};

Population.parse = function(rootCollection, fields) {
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

    var parseProjection = function(collection, fields) {
      var projection = [];

      _.each(fields, function(value, key) {
        if (key === $all) {
          projection.push($all);
        } else {
          var namePath = new NamePath(collection, key);

          if (value === 0 || value === false) {
            projection.push(new Population(namePath, false));
          } else if (value === 1 || value === true) {
            projection.push(new Population(namePath, true));
          } else {
            var link = namePath.tailDef().link;

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
};

Population.prototype.hasNestedPopulations = function() {
  var proj = this.projection;
  if (Array.isArray(proj)) {
    return this.projection.some(function(population) { return population instanceof Population; });
  } else {
    return false;
  }
};

/*
 * TODO:  should we mark populated values as enumerable: false ?
 */
Population.prototype.populate = function(populator, documents) {
  var population = this;

  population.projection.forEach(function(population) {
    if (population instanceof Population && !population.isSimple()) {
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
          if (!(population instanceof Population) || population.isSimple()) {
            return;
          }

          var nestedDocs;
          if (population.hasNestedPopulations()) {
            nestedDocs = [];
          }

          var namePath = population.namePath;
          documents.forEach(function(obj) {
            var cache = populator.cacheFor(namePath.tailDef().link.id),
                path  = namePath.path,
                plen  = path.length;

            function mapIdsToObjects(obj) {
              if (Array.isArray(obj)) {
                var arr = new Array(obj.length);

                for (var ai=0, alen=obj.length; ai<alen; ai++ ) {
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
              var name = path[pi];

              if (Array.isArray(obj)) {
                for (var ai=0, alen=obj.length; ai<alen; ai++ ){
                  walkToEndOfPath(pi, obj[ai]);
                }
              } else if (obj === undefined || obj === null) {
                return;
              } else if (pi === plen - 1) {
                var pname = NamePath.populateNameFor(name, populator.denormal);
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


// Populator
// =========

function Populator(denormal) {

  this.denormal = denormal;
  this.cachesByColId = {};
}

/**
 * cache maps ids to:
 *
 *   undefined:  this id has not been requested yet
 *   null:       this id has been requested but we don't have a doc for it yet
 *   document:   this id has been requested and we have a doc for it
 */
Populator.prototype.cacheFor = function(colId) {
  var cache = this.cachesByColId[colId];

  if (!cache) {
    this.cachesByColId[colId] = cache = {};
  }

  return cache;
};

Populator.prototype.addIds = function(population, documents) {
  var namePath = population.namePath;
  var link = namePath.tailDef().link;

  if (!link) {
    throw new Error('Cannot populate ' + namePath + ' -- it is not a link');
  }

  var linkId = link.id,
      cache = this.cacheFor(linkId);

  documents.forEach(function(doc) {
    _.each(namePath.getUniq(doc), function(id) {
      if (id) {
        var v = cache[id];
        if (v === undefined) {
          cache[id] = null;
        }
      }
    });
  });
};

Populator.prototype.queryMissingIds = function() {
  return Promise.all(
    _.map(this.cachesByColId, function(cache, colId) {
      var collection = collectionsById[colId],
          idType = collection.def.fields._id.is;

      var ids = [];
      _.each(cache, function(v, k) {
        if (v === null) {
          // TODO:  once we can use ES6 Maps we can get rid of this string conversion -- due to keys having to be strings on regular objects
          ids.push(idType.fromString(k));
        }
      });

      if (!ids.length)
        return Promise.resolve();

      return collection.find({ _id: { $in: ids }}).then(function(linkDocs) {
        linkDocs.forEach(function(doc) {
          cache[doc._id] = doc;
        });
      });
    })
  );
};



// Schema
// ======

function pathAdd(path, add) {
  return path ? path + '.' + add : add;
}

function setFalse(v) {
  return v !== undefined && !v;
}

function validateType(type) {
  var def = type.def;

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

function ValidationError(path, reason) {
  this.path = path;
  this.reason = reason;
}

Object.defineProperty(ValidationError, 'message', {
  get: function() {
    return 'The value at ' + this.path + ' ' + this.reason;
  }
});

ValidationError.prototype.toString = function() {
  return this.message;
};



// Type
// ====

function Type(def) {
  this.def = def;

  validateType(this);
}

Type.prototype.validateSchema = function(validator, path, field) {
  var v = this.def.validateSchema;
  if (v) {
    v(validator, path, field);
  }
};

Type.prototype.validate = function(path, field, value) {
  if (field.required && value === undefined) {
    return new ValidationError(path, 'is required');
  }

  var f = this.def.validate;
  return f ? f(path, field, value) : undefined;
};

Type.prototype.fromString = function(s) {
  var f = this.def.fromString;
  return f ? f(s) : s;
};

Type.prototype.fromClient = function(field, value) {
  var f = this.def.fromClient;
  return f ? f(field, value) : value;
};

Type.prototype.toClient = function(field, value, data) {

  var def = this.def,
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

  var f = def.toClient;
  return f ? f(field, value) : value;

};


// Document
// ========

var documentPrototype = {
  $save: function() {
    return this.$model.save(this);
  },

  $insert: function() {
    return this.$model.insert(this);
  },

  $update: function() {
    return this.$model.update(this);
  },

  $toClient: function() {
    return this.$model.toClient(this);
  },

  $populate: function(fields, denormal) {
    return this.$model.populate(fields, this, denormal);
  },

  $validate: function() {
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

function Collection(def) {

  var colId = def.id;
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
  // instances of Collection are functions so that you can go "var User = ...; var user = new User();"
  //
  // i.e.  instances of Collection are collections
  //       instances of instances of Collection are documents (collection instances)
  //

  var dp = {};
  _.assign(dp, documentPrototype);

  var CollectionInstance = function(data) {
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

  var db = def.db || config.db;

  if ( !db ) {
    throw new Error('The "db" parameter must be specified either in the Collection schema or in the Tyranid.config().');
  }

  CollectionInstance.db = db.collection(CollectionInstance.def.dbName);

  collections.push(CollectionInstance);

  collectionsById[def.id] = CollectionInstance;

  for (var key in dp) {
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
    var get  = field.get,
        set  = field.set,
        isDb = field.db;

    if (get || set) {
      var prop = {
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

Collection.prototype.idToUid = function(id) {
  return this.id + id;
};

Collection.prototype.isStatic = function() {
  return this.def.enum;
};

Collection.prototype.byId = function(id) {
  if (typeof id === 'string') {
    id = this.def.fields._id.is.fromString(id);
  }

  return this.findOne({ _id: id });
};

Collection.prototype.byLabel = function(n, forcePromise) {
  var col = this,
      findName = col.labelField,
      matchLower = n.toLowerCase();

  if (col.isStatic()) {
    var value = _.find(col.def.values, function(v) {
      var name = v[findName];
      return name && name.toLowerCase() === matchLower;
    });

    return forcePromise ? new Promise.resolve(value) : value;
  } else {
    var query = {};
    query[findName] = {$regex: escapeRegex(matchLower), $options : 'i'};
    return col.db.findOne(query);
  }
};

Collection.prototype.labelFor = function(doc) {
  var col = this,
      labelField = col.labelField;

  // TODO:  have this use path finder to walk the object in case the label is stored in an embedded object
  // TODO:  support computed properties
  return doc[labelField];
};

/**
 * Behaves like promised-mongo's find() method except that the results are mapped to collection instances.
 */
Collection.prototype.find = function() {
  var collection = this,
      db         = collection.db;

  return db.find.apply(db, arguments).then(function(documents) {
    return _.compact(_.map(documents, function(doc) { return doc ? new collection(doc) : null; }));
  });
};

/**
 * Behaves like promised-mongo's findOne() method except that the results are mapped to collection instances.
 */
Collection.prototype.findOne = function() {
  var collection = this,
      db         = collection.db;

  return db.findOne.apply(db, arguments).then(function(doc) {
    return doc ? new collection(doc) : null;
  });
};

/**
 * Behaves like promised-mongo's findAndModify() method except that the results are mapped to collection instances.
 */
Collection.prototype.findAndModify = function(opts) {
  var collection = this,
      db         = collection.db,
      update;

  if ((update=opts.update) && collection.def.timestamps) {
    var $set = update.$set;
    if (!$set) {
      $set = update.$set = {};
    }
    $set.updatedAt = new Date();
  }

  return db.findAndModify(opts).then(function(result) {
    var doc = result[0];

    if (doc) {
      result[0] = new collection(doc);
    }

    return result;
  });
};

function denormalPopulate(col, obj) {
  var denormal = col.denormal;
  return denormal ? col.populate(denormal, obj, true) : Promise.resolve();
}

Collection.prototype.save = function(obj, denormalAlreadyDone) {
  var col = this;

  return denormalPopulate(col, obj, denormalAlreadyDone)
    .then(function() {
      if (Array.isArray(obj)) {
        return Promise.all(
          obj.map(function(doc) {
            return col.save(doc, true);
          })
        );
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
    });
};

var parseInsertObj = function parseInsertObj(col, obj) {
  var def       = col.def,
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
    var now = new Date();
    insertObj.createdAt = now;
    insertObj.updatedAt = now;
  }

  return insertObj;
};

Collection.prototype.insert = function(obj, denormalAlreadyDone) {
  var col  = this,
      insertObj;

  return denormalPopulate(col, obj, denormalAlreadyDone)
    .then(function() {
      if (Array.isArray(obj)) {
        insertObj = _.map(obj, function(el) {
          return parseInsertObj(col, el);
        });
      } else {
        insertObj = parseInsertObj(col, obj);
      }

      return col.db.insert(insertObj);
    });
};

Collection.prototype.update = function(obj) {
  var def    = this.def,
      fields = this.def.fields;
  var setObj = {};

  _.each(fields, function(field, name) {
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
};


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
Collection.prototype.populate = function(fields, documents, denormal) {
  var collection = this,

      population = Population.parse(collection, fields),
      populator  = new Populator(denormal);

  function populatorFunc(documents) {
    var isArray = documents && Array.isArray(documents);
    documents = isArray ? documents : [documents];

    return population.populate(populator, documents)
      .then(function() {
        return isArray ? documents : documents[0];
      });
  }

  return documents ? populatorFunc(documents) : populatorFunc;
};

Collection.prototype.fieldsBy = function(comparable) {
  var results = [];

  var cb = _.callback(comparable);

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
};

Collection.prototype.valuesFor = function(fields) {
  var col = this;

  return new Promise(function(resolve, reject) {
    var fieldsObj = { _id: 0 };
    _.each(fields, function(field) {
      if (field.db !== false) {
        fieldsObj[field] = 1;
      }
    });

    var values = [];
    col.db.find({}, fieldsObj).forEach(function(err, doc) {
      if (err) {
        reject(err);
        return;
      }

      if (doc) {
        var extractValues = function(val) {
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
};

/**
 * This creates a new record instance out of a POJO.  Values are copied by reference (not deep-cloned!).
 */
Collection.prototype.fromClient = function(pojo, path) {
  var col = this;
  var fields = col.def.fields;

  var namePath = path ? new NamePath(this, path) : null;

  if (Array.isArray(pojo)) {
    return pojo.map(function(doc) {
      return col.fromClient(doc, path);
    });
  }

  if (namePath) {
    var tailDef = namePath.tailDef();
    col = tailDef.id ? collectionsById[tailDef.id] : null;
    fields = tailDef.fields;
  }

  var obj = {}; // TODO:  create a new instance of this record-class?

  _.each(pojo, function(v, k) {
    var field = fields[k];

    if (field) {
      if (!field.is ) {
        throw new Error('collection missing type ("is"), missing from schema?');
      }

      obj[k] = field.is.fromClient(field, v);
    }
  });

  return col ? new col(obj) : obj;
};

function toClient(col, data) {

  if (Array.isArray(data)) {
    return data.map(function(doc) {
      return toClient(col, doc);
    });
  }

  var obj = {};

  var fields = col ? col.def.fields : null;
  _.each(data, function(v, k) {
    var field;

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
    var value, client;
    if (field.get && (client = field.client)) {
      value = data[name];
      if ( !_.isFunction(client) || client.call(data, value) ) {
        obj[name] = value;
      }
    }
  });

  return obj;
}

/**
 * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
 */
Collection.prototype.toClient = function(data) {
  return toClient(this, data);
};

Collection.prototype.validateSchema = function() {
  var col = this,
      def = col.def;

  var validator = {
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

      var type;
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

        var denormal = col.denormal = col.denormal || {};
        denormal[path.substring(1)] = field.denormal;
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
};

Collection.prototype.validateValues = function() {
  var col  = this,
      def  = col.def,
      rows = def.values;

  if (!rows) {
    return;
  }

  if (!Array.isArray(rows)) {
    throw new Error('Expected values for collection ' + def.name + ' to be an array');
  }

  var ri,
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

    var header = rows[0],
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
      var orow = rows[ri],
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
        var extraVals = orow[hi];

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
};

var Tyranid = {
  Type: Type,
  ValidationError: ValidationError,

  $all: $all,

  config: function(opts) {
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

  validate: function(opts) {
    if (opts) {
      _.forEach(opts, function(opt) {
        if (!opt.dir)
          throw new Error('dir not specified in validate option.');

        var fileRe = opt.fileMatch ? new RegExp(opt.fileMatch) : undefined;

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

  Collection: Collection,

  collections: collections,

  valuesBy: function(comparable) {

    return Promise.all(
      _.map(Tyranid.collections, function(c) {
        return c.valuesFor(c.fieldsBy(comparable));
      })
    ).then(function(arrs) {
      return _.union.apply(null, arrs);
    });
  },

  parseUid: function(uid) {
    var colId = uid.substring(0, 3);

    var col = collectionsById[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    var strId = uid.substring(3);

    var idType = col.def.fields._id.is;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  },

  byUid: function(uid) {
    var p = Tyranid.parseUid(uid);
    return p.collection.byId(p.id);
  },

  byName: function(name) {
    var nameLower = name.toLowerCase();

    return _.find(collections, function(c) {
      return c.def.name.toLowerCase() === nameLower;
    });
  },

  /**
   * Mostly just used by tests.
   */
  reset: function() {
    collections.length = 0;
    for (var id in collectionsById) {
      delete collectionsById[id];
    }
    for (var name in typesByName) {
      var type = typesByName[name];
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
  fromClient: function(field, value) {
    var linkField = field.link.def.fields._id;
    return linkField.is.def.fromClient(linkField, value);
  },
  toClient: function(field, value) {
    return value ? (value instanceof ObjectId ? value.toString() : value) : value;
  }
});

function validateUidCollection(validator, path, collection) {
  var unknownTypeErrMsg = 'Unknown Collection for uid "of".';
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
  validateSchema: function (validator, path, field) {
    var of = field.of;

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
  fromString: function(s) {
    return parseInt(s, 10);
  },
  fromClient: function(field, value) {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    } else {
      return value;
    }
  },
  validate: function(path, field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new ValidationError(path, 'is not an integer');
    }
  }
});
new Type({ name: 'string' });
new Type({ name: 'double' });

new Type({
  name: 'array',
  fromClient: function(field, value) {
    if (Array.isArray(value)) {
      var ofField = field.of;
      return value.map(function(v) {
        return ofField.is.fromClient(ofField, v);
      });
    } else {
      return value;
    }
  },
  validateSchema: function(validator, path, field) {
    var of = field.of;

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
  fromClient: function(field, value) {
    if (!value) {
      return value;
    }

    var obj = {};

    var fields = field.fields;
    _.each(value, function(v, k) {
      var field = fields[k];

      if (field) {
        if (!field.is ) {
          throw new Error('collection missing type ("is"), missing from schema?');
        }

        obj[k] = field.is.fromClient(field, v);
      }
    });

    return obj;
  },
  validate: function(path, def, obj) {
    var errors = [];

    if (obj) {
      _.each(def.fields, function(field, fieldName) {
        if (!field.get) {
          var error = field.is.validate(path + '.' + fieldName, field, obj[fieldName]);

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
  fromString: function(str) {
    return ObjectId(str);
  },
  fromClient: function(field, value) {
    return ObjectId(value);
  },
  toClient: function(field, value) {
    return value ? value.toString() : value;
  }
});

new Type({ name: 'email' });
new Type({ name: 'url' });
new Type({ name: 'password', client: false });
new Type({ name: 'image' });

new Type({
  name: 'date',
  fromString: function(s) {
    return s ? new Date(s) : s;
  },
  fromClient: function(field, value) {
    if (typeof value === 'string') {
      return new Date(value);
    }

    return value;
  },
  validate: function(path, field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(path, 'is not a date');
    }
  }
});

module.exports = Tyranid;
