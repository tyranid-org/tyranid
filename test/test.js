
require('es6-promise');

var tyr            = require('../tyranid'),
    chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),

    pmongo         = require('promised-mongo'),

    expect         = chai.expect;

chai.use(chaiAsPromised);
chai.should();

global.ObjectId = pmongo.ObjectId;

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

    it( 'should support self-referential links', function() {
      tyr.reset();
      expect(function() {
        new tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            _id:     { is: 'mongoid' },
            self:    { link: 'test' }
          }
        });
      }).to.not.throw();
    });

    it( 'should throw if a field is missing a definition', function() {
      tyr.reset();
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

      tyr.reset();
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
      }).to.throw( /Unknown field definition/i );
    });
  });

  describe( 'with model', function() {
    var Job, Organization, Person;
    before(function() {
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

      Job.prototype.isSoftware = function() {
        return this.name.substring(0, 8) === 'Software';
      };

      Organization = new tyr.Collection({
        id: 't04',
        name: 'organization',
        fields: {
          _id: { is: 'integer' },
          name: { is: 'string' }
        }
      });

      Person = new tyr.Collection({
        id: 't03',
        name: 'person',
        fields: {
          _id: { is: 'integer' },

          name: {
            is: 'object',
            fields: {
              first: { is: 'string', as: 'First Name' },
              last:  { is: 'string', as: 'Last Name'  }
            }
          },

          birthDate: { is: 'date' },
          job:       { 'link' : 'job' },

          siblings: {
            is: 'array',
            of: {
              is: 'object',
              fields: {
                name: { is: 'string' }
              }
            }
          },

          title: { is: 'string' },
          organization: { link: 'organization' }
        }
      });

      tyr.validate();

      return Promise.all([
        Organization.db.remove({}).then(function() {
          return Organization.db.insert([
            { _id: 1, name: 'Acme Unlimited' },
            { _id: 2, name: '123 Construction' }
          ]);
        }),
        Person.db.remove({}).then(function() {
          return Person.db.insert([
            { _id: 1, organization: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
            { _id: 2, organization: 1, name: { first: 'John', last: 'Doe' } },
            { _id: 3, organization: 2, name: { first: 'Jane', last: 'Doe' }, siblings: [ { name: 'Jill Doe' } ] }
          ]);
        })
      ]);
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

    describe('finding', function() {
      it('should find unwrapped objects', function() {
        return Person.db.find({'name.first': 'An'}).then(function(docs) {
          expect(docs.length).to.be.eql(1);
        });
      });

      it('should find wrapped objects', function() {
        return Person.find({'name.first': 'An'}).then(function(docs) {
          expect(docs.length).to.be.eql(1);
          expect(docs[0]).to.be.an.instanceof(Person);
        });
      });

      it('should findOne()', function() {
        return Person.findOne({'name.first': 'An'}).then(function(doc) {
          expect(doc).to.be.an.instanceof(Person);
        });
      });

      it('should byId()', function() {
        return Person.byId(1).then(function(doc) {
          expect(doc).to.be.an.instanceof(Person);
          expect(doc._id).to.be.eql(1);
        });
      });

      it('should byLabel()', function() {
        expect(Job.byLabel('Designer')._id).to.be.eql(3);
        expect(Job.byLabel('Software Lead')._id).to.be.eql(2);
      });
    });

    describe('saving', function() {
      after(function() {
        return Person.db.remove({'name.first': 'Elizabeth', 'name.last': 'Smith' });
      });

      it('should save objects', function() {
        var elizabeth = new Person({ name: { first: 'Elizabeth', last: 'Smith' }, title: 'Software Engineer' });

        return elizabeth.$save().then(function() {
          Person.db.find({ 'name.first': 'Elizabeth', 'name.last': 'Smith' }).then(function(person) {
            expect(person.name.first).to.eql('Elizabeth 2');
          });
        });
      });
    });

    describe('values', function() {
      var allString = [ '123 Construction', 'Acme Unlimited', 'An', 'Anon', 'Developer', 'Doe', 'Jane', 'Jill Doe', 'John' ];

      it( 'should support valuesFor()', function() {
        Person.valuesFor(Person.fieldsBy({ name: 'string' })).then(function(values) {
          return values.sort();
        }).should.eventually.eql(allString);
      });

      it( 'should support Tyranid.valuesBy()', function() {
        return tyr.valuesBy({ name: 'string' }).then(function(values) {
          return values.sort();
        }).should.eventually.eql(allString);
      });
    });

    describe('static data', function() {

      it( 'should contain instances of the enumeration class', function() {
        expect(Job.def.values.length).to.eql(3);
      });

      it( 'should contain upper-undescore static names when a label is present', function() {
        expect(Job.SOFTWARE_LEAD._id).to.be.eql(2);
      });

      it( 'should support static data methods', function() {
        expect(Job.SOFTWARE_LEAD.isSoftware()).to.be.eql(true);
        expect(Job.DESIGNER.isSoftware()).to.be.eql(false);
      });
    });

    describe('population', function() {

      function verifyPeople(people) {
        expect(people.length).to.eql(3);
        expect(people[0]).to.be.an.instanceof(Person);
        expect(people[0].organization$).to.be.an.instanceof(Organization);
        expect(people[0].organization$.name).to.be.eql('Acme Unlimited');
        expect(people[2].organization$.name).to.be.eql('123 Construction');
      }

      it( 'should work curried', function() {
        return Person.find()
          .then(Person.populate({ fields: 'organization' }))
          .then(function(people) {
            verifyPeople(people);
          });
      });
      
      it( 'should work uncurried', function() {
        return Person.find()
          .then(function(people) {
           return Person.populate({ fields: 'organization' }, people).then(function(people) {
              verifyPeople(people);
           });
          });
      });
    });

    describe('client', function() {

      it( 'should fromClient', function() {
        var personObj = { name : { firstName: 'Foo' }, job : 1 };
        var person = Person.fromClient(personObj);
        expect(person).to.be.an.instanceof(Person);
        expect(person.job).to.be.eql(1);
      });
    });

    describe('update', function() {
      it( 'should update shallow', function() {
        return Person.byId(1)
          .then( function(savedPerson) {
            var clientPerson =  { _id: 1, organization: 2 };
            var person = Person.fromClient(clientPerson);

            return person.$update()
              .then(function() {
                return Person.byId(1);
              })
              .then(function(newPerson) {
                savedPerson.$save();
                expect(newPerson.title).to.be.eql('Developer');
              });
          });
      });
    });

    describe('uids', function() {

      it( 'should parse', function() {
        tyr.parseUid('t031').should.eql({
          collection: Person,
          id: 1
        });
      });

      it( 'should support byId()', function() {
        return tyr.byUid('t031').then(function(person) {
          expect(person).to.be.an.instanceof(Person);
          expect(person._id).to.be.eql(1);
        });
      });
    });
  });
});

