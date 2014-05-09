
var tyr     = require( '../tyranid' ),
    chai    = require( 'chai' ),
    mongodb = require( 'mongodb' ),
    async   = require( 'async' ),
    expect  = chai.expect;

describe( 'tyranid', function() {
  var db = null;
  before( function( done ) {
    mongodb.MongoClient.connect( 'mongodb://localhost:27017/tyranid_test', function( err, tdb ) {
      db = tdb;
      tyr.config({
        db: db 
      });
      done( err, db );
    });
  });

  describe( 'schema validation', function() {
    it( 'should error if no name is provided', function() {
      expect( function() {
        new tyr.Collection({
          fields: {}
        })
      }).to.throw();
    });

    it( 'should throw if the name is not a string', function() {
      expect( function() {
        new tyr.Collection({
          name: 3,
          fields: {}
        })
      }).to.throw();
    });

    it( 'should accept a present but empty fields array', function() {
      expect( function() {
        new tyr.Collection({
          name: 'test',
          fields: {
          }
        })
      }).to.not.throw();
    });

    it( 'should throw if arrays do not contain a single value', function() {
      expect( function() {
        new tyr.Collection({
          name: 'test',
          fields: {
            emptyArray: []
          }
        })
      }).to.throw();
    });

    it( 'should throw if a field is missing a definition', function() {
      expect( function() {
        new tyr.Collection({
          name: 'test',
          fields: {
            cat: 3
          }
        })
      }).to.throw( /missing field definition/i );

      expect( function() {
        new tyr.Collection({
          name: 'test',
          fields: {
            cat: [
              3
            ]
          }
        })
      }).to.throw( /missing field definition/i );
    });
  });

  describe( 'with model', function() {
    var Person;
    before( function( done ) {
      Person = new tyr.Collection({
        name: 'person',
        fields: {
          name: {
            first: { type: 'string', as: 'First Name' },
            last:  { type: 'string', as: 'Last Name'  }
          },

          birthDate: { type: 'date' },

          siblings: [
            {
              name: { type: 'string' }
            }
          ],

          title: { type: 'string' }
        }
      });

      async.series([
        function( cb ) {
          Person.db.drop( cb );
        },
        function( cb ) {
          Person.db.insert([
            { _id: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
            { _id: 2, name: { first: 'John', last: 'Doe' } },
            { _id: 3, name: { first: 'Jane', last: 'Doe' }, siblings: [ { name: 'Jill Doe' } ] }
          ], cb );
        }
      ], done );
    });

    describe( 'schema methods', function() {

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ type: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ type: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });
    });

    describe( 'collection methods', function() {

      it( 'should support valuesFor()', function( done ) {
        Person.valuesFor( Person.fieldsBy({ type: 'string' }), function( err, values ) {
          expect(
            values.sort()
          ).to.eql(
            [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
          );

          done( err );
        });
      });

      it( 'should support Tyranid.valuesBy()', function( done ) {
        tyr.valuesBy( { type: 'string' }, function( err, values ) {
          expect(
            values.sort()
          ).to.eql(
            [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
          );

          done( err );
        });
      });
    });
  });
});


