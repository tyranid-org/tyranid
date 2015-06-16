
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
    setTimeout(function() {
      process.exit(0);
    }, 500);
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
        tyr.reset();
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
        tyr.reset();
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
      }).to.throw( /Unknown field definition/i );
    });
  });

  describe( 'with model', function() {
    var Person, Job;
    before(function(done) {
      tyr.reset();

      Job = new tyr.Collection({
        id: 'j00',
        name: 'job',
        enum: true,
        fields: {
          _id:     { is: 'integer' },
          name:    { is: 'string', label: true },
          manager: { is: 'boolean' }
        },
        values: [
          [ '_id', 'name',              'manager' ],

          [    1,  'Software Engineer', false     ],
          [    2,  'Software Lead',     true      ],
          [    3,  'Designer',          false     ]
        ]
      });

      Person = new tyr.Collection({
        id: 't03',
        name: 'person',
        fields: {
          name: {
            is: 'object',
            fields: {
              first: { is: 'string', as: 'First Name' },
              last:  { is: 'string', as: 'Last Name'  }
            }
          },

          birthDate: { is: 'date' },

          siblings: {
            is: 'array',
            of: {
              is: 'object',
              fields: {
                name: { is: 'string' }
              }
            }
          },

          title: { is: 'string' }
        }
      });

      tyr.validate();

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
          Person.fieldsBy({ name: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ name: 'string' })
        ).to.eql(
          [ 'name.first', 'name.last', 'siblings.name', 'title' ]
        );
      });
    });

    describe('collection methods', function() {

      it( 'should support valuesFor()', function() {
        Person.valuesFor(Person.fieldsBy({ name: 'string' })).then(function(values) {
          return values.sort();
        }).should.eventually.eql(
          [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
        );
      });

      it( 'should support Tyranid.valuesBy()', function() {
        return tyr.valuesBy({ name: 'string' }).then(function(values) {
          return values.sort();
        }).should.eventually.eql(
          [ 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ]
        );
      });
    });

    describe('static data', function() {

      it( 'should contain instances of the enumeration class', function() {
        expect(Job.def.values.length).to.eql(3);
      });

      it( 'should contain upper-undescore static names when a label is present', function() {
        expect(Job.SOFTWARE_LEAD._id).to.be.eql(2);
      });
    });
  });
});

