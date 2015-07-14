
require('es6-promise');

var tyr            = require('../tyranid'),
    $all           = tyr.$all,

    chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),

    pmongo         = require('promised-mongo'),

    expect         = chai.expect,

    _              = require('lodash');

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
    var Job, Organization, Department, Person, Task;
    //var Job2, Organization2, Department2, Person2;

    before(function() {
      tyr.reset();

      // Test validate load models and byName
      tyr.validate([{dir:'./test/models', fileMatch: '\.js$' }]);

      Job = tyr.byName('job');
      Organization = tyr.byName('organization');
      Department = tyr.byName('department');
      Person = tyr.byName('person');
      Task = tyr.byName('task');

      return Promise.all([
        Organization.db.remove({}).then(function() {
          return Organization.db.insert([
            { _id: 1, name: 'Acme Unlimited' },
            { _id: 2, name: '123 Construction' }
          ]);
        }),
        Department.db.remove({}).then(function() {
          return Department.db.insert([
            { _id: 1, name: 'Engineering', creator: 2, head: 3, permissions: { members: [ 2, 3 ] } }
          ]);
        }),
        Person.db.remove({}).then(function() {
          return Person.db.insert([
            { _id: 1, organization: 1, department: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
            { _id: 2, organization: 1, name: { first: 'John', last: 'Doe' }, homepage: 'https://www.tyranid.org', siblings: [
              { name: 'Tom Doe', bestFriend : 1, friends: [ { person : 3 }, { person: 1 } ] },
              { name: 'George Doe', friends: [ { person : 1 }, { person: 3 } ] }
            ]
            },
            { _id: 3, organization: 2, name: { first: 'Jane', last: 'Doe' }, siblings: [
                { name: 'Jill Doe', friends: [ { person : 1 }, { person: 2 } ] },
                { name: 'Bill Doe', friends: [ { person : 2 }, { person: 3 } ] }
              ]
            }
          ]);
        }),
        Task.db.remove({}).then(function() {
          return Task.db.insert([
            { _id: 1, title: 'Write instance validation tests', assigneeUid: Person.idToUid(1) },
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

      it('should findAndModify()', function() {
        return Person.findAndModify({ query: { _id: 1 }, update: { $set: { age: 32 } }, new: true }).then(function(doc) {
          var person = doc[0];
          expect(person).to.be.an.instanceof(Person);
          expect(person.age).to.be.eql(32);
        });
      });

      it('should byId()', function() {
        return Person.byId(1).then(function(doc) {
          expect(doc).to.be.an.instanceof(Person);
          expect(doc._id).to.be.eql(1);
        });
      });
    });

    describe('labels', function() {
      it('should byLabel() on static collections', function() {
        expect(Job.byLabel('Designer')._id).to.be.eql(3);
        expect(Job.byLabel('Software Lead')._id).to.be.eql(2);
      });

      it('should byLabel() on mongo collections', function() {
        return Organization.byLabel('Acme Unlimited').then(function(row) {
          expect(row.name).to.be.eql('Acme Unlimited');
        });
      });

      it('should fail byLabel() on mongo collections on bad data', function() {
        return Organization.byLabel('Acme Unlimitedx').then(function(row) {
          expect(row).to.be.eql(null);
        });
      });

      it('should support $label', function() {
        expect(Job.byLabel('Designer').$label).to.be.eql('Designer');
        expect(Job.byLabel('Software Lead').$label).to.be.eql('Software Lead');
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
      var allString = [ '123 Construction', 'Acme Unlimited', 'An', 'Anon', 'Bill Doe', 'Developer', 'Doe', 'Engineering', 'George Doe', 'Jane', 'Jill Doe', 'John', 'Tom Doe' ];

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
        var person1 = _.find(people, { _id: 1 });
        var person3 = _.find(people, { _id: 3 });
        expect(person1).to.be.an.instanceof(Person);
        expect(person1.organization$).to.be.an.instanceof(Organization);
        expect(person1.organization$.name).to.be.eql('Acme Unlimited');
        expect(person3.organization$.name).to.be.eql('123 Construction');
      }

      it( 'should work curried', function() {
        return Person.find()
          .then(Person.populate('organization'))
          .then(function(people) {
            verifyPeople(people);
          });
      });

      it( 'should work uncurried', function() {
        return Person.find()
          .then(function(people) {
           return Person.populate('organization', people).then(function(people) {
              verifyPeople(people);
           });
          });
      });

      it( 'should skip fields with no value using array format', function() {
        return Person.find()
          .then(function(people) {
            return Person.populate([ 'organization', 'department' ], people).then(function(people) {
              verifyPeople(people);
            });
          });
      });

      it( 'should deep populate array links', function() {
        return Person.db
          .find()
          .sort({ '_id' : 1 })
          .then(Person.populate([ 'organization', 'siblings.friends.person' ]))
          .then(function(people) {
            expect(people[1].siblings[0].friends[0].person$._id).to.be.eql(3);
            expect(people[1].siblings[0].friends[1].person$._id).to.be.eql(1);
            expect(people[1].siblings[1].friends[0].person$._id).to.be.eql(1);
            expect(people[1].siblings[1].friends[1].person$._id).to.be.eql(3);
            expect(people[2].siblings[0].friends[0].person$._id).to.be.eql(1);
            expect(people[2].siblings[0].friends[1].person$._id).to.be.eql(2);
            expect(people[2].siblings[1].friends[0].person$._id).to.be.eql(2);
            expect(people[2].siblings[1].friends[1].person$._id).to.be.eql(3);
          });
      });

      it( 'should deep populate array link links', function() {
        return Person.db
          .find({ '_id' : 2 })
          .then(Person.populate({ organization: $all, 'siblings.bestFriend': { $all: 1, organization: $all } }))
          .then(function(people) {
            expect(people[0].siblings[0].bestFriend$.organization$.name).to.be.eql('Acme Unlimited');
          });
      });

      it( 'should populate paths and arrays using array format', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate([ 'creator', 'permissions.members' ]).then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(Person);
              expect(department.permissions.members$[0].name.first).to.be.eql('John');
              expect(department.permissions.members$[1]).to.be.an.instanceof(Person);
              expect(department.permissions.members$[1].name.first).to.be.eql('Jane');
            });
          });
      });

      it( 'should populate paths and arrays using object format', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate({ 'permissions.members': $all }).then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(Person);
              expect(department.permissions.members$[0].name.first).to.be.eql('John');
              expect(department.permissions.members$[1]).to.be.an.instanceof(Person);
              expect(department.permissions.members$[1].name.first).to.be.eql('Jane');
            });
          });
      });

      it( 'should do nested population, 1', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate({ 'permissions.members': { $all: 1, organization: $all } }).then(function() {
              var members = department.permissions.members$;
              expect(members[0].organization$.name).to.be.eql('Acme Unlimited');
              expect(members[1].organization$.name).to.be.eql('123 Construction');
            });
          });
      });

      it( 'should do nested population, 2', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate({ creator: { $all: 1, organization: $all }, head: { $all: 1, organization: $all } }).then(function() {
              expect(department.creator$._id).to.be.eql(2);
              expect(department.creator$.organization$._id).to.be.eql(1);
              expect(department.head$._id).to.be.eql(3);
              expect(department.head$.organization$._id).to.be.eql(2);
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

      it( 'should deep fromClient', function() {
        var friendObj = { birthDate : '03-07-1969' };
        var friend = Person.fromClient(friendObj, 'siblings.friends' );
        expect(friend.birthDate).to.be.an.instanceof(Date);
        expect(friend).not.to.be.an.instanceof(Person);
      });
    });

    describe('insert', function() {
      it('should generate an _id', function() {
        var p = new Person({ organization: 1, department: 1, name: { first: 'New', last: 'Person' }, title: 'Developer' });
        return p.$insert()
          .then(function(newPerson) {
            expect(newPerson._id).to.be.an.instanceOf(ObjectId);
          });
      });
      it('should support defaultValues', function() {
        var p = new Person({ organization: 1, department: 1, name: { first: 'Default', last: 'Employee' } });
        return p.$insert()
          .then(function(newPerson) {
            expect(newPerson.title).to.be.eql('Employee');
            expect(newPerson.goldStars).to.be.eql(0);
          });
      });
      it('should use specified _id', function() {
        var p = new Person({ _id: 200, organization: 1, department: 1, name: { first: 'New', last: 'Person' }, title: 'Developer' });
        return p.$insert()
          .then(function(newPerson) {
            expect(newPerson._id).to.be.eql(200);
          });
      });
      it('should throw if _id already exists', function() {
        var p = new Person({ _id: 200, organization: 1, department: 1, name: { first: 'New', last: 'Person' }, title: 'Developer' });
        return p.$insert().should.eventually.be.rejectedWith(Error);
      });
      it('should support bulk inserts like mongo insert', function() {
        var people = [
          new Person({ organization: 1, department: 1, name: { first: 'First', last: 'Person' }, title: 'Developer' }),
          new Person({ organization: 1, department: 1, name: { first: 'Second', last: 'Person' }, title: 'Developer' })
        ];
        return Person.insert(people)
          .then(function(newPeople) {
            expect(newPeople).to.be.instanceof(Array);
            expect(newPeople.length).to.be.eql(2);
            expect(newPeople[1].name.first).to.be.eql('Second');
          });
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

    describe('validation', function() {

      it( 'should return no validation errors on a valid data', function() {
        var person = new Person({ name: { first: 'Jane' }, age: 5 });

        expect(person.$validate().length).to.be.eql(0);
      });

      it( 'should return validate errors on invalid data', function() {
        var person = new Person({ age: 5.1 });

        expect(person.$validate().length).to.be.eql(2);
      });
    });

    describe('timestamps', function() {
      it( 'should set updatedAt', function() {
        Person.def.timestamps = true;
        Person.byId(1).then(function(person) {
          person.age = 33;
          person.$update().then(function() {
            expect(person.updatedAt).to.exist;
          });
        });
      });

      it( 'should set createdAt', function() {
        Person.def.timestamps = true;
        Person.save({ name: { first: 'Jacob' } }).then(function(person) {
          return Person.db.remove({ _id: person._id }).then(function() {
            expect(person.createdAt).to.exist;
            expect(person.updatedAt).to.exist;
          });
        });
      });

      it('should support findAndModify()', function() {
        Person.def.timestamps = true;
        return Person.findAndModify({ query: { _id: 2 }, update: { $set: { age: 31 } }, new: true }).then(function(doc) {
          var person = doc[0];
          expect(person.age).to.be.eql(31);
          expect(person.updatedAt).to.exist;
        });
      });

    });
  });
});
