
import Tyr            from '../src/tyranid';
import chai           from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mongodb        from 'mongodb';
import _              from 'lodash';
import Field          from '../src/core/field';
import Type           from '../src/core/type';
import UnitType       from '../src/unit/unitType';
import Unit           from '../src/unit/unit';
import Units          from '../src/unit/units';
import Role           from './models/role'; // require to get extra link in prototype chain
import                     './models/user';
import historical     from '../src/historical/historical';

const babel = require('babel-core');
//import babel        from 'babel-core';

const {
  ObjectId
} = mongodb;

const {
  NamePath,
  $all,
  Log
} = Tyr;

const {
  expect,
  assert
} = chai;


const fakeSecure = {
  boot() {},
  query(collection, perm, auth) {
    const query = {};
    if (collection.name === 'Book') {
      if (auth && auth.name.first === 'An') {
        query.title = /Tyranid/;
      }
    } else {
      query.SECURED = {
        perm,
        auth: auth.$uid
      };
    }
    return query;
  },
  canInsert(collection, doc, perm, auth) {
    if (auth.name.first === 'An') {
      return false;
    }

    return true;
  }
};


chai.use(chaiAsPromised);
chai.should();

async function expectAsyncToThrow(promise, regex) {
  let failed = false;

  try {
    await promise;
    failed = true;
  } catch (e) {
    if (!e.message.match(regex)) {
      assert(false, `threw "${e.message}", expected to throw ` + regex);
    }
  }

  if (failed) {
    assert(false, 'expected to throw ' + regex);
  }
}


function round5(v) {
  return parseFloat(v.toFixed(5));
}

function prec5(v) {
  return parseFloat(v.toPrecision(5));
}

describe('tyranid', function() {
  var db = null;
  before(async function(done) {
    db = await mongodb.MongoClient.connect('mongodb://localhost:27017/tyranid_test');
    Tyr.config({
      db: db,
      consoleLogLevel: 'ERROR',
      dbLogLevel: 'TRACE',
      secure: fakeSecure,
      indexes: true
    });
    done(null, db);
  });

  after(function() {
    Tyr.db.close();
    setTimeout(function() {
      process.exit(0);
    }, 500);
  });

  describe('lodash-like methods', () => {
    const oid1 = new ObjectId('55bb8ecff71d45b995ff8c83'),
          oid1_ = new ObjectId('55bb8ecff71d45b995ff8c83'),
          oid2  = new ObjectId('5567f2a8387fa974fc6f3a5a'),
          oid2_ = new ObjectId('5567f2a8387fa974fc6f3a5a'),
          oid3  = new ObjectId('aaa7f2a8387fa9abdc6f3ced'),
          oid3_ = new ObjectId('aaa7f2a8387fa9abdc6f3ced');

    it('should support isEqual with OIDs', () => {
      expect(
        Tyr.isEqual(
          [oid1, oid2, oid3],
          [oid1_, oid2_, oid3_]
        )
      ).to.be.true;
    });

    it('should support indexOf with OIDs', () => {
      expect(
        Tyr.indexOf([oid1, oid2, oid3], oid2_)
      ).to.eql(1);

      expect(
        Tyr.indexOf([oid1, oid2], oid3_)
      ).to.eql(-1);
    });

    it('should support addToSet', () => {
      const a = [ oid1, oid2 ];

      Tyr.addToSet(a, oid2_);

      expect(a.length).to.eql(2);

      Tyr.addToSet(a, oid3 );

      expect(
        Tyr.isEqual(
          a,
          [oid1, oid2, oid3_]
        )
      ).to.be.true;
    });

    it('should support pullAll', () => {
      const a = [oid1, oid2, oid3];
      Tyr.pullAll(a, oid2_);

      expect(Tyr.isEqual(a, [oid1, oid3])).to.be.true;

      Tyr.pullAll(a, 3);

      expect(Tyr.isEqual(a, [oid1, oid3])).to.be.true;
    });
  });

  describe( 'schema validation', function() {
    afterEach(() => {
      Tyr.forget('t00');
      Tyr.forget('t01');
      Tyr.forget('t02');
    });

    it( 'should error if no name is provided', function() {
      expect(function() {
        new Tyr.Collection({
          id: 't00',
          fields: {
            _id:     { is: 'mongoid' },
          }
        });
      }).to.throw();
    });

    it( 'should throw if the name is not a string', function() {
      expect(function() {
        new Tyr.Collection({
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
        new Tyr.Collection({
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

    it('should throw if arrays do not contain a single value', function() {
      expect(function() {
        new Tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            emptyArray: []
          }
        });
      }).to.throw();
    });

    it('should support self-referential links', function() {
      expect(function() {
        new Tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            _id:     { is: 'mongoid' },
            self:    { link: 'test' }
          }
        });
      }).to.not.throw();
    });

    it('should throw if a field is missing a definition', function() {
      expect(function() {
        new Tyr.Collection({
          id: 't01',
          name: 'test1',
          fields: {
            cat: 3
          }
        });
        Tyr.validate();
      }).to.throw( /Invalid field definition/i );

      expect(function() {
        new Tyr.Collection({
          id: 't02',
          name: 'test2',
          fields: {
            cat: [
              3
            ]
          }
        });
        Tyr.validate();
      }).to.throw( /Unknown field definition/i );
    });

    /*
       Tyranid modifies field definitions with backreferences so therefore the defs are not reusable.

       However, you can still clone definitions before passing them on to Tyranid.
     */
    it('should support re-usable bits of metadata', function() {
      expect(function() {
        var Meta = {
          is: 'object',
          fields: {
            name: { is: 'string' }
          }
        };

        new Tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            _id: { is: 'mongoid' },
            one: Tyr.cloneDeep(Meta),
            two: Tyr.cloneDeep(Meta)
          }
        });
      }).to.not.throw();
    });
  });

  describe('with model', function() {
    var Job, Organization, Department, User, Task, Book, Location,
        TyrSchema, TyrSchemaType;
    //var Job2, Organization2, Department2, User2;
    var AdministratorRoleId = new ObjectId('55bb8ecff71d45b995ff8c83');
    var BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');
    var Book2Isbn = new ObjectId('aaa7f2a8387fa9abdc6f3ced');

    before(async function() {
      // Test validate load models and byName
      Tyr.validate({
        glob: __dirname + '/models/**/*.js'
        //dir: __dirname + '/models',
        // note, we want fileMatch to match the "subdir" directory to test that tyranid ignores directories
        //fileMatch: '[a-z].*'
      });

      Job = Tyr.byName.job;
      Organization = Tyr.byName.organization;
      Department = Tyr.byName.department;
      User = Tyr.byName.user;
      Task = Tyr.byName.task;
      Book = Tyr.byName.book;
      Location = Tyr.byName.location;
      TyrSchema = Tyr.byName.tyrSchema;
      TyrSchemaType = Tyr.byName.tyrSchemaType;

      await Organization.db.remove({});
      await Organization.db.insert([
        { _id: 1, name: 'Acme Unlimited' },
        { _id: 2, name: '123 Construction', owner: 3 },
      ]);
      await Department.db.remove({});
      await Department.db.insert([
        { _id: 1, name: 'Engineering', creator: 2, head: 3, permissions: { members: [ 2, 3 ] } }
      ]);
      await Role.db.remove({});
      await Role.db.insert([
        { _id: AdministratorRoleId, name: 'Administrator' }
      ]);
      await User.db.remove({});
      await User.db.insert([
        { _id: 1, organization: 1, department: 1, name: { first: 'An', last: 'Anon' }, title: 'Developer' },
        { _id: 2, organization: 1, name: { first: 'John', last: 'Doe' }, homepage: 'https://www.tyranid.org', siblings: [
          { name: 'Tom Doe', bestFriend: 1, friends: [ { user: 3 }, { user: 1 } ] },
          { name: 'George Doe', friends: [ { user: 1 }, { user: 3 } ] }
        ],
          age: 35,
          ageAppropriateSecret: 'Eats at Chipotle way to much...',
          roles: [ { role: AdministratorRoleId, active: true } ]
        },
        { _id: 3, organization: 2, name: { first: 'Jane', last: 'Doe' }, siblings: [
            { name: 'Jill Doe', friends: [ { user: 1 }, { user: 2 } ] },
            { name: 'Bill Doe', friends: [ { user: 2 }, { user: 3 } ] }
        ],
          age: 20,
          ageAppropriateSecret: 'Not a fan of construction companies...'
        },
        { _id: 4, organization: 2, name: { first: 'Jill', last: 'Doe' }, age: 20 }
      ]);
      await Book.db.remove({});
      await Book.db.insert([
        { _id: 1, isbn: BookIsbn, title: 'Tyranid User Guide' },
      ]);
      await Book.db.insert([
        { _id: 2, isbn: Book2Isbn, title: 'Home Gardening 101' },
      ]);
      await Task.db.remove({});
      await Task.db.insert([
        { _id: 1, title: 'Write instance validation tests', assigneeUid: User.idToUid(1), manual: BookIsbn },
      ]);
      await TyrSchema.db.remove({});
      await TyrSchema.db.insert([
        {
          collection: User.id,
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
      await Log.db.remove({});
    });

    describe('fields', function() {
      it('should support fields object', function() {
        expect(User.paths['name.first']).to.be.instanceof(Field);
        expect(User.paths['roles._.role']).to.be.instanceof(Field);
      });

      it('should support field.type', function() {
        expect(User.paths['name.first'].type).to.be.instanceof(Type);
        expect(User.paths['roles._.role'].type).to.be.instanceof(Type);
      });

      it('should support field.link', function() {
        expect(User.paths['roles._.role'].link).to.be.eql(Tyr.byName.role);
      });

      it('should support field.parent', function() {
        expect(User.paths['name.first'].parent.name).to.be.eql('name');
        expect(User.paths['name'].parent).to.be.eql(User);
      });

      it('should support field.pathLabel', function() {
        expect(User.paths['name.first'].parent.pathLabel).to.be.eql('Name');
        expect(User.paths['name.first'].pathLabel).to.be.eql('Name First Name');
        expect(User.paths['name.last'].pathLabel).to.be.eql('Name Last');
      });
    });

    describe('maps', function() {
      it('should support "keys"', function() {
        expect(Department.paths['checkouts'].keys).to.be.instanceof(Field);
        expect(Department.paths['checkouts'].keys.type.name).to.eql('uid');
      });

      it('should support "of"', function() {
        expect(Department.paths['checkouts'].of).to.be.instanceof(Field);
        expect(Department.paths['checkouts'].of.type.name).to.eql('double');
      });
    });

    describe( 'schema methods', function() {

      it('should support fieldsBy()', function() {
        expect(
          User.fieldsBy(field => field.type.def.name === 'string').map(field => field.spath)
        ).to.eql(
          ['fullName', 'name.first', 'name.last', 'name.suffices', 'address.street', 'address.notes', 'ageAppropriateSecret', 'siblings.name', 'title']
        );
      });

      it('should support static methods in ES6 class defs', async function() {
        const cursor = await Role.search('Admin');
        return cursor.toArray().then(function(docs) {
          expect(docs[0].name).to.equal('Administrator');
        })
      })
    });

    describe('mixin schemas', () => {
      it('should support mixin()', function() {
        Department.mixin({
          fields: {
            city: { is: 'string' }
          }
        });

        expect(Department.def.fields.city.def.is).to.eql('string');
        expect(Department.fields.city.type.name).to.eql('string');
        expect(Department.paths.city.type.name).to.eql('string');
      });
    });

    describe('dynamic schemas', () => {
      const dynUserId = 111;
      afterEach(() => {
        return User.db.remove({ _id: dynUserId });
      });

      it( 'should support matching fieldsFor()', async () => {
        const fields = await User.fieldsFor({ organization: 1 });
        expect(_.values(fields).length).to.be.eql(17);
      });

      it( 'should support unmatching fieldsFor()', async () => {
        const fields = await User.fieldsFor({ organization: 2 });
        expect(_.values(fields).length).to.be.eql(16);
      });

      it( 'should set dyn fields on insert for matching objects', async () => {
        return User.insert({ _id: dynUserId, organization: 1, name: { first: 'Dynamic', last: 'Schema' }, acmeX: 999 }).then(p => {
          expect(p.acmeX).to.be.eql(999);
        });
      });

      it( 'should NOT set dyn fields on insert for unmatching objects', async () => {
        return User.insert({ _id: dynUserId, organization: 2, name: { first: 'Not', last: 'Dynamic' }, acmeX: 999 }).then(p => {
          expect(p.acmeX).to.not.exist;
        });
      });
    });

    describe('secure', function() {
      it('should add properties passed to secure.query', async function() {
        const user = await User.findOne({});
        const secured = await User.secureQuery({}, 'view', user);
        expect(secured.SECURED).to.deep.equal({
          perm: 'view',
          auth: user.$uid
        });
      });

      it('should stop inserts when not authorized', async function() {
        const anon = await User.findOne({ 'name.first': 'An' });
        const book = new Book();
        expect(await book.$insert({ auth: anon })).to.eql(false);
      });

      it('should support secured find()s', async function() {
        const anon = await User.findOne({ 'name.first': 'An' });
        let books = await Book.find({}, { title: 1 }, { auth: anon }).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');

        const jane = await User.findOne({ 'name.first': 'Jane' });
        books = await Book.find({}, { title: 1 }, { auth: jane }).toArray();
        expect(books.length).to.eql(2);
      });

      it('should support secured find()s with a single options argument', async function() {
        const anon = await User.findOne({ 'name.first': 'An' });
        const books = await Book.find({ query: {}, fields: { title: 1 }, auth: anon }).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');
      });

      it('should support secured find()s with a query and an options argument', async function() {
        const anon = await User.findOne({ 'name.first': 'An' });
        const books = await Book.find({}, { fields: { title: 1 }, auth: anon }).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');
      });

      it('should support secured find()s with a empty query and an empty options argument', async function() {
        const books = await Book.find({}, {}).toArray();
        expect(books.length).to.eql(2);
      });

      it('should support secured find()s with a empty query, a null projection, and an empty options argument', async function() {
        const books = await Book.find({}, null, {}).toArray();
        expect(books.length).to.eql(2);
      });
    });

    describe('finding', function() {
      it('should find unwrapped objects', async function() {
        const docs = await User.db.find({'name.first': 'An'}).toArray();
        expect(docs.length).to.be.eql(1);
      });

      it('should find wrapped objects', async function() {
        const docs = await (await User.find({'name.first': 'An'})).toArray();
        expect(docs.length).to.be.eql(1);
        expect(docs[0]).to.be.an.instanceof(User);
      });

      it('should return a cursor', async function() {
        const docs = await (await User.find()).skip(2).limit(2).sort({'name.first':-1}).toArray();
        expect(docs.length).to.be.eql(2);
        expect(docs[0].name.first).to.be.eql('Jane');
        expect(docs[1].name.first).to.be.eql('An');
        expect(docs[0]).to.be.an.instanceof(User);
        expect(docs[1]).to.be.an.instanceof(User);
      });

      it('should findOne()', function() {
        return User.findOne({'name.first': 'An'}).then(function(doc) {
          expect(doc).to.be.an.instanceof(User);
        });
      });

      it('should findOne() with direct ObjectId', function() {
        return Role.findOne(AdministratorRoleId).then(function(doc) {
          // Not instanceof check since Role is a class
          expect(doc.$model).to.be.eql(Tyr.byName.role);
        });
      });

      it('should findOne() with direct ObjectId + projection', function() {
        return Role.findOne(AdministratorRoleId, { _id: false }).then(function(doc) {
          expect(doc.$model).to.be.eql(Tyr.byName.role);
          expect(doc._id).to.not.exist;
          expect(doc.name).to.exist;
        });
      });

      it('should findOne() with projection', async function() {
        const doc = await User.findOne({ 'name.first': 'An' }, { name: 1 });
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc)).to.eql(['_id', 'name']);
      });

      it('should findOne() with a null projection', async function() {
        const doc = await User.findOne({ 'name.first': 'An' }, null);
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc).length).to.be.greaterThan(3);
      });

      it('should findOne() with a null projection and options, 1', async function() {
        const doc = await User.findOne({ 'name.first': 'An' }, null, { fields: { name: 1 } });
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc)).to.eql(['_id', 'name']);
      });

      it('should findOne() with a null projection and options, 2', async function() {
        const doc = await User.findOne({ 'name.first': 'John' }, null, { tyranid: { secure: false } });
        expect(doc).to.be.an.instanceof(User);
        expect(doc.name.first).to.eql('John');
        expect(_.keys(doc).length).to.be.greaterThan(3);
      });

      it('should findOne() with just options', async function() {
        const doc = await User.findOne({ query: { 'name.first': 'An' }, fields: { name: 1 } });
        expect(doc).to.be.an.instanceof(User);
      });

      it('should findAll()', function() {
        return User.findAll({'name.first': 'An'}).then(function(docs) {
          expect(docs.length).to.be.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
        });
      });

      it('should findAll() with options', function() {
        return User.findAll({ query: {'name.first': /^J/}, skip: 1, limit: 1 }).then(function(docs) {
          expect(docs.length).to.be.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
        });
      });

      it('should findAndModify()', function() {
        return User.findAndModify({ query: { _id: 1 }, update: { $set: { age: 32 } }, new: true, historical: false }).then(function(result) {
          var user = result.value;
          expect(user).to.be.an.instanceof(User);
          expect(user.age).to.be.eql(32);
        });
      });

      it('should byId()', function() {
        return User.byId(1).then(function(doc) {
          expect(doc).to.be.an.instanceof(User);
          expect(doc._id).to.be.eql(1);
        });
      });

      it('should byId() with string conversions', function() {
        return User.byId('1').then(function(doc) {
          expect(doc).to.be.an.instanceof(User);
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
      it('should support projections returning a cursor out of find (not a promise of a cursor)', async function() {
        const docs = await User.db.find({ 'name.first': 'An'}).limit(1).toArray();
        expect(docs.length).to.be.eql(1);
      });

      it('should support projections', async function() {
        const docs = await (await User.db.find({ 'name.first': 'An'}, { name: 1 })).toArray();
        expect(docs.length).to.be.eql(1);
        expect(_.keys(docs[0]).length).to.be.eql(2);
      });

      it('should return custom primaryKey if not specified in projection', function() {
        return Book.findAll({isbn:BookIsbn},{_id:1}).then(function(docs) {
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
        expect(User.def.fields.name.def.fields.first.name).to.be.eql('first');
        expect(User.def.fields.name.def.fields.first.path).to.be.eql('name.first');
      });
    });

    describe('documents', function() {
      it('should support $clone() on instances', async function() {
        const orig  = await Book.byId(BookIsbn),
              clone = orig.$clone();
        expect(clone.$id).to.eql(BookIsbn);
        expect(clone.$model).to.equal(orig.$model);
        expect(clone).to.not.equal(orig);
      });

      it('should support $id on instances', function() {
        expect(Job.byLabel('Designer').$id).to.be.eql(3);
        expect(Job.byLabel('Software Lead').$id).to.be.eql(2);
      });

      it('should support $uid on instances', function() {
        expect(Job.byLabel('Designer').$uid).to.be.eql('j003');
        expect(Job.byLabel('Software Lead').$uid).to.be.eql('j002');
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

      it('should support idToLabel on static collections both async and non-async', async function() {
        expect(Job.idToLabel(3)).to.be.eql('Designer');
        expect(Job.idToLabel(undefined)).to.be.eql('');
        expect(await Job.idToLabel(3)).to.be.eql('Designer');
      });

      it('should support idToLabel on non-static collections both async and non-async', async function() {
        expect(await Organization.idToLabel(1)).to.be.eql('Acme Unlimited');
        expect(await Organization.idToLabel(null)).to.be.eql('');
        expect(await User.idToLabel(1)).to.be.eql('An Anon');
      });

      it('should support label on collections', function() {
        expect(Job.label).to.be.eql('Job');
        expect(Task.label).to.be.eql('Issue');
      });

      it('should support label on fields', function() {
        expect(Job.def.fields.manager.label).to.be.eql('Manager');
        expect(Task.def.fields.assigneeUid.label).to.be.eql('Assignee UID');
        expect(User.def.fields.birthDate.label).to.be.eql('Dyn Birth Date');
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
          return Book.findAll({ isbn: newIsbn }).then(function(docs) {
            expect(docs.length).to.eql(1);
            expect(docs[0].title).to.eql('Datamodeling for Dummies');
          });
        });
      });

      it('should save existing objects', function() {
        var book = new Book({ isbn: newIsbn, description: 'Lovely' });

        return book.$save().then(function() {
          return Book.findAll({ isbn: newIsbn }).then(function(docs) {
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
        'George Doe', 'Home Gardening 101', 'Jane', 'Jill', 'Jill Doe', 'John', 'Not a fan of construction companies...', 'Tom Doe', 'Tyranid User Guide', 'u00'
      ];

      it( 'should support valuesFor()', function() {
        User.valuesFor(User.fieldsBy(field => field.type.def.name === 'string')).then(function(values) {
          return values.sort();
        }).should.eventually.eql(allString);
      });

      it( 'should support Tyranid.valuesBy()', function() {
        return Tyr.valuesBy(field => field.type.def.name === 'string').then(function(values) {
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

      it ('it should support lookups by label in string data', () => {
        expect(Unit.byLabel('dram').system.name).to.be.eql('english');
        expect(Unit.byLabel('meter').system.name).to.be.eql('metric');
      });
    });

    describe('population', function() {

      function verifyPeople(users) {
        expect(users.length).to.eql(4);
        var user1 = _.find(users, { _id: 1 });
        var user3 = _.find(users, { _id: 3 });
        expect(user1).to.be.an.instanceof(User);
        expect(user1.organization$).to.be.an.instanceof(Organization);
        expect(user1.organization$.name).to.be.eql('Acme Unlimited');
        expect(user3.organization$.name).to.be.eql('123 Construction');
      }

      it('should work curried', function() {
        return User.findAll()
          .then(User.populate('organization'))
          .then(function(users) {
            verifyPeople(users);
          });
      });

      it('should work uncurried', function() {
        return User.findAll()
          .then(function(users) {
            return User.populate('organization', users).then(function(users) {
              verifyPeople(users);
            });
          });
      });

      it('should work with findOne() populate in options', async function() {
        const user = await User.findOne({ query: { 'name.first': 'John' }, populate: 'organization' });
        expect(user).to.be.an.instanceof(User);
        expect(user.organization$).to.be.an.instanceof(Organization);
        expect(user.organization$.name).to.be.eql('Acme Unlimited');
      });

      it('should work with findAll() populate in options', async function() {
        const users = await User.findAll({ populate: 'organization' });
        verifyPeople(users);
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
        return User.findAll()
          .then(function(users) {
            return User.populate([ 'organization', 'department' ], users).then(function(users) {
              verifyPeople(users);
            });
          });
      });

      it( 'should deep populate array links', async function() {
        return (await User.db.find())
          .sort({ _id: 1 })
          .toArray()
          .then(User.populate([ 'organization', 'siblings.friends.user' ]))
          .then(function(users) {
            expect(users[1].siblings[0].friends[0].user$._id).to.be.eql(3);
            expect(users[1].siblings[0].friends[1].user$._id).to.be.eql(1);
            expect(users[1].siblings[1].friends[0].user$._id).to.be.eql(1);
            expect(users[1].siblings[1].friends[1].user$._id).to.be.eql(3);
            expect(users[2].siblings[0].friends[0].user$._id).to.be.eql(1);
            expect(users[2].siblings[0].friends[1].user$._id).to.be.eql(2);
            expect(users[2].siblings[1].friends[0].user$._id).to.be.eql(2);
            expect(users[2].siblings[1].friends[1].user$._id).to.be.eql(3);
          });
      });

      it( 'should deep populate array link links', function() {
        return User.findAll({ _id: 2 })
          .then(User.populate({ organization: $all, 'siblings.bestFriend': { $all: 1, organization: $all } }))
          .then(function(users) {
            expect(users[0].siblings[0].bestFriend$.organization$.name).to.be.eql('Acme Unlimited');
          });
      });

      it( 'should populate paths and arrays using array format', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate([ 'creator', 'permissions.members' ]).then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(User);
              expect(department.permissions.members$[0].name.first).to.be.eql('John');
              expect(department.permissions.members$[1]).to.be.an.instanceof(User);
              expect(department.permissions.members$[1].name.first).to.be.eql('Jane');
            });
          });
      });

      it( 'should populate paths and arrays using object format', function() {
        return Department.byId(1)
          .then(function(department) {
            return department.$populate({ 'permissions.members': $all }).then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(User);
              expect(department.permissions.members$[0].name.first).to.be.eql('John');
              expect(department.permissions.members$[1]).to.be.an.instanceof(User);
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

    describe('NamePath', function() {
      it('should parse arrays', () => {
        let np = new NamePath(User, 'roles._');
        expect(np.fields.length).to.eql(2);
        expect(np.fields[0].type.def.name).to.eql('array');
        expect(np.fields[1].type.def.name).to.eql('object');

        np = new NamePath(User, 'roles', true);
        expect(np.fields.length).to.eql(1);
        expect(np.fields[0].type.def.name).to.eql('object');

        np = new NamePath(User, 'roles');
        expect(np.fields.length).to.eql(1);
        expect(np.fields[0].type.def.name).to.eql('array');

        np = new NamePath(User, 'roles._.role');
        expect(np.fields.length).to.eql(3);
        expect(np.fields[0].type.def.name).to.eql('array');
        expect(np.fields[1].type.def.name).to.eql('object');
        expect(np.fields[2].type.def.name).to.eql('link');

        np = new NamePath(User, 'roles.role');
        expect(np.fields.length).to.eql(2);
        expect(np.fields[0].type.def.name).to.eql('array');
        expect(np.fields[1].type.def.name).to.eql('link');

        np = User.paths['roles._.role'].namePath;
        expect(np.fields.length).to.eql(3);
        expect(np.fields[0].type.def.name).to.eql('array');
        expect(np.fields[1].type.def.name).to.eql('object');
        expect(np.fields[2].type.def.name).to.eql('link');

        const obj = new Department({ tags: [ 'red', 'tiny' ] });

        np = Department.paths.tags.namePath;
        expect(np.get(obj)).to.eql([ 'red', 'tiny' ]);

        np = Department.parsePath('tags.1');
        expect(np.get(obj)).to.eql('tiny');
      });

      it('should parse maps', () => {
        let np = Department.paths['checkouts._'].namePath;
        expect(np.fields.length).to.eql(2);
        expect(np.fields[0].type.def.name).to.eql('object');
        expect(np.fields[1].type.def.name).to.eql('double');

        const obj = new Department({
          checkouts: {
            u002: 1.0,
            u001: 2.0
          },
          cubicles: {
            1:    { name: 'West',     size: 100 },
            3:    { name: 'East',     size: 200 },
            old3: { name: 'Old East', size: 170 }
          }
        });

        expect(np.get(obj)).to.eql([ 1.0, 2.0 ]);

        np = Department.paths['cubicles._.size'].namePath;
        expect(np.get(obj)).to.eql([ 100, 200, 170 ]);

        np = Department.parsePath('cubicles.3.size');
        expect(np.get(obj)).to.eql(200);

        np = Department.parsePath('cubicles.old3.size');
        expect(np.get(obj)).to.eql(170);
      });
    });

    describe('denormalization', function() {
      var julia,
          juliaMatch = { 'name.first': 'Julia', 'name.last': 'Doe' };

      before(function() {
        julia = new User({ _id: 2000, name: { first: 'Julia', last: 'Doe' }, organization: 1 });
        return julia.$save();
      });

      after(function() {
        return User.db.remove(juliaMatch);
      });

      it( 'denormalize on save', function() {
        return User.db.findOne(juliaMatch).then(function(doc) {
          expect(doc.organization_.name).to.be.eql('Acme Unlimited');
        });
      });

      it( 'simple denormalize pathing', function() {
        const np = new NamePath(User, 'organization_.name'),
              field = np.detail;
        expect(field.collection).to.be.eql(Tyr.byName.organization);
        expect(field.name).to.be.eql('name');
      });

      it('complex denormalize pathing', function() {
        const np = new NamePath(User, 'organization_.owner_.name.first'),
              field = np.detail;
        expect(field.collection).to.be.eql(Tyr.byName.user);
        expect(field.name).to.be.eql('first');
        expect(np.pathLabel).to.be.eql('Organization Owner Name First Name');
      });
    });

    describe('client', function() {
      it('should fromClient', function() {
        var title = 'Browsers';
        var bookObj = { title, isbn: '5614c2f00000000000000000' };
        var book = Book.fromClient(bookObj);
        expect(book).to.be.an.instanceof(Book);
        expect(book.title).to.be.eql(title);
        expect(book.isbn).to.be.an.instanceof(ObjectId);
      });

      it('should fromClient array objects', function() {
        var userObj = { _id: 1, roles: [ { role: AdministratorRoleId.toString(), active: true } ] };
        var user = User.fromClient(userObj);
        expect(user.roles[0].role).to.be.an.instanceof(ObjectId);
      });

      it('should deep fromClient', function() {
        var friendObj = { birthDate: '03-07-1969' };
        var friend = User.fromClient(friendObj, 'siblings.friends');
        expect(friend.birthDate).to.be.an.instanceof(Date);
        expect(friend).not.to.be.an.instanceof(User);
      });

      it('should allow parametric client flags', function() {
        User.findAll({ age: { $exists: true } })
          .then(function(users) {
            var clientData = User.toClient(users);
            expect(clientData[0]).ageAppropriateSecret.to.be.eql('Eats at Chipotle way to much...')
            expect(clientData[1]).ageAppropriateSecret.to.be.eql(undefined);
          })
      });

      it('should copy dynamic objects', function() {
        var userObj = { name: { firstName: 'Foo' }, bag: { abc123: 5 } };
        var user = User.fromClient(userObj);
        expect(user).to.be.an.instanceof(User);
        expect(user.bag).to.be.eql({ abc123: 5 });
      });

      it('links should fromClient by label or id', () => {
        let userObj = { job: 'Designer' };
        const user = User.fromClient(userObj);
        expect(user.job).to.be.eql(3);

        userObj = { job: 'Astronaut' };
        expect(() => User.fromClient(userObj)).to.throw(/Invalid integer/);
      });
    });

    describe('fromClientQuery', function() {
      it( 'should variation 1', function() {
        var title = 'Browsers';
        var clientQuery = {
          title,
          isbn: '5614c2f00000000000000000'
        };
        var serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.title).to.be.eql(title);
        expect(serverQuery.isbn).to.be.an.instanceof(ObjectId);
      });

      it( 'should variation 2', function() {
        var clientQuery = {
          isbn: { $in: [ '5614c2f00000000000000000', '5614c2f00000000000000001' ] }
        };
        var serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.isbn.$in.length).to.be.eql(2);
        expect(serverQuery.isbn.$in[0]).to.be.an.instanceof(ObjectId);
        expect(serverQuery.isbn.$in[1]).to.be.an.instanceof(ObjectId);
      });

      it( 'should variation 3', function() {
        var clientQuery = {
          isbn: { $ne: '5614c2f00000000000000000' },
          title: { $exists: true }
        };
        var serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.title.$exists).to.be.eql(true);
        expect(serverQuery.isbn.$ne).to.be.an.instanceof(ObjectId);
      });

      it( 'should variation 4', function() {
        var clientQuery = {
          $or: [
            { title: { $exists: true } },
            { isbn: { $in: [ '5614c2f00000000000000000' ] } }
          ]
        };
        var serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.$or[0].title.$exists).to.be.eql(true);
        expect(serverQuery.$or[1].isbn.$in.length).to.be.eql(1);
        expect(serverQuery.$or[1].isbn.$in[0]).to.be.an.instanceof(ObjectId);
      });

      it( 'should variation 5', function() {
        var clientQuery = {
          name: {
            first: { $eq: 'An' },
            last: 'Anon'
          }
        };
        var serverQuery = User.fromClientQuery(clientQuery);
        expect(serverQuery.name.first.$eq).to.be.eql('An');
        expect(serverQuery.name.last).to.be.eql('Anon');
      });
    });

    describe('insert', () => {
      it('should set _id on the inserted document', async () => {
        try {
          await Location.db.remove({});

          const l = new Location({ name: 'Test Location' });

          await l.$insert();

          expect(l._id).to.be.instanceof(ObjectId);
        } finally {
          await Location.db.remove({});
        }
      });

      it('should generate an _id if Type.generatePrimaryKeyVal() defined', async () => {
        const r = new Role();
        const newRole = await r.$insert();
        expect(newRole._id).to.be.an.instanceOf(ObjectId);
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
        var p = new User({ _id: 1000, organization: 1, department: 1, name: { first: 'Default', last: 'Employee' } });
        return p.$insert()
          .then(function(newUser) {
            expect(newUser.title).to.be.eql('Employee');
            expect(newUser.goldStars).to.be.eql(0);
          });
      });

      it('should use specified _id', function() {
        var p = new User({ _id: 200, organization: 1, department: 1, name: { first: 'New', last: 'User' }, title: 'Developer' });
        return p.$insert()
          .then(function(newUser) {
            expect(newUser._id).to.be.eql(200);
          });
      });

      it('should throw if _id already exists', function() {
        var p = new User({ _id: 200, organization: 1, department: 1, name: { first: 'New', last: 'User' }, title: 'Developer' });
        return p.$insert().should.eventually.be.rejectedWith(Error);
      });

      it('should support bulk inserts like mongo insert', function() {
        var users = [
          new User({ _id: 1001, organization: 1, department: 1, name: { first: 'First', last: 'User' }, title: 'Developer' }),
          new User({ _id: 1002, organization: 1, department: 1, name: { first: 'Second', last: 'User' }, title: 'Developer' })
        ];
        return User.insert(users)
          .then(function(newPeople) {
            expect(newPeople).to.be.instanceof(Array);
            expect(newPeople.length).to.be.eql(2);
            expect(newPeople[1].name.first).to.be.eql('Second');
          });
      });

      it('should return Document instances from insert()', async () => {
        try {
          await Location.db.remove({});

          const l = await Location.insert(new Location({ name: 'Test Location' }));
          expect(l).to.be.instanceof(Location);

          // some checks here to make sure that we're properly returning the new ObjectId
          expect(l._id).to.be.instanceof(ObjectId);

          const locs = await Location.findAll({ name: 'Test Location' });
          expect(locs.length).to.eql(1);
          expect(locs[0]._id).to.eql(l._id);
        } finally {
          await Location.db.remove({});
        }
      });
    });

    describe('$update()', function() {
      it( 'should update shallow', async () => {
        const savedUser = await User.byId(1);
        const clientUser =  { _id: 1, organization: 2 };
        const user = User.fromClient(clientUser);

        await user.$update();
        const newUser = await User.byId(1);

        await savedUser.$save();
        expect(newUser.title).to.be.eql('Developer');
      });

      it( 'should not replace', async () => {
        let dale = new User({ _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 });
        await dale.$save();
        dale = await User.byId(2001);

        delete dale.name;
        dale.age = 32;
        await dale.$update();

        dale = await User.byId(2001);

        await User.remove({ _id: 2001 });

        expect(dale.name.first).to.eql('Dale');
      });
    });

    describe('$save()', function() {
      it( 'should replace', async () => {
        let dale = new User({ _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 });
        await dale.$save();
        dale = await User.byId(2001);

        delete dale.name;
        dale.age = 32;
        await dale.$save();

        dale = await User.byId(2001);

        await User.remove({ _id: 2001 });

        expect(dale.name).to.be.undefined;
      });

      it('should set _id on new documents', async () => {
        try {
          await Location.db.remove({});

          const l = new Location({ name: 'Test Location' });

          await l.$save();

          expect(l._id).to.be.instanceof(ObjectId);
        } finally {
          await Location.db.remove({});
        }
      });
    });

    describe('update', function() {
      it( 'should update', async () => {
        await User.update({ _id: 4 }, { title: 'Software Engineer' });
        const user = await User.byId(4);
        expect(user.title).to.be.eql('Software Engineer');
      });

      it( 'should update with `options` param', async () => {
        await User.update({ _id: 4 }, { title: 'Software Engineer' }, { multi: false });
        const user = await User.byId(4);
        expect(user.title).to.be.eql('Software Engineer');
      });
    });

    describe('remove', function() {
      it( 'should remove', async () => {
        const dale = new User({ _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 });
        await dale.$save();
        await User.remove({ _id: 2001 });
        expect(await User.byId(2001)).to.be.null;
      });
    });

    describe('uids', function() {

      it( 'should support collections ids', function() {
        expect(User.id).to.eql('u00');
      });

      it( 'should support collection.isUid()', function() {
        expect(User.isUid('u001')).to.eql(true);
        expect(User.isUid('o001')).to.eql(false);
      });

      it( 'should parse', function() {
        Tyr.parseUid('u001').should.eql({
          collection: User,
          id: 1
        });
      });

      it( 'should support byUid()', function() {
        return Tyr.byUid('u001').then(function(user) {
          expect(user).to.be.an.instanceof(User);
          expect(user._id).to.be.eql(1);
        });
      });

      it( 'should support byUids()', function() {
        return Tyr.byUids(['u001']).then(function(docs) {
          expect(docs.length).to.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0]._id).to.be.eql(1);
        });
      });

      it( 'should support byUids() from multiple collections', function() {
        return Tyr.byUids(['u001', 't041', 'u003']).then(function(docs) {
          expect(docs.length).to.eql(3);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0]._id).to.be.eql(1);
          expect(docs[1]).to.be.an.instanceof(Organization);
          expect(docs[1].name).to.be.eql('Acme Unlimited');
          expect(docs[2]).to.be.an.instanceof(User);
          expect(docs[2].name.first).to.be.eql('Jane');
        });
      });

      it( 'should support byUids(), some of which are static', function() {
        return Tyr.byUids(['u001', 'j002', 'u003', 't041']).then(function(docs) {
          expect(docs.length).to.eql(4);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0]._id).to.be.eql(1);
          expect(docs[1]).to.be.an.instanceof(Job);
          expect(docs[1].name).to.be.eql('Software Lead');
          expect(docs[2]).to.be.an.instanceof(User);
          expect(docs[2].name.first).to.be.eql('Jane');
          expect(docs[3]).to.be.an.instanceof(Organization);
          expect(docs[3].name).to.be.eql('Acme Unlimited');
        });
      });
    });

    describe('validation', function() {

      it( 'should return no validation errors on a valid data', function() {
        var user = new User({ name: { first: 'Jane' }, age: 5 });

        expect(user.$validate().length).to.be.eql(0);
      });

      it( 'should return validate errors on invalid data', function() {
        var user = new User({ age: 5.1 });
        expect(user.$validate().length).to.be.eql(2);
      });
    });

    describe('timestamps', function() {
      it( 'should set updatedAt', function() {
        User.def.timestamps = true;
        User.byId(1).then(function(user) {
          user.age = 33;
          user.$update().then(function() {
            expect(user.updatedAt).to.exist;
          });
        });
      });

      it( 'should set createdAt', function() {
        User.def.timestamps = true;
        User.save({ name: { first: 'Jacob' } }).then(function(user) {
          return User.db.remove({ _id: user._id }).then(function() {
            expect(user.createdAt).to.exist;
            expect(user.updatedAt).to.exist;
          });
        });
      });

      it('should support findAndModify()', function() {
        User.def.timestamps = true;
        return User.findAndModify({ query: { _id: 2 }, update: { $set: { age: 31 }, $setOnInsert: { title: 'Uh oh' } }, new: true }).then(function(result) {
          var user = result.value;
          expect(user.age).to.be.eql(31);
          expect(user.updatedAt).to.exist;
          expect(user.title).to.not.exist;
        });
      });

      it('should support findAndModify() with defaultValues on upsert', function() {
        return User.findAndModify({ query: { _id: 1003 }, update: { $set: { age: 31 }, $setOnInsert: { name: { first: 'Bill', last: 'Gates' } } }, upsert: true, new: true }).then(function(result) {
          var user = result.value;
          expect(user.name.first).to.be.eql('Bill');
          expect(user.title).to.be.eql('Employee');
          expect(user.goldStars).to.be.eql(0);
        });
      });

      it('should support findAndModify() with complete doc replacement', function() {
        return User.findAndModify({ query: { _id: 1003 }, update: { title: 'Good Boy', goldStars: 3 }, upsert: true, new: true }).then(function(result) {
          var user = result.value;
          expect(user.name).to.not.exist;
          expect(user.goldStars).to.be.eql(3);
          expect(user.title).to.be.eql('Good Boy');
        });
      });

      it('should support findAndModify() upsert with complete doc replacement', function() {
        return User.findAndModify({ query: { _id: 1004 }, update: { age: 24 }, upsert: true, new: true }).then(function(result) {
          var user = result.value;
          expect(user.name).to.not.exist;
          expect(user.goldStars).to.be.eql(0); // defaultValue
          expect(user.age).to.be.eql(24);
          expect(user.title).to.be.eql('Employee'); // defaultValue
        });
      });

      it( 'should update the existing updatedAt in-line on $update()', async () => {
        const startAt = new Date();
        const dale = new User({ _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 });
        await dale.$save();

        const updatedAt = dale.updatedAt;

        dale.age = 32;
        await dale.$update();

        expect(dale.updatedAt).to.not.eql(updatedAt);
        expect(dale.updatedAt.getTime()).to.be.at.least(startAt.getTime());

        await User.remove({ _id: 2001 });
      });
    });

    describe('computed properties', function() {

      it( 'should support computed properties', function() {
        var user = new User({ name: { first: 'Jane', last: 'Smith' }, age: 5 });
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it( 'should work with CollectionInstance.toClient()', function() {
        var user = new User({ name: { first: 'Jane', last: 'Smith' }, age: 5 }).$toClient();
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it( 'should work with POJO toClient()', function() {
        var user = { name: { first: 'Jane', last: 'Smith' }, age: 5 };
        var clientUser = User.toClient(user);
        expect(clientUser.fullName).to.be.eql('Jane Smith');
      });
    });

    describe('methods', function() {

      it( 'should support methods', function() {
        var child = new User({ name: { first: 'Jane', last: 'Smith' }, age: 5 });
        expect(child.canDrink()).to.be.eql(false);

        var adult = new User({ name: { first: 'Jill', last: 'Smith' }, age: 32 });
        expect(adult.canDrink()).to.be.eql(true);
      });

      it( 'should work with CollectionInstance.toClient()', function() {
        var user = new User({ name: { first: 'Jane', last: 'Smith' }, age: 5 }).$toClient();
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it( 'should work with POJO toClient()', function() {
        var user = { name: { first: 'Jane', last: 'Smith' }, age: 5 };
        var clientUser = User.toClient(user);
        expect(clientUser.fullName).to.be.eql('Jane Smith');
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
          const fakeDoc = await User.fake({ seed });
          expect(fakeDoc, 'Fake document should be valid instance of user').to.be.instanceOf(User);
          fakeDoc.$validate();
        });

        it('faker: should produce same document given same seed', async () => {
          const fakeDoc1 = JSON.stringify(await User.fake({ seed }), null, 2),
                fakeDoc2 = JSON.stringify(await User.fake({ seed }), null, 2);

          expect(fakeDoc2).to.deep.equal(fakeDoc1);
        });

      });

    });

    describe('types', () => {
      it('should support Type.byName', () => {
        expect(Type.byName.integer).to.exist;
      });
    });

    describe('unit types', function() {
      it('should parse base and composite unit types', () => {
        expect(UnitType.parse('l'      ).name === 'length'   ).to.be.true;
        expect(UnitType.parse('l^2'    ).name === 'area'     ).to.be.true;
        expect(UnitType.parse('l-2*lum').name === 'luminance').to.be.true;

        expect(() => UnitType.parse('l-2*cure')).to.throw(/"cure"/);
      });

      it('should be shared and unique', () => {
        expect(UnitType.parse('l')           === UnitType.parse('l')           ).to.be.true;
        expect(UnitType.parse('l^2')         === UnitType.parse('l2')          ).to.be.true;
        expect(UnitType.parse('l2m1/s2cur1') === UnitType.parse('cur-1s-2m1l2')).to.be.true;
      });
    });

    describe('units', function() {

      it('should parse unit factors', () => {
        let u = Unit.parse('km');
        expect(u.abbreviation).to.be.eql('km');
        expect(u.factor.symbol).to.be.eql('k');

        u = Unit.parse('cm');
        expect(u.abbreviation).to.be.eql('cm');
        expect(u.factor.symbol).to.be.eql('c');

        u = Unit.parse('kibibyte');
        expect(u.abbreviation).to.be.eql('KiB');
        expect(u.factor.symbol).to.be.eql('Ki');
      });

      it('should parse simple units', () => {
        let u = Units.parse('cm');
        expect(u.cm).to.be.eql(1);

        u = Units.parse('m');
        expect(u.m).to.be.eql(1);

        expect(() => Units.parse('draculas')).to.throw(/"draculas"/);
      });

      it('should parse composite units', () => {
        let u = Units.parse('m/s^2');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        u = Units.parse('m/s2');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        u = Units.parse('N*m');
        expect(u.N).to.be.eql(1);
        expect(u.m).to.be.eql(1);

        u = Units.parse('s-2*m');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        expect(() => Units.parse('m/foo^2')).to.throw(/"foo"/);
      });

      it('should iterate', () => {
        const expected = { m: 1, s: -2 };
        _.each(Units.parse('m/s^2'), (v, k) => {
          expect(expected[k]).to.be.eql(v);
        });
      });

      it('should be shared and unique', () => {
        expect(Unit.parse('s')     === Unit.parse('s')     ).to.be.true;
        expect(Unit.parse('Mmol')  === Unit.parse('Mmol')  ).to.be.true;
        expect(Unit.parse('km')    === Unit.parse('km')    ).to.be.true;

        expect(Units.parse('m/s2') === Units.parse('s-2*m')).to.be.true;
        expect(Units.parse('N')    === Units.parse('N')    ).to.be.true;
      });

      it('should support "in" on numbers', () => {
        expect(User.paths.age.in.Yr).to.be.eql(1);
      });

      const U = Tyr.U;

      it('should support base units', () => {
        expect(U`m`  .base === U('m')).to.be.true;
        expect(U`m`  .base).to.eql({ m: 1 });
        expect(U`N`  .base).to.eql({ kg: 1, m: 1, s: -2 });
        expect(U`Pa` .base).to.eql({ kg: 1, m: -1, s: -2 });
        expect(U`J`  .base).to.eql({ kg: 1, m: 2, s: -2 });
        expect(U`W`  .base).to.eql({ kg: 1, m: 2, s: -3 });
        expect(U`V`  .base).to.eql({ kg: 1, m: 2, A: -1, s: -3 });
        expect(U`Wb` .base).to.eql({ kg: 1, m: 2, A: -1, s: -2 });
        expect(U`rad`.base).to.eql({});
      });

      it('should have types', () => {
        expect(U('m'    ).type.name).to.eql('length');
        expect(U('m2'   ).type.name).to.eql('area');
        expect(U('m3'   ).type.name).to.eql('volume');
        expect(U('cm*m' ).type.name).to.eql('area');
        expect(U('ft2'  ).type.name).to.eql('area');
        expect(U('N'    ).type.name).to.eql('force');
        expect(U('N/kg' ).type.name).to.eql('acceleration');
        expect(U('N*m'  ).type.name).to.eql('energy');
        expect(U('N*m/s').type.name).to.eql('power');
        expect(U('kC'   ).type.name).to.eql('electricCharge');
      });

      it('should support compatibility checks', () => {
        expect(U`m`.isCompatibleWith(U`ft`)).to.be.true;
        expect(U('cm*m').isCompatibleWith(U('m2'))).to.be.true;
        expect(U('kC').isCompatibleWith(U('kA*us'))).to.be.true;
        expect(U('degC').isCompatibleWith(U('m*s'))).to.be.false;
      });

      it('should support valid conversions', () => {
        const tests = [
          [  1,     'm',       100,    'cm' ],
          [  0,  'degC',        32,  'degF' ],
          [ 80,    'kg', 176.36981,    'lb' ],
          [  5,    'mi',   8.04672,    'km' ],
          [  1,    'ft',        12,    'in' ],
          [  1,    'ft',    0.3048,     'm' ],
          [  1,    'm3',   1000000,   'cm3' ],
          [  1,    'm3',     10000, 'm*cm2' ],
          [  1, 'ft*ms',     0.012,  'in*s' ],
        ];

        for (const test of tests) {
          const fromValue = test[0],
                fromUnits = U(test[1]),
                toValue   = test[2],
                toUnits   = U(test[3]);

          expect(round5(fromUnits.convert(fromValue, toUnits))).to.equal(toValue);
        }
      });

      it('should throw on invalid conversions', () => {
        const tests = [
          [  1,    'm',   'degC' ],
          [  0, 'degC', 'degF*s' ],
          [ 80,   'kg',      'm' ],
          [  5,  'm*s',   'm*s2' ],
          [  1,   'ft',    'in2' ],
        ];

        for (const test of tests) {
          const fromValue = test[0],
                fromUnits = U(test[1]),
                toUnits   = U(test[2]);

          expect(() => fromUnits.convert(fromValue, toUnits)).to.throw(/Cannot convert/);
        }
      });

      it('should support unit arithmetic', () => {
        expect(U('in').add(5, U('ft'), 1)).to.eql(17);

        expect(round5(U('in').subtract(5, U('ft'), 1))).to.eql(-7);

        expect(U('m').multiply(U('s'))).to.eql(U('m*s'));
        expect(U('km').multiply(U('m'))).to.eql(U('km*m'));
        expect(U('m/s').multiply(U('m/s'))).to.eql(U('m2/s2'));

        expect(U('m').divide(U('s'))).to.eql(U('m/s'));
        expect(U('m/s*A').divide(U('s'))).to.eql(U('m/s2*A'));

        expect(U('m').invert()).to.eql(U('m-1'));
        expect(U('m/s*A').invert()).to.eql(U('s*A/m'));
      });

      it('should support planck units', () => {
        const c  = 299792458,
              EP = 1.0,
              mP = EP, // EP == mP
              m  = U`mP`.convert(mP, U`kg`),
              E  = m*c*c;

        expect(prec5(m)).to.eql(2.1765e-8);
        expect(prec5(E)).to.eql(1.9561E9);
      });

      it('should support normals', () => {
        expect(U('m/s'       ).normal()).to.eql({ m: 1, s: -1 });
        expect(U('ft'        ).normal()).to.eql({ m: 1 });
        expect(U('ft/h'      ).normal()).to.eql({ m: 1, s: -1 });
        expect(U('ft*furlong').normal()).to.eql({ m: 2 });
        expect(U('cm*m*ft'   ).normal()).to.eql({ m: 3 });
      });

      it('should support formatting', () => {
        expect(U('m*s-1').toString()).to.eql('m/s');
        expect(U('m*s-2').toString()).to.eql('m/s2');
        expect(U('N2*m*s-1').toString()).to.eql('m1N2/s');
      });
    });

    describe('logging', function() {
      const LogLevel = Tyr.byName.tyrLogLevel;

      beforeEach(async function() {
        await Log.db.remove({});
      });

      afterEach(async function() {
        await Log.db.remove({});
      });

      it('should log simple strings', async function() {
        await Tyr.info('test');

        const logs = await Log.findAll({});
        expect(logs.length).to.be.eql(1);
        expect(logs[0].m).to.be.eql('test');
        expect(logs[0].l).to.be.eql(LogLevel.INFO._id);
      });

      it('should log objects', async function() {
        await Tyr.info({ m: 'test', e: 'http' });

        const logs = await Log.findAll({});
        expect(logs.length).to.be.eql(1);
        expect(logs[0].m).to.be.eql('test');
        expect(logs[0].l).to.be.eql(LogLevel.INFO._id);
        expect(logs[0].e).to.be.eql('http');
      });

      it('should log errors', async function() {
        await Tyr.warn('test one', new Error('test'));

        const logs = await Log.findAll({});
        expect(logs.length).to.be.eql(1);
        expect(logs[0].m).to.be.eql('test one');
        expect(logs[0].l).to.be.eql(LogLevel.WARN._id);
        expect(logs[0].st).to.match(/Error: test/);
      });

      it('should log errors, #2', async function() {
        await Tyr.info(new Error('test'));

        const logs = await Log.findAll({});
        expect(logs.length).to.be.eql(1);
        expect(logs[0].m).to.be.eql('test');
        expect(logs[0].st).to.match(/Error: test/);
      });

      it('should throw on invalid parameters', function() {
        return Tyr.info(3, 'test')
          .then(() => assert(false, 'no exception thrown'))
          .catch(err => {
            expect(err.message).to.match(/Invalid option "3"/)
          });
      });

      it('should throw on an invalid event', async function() {
        return Tyr.warn({ m: 'test', e: 'bad_event' })
          .then(() => assert(false, 'no exception thrown'))
          .catch(err => {
            expect(err.message).to.match(/Invalid event.*"bad_event"/)
          });
      });

      it('should allow events to be added', async function() {
        Tyr.Log.addEvent('myEvent', 'My Event');

        await Tyr.info({ e: 'myEvent', m: 'a test' });

        const logs = await Log.findAll({});
        expect(logs.length).to.be.eql(1);
        expect(logs[0].m).to.be.eql('a test');
        expect(logs[0].e).to.be.eql('myEvent');
      });

    });

    describe('query merging', function() {
      const merge = Tyr.query.merge,
            i1 = '111111111111111111111111',
            i2 = '222222222222222222222222',
            i3 = '333333333333333333333333',
            i4 = '444444444444444444444444';

      function testl(v1, v2, expected) {
        const merged = merge(v1, v2);
        //console.log('merged', merged);
        expect(merged).to.eql(expected);
      }

      function test(v1, v2, expected) {
        testl(v1, v2, expected);
        expect(merge(v2, v1)).to.eql(expected);
      }

      it('should merge empty queries', () => {
        test(null, null, null);
        test(null, {}, {});
        test({}, {}, {});
        test({ foo: 1 }, null, { foo: 1 });
        test({ foo: 1 }, {}, { foo: 1 });
      });

      it('should merge deep queries', () => {
        const v = { foo: [1, 2, { bar: 3 }]};
        test({}, v, v);
      });

      it('should merge queries without duplication', () => {
        expect(merge({ org: 1 }, { org: 1 })).to.eql({ org: 1 });
      });

      it('should merge non-overlapping queries', () => {
        expect(merge({ org: 1 }, { user: 1 })).to.eql({ org: 1, user: 1 });
      });

      it('should detect equal ObjectIds', () => {
        expect(merge({ org: ObjectId(i1) }, { org: ObjectId(i1) })).to.eql({ org: ObjectId(i1) });
      });

      it('should work with $eq', () => {
        test({ org: { $eq: 1 } }, { org: 1 }, { org: 1 });
        test({ org: 1 }, { org: 2 }, false);
        test({ org: 1 }, { org: { $eq: 2 } }, false);
      });

      it('should work with $ne', () => {
        test({ org: { $ne: 1 } }, { org: 1 }, false);
        test({ org: { $ne: 1 } }, { org: 2 }, { org: 2 });
        testl({ org: { $ne: 1 } }, { org: { $ne: 2 } }, { org: { $nin: [ 1, 2 ] } });
      });

      it('should work with $in', () => {
        test({ org: 1 }, { org: { $in: [1, 2] } }, { org: 1 });
        test({ org: { $in: [2, 3] } }, { org: { $in: [1, 2] } }, { org: 2 });
        test({ org: { $in: [2, 3, 4] } }, { org: { $in: [1, 2, 4] } }, { org: { $in: [2, 4] } });
        test({ org: { $in: [2] } }, { org: 3 }, false);
        test({ org: { $in: [2] } }, { org: { $eq: 3 } }, false);
        test({ org: { $in: [2] } }, { org: { $in: [3] } }, false);
      });

      it('should work with $nin', () => {
        testl({ org: { $nin: [ 1, 2 ] } }, { org: { $nin: [3, 4] } }, { org: { $nin: [1, 2, 3, 4] } });
        testl({ org: { $ne: 1, $nin: [3, 4] } }, { org: { $ne: 2 } }, { org: { $nin: [ 1, 2, 3, 4] } });
      });

      it('should work with ObjectIds and $in/$nin', () => {
        test({ org: ObjectId(i1) }, { org: { $in: [ObjectId(i1), ObjectId(i2)] } }, { org: ObjectId(i1) });
        test({ org: { $in: [ObjectId(i2), ObjectId(i3)] } }, { org: { $in: [ObjectId(i1), ObjectId(i2)] } }, { org: ObjectId(i2) });
        test({ org: { $in: [ObjectId(i2), ObjectId(i3), ObjectId(i4)] } }, { org: { $in: [ObjectId(i1), ObjectId(i2), ObjectId(i4)] } }, { org: { $in: [ObjectId(i2), ObjectId(i4)] } });
        test({ org: { $in: [ObjectId(i2)] } }, { org: ObjectId(i3) }, false);
        test({ org: { $in: [ObjectId(i2)] } }, { org: { $in: [ObjectId(i3)] } }, false);
        testl({ org: { $nin: [ObjectId(i2)] } }, { org: { $nin: [ObjectId(i3)] } }, { org: { $nin: [ ObjectId(i2), ObjectId(i3) ] } });
      });

      it('should merge compatible comparisons', () => {
        test({ count: { $ge: 1 } }, { count: { $lt: 4 } }, { count: { $ge: 1, $lt: 4 } });
      });

      it('should work with composite queries', () => {
        test({ org: { $in: [ObjectId(i2)] }, name: 'Foo' }, { org: { $in: [ObjectId(i3)] } }, false);
        test({ org: 1, name: 'Foo' }, { org: { $in: [1, 2] } }, { org: 1, name: 'Foo' });
        test({ org: { $in: [1, 2], $eq: 2 } }, { org: 2 }, { org: 2 });
      });

      it('should work with $and', () => {
        testl({ $and: [ { blog: 1 }, { org: 1 } ] }, { $and: [ { foo: 1 }, { bar: 2 } ] },
              { $and: [ { blog: 1 }, { org: 1 }, { foo: 1 }, { bar: 2 } ] });
      });

      it('should work with $or', () => {
        testl({ $or: [ { blog: 1 }, { org: 1 } ] }, { $or: [ { foo: 1 }, { bar: 2 } ] },
              { $and: [ { $or: [ { blog: 1 }, { org: 1 } ] }, { $or: [ { foo: 1  }, { bar: 2 } ] } ] });
      });

      it('should work with $or and $ands together', () => {
        testl({ $or: [ { blog: 1 }, { org: 1 } ], $and: [ { a1: 1 }, { b1: 1 } ] },
              { $or: [ { foo: 1  }, { bar: 2 } ], $and: [ { c1: 1 }            ] },
              { $and: [
                  { $or: [ { blog: 1 }, { org: 1 } ] },
                  { $or: [ { foo: 1  }, { bar: 2 } ] },
                  { a1: 1 },
                  { b1: 1 },
                  { c1: 1 },
              ] });
      });

      it('should work with nested $and/$or', () => {
        test({ $and: [ { $or: [ { blogId: { $in: [ ObjectId('56fc2aacbb4c31a277f9a454') ] } } ] }, { $and: [ { _id: { $nin: [ ObjectId('56fc2aacbb4c31a277f9a45b') ] } } ] } ] },
             {},
             { $and: [ { $or: [ { blogId: { $in: [ ObjectId('56fc2aacbb4c31a277f9a454') ] } } ] }, { $and: [ { _id: { $nin: [ ObjectId('56fc2aacbb4c31a277f9a45b') ] } } ] } ] });
      });

      it('should merge $or\'s when there are sibling clauses present', () => {
        testl(
          {
            $or: [
              {
                a: 3
              }
            ]
          },
          {
            $or: [
              {
                b: 'test'
              }
            ],
            _id: '5567f2ab387fa974fc6f3a70'
          },
          {
            $and: [
              {
                $or: [
                  {
                    a: 3
                  }
                ]
              },
              {
                $or: [
                  {
                    b: 'test'
                  }
                ]
              }
            ],
            _id: '5567f2ab387fa974fc6f3a70'
          }
        );
      });
    });

    describe('collection.links()', function() {
      it('should work with no options', () => {
        const links = User.links();
        expect(links.length).to.be.eql(11);
      });

      it('should work with incoming', () => {
        const links = User.links({ direction: 'incoming' });
        expect(links.length).to.be.eql(5);
      });

      it('should work with outgoing', () => {
        const links = User.links({ direction: 'outgoing' });
        expect(links.length).to.be.eql(6);
      });

      it('should work with relate', () => {
        let links = User.links({ relate: 'ownedBy' });
        expect(links.length).to.be.eql(1);

        links = User.links({ relate: 'associate' });
        expect(links.length).to.be.eql(10);
      });
    });

    // oid1 and oid2 are equals() but not ===
    const oid1 = new ObjectId('5567f2a6387fa9723c6f3a45'),
          oid2 = new ObjectId('5567f2a6387fa9723c6f3a45');

    describe('Tyr.cloneDeep()', function() {
      it('should handle ObjectIds', () => {
        const o = { a: 1, b: oid1 };

        expect(o).to.not.eql(_.cloneDeep(o));
        expect(o).to.eql(Tyr.cloneDeep(o));
      });
    });

    describe('$copy() and $replace()', function() {

      it('should copy and not remove existing values', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$copy({ age: 6 });

        expect(u.name.first).to.eql('Amy');
        expect(u.age).to.eql(6);
      });

      it('should copy and remove existing values when passed an array of properties', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$copy({ age: 6 }, [ 'age', 'name' ]);

        expect(u.name).to.be.undefined;
        expect(u.age).to.eql(6);
      });

      it('should handle Tyr.$all', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$copy({ age: 6 }, Tyr.$all);

        expect(u.name).to.be.undefined;
        expect(u.age).to.eql(6);
      });

      it('should handle replace', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$replace({ age: 6 });

        expect(u.name).to.be.undefined;
        expect(u.age).to.eql(6);
      });
    });

    describe('diff & patch', function() {
      const simpleObjTests = [
        [ { a: 1, b: 2 }, { a: 1 },       { b: 0 }           ],
        [ { a: 1, b: 2 }, {},             { a: 0, b: 0 }     ],
        [ { a: 1, b: 2 }, { a: 2 },       { a: [ 2 ], b: 0 } ],
        [ { a: 1, b: 2 }, { a: 2, b: 2 }, { a: [ 2 ] }       ],
        [ { a: oid1 },    { a: oid2 },    {}                 ]
      ];

      const simpleArrTests = [
        [ [],               [],           {}                             ],
        [ [1,2,3],          [1,2,4],      { 2: [4] }                     ],
        [ [1,2,3],          [1,2,3,4],    { 3: [4] }                     ],
        [ [1,2,3],          [1],          { n: 1 }                       ],
        [ [1,2,3],          [],           { n: 0 }                       ],
        [ [1,2,3],          [3,2,1],      { 0: 2, 2: 0 }                 ],
        [ [1,2,3],          [3,2,1,4],    { 0: 2, 2: 0, 3: [4] }         ],
        [ [1,2,3,4,5],      [2,3,4,5],    { 0: [1, 4], n: 4 }            ],
        [ [2,3,4,5],        [1,2,3,4,5],  { 0: [1], 1: [-1, 4] }         ],
        [ [1,2,3,4,5,6],    [1,3,4,5],    { 1: [1, 3], n: 4 }            ],
        [ [1,2,3,4,5,6],    [2,3,5,6],    { 0: [1, 2], 2: [2, 2], n: 4 } ]
      ];

      const complexObjTests = [
        [ { a: [1,2] },           { a: [2,1] },           { a: [0, { 0: 1, 1: 0 }] }       ],
        [ { a: [1,2], b: 3 },     { a: [2,1] },           { a: [0, { 0: 1, 1: 0 }], b: 0 } ],
        [ { a: [1,2] },           { a: [] },              { a: [0, { n: 0 }] }             ],
        [ { a: [1,2] },           { a: [1,2] },           {}                               ],
        [ { a: { b: 1, c: 1 } },  { a: { a: 1, b: 1 } },  { a: [1, { a: [1], c: 0 }] }     ],
        [ { a: { b: { c: 1 } } }, { a: { d: { c: 1 } } }, { a: [1,{b:0,d:[{c:1}]}] }       ],
        [ { a: { b: { c: 1 } } }, { a: { b: { d: 1 } } }, { a: [1,{b:[1,{c:0,d:[1]}]}] }   ]
      ];

      const propsObjTests = [
        [ { a: [1,2] },           { a: [2,1] },           {},                               {} ],
        [ { a: [1,2] },           { a: [2,1] },           {},                               { c: 1 } ],
        [ { a: [1,2] },           { a: [2,1] },           { a: [0, { 0: 1, 1: 0 }] },       { a: 1 } ],
        [ { a: [1,2], b: 3 },     { a: [2,1] },           { a: [0, { 0: 1, 1: 0 }] },       { a: 1 } ],
        [ { a: [1,2], b: 3 },     { a: [2,1] },           { a: [0, { 0: 1, 1: 0 }], b: 0 }, { a: 1, b: 1 } ],
        [ { a: { b: 1, c: 1 } },  { a: { a: 1, b: 1 } },  { a: [ 1, { a: [ 1 ], c: 0 } ] }, { a: 1 } ],
      ];

      it('should diff simple objects', () => {
        for (const test of simpleObjTests) {
          expect(Tyr.diff.diffObj(test[0], test[1])).to.be.eql(test[2]);
        }
      });

      it('should diff simple arrays', () => {
        for (const test of simpleArrTests) {
          expect(Tyr.diff.diffArr(test[0], test[1])).to.be.eql(test[2]);
        }
      });

      it('should diff complex objects', () => {
        for (const test of complexObjTests) {
          //console.log(JSON.stringify(diff.diffObj(test[0], test[1])));
          expect(Tyr.diff.diffObj(test[0], test[1])).to.be.eql(test[2]);
        }
      });

      it('should diff objects with selected props', () => {
        for (const test of propsObjTests) {
          expect(Tyr.diff.diffObj(test[0], test[1], test[3])).to.be.eql(test[2]);
        }
      });

      it('should patch simple objects', () => {
        for (const test of simpleObjTests) {
          const po = Tyr.cloneDeep(test[0]);
          Tyr.diff.patchObj(po, test[2]);
          expect(po).to.be.eql(test[1]);
        }
      });

      it('should patch simple arrays', () => {
        for (const test of simpleArrTests) {
          const po = Tyr.cloneDeep(test[0]);
          Tyr.diff.patchArr(po, test[2]);
          expect(po).to.be.eql(test[1]);
        }
      });

      it('should patch complex objects', () => {
        for (const test of complexObjTests) {
          const po = Tyr.cloneDeep(test[0]);
          Tyr.diff.patchObj(po, test[2]);
          expect(po).to.be.eql(test[1]);
        }
      });

      it('should support patching O_TRUNCATE_ARRAY_BY_1 with simple paths', () => {
        const u = new User({ siblings: [ { name: 'Jan' }, { name: 'Frederick' } ] });

        Tyr.diff.patchObj(u, { siblings: 1 });

        expect(u.siblings.length).to.eql(1);
      });

      it('should support patching O_TRUNCATE_ARRAY_BY_1 with composite paths', () => {
        const u = new User({ name: { first: 'Jan', suffices: [ 'Sr', 'The Awesome' ] } });

        Tyr.diff.patchObj(u, { 'name.suffices': 1 });

        expect(u.name.suffices.length).to.eql(1);
        expect(u.name.suffices[0]).to.eql('Sr');
      });
    });

    describe('historical', function() {
      it('should create _historicalFields hash', () => {
        expect(User._historicalFields.age).to.eql(User.fields.age);
      });

      it('should create preserveInitialValues()', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        historical.preserveInitialValues(User, u);
        expect(u.$orig.age).to.eql(u.age);
        expect(u.$orig.name).to.be.undefined;
      });

      it('should create snapshot()s', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        historical.preserveInitialValues(User, u);
        u.age = 6;
        historical.snapshot(User, u);
        expect(u._history[0].p).to.eql({ age: [5] });
      });

      function user1() {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        historical.preserveInitialValues(User, u);
        u.age = 6;
        historical.snapshot(User, u, { o: new Date('5-Oct-2016').getTime() });
        u.age = 7;
        historical.snapshot(User, u, { o: new Date('10-Oct-2016').getTime() });

        return u;
      }

      it('should support asOf()', () => {
        let u = user1();
        expect(u.age).to.eql(7);

        historical.asOf(User, u, new Date('8-Oct-2016').getTime());
        expect(u.age).to.eql(6);

        u = user1();
        u.$asOf(new Date('8-Oct-2015'));
        expect(u.age).to.eql(5);
      });

      it('should preserveInitialValues() automatically on records read from the db', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });
        await amy.$save();

        amy = await User.byId(2001);

        expect(amy.$orig).to.eql({ age: 36 });

        await User.remove({ _id: 2001 });
      });

      it('should _history for $save()', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined;

        amy.age = 37;

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history[0].p).to.eql({ age: [ 36 ] });

        await User.remove({ _id: 2001 });
      });

      it('should support push()', async () => {
        let startTime = new Date();

        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36, address: {} });

        await amy.$save();

        await User.push(2001, 'name.suffices', 'The Awesome');

        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined; // "name" isn't historical
        expect(amy.updatedAt.getTime()).to.be.at.least(startTime.getTime()); // but should still update timestamps

        startTime = amy.updatedAt;

        await User.push(2001, 'address.notes', 'note 1');

        amy = await User.byId(2001);

        expect(amy._history[0].p).to.eql({ 'address|notes': 1 });
        expect(amy.updatedAt.getTime()).to.be.at.least(startTime.getTime());

        amy.$asOf(new Date('2000-10-1'));

        expect(amy.address.notes.length).to.eql(0);

        await User.remove({ _id: 2001 });
      });

      it('should support pull()', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell', suffices: [ 'The Awesome', 'Sr', 'The Nice' ] },
          address: {
            notes: [ 'one', 'two', 'three' ]
          },
          age: 36
        });

        await amy.$save();

        await User.pull(2001, 'name.suffices', v => v === 'Sr');

        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined; // name isn't historical
        expect(amy.name.suffices).to.eql([ 'The Awesome', 'The Nice' ]);

        await User.pull(2001, 'address.notes', v => v === 'two');

        amy = await User.byId(2001);

        expect(amy._history.length).to.eql(1);
        expect(amy.address.notes).to.eql([ 'one', 'three' ]);
      });

      it('should support historical $update()', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });

        await amy.$save();

        amy.age = 37;

        await amy.$update();

        amy = await User.byId(2001);
        expect(amy.age).to.eql(37);
        expect(amy._history.length).to.eql(1);

        await User.remove({ _id: 2001 });
      });

      it('should support historical $update() with partial data', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });

        await amy.$save();

        amy = await User.byId(2001, { fields: { age: 1 } });
        amy.age = 37;
        expect(amy._history).to.be.undefined;
        amy.$update();

        amy = await User.byId(2001);
        expect(amy.age).to.eql(37);
        expect(amy._history.length).to.eql(1);

        await User.remove({ _id: 2001 });
      });

      it('should support author and comment', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });
        await amy.$save();

        amy = await User.byId(2001, { fields: { age: 1 } });
        amy.age = 37;
        amy.$update({ author: 'u001', comment: 'age was wrong' });

        amy = await User.byId(2001);
        expect(amy._history.length).to.eql(1);
        expect(amy._history[0].a).to.eql('u001');
        expect(amy._history[0].c).to.eql('age was wrong');

        await User.remove({ _id: 2001 });
      });

      //amy = await User.byId(2001, { fields: { _history: 0 } });

      it('should prevent $save()s on $historical documents', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, age: 36 });

        await amy.$save();
        amy = await User.byId(2001);

        amy.age = 37;

        await amy.$save();
        amy = await User.byId(2001);

        amy.$asOf(new Date('8-Oct-2015'));
        expect(amy.$historical).to.be.true;

        await expectAsyncToThrow(amy.$save(), /read-only.*historical/);
      });

      it('historical differencing should take into account nested modifications', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({ _id: 2001, name: { first: 'Amy', last: 'Tell' }, address: { street: '123 Mayberry' } });

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined;

        amy.address.street = '123 Juneberry';
        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history[0].p).to.eql({'address':[1,{'street':['123 Mayberry']}]});

        await User.remove({ _id: 2001 });
      });
    });

    if (false) {
      describe('babel transform', function() {

        try {
          let s = `function foo(uid) {
    const colId = uid.substring(0, 3);

    const col = _tyr2.default.byId[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    const strId = uid.substring(3);

    const idType = col.fields[col.def.primaryKey.field].type;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  }`;

          s = babel.transform(s).code;
        } catch (err) {
          console.log(err.stack);
        }
      });
    }
  });
});
