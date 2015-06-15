
var _     = require( 'lodash' ),
    async = require( 'async' );

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
}

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

  dp.constructor = dp.$model = CollectionInstance;
  dp.__proto__ = CollectionInstance.prototype;
  dp.$name = def.name;

  var CollectionInstance = function() {
    this.__proto__ = dp;
  }

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

  collectionsById[def.id] = collection;

  return CollectionInstance;
}

//Collection.prototype = Object.create( null );

Collection.prototype.idToUid = function(id) {
  return this.id + id;
};

/**
 * Behaves like promised-mongo's find() method except that the results are mapped to collection instances.
 */
Collection.prototype.find = function() {
  var collection = this,
      db         = collection.db;

  return db.find.apply(db, arguments).then(function(documents) {
    return _.map(documents, function(doc) { return new collection.constructor(doc); });
  });
};

Collection.prototype.fieldsBy = function( comparable ) {
  var results = [];

  var cb = _.createCallback( comparable );

  function fieldsBy( path, val ) {

    if ( _.isArray( val ) ) {
      fieldsBy( path, val[ 0 ] );

    } else if ( _.isObject( val ) ) {

      if ( val.is ) {
        if ( cb( val ) )
          results.push( path );
      } else {
        _.each( val, function( field, name ) {
          fieldsBy( pathAdd( path, name ), field );
        });
      }
    }
  }

  fieldsBy( '', this.def.fields );
  return results;
};

Collection.prototype.valuesFor = function( fields, callback ) {

  var fieldsObj = { _id: 0 };
  _.each( fields, function( field ) {
    fieldsObj[ field ] = 1;
  });

  this.db.find( {}, fieldsObj, function( err, curs ) {
    if ( err ) {
      callback( err );
      return;
    }

    var values = [];

    function extractValues( val ) {
      if ( _.isObject( val ) )
        _.each( val, extractValues );
      else
        values.push( val );
    }

    function next() {
      curs.nextObject( function( err, doc ) {
        if ( err ) {
          callback( err );
          return;
        } else if ( !doc ) {
          callback( null, _.uniq( values ) );
        } else {
          extractValues( doc );
          next();
        }
      });
    }

    next();
  });
};

/**
 * This creates a new record instance out of a POJO.  Values are copied by reference (not deep-cloned!).
 */
Collection.prototype.fromClient = function(pojo) {
  var fields = this.def.fields;

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

  return obj;
};

/**
 * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
 */
Collection.prototype.toClient = function(pojo) {
  var fields = this.def.fields;

  var obj = {};

  _.each(pojo, function(v, k) {
    var field = fields[k];

    if (field) {
      var v = field.is.toClient(field, v);

      if (v !== undefined) {
        obj[k] = v;
      }
    }
  });

  return obj;
};

Collection.prototype.validateValues = function() {
  var def = this.def,
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
        newValues = [];

    for (hi=0; hi<hlen; hi++) {
      var name = header[hi];

      if (!_.isString(name)) {
        throw new Error('Expected value ' + hi + ' in the values header for collection ' + def.name + ' to be a string');
      }

      if (!def.fields[name]) {
        throw new Error('Field ' + name + ' does not exist on collection ' + def.name);
      }
    }

    for (ri=1; ri<rlen; ri++) {
      var orow = rows[ri],
          nrow = {};

      if (orow.length !== hlen && orow.length !== hlen+1) {
        throw new Error('Incorrect number of values on row ' + ri + ' in collection ' + def.name);
      }

      for (hi=0; hi<hlen; hi++) {
        var v = orow[hi];
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
      
      newValues.push(nrow);
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

Collection.prototype.validateSchema = function() {
  var def = this.def;

  var validator = {
    err: function err(path, msg) {
      return new Error('Tyranid Schema Error| ' + def.name + (path ? path : '') + ': ' + msg);
    },

    field: function(path, field) {

      if (!_.isObject(field)) {
        throw validator.err('Invalid field definition, expected an object, got: ' + field);
      }

      if (field.is) {
        var type = typesByName[field.is];

        if (!type) {
          throw validator.err(path, 'Unknown type ' + field.is);
        }

        field.is = type;

        type.validate(validator, path, field);

      } else if (field.link) {
        var type = typesByName[field.link];

        if (!type) {
          throw validator.err(path, 'Unknown type ' + field.link);
        }

        if (!(type instanceof Collection)) {
          throw validator.err(path, 'Links must link to a collection, instead linked to ' + field.link);
        }

        field.is = typesByName.link;
        field.link = type;

      } else {
        throw validator.err('Unknown field definition');
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

        return validator.field(path + '.' + name, field)
      });

    }
  };

  validator.fields('', this.def.fields);

  this.validateValues();
};

var Tyranid = {
  Type: Type,

  config: function( opts ) {
    config = opts;

    if ( !opts.db )
      throw new Error( 'Missing "db" in config.' );
  },

  validate: function( ) {
    collections.forEach(function(col) {
      col.validateSchema();
    });
  },

  Collection: Collection,

  collections: collections,

  valuesBy: function( comparable, callback ) {

    async.series(
      _.map( all, function( coll ) {
        return function( cb ) {
          coll.valuesFor( coll.fieldsBy( comparable ), cb );
        };
      }),
      function(err, arrs) {
        callback( err, _.union.apply( null, arrs ) );
      }
    );
  }
};


// Built-in Types
// ==============

new Type({
  name: 'link',
  // TODO:  look up the data type of the id, and use that type from inside link, rather than just copying mongoids
  //        (i.e. if the primary id is an int)
  fromClient: function(field, value) {
    return ObjectId(value);
  },
  toClient: function(field, value) {
    return value ? value.toString() : value;
  }
});

new Type({ name: 'boolean' });
new Type({ name: 'integer' });
new Type({ name: 'string' });

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

module.exports = Tyranid;

