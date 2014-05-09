
var _     = require( 'lodash' ),
    async = require( 'async' );

/*
   /. server inherits client objects

   /. validation (server vs. client)

   /. authorized methods + filtering attributes to the client

   /. offline support

   /. store cache on client

   /. tids ?
   
      f23<mongo id (24 chars) >

      <letter + 2 alphanum><mongo id>


   ?. how do we share code between server and client from the same source .js file ?


  var String = {
  }

  var Date = {
  }



  Collection Schema BNF: 

  <field def>: {
    type:  <string, a field type>,
    as:    <string, a label>,
    desc:  <string, a description>,
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
    db:    <mongodb database>, // optional, if not present will default to config.db
    fields: <field object>
  }

*/

var all    = [],
    config = {};


// Schema
// ======

function pathAdd( path, add ) {
  return path ? path + '.' + add : add;
}



// Collection
// ==========

function Collection( def ) {
  this.def = def;
  this.validateSchema();

  var db = def.db || config.db;

  if ( !db )
    throw new Error( 'The "db" parameter must be specified either in the Collection schema or in the Tyranid.config().' );

  this.db = db.collection( this.def.name );

  all.push( this );
}

//Collection.prototype = Object.create( null );

Collection.prototype.fieldsBy = function( comparable ) {
  var results = [];

  var cb = _.createCallback( comparable );

  function fieldsBy( path, val ) {

    if ( _.isArray( val ) ) {
      fieldsBy( path, val[ 0 ] );

    } else if ( _.isObject( val ) ) {

      if ( val.type ) {
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

Collection.prototype.validateSchema = function() {
  if ( !this.def )
    throw new Error( 'Missing schema definition.' );

  if ( !this.def.name )
    throw new Error( 'Missing "name" field in schema definition.' );

  if ( !_.isString( this.def.name ) )
    throw new Error( '"name" should be a string in schema definition.' );

  if ( !this.def.fields )
    throw new Error( 'Missing "fields" field in schema definition.' );

  function validate( path, val ) {
    if ( _.isArray( val ) ) {
      if ( val.length != 1 )
        throw new Error( 'Invalid field definition.' );

      validate( path, val[ 0 ] );
    } else if ( _.isObject( val ) ) {
      if ( val.type ) {
        // TODO:  validate type definitions here

      } else {
        _.each( val, function( field, name ) {
          validate( pathAdd( path, name ), field );
        });
      }

    } else {
      throw new Error(
        path ? 'Missing field definition at "' + path + '", got "' + val + '" instead.'
             : 'Invalid "fields" definition:  "' + val + '".'
      );
    }
  }

  validate( '', this.def.fields );
};

module.exports = {

  config: function( opts ) {
    config = opts;

    if ( !opts.db )
      throw new Error( 'Missing "db" in config.' );
  },

  Collection: Collection,

  all: all,

  valuesBy: function( comparable, callback ) {

    async.series(
      _.map( all, function( coll ) {
        return function( cb ) {
          coll.valuesFor( coll.fieldsBy( comparable ), cb );
        };
      }),
      function( err, arrs ) {
        callback( err, _.union.apply( null, arrs ) );
      }
    );
  }
};

