
var _ = require( 'lodash' );

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
    config          = {};

// Name
// ====

// TODO:  name needs to support paths, not just simple names ... i.e. "person.organization" not just "person"
function Name(collection, name) {
  this.col = collection;
  this.name = name;

  this.def = collection.def.fields[name];
  if (!this.def) {
    throw new Error('Cannot find field "' + name + '" on ' + collection.def.name);
  }
}

Name.prototype.toString = function() {
  return this.name;
};

Name.prototype.get = function(obj) {
  return obj[this.name];
};

Name.prototype.set = function(obj, value) {
  obj[this.name] = value;
};

Name.prototype.populate = function(obj, value) {
  var n = this.name;
      l = n.length;

  /*
   * TODO:  make this a configurable Tyranid option as to how populated entries should be named
   *
   *    1. organizationId -> organization
   *    2. organization   -> organization$
   *    3. organization   -> organization
   *
   * TODO:  should we mark populated values as enumerable: false ?
   */
  if (n.substring(l-2) === 'Id') {
    n = n.substring(0, l-2);
  } else {
    n += '$';
  }

  obj[n] = value;
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



// Type
// ====

function Type(def) {
  this.def = def;

  validateType(this);
}

Type.prototype.validate = function(validator, path, field) {
  var v = this.def.validate;
  if (v) {
    v(validator, path, field);
  }
};

Type.prototype.fromString = function(s) {
  var a = this.def.fromString;
  return a ? a(s) : s;
};

Type.prototype.fromClient = function(field, value) {
  var a = this.def.fromClient;
  return a ? a(field, value) : value;
};

Type.prototype.toClient = function(field, value) {
  var def = this.def;

  if (setFalse(def.client) || setFalse(field.client)) {
    return undefined;
  }

  var a = def.toClient;
  return a ? a(field, value) : value;
};


// Document
// ========

var documentPrototype = {
  $save: function() {
    // the mongo driver only saves properties on the object directly, prototype values will not be recorded

    return this.$model.db.save(this);
  },

  $update: function() {
    return this.$model.update(this);
  },

  $toClient: function() {
    return this.$model.toClient(this);
  },

  $populate: function(opts) {
    return this.$model.populate(opts, this);
  },

  $uid: function() {
    return this.$model.idToUid(this._id);
  }
};



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

  if ( !db )
    throw new Error('The "db" parameter must be specified either in the Collection schema or in the Tyranid.config().');

  CollectionInstance.db = db.collection(CollectionInstance.def.dbName);

  collections.push(CollectionInstance);

  collectionsById[def.id] = CollectionInstance;

  for (var key in dp) {
    if (key.substring(0,1) === '$') {
      Object.defineProperty(dp, key, {
        enumerable:   false,
        writeable:    false,
        configurable: false
      });
    }
  }

  return CollectionInstance;
}

//Collection.prototype = Object.create( null );

Collection.prototype.idToUid = function(id) {
  return this.id + id;
};

Collection.prototype.byId = function(id) {
  if (typeof id === 'string') {
    id = this.def.fields._id.is.fromString(id);
  }

  return this.findOne({ _id: id });
};


/**
 * Behaves like promised-mongo's find() method except that the results are mapped to collection instances.
 */
Collection.prototype.find = function() {
  var collection = this,
      db         = collection.db;

  return db.find.apply(db, arguments).then(function(documents) {
    return _.map(documents, function(doc) { return new collection(doc); });
  });
};

/**
 * Behaves like promised-mongo's findOne() method except that the results are mapped to collection instances.
 */
Collection.prototype.findOne = function() {
  var collection = this,
      db         = collection.db;

  return db.findOne.apply(db, arguments).then(function(doc) {
    return new collection(doc);
  });
};

Collection.prototype.update = function(obj) {
  var flds = this.def.fields;
  var setObj = {};

  _.each(flds, function(v,k) {
    if (obj[k] !== undefined && k !== '_id') {
      setObj[k] = obj[k];
    }
  });

  return this.db.update(
    { _id : obj._id },
    { $set : setObj }
  );
};


/**
 * @opts: options ... options are:
 *   @fields: string | array<string>;   a property name or an array of property names
 *
 *   TODO: @only: array<string>;        list of fields in linked-to collections to query
 *
 * @documents: array<document>;       an array of documents
 *
 * If documents is not provided, this function will return a curried version of this function that takes a single array
 * of documents.  This allows populate to be fed into a promise chain.
 */
Collection.prototype.populate = function(opts, documents) {
  var col = this,
      fields = opts.fields;

  if (_.isString(fields)) {
    fields = [ fields ];
  } else if (!_.isArray(fields)) {
    throw new Error('missing opts.fields option to populate()');
  }

  var names = fields.map(function(field) { return new Name(col, field); });

  function populator(documents) {
    var isArray = documents && _.isArray(documents);
    documents = isArray ? documents : [documents];

    var insByColId = {};

    names.forEach(function(name) {
      var link = name.def.link;

      if (!link) {
        throw new Error('Cannot populate ' + col.def.name + '.' + name + ' -- it is not a link');
      }

      var linkId = link.id,
          ins = insByColId[linkId];
      if (!ins) {
        insByColId[linkId] = ins = [];
      }

      documents.forEach(function(doc) {
        ins.push(name.get(doc));
      });
    });

    return Promise.all(
      _.map(insByColId, function(ins, colId) {
        var linkCol = collectionsById[colId];

        return linkCol.find({ _id: { $in: _.uniq(ins) }}).then(function(linkDocs) {
          names.forEach(function(name) {
            if (name.def.link.id === colId) {
              documents.forEach(function(doc) {
                var linkId = name.get(doc);

                if (linkId) {
                  var linkIdStr = linkId.toString();

                  // TODO:  maybe trade space for time by keeping a hash of the linkDocs by id to make this algorithm not n^2?
                  var linkDoc = _.find(linkDocs, function(d) {
                    return d._id.toString() === linkIdStr;
                  });

                  if (linkDoc) {
                    name.populate(doc, linkDoc);
                  }
                }
              });
            }
          });
        });
      })
    ).then(function() {
      return isArray ? documents : documents[0];
    });
  }

  return documents ? populator(documents) : populator;
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
      fieldsObj[field] = 1;
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
Collection.prototype.fromClient = function(pojo) {
  var fields = this.def.fields;

  if (_.isArray(pojo)) {
    var col = this;
    return pojo.map(function(doc) {
      return col.fromClient(doc);
    });
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

  return new this(obj);
};

function toClient(col, data) {

  if (_.isArray(data)) {
    return data.map(function(doc) {
      return toClient(col, doc);
    });
  }

  var obj = {};

  var fields = col ? col.def.fields : null;
  _.each(data, function(v, k) {
    var field;

    if (fields && (field=fields[k])) {
      v = field.is.toClient(field, v);

      if (v !== undefined) {
        obj[k] = v;
      }
    } else if (v.$toClient) {
      obj[k] = v.$toClient();
    } else if (_.isArray(v)) {
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

  return obj;
};

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
        type = typesByName[field.is];

        if (!type) {
          throw validator.err(path, 'Unknown type ' + field.is);
        }

        if (type instanceof Collection) {
          throw validator.err(path, 'Trying to "is" a collection -- ' + field.is + ', either make it a "link" or a metadata snippet');
        }

        field.is = type;

        type.validate(validator, path, field);

        if (type.def.name === 'object' && field.fields) {
          validator.fields(path, field.fields);
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
};

Collection.prototype.validateValues = function() {
  var col  = this,
      def  = col.def,
      rows = def.values;

  if (!rows) {
    return;
  }

  if (!_.isArray(rows)) {
    throw new Error('Expected values for collection ' + def.name + ' to be an array');
  }

  var ri,
      rlen = rows.length;
  if (!rlen) {
    return;
  }

  if (_.isArray(rows[0])) {
    // array format

    for (ri=0; ri<rlen; ri++) {
      if (!_.isArray(rows[ri])) {
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

    col.byLabel = function(n) {
      var findName = col.labelField;
      var q = {};
      q[findName] = n;

      return _.find(def.values, q);
    };

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

  config: function(opts) {
    config = opts;

    if (!opts.db)
      throw new Error('Missing "db" in config.');

    this.db = opts.db;
  },

  validate: function() {
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

new Type({ name: 'boolean' });
new Type({
  name: 'integer',
  fromString: function(s) {
    return parseInt(s, 10);
  },
  fromClient: function(field, value) {
    if (typeof value === 'string') {
      return parseInt(s, 10);
    } else {
      return value;
    }
  }
});
new Type({ name: 'string' });
new Type({ name: 'double' });

new Type({
  name: 'array',
  validate: function(validator, path, field) {
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

      field.of = of;
    }
  }
});

new Type({ name: 'object' });

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
new Type({ name: 'password', client: false });
new Type({ name: 'image' });
new Type({ name: 'date' });

module.exports = Tyranid;

