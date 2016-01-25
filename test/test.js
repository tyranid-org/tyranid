
require('es6-promise');

var tyr            = require('../src/tyranid'),
    $all           = tyr.$all,
    chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    pmongo         = require('promised-mongo'),
    expect         = chai.expect,
    _              = require('lodash'),
    Field          = require('../src/classes/Field');

chai.use(chaiAsPromised);
chai.should();

global.ObjectId = pmongo.ObjectId;

describe('tyranid', function() {
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
          fields: {
            _id:     { is: 'mongoid' },
          }
        });
      }).to.throw();
    });

    it( 'should throw if the name is not a string', function() {
      expect(function() {
        new tyr.Collection({
          id: 't00',
          name: 3,
          fields: {
            _id:     { is: 'mongoid' },
          }
        });
      }).to.throw();
    });

    /*
     * This test is disabled because we now require a collection to have a primary key field defined.
     * Possibly this decision will be reversed if we find a use case where it is valid.
     *
    it( 'should accept a present but empty fields array', function() {
      expect(function() {
        try {
        new tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
          }
        });
      } catch (err) {
        console.log(err);
      }
      }).to.not.throw();
    });
     */

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

    /*
       Tyranid modifies field definitions with backreferences so therefore the defs are not reusable.

       However, you can still clone definitions before passing them on to Tyranid.
     */
    it( 'should support re-usable bits of metadata', function() {
      tyr.reset();
      expect(function() {
        var Meta = {
          is: 'object',
          fields: {
            name: { is: 'string' }
          }
        };

        new tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            _id: { is: 'mongoid' },
            one: _.cloneDeep(Meta),
            two: _.cloneDeep(Meta)
          }
        });
      }).to.not.throw();
    });
  });

  describe( 'with model', function() {
    var Job, Organization, Department, Person, Task, Role, Book,
        TyrSchema, TyrSchemaType;
    //var Job2, Organization2, Department2, Person2;
    var AdministratorRoleId = new ObjectId('55bb8ecff71d45b995ff8c83');
    var BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');

    before(function() {
      tyr.reset();

      // Test validate load models and byName
      tyr.validate([{dir: __dirname + '/models', fileMatch: '\.js$' }]);

      Job = tyr.byName.job;
      Organization = tyr.byName.organization;
      Department = tyr.byName.department;
      Person = tyr.byName.person;
      Task = tyr.byName.task;
      Book = tyr.byName.book;
      TyrSchema = tyr.byName.tyrSchema;
      TyrSchemaType = tyr.byName.tyrSchemaType;

      Role = require('./models/role.js'); // require to get extra link in prototype chain

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
        Role.db.remove({}).then(function() {
          return Role.db.insert([
            { _id: AdministratorRoleId, name: 'Administrator' }
          ]);
        }),
        Person.db.remove({}).then(function() {
          return Person.db.insert([
            { _id: 1, organization: 1, department: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
            { _id: 2, organization: 1, name: { first: 'John', last: 'Doe' }, homepage: 'https://www.tyranid.org', siblings: [
              { name: 'Tom Doe', bestFriend: 1, friends: [ { person: 3 }, { person: 1 } ] },
              { name: 'George Doe', friends: [ { person: 1 }, { person: 3 } ] }
            ],
              age: 35,
              ageAppropriateSecret: 'Eats at Chipotle way to much...',
              roles: [ { role: AdministratorRoleId, active: true } ]
            },
            { _id: 3, organization: 2, name: { first: 'Jane', last: 'Doe' }, siblings: [
                { name: 'Jill Doe', friends: [ { person: 1 }, { person: 2 } ] },
                { name: 'Bill Doe', friends: [ { person: 2 }, { person: 3 } ] }
            ],
              age: 20,
              ageAppropriateSecret: 'Not a fan of construction companies...'
            },
            { _id: 4, organization: 2, name: { first: 'Jill', last: 'Doe' }, age: 20 }
          ]);
        }),
        Book.db.remove({}).then(function() {
          return Book.db.insert([
            { _id: 1, isbn: BookIsbn, title: 'Tyranid User Guide' },
          ]);
        }),
        Task.db.remove({}).then(function() {
          return Task.db.insert([
            { _id: 1, title: 'Write instance validation tests', assigneeUid: Person.idToUid(1), manual: BookIsbn },
          ]);
        }),
        TyrSchema.db.remove({}).then(function() {
          return TyrSchema.db.insert([
            {
              collection: Person.id,
              match: {
                organization: 1
              },
              type: TyrSchemaType.PARTIAL._id,
              def: {
                fields: {
                  acmeX: { is: 'integer' }
                }
              }
            }
          ]);
        })
      ]);
    });

    describe( 'schema methods', function() {
      it( 'should support fields object', function() {
        expect(Person.fields['name.first']).to.be.instanceof(Field);
        expect(Person.fields['roles._.role']).to.be.instanceof(Field);
      });

      it( 'should support fieldsBy()', function() {
        expect(
          Person.fieldsBy({ name: 'string' })
        ).to.eql(
          ['fullName', 'name.first', 'name.last', 'ageAppropriateSecret', 'siblings.name', 'title']
        );
      });

      it('should support static methods in ES6 class defs', function() {
        return Role.search('Admin').then(function(docs) {
          expect(docs[0].name).to.equal('Administrator');
        })
      })
    });

    describe('dynamic schemas', () => {
      const dynPersonId = 111;
      afterEach(() => {
        return Person.db.remove({ _id: dynPersonId });
      });

      it( 'should support matching fieldsFor()', async () => {
        const fields = await Person.fieldsFor({ organization: 1 });
        expect(Object.values(fields).length).to.be.eql(16);
      });

      it( 'should support unmatching fieldsFor()', async () => {
        const fields = await Person.fieldsFor({ organization: 2 });
        expect(Object.values(fields).length).to.be.eql(15);
      });

      it( 'should set dyn fields on insert for matching objects', async () => {
        return Person.insert({ _id: dynPersonId, organization: 1, name: { first: 'Dynamic', last: 'Schema' }, acmeX: 999 }).then(p => {
          expect(p.acmeX).to.be.eql(999);
        });
      });

      it( 'should NOT set dyn fields on insert for unmatching objects', async () => {
        return Person.insert({ _id: dynPersonId, organization: 2, name: { first: 'Not', last: 'Dynamic' }, acmeX: 999 }).then(p => {
          expect(p.acmeX).to.not.exist;
        });
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

      it('should return a cursor', function() {
        return Person.find().skip(2).limit(2).sort({'name.first':-1}).then(function(docs) {
          expect(docs.length).to.be.eql(2);
          expect(docs[0].name.first).to.be.eql('Jane');
          expect(docs[1].name.first).to.be.eql('An');
          expect(docs[0]).to.be.an.instanceof(Person);
          expect(docs[1]).to.be.an.instanceof(Person);
        });
      });

      it('should findOne()', function() {
        return Person.findOne({'name.first': 'An'}).then(function(doc) {
          expect(doc).to.be.an.instanceof(Person);
        });
      });

      it('should findAndModify()', function() {
        return Person.findAndModify({ query: { _id: 1 }, update: { $set: { age: 32 } }, new: true }).then(function(result) {
          var person = result.value;
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

      it('should byId() with string conversions', function() {
        return Person.byId('1').then(function(doc) {
          expect(doc).to.be.an.instanceof(Person);
          expect(doc._id).to.be.eql(1);
        });
      });

      it('should byId() with custom primaryKey', function() {
        return Book.byId(BookIsbn).then(function(doc) {
          expect(doc).to.be.an.instanceof(Book);
          expect(doc._id).to.be.eql(1);
          expect(doc.isbn).to.be.eql(BookIsbn);
        });
      });
    });

    describe('projections', function() {
      it('should return custom primaryKey if not specified in projection', function() {
        return Book.find({isbn:BookIsbn},{_id:1}).then(function(docs) {
          expect(docs.length).to.be.eql(1);
          expect(docs[0].title).to.not.exist;
          expect(docs[0].isbn).to.be.eql(BookIsbn);
        });
      });

      it('should not include custom primaryKey if specifically excluded', function() {
        return Book.findOne({isbn:BookIsbn},{isbn:0}).then(function(doc) {
          expect(doc.isbn).to.not.exist;
        });
      });

      it('should work with findAndModify `fields` param', function() {
        return Book.findAndModify({
          query: { isbn:BookIsbn },
          update: { $set: { fakeProp: 'fake' } },
          fields: { title:1 }
        }).then(function(doc) {
          expect(doc.value.isbn).to.be.eql(BookIsbn);
        });
      });
    });

    describe('fields', function() {
      it('model fields should be an instanceof Field', function() {
        expect(Job.def.fields.manager instanceof Field).to.be.eql(true);
      });

      it('model fields should have name and path fields', function() {
        expect(Job.def.fields.manager.name).to.be.eql('manager');
        expect(Person.def.fields.name.def.fields.first.name).to.be.eql('first');
        expect(Person.def.fields.name.def.fields.first.path).to.be.eql('name.first');
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

      it('should support $label on instances', function() {
        expect(Job.byLabel('Designer').$label).to.be.eql('Designer');
        expect(Job.byLabel('Software Lead').$label).to.be.eql('Software Lead');
      });

      it('should support label on collections', function() {
        expect(Job.label).to.be.eql('Job');
        expect(Task.label).to.be.eql('Issue');
      });

      it('should support label on fields', function() {
        expect(Job.def.fields.manager.label).to.be.eql('Manager');
        expect(Task.def.fields.assigneeUid.label).to.be.eql('Assignee UID');
        expect(Person.def.fields.birthDate.label).to.be.eql('Dyn Birth Date');
      });
    });

    describe('saving', function() {
      var newIsbn = ObjectId('561cabf00000000000000000');

      after(function() {
        return Book.db.remove({ isbn: newIsbn });
      });

      it('should save new objects', function() {
        var book = new Book({ isbn: newIsbn, title: 'Datamodeling for Dummies' });

        return book.$save().then(function() {
          return Book.db.find({ isbn: newIsbn }).then(function(docs) {
            expect(docs.length).to.eql(1);
            expect(docs[0].title).to.eql('Datamodeling for Dummies');
          });
        });
      });

      it('should save existing objects', function() {
        var book = new Book({ isbn: newIsbn, description: 'Lovely' });

        return book.$save().then(function() {
          return Book.db.find({ isbn: newIsbn }).then(function(docs) {
            expect(docs.length).to.eql(1);
            expect(docs[0].description).to.eql('Lovely');
            // $save should replace entire doc
            expect(docs[0].title).to.not.exist;
          });
        });
      });
    });

    describe('values', function() {
      var allString = [
        '123 Construction', 'Acme Unlimited', 'Administrator', 'An', 'Anon', 'Bill Doe', 'Developer', 'Doe', 'Eats at Chipotle way to much...', 'Engineering',
        'George Doe', 'Jane', 'Jill', 'Jill Doe', 'John', 'Not a fan of construction companies...', 'Tom Doe', 'Tyranid User Guide', 't03'
      ];

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
        expect(people.length).to.eql(4);
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

      it('should work with custom primaryKey', function() {
        return Task.findOne({_id:1})
          .then(Task.populate('manual'))
          .then(function(task) {
            expect(task.manual$).to.be.an.instanceof(Book);
            expect(task.manual$._id).to.be.eql(1);
            expect(task.manual$.isbn).to.be.eql(BookIsbn);
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
          .sort({ _id: 1 })
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
          .find({ _id: 2 })
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

    describe('denormalization', function() {
      var julia,
          juliaMatch = { 'name.first': 'Julia', 'name.last': 'Doe' };

      before(function() {
        julia = new Person({ _id: 2000, name: { first: 'Julia', last: 'Doe' }, organization: 1 });
        return julia.$save();
      });

      after(function() {
        return Person.db.remove(juliaMatch);
      });

      it( 'denormalize on save', function() {
        return Person.db.findOne(juliaMatch).then(function(doc) {
          expect(doc.organization_.name).to.be.eql('Acme Unlimited');
        });
      });
    });

    describe('client', function() {
      it( 'should fromClient', function() {
        var title = 'Browsers';
        var bookObj = { title, isbn: ObjectId('5614c2f00000000000000000') };
        var book = Book.fromClient(bookObj);
        expect(book).to.be.an.instanceof(Book);
        expect(book.title).to.be.eql(title);
        expect(book.isbn).to.be.an.instanceof(ObjectId);
      });

      it( 'should fromClient array objects', function() {
        var personObj = { _id: 1, roles: [ { role: AdministratorRoleId.toString(), active: true } ] };
        var person = Person.fromClient(personObj);
        expect(person.roles[0].role).to.be.an.instanceof(ObjectId);
      });

      it( 'should deep fromClient', function() {
        var friendObj = { birthDate: '03-07-1969' };
        var friend = Person.fromClient(friendObj, 'siblings.friends');
        expect(friend.birthDate).to.be.an.instanceof(Date);
        expect(friend).not.to.be.an.instanceof(Person);
      });

      it( 'should allow parametric client flags', function() {
        Person.find({ age: { $exists: true } })
          .then(function(people) {
            var clientData = Person.toClient(people);
            expect(clientData[0]).ageAppropriateSecret.to.be.eql('Eats at Chipotle way to much...')
            expect(clientData[1]).ageAppropriateSecret.to.be.eql(undefined);
          })
      });

      it( 'should copy dynamic objects', function() {
        var personObj = { name: { firstName: 'Foo' }, bag: { abc123: 5 } };
        var person = Person.fromClient(personObj);
        expect(person).to.be.an.instanceof(Person);
        expect(person.bag).to.be.eql({ abc123: 5 });
      });
    });

    describe('insert', function() {
      it('should generate an _id if Type.generatePrimaryKeyVal() defined', function() {
        var r = new Role();
        return r.$insert()
          .then(function(newRole) {
            expect(newRole._id).to.be.an.instanceOf(ObjectId);
          });
      });
      it('should generate a custom primaryKey if Type.generatePrimaryKeyVal() defined', function() {
        var b = new Book();
        return b.$insert()
          .then(function(newBook) {
            expect(newBook.isbn).to.be.an.instanceOf(ObjectId);
            expect(newBook._id).to.eql(newBook.isbn);
          });
      });
      it('should support defaultValues', function() {
        var p = new Person({ _id: 1000, organization: 1, department: 1, name: { first: 'Default', last: 'Employee' } });
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
          new Person({ _id: 1001, organization: 1, department: 1, name: { first: 'First', last: 'Person' }, title: 'Developer' }),
          new Person({ _id: 1002, organization: 1, department: 1, name: { first: 'Second', last: 'Person' }, title: 'Developer' })
        ];
        return Person.insert(people)
          .then(function(newPeople) {
            expect(newPeople).to.be.instanceof(Array);
            expect(newPeople.length).to.be.eql(2);
            expect(newPeople[1].name.first).to.be.eql('Second');
          });
      });
    });

    describe('$update', function() {
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

    describe('update', function() {
      it( 'should update', async () => {
        await Person.update({ _id: 4 }, { title: 'Software Engineer' });
        const person = await Person.byId(4);
        expect(person.title).to.be.eql('Software Engineer');
      });
    });

    describe('remove', function() {
      it( 'should remove', async () => {
        const dale = new Person({ _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 });
        await dale.$save();
        await Person.remove({ _id: 2001 });
        expect(await Person.db.findOne({ _id: 2001 })).to.be.null;
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
        return Person.findAndModify({ query: { _id: 2 }, update: { $set: { age: 31 }, $setOnInsert: { title: 'Uh oh' } }, new: true }).then(function(result) {
          var person = result.value;
          expect(person.age).to.be.eql(31);
          expect(person.updatedAt).to.exist;
          expect(person.title).to.not.exist;
        });
      });

      it('should support findAndModify() with defaultValues on upsert', function() {
        return Person.findAndModify({ query: { _id: 1003 }, update: { $set: { age: 31 }, $setOnInsert: { name: { first: 'Bill', last: 'Gates' } } }, upsert: true, new: true }).then(function(result) {
          var person = result.value;
          expect(person.name.first).to.be.eql('Bill');
          expect(person.title).to.be.eql('Employee');
          expect(person.goldStars).to.be.eql(0);
        });
      });

      it('should support findAndModify() with complete doc replacement', function() {
        return Person.findAndModify({ query: { _id: 1003 }, update: { title: 'Good Boy' }, upsert: true, new: true }).then(function(result) {
          var person = result.value;
          expect(person.name).to.not.exist;
          expect(person.goldStars).to.not.exist;
          expect(person.title).to.be.eql('Good Boy');
        });
      });

      it('should support findAndModify() upsert with complete doc replacement', function() {
        return Person.findAndModify({ query: { _id: 1004 }, update: { title: 'Good Boy' }, upsert: true, new: true }).then(function(result) {
          var person = result.value;
          expect(person.name).to.not.exist;
          expect(person.goldStars).to.not.exist;
          expect(person.title).to.be.eql('Good Boy');
        });
      });

    });

    describe('computed properties', function() {

      it( 'should support computed properties', function() {
        var person = new Person({ name: { first: 'Jane', last: 'Smith' }, age: 5 });
        expect(person.fullName).to.be.eql('Jane Smith');
      });

      it( 'should work with CollectionInstance.toClient()', function() {
        var person = new Person({ name: { first: 'Jane', last: 'Smith' }, age: 5 }).$toClient();
        expect(person.fullName).to.be.eql('Jane Smith');
      });

      it( 'should work with POJO toClient()', function() {
        var person = { name: { first: 'Jane', last: 'Smith' }, age: 5 };
        var clientPerson = Person.toClient(person);
        expect(clientPerson.fullName).to.be.eql('Jane Smith');
      });
    });

    describe('hooks and plugins', function() {
      it( 'should support pre hooks', function() {
        Book.pre('insert', (next, obj, ...otherArgs) => {
          // Following is specific to this test, verifying args passed correctly
          expect(obj.pages).to.be.eql(5);

          // Add 2 pages for for front and back cover
          obj.pages += 2;
          return next(obj, ...otherArgs);
        });

        var b = new Book({ pages: 5 });
        return b.$insert()
          .then(function(newBook) {
            expect(newBook.pages).to.be.eql(7);
          });
      });

      it( 'should support post hooks', function() {
        Book.post('insert', (next, promise) => {
          const modified = promise.then(newBook => {
            // Add 2 more pages
            newBook.pages += 2;
            return newBook;
          });
          return next(modified);
        });

        var b = new Book({ pages: 5 });
        return b.$insert()
          .then(function(newBook) {
            expect(newBook.pages).to.be.eql(9);
          });
      });

      it( 'should unhook', function() {
        Book.unhook('insert');
        Book.unhook('insert');
        var b = new Book({ pages: 5 });
        return b.$insert()
          .then(function(newBook) {
            expect(newBook.pages).to.be.eql(5);
          });
      });

      it( 'should support plugins', function() {
        Book.plugin(function(collection, options) {
          expect(collection).to.be.eql(Book);
          expect(options.testOption).to.be.eql('test');

          Book.def.timestamps = true;
        }, { testOption: 'test' });

        var b = new Book({ pages: 5 });
        return b.$insert()
          .then(function(newBook) {
            expect(newBook.createdAt).to.exist;
            expect(newBook.updatedAt).to.exist;
          });
      });

      describe( 'Fake data generation', function() {

        const seed = 100;

        it('faker: should successfully create valid document', async () => {
          const fakeDoc = await Person.fake({ seed });
          expect(fakeDoc, 'Fake document should be valid instance of person').to.be.instanceOf(Person);
          fakeDoc.$validate();
        });

        it('faker: should produce same document given same seed', async () => {
          const fakeDoc1 = JSON.stringify(await Person.fake({ seed }), null, 2),
                fakeDoc2 = JSON.stringify(await Person.fake({ seed }), null, 2);

          expect(fakeDoc2).to.deep.equal(fakeDoc1);
        });

      });

    });

  });
});
