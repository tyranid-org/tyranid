
require('es6-promise');

var tyr            = require('../tyranid'),
    chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),

    pmongo         = require('promised-mongo'),

    expect         = chai.expect;

chai.use(chaiAsPromised);
chai.should();

describe( 'tyranid', function() {
  var db = null;
  before(function(done) {
    db = pmongo('mongodb://localhost:27017/tyranid_test');
    tyr.config({
      db: db 
    });
    done(null, db);
  });

  after(function() {
    tyr.db.close();
    process.exit(0);
  });

  describe( 'schema validation', function() {
    it( 'should error if no name is provided', function() {
      expect(function() {
        new tyr.Collection({
          id: 't00',
          fields: {}
        });
      }).to.throw();
    });

    it( 'should throw if the name is not a string', function() {
      expect(function() {
        new tyr.Collection({
          id: 't00',
          name: 3,
          fields: {}
        });
      }).to.throw();
    });

    it( 'should accept a present but empty fields array', function() {
      expect(function() {
        new tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
          }
        });
      }).to.not.throw();
    });

    it( 'should throw if arrays do not contain a single value', function() {
      expect(function() {
        new tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            emptyArray: []
          }
        });
      }).to.throw();
    });

    it( 'should throw if a field is missing a definition', function() {
      expect(function() {
        new tyr.Collection({
          id: 't01',
          name: 'test1',
          fields: {
            cat: 3
          }
        });
        tyr.validate();
      }).to.throw( /Invalid field definition/i );

      expect(function() {
        new tyr.Collection({
          id: 't02',
          name: 'test2',
          fields: {
            cat: [
              3
            ]
          }
        });
        tyr.validate();
      }).to.throw( /Invalid field definition/i );
    });
  });

  describe( 'with model', function() {
    var Person;
    before(function(done) {
      Person = new tyr.Collection({
        id: 't03',
        name: 'person',
        fields: {
          name: {
            first: { is: 'string', as: 'First Name' },
            last:  { is: 'string', as: 'Last Name'  }
          },

          birthDate: { is: 'date' },

          siblings: [
            {
              name: { is: 'string' }
            }
          ],

          title: { is: 'string' }
        }
      });

      Person.db.drop().then(function() {
        Person.db.insert([
          { _id: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
          { _id: 2, name: { first: 'John', last: 'Doe' } },
          { _id: 3, name: { first: 'Jane', last: 'Doe' }, siblings: [ { name: 'Jill Doe' } ] }
        ]).then(function() {
          done();
        });
      });
    });

    describe( 'schema methods', function() {

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ is: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ is: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });
    });

    describe('collection methods', function() {

      it( 'should support valuesFor()', function() {
        Person.valuesFor(Person.fieldsBy({ is: 'string' })).then(function(values) {
          return values.sort();
        }).should.eventually.eql(
          [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
        );
      });

      it( 'should support Tyranid.valuesBy()', function() {
        return tyr.valuesBy({ is: 'string' }).then(function(values) {
          return values.sort();
        }).should.eventually.eql(
          [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
        );
      });
    });
  });
});

