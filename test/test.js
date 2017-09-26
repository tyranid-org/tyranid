
import * as chai                 from 'chai';
import * as fetch                from 'node-fetch';
import * as chaiAsPromised       from 'chai-as-promised';
import * as mongodb              from 'mongodb';
import * as express              from 'express';
import * as bodyParser           from 'body-parser';
import * as _                    from 'lodash';
import * as jsdom                from 'jsdom';
import * as fs                   from 'fs';

import Tyr                       from '../src/tyranid';
import Field                     from '../src/core/field';
import Type                      from '../src/core/type';
import Unit                      from '../src/unit/unit';
import Role                      from './models/role'; // require to get extra link in prototype chain
import initModel                 from './model';

import                                './models/user';
import projection                from '../src/core/projection';
import { generateClientLibrary } from '../src/express';

import * as testEvent            from './event.test';
import * as testQuery            from './query.test';
import * as testDiff             from './diff.test';
import * as testHistorical       from './historical.test';
import * as testPopulation       from './population.test';
import * as testUnit             from './unit.test';

const jquerySource = fs.readFileSync('./node_modules/jquery/dist/jquery.min.js', 'utf-8');
const lodashSource = fs.readFileSync('./node_modules/lodash/index.js', 'utf-8');

const expressPort = 6783; // random #

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

// oidX and oidX_ are equals() but not ===
const oid1 = new ObjectId('55bb8ecff71d45b995ff8c83'),
      oid1_ = new ObjectId('55bb8ecff71d45b995ff8c83'),
      oid2  = new ObjectId('5567f2a8387fa974fc6f3a5a'),
      oid2_ = new ObjectId('5567f2a8387fa974fc6f3a5a'),
      oid3  = new ObjectId('aaa7f2a8387fa9abdc6f3ced'),
      oid3_ = new ObjectId('aaa7f2a8387fa9abdc6f3ced');

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

  describe('ObjectId utilities', () => {
    it('should support isValidObjectId()', () => {
      const tests = [
        [ 3,                          false ],
        [ new ObjectId().toString(),  true  ],
        [ '599a2e1453ceg2d33e99938c', false ],
        [ '599a2e145 ceg2d33e99938c', false ],
        [ '599a2e145ceg2d33e99938c',  false ],
        [ '599a2e1453ce22d33e99938c', true  ]
      ];

      for (const test of tests) {
        const [ value, expected ] = test;
        expect(Tyr.isValidObjectIdStr(value)).to.eql(expected);
      }
    });
  });

  describe('lodash-like methods', () => {
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

    it('should support isCompliant', () => {
      const tests = [
        [ undefined,         undefined,                true ],
        [ undefined,         null,                     false ],
        [ 2,                 2,                        true ],
        [ { group: 1 },      { group: 1 },             true ],
        [ { group: 1 },      { group: 2 },             false ],
        [ { group: 1 },      { group: 1, another: 3 }, true ],
        [ { group: 1 },      {},                       false ],
        [ { group: [1, 2] }, { group: 1 },             true ],
        [ { group: [1, 2] }, { group: [1, 2] },        true ],
        [ { group: [1, 2] }, { group: 3 },             false ],
      ];

      for (const testCase of tests) {
        expect(
          Tyr.isCompliant(testCase[0], testCase[1])
        ).to.equal(testCase[2]);

        expect(
          Tyr.isCompliant(testCase[0])(testCase[1])
        ).to.equal(testCase[2]);
      }
    });
  });

  describe('projection utilities', () => {
    it('should support projection lookups', () => {
      expect(
        projection.resolve({ default: { a: 1, b: 1 } }, 'default')
      ).to.eql(
        { a: 1, b: 1 }
      );
    });

    it('should merge projections', () => {
      expect(
        projection.resolve({ default: { a: 1, b: 1 } }, ['default', { c: 1 }])
      ).to.eql(
        { a: 1, b: 1, c: 1 }
      );
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
    var Job, Organization, Department, User, Task, Book, Location;
    //var Job2, Organization2, Department2, User2;
    var AdministratorRoleId = new ObjectId('55bb8ecff71d45b995ff8c83');
    var BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');

    before(async function() {
      // Test validate load models and byName
      await Tyr.validate({
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

      await initModel();
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
          ['fullName', 'name.first', 'name.last', 'name.suffices', 'address.street', 'address.notes', 'oldName', 'ssn', 'favoriteColor', 'ageAppropriateSecret', 'siblings.name', 'title']
        );
      });

      it('should support static methods in ES6 class defs', async function() {
        const cursor = await Role.search('Admin');
        return cursor.toArray().then(function(docs) {
          expect(docs[0].name).to.equal('Administrator');
        });
      });
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

      it('should support matching fieldsFor()', async () => {
        const fields = await User.fieldsFor({ organization: 1 });
        expect(_.values(fields).length).to.be.eql(24);
      });

      it('should support unmatching fieldsFor()', async () => {
        const fields = await User.fieldsFor({ organization: 2 });
        expect(_.values(fields).length).to.be.eql(21);
      });

      it('should set dyn fields on insert for matching objects', async () => {
        return User.insert({ _id: dynUserId, organization: 1, name: { first: 'Dynamic', last: 'Schema' }, acmeX: 999 }).then(p => {
          expect(p.acmeX).to.be.eql(999);
        });
      });

      it('should NOT set dyn fields on insert for unmatching objects', async () => {
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
        let books = await Book.find({ fields: { title: 1 }, auth: anon }).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');

        const jane = await User.findOne({ 'name.first': 'Jane' });
        books = await Book.find({ fields: { title: 1 }, auth: jane }).toArray();
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
        const books = await Book.find({ fields: { title: 1 }, auth: anon }).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');
      });

      it('should support secured find()s with a empty query / empty options argument', async function() {
        const books = await Book.find({}).toArray();
        expect(books.length).to.eql(2);
      });
    });

    describe('finding', function() {
      it('should find unwrapped objects', async function() {
        const docs = await User.db.find({'name.first': 'An'}).toArray();
        expect(docs.length).to.be.eql(1);
      });

      it('should find wrapped objects', async function() {
        const docs = await (await User.find({ query: {'name.first': 'An'} })).toArray();
        expect(docs.length).to.be.eql(1);
        expect(docs[0]).to.be.an.instanceof(User);
      });

      it('should return a cursor', async function() {
        const docs = await (await User.find()).skip(2).limit(2).sort({'name.first': -1}).toArray();
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
        return User.findAll({ query: { 'name.first': 'An' } }).then(function(docs) {
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

      it('should support predefined projections', async () => {
        const u = await User.byId(4, { fields: 'nameAndAge' });
        expect(_.keys(u).length).to.eql(3);
      });

      it('should support projection merging', async () => {
        const u = await User.byId(4, { fields: ['nameAndAge', { organization: 1 }] });
        expect(_.keys(u).length).to.eql(4);
      });

      it('should support support exclusions', async () => {
        const u = await User.findOne({
          query: { _id: 4 },
          fields: { organization: 0 }
        });
        expect(u.organization).to.be.undefined;
      });
    });

    describe('counting', () => {
      it('should support collection.count()', async () => {
        expect(await User.count({ query: { _id: { $in: [1, 2, 3, 4] } } })).to.eql(4);
      });

      it('should support the findAll count option', async () => {
        const docs = await User.findAll({
          query: { _id: { $in: [1, 2, 3, 4] } },
          limit: 1,
          count: true
        });

        expect(docs.length).to.eql(1);
        expect(docs.count).to.eql(4);
      });

      it('should not count unless requested', async () => {
        const docs = await User.findAll({
          query: { _id: { $in: [1, 2, 3, 4] } },
          limit: 1
        });

        expect(docs.length).to.eql(1);
        expect(docs.count).to.undefined;
      });
    });

    describe('exists', () => {
      it('should support collection.exists()', async () => {
        expect(await User.exists({ query: { _id: 1 } })).to.equal(true);
        expect(await User.exists({ query: { _id: 'cat' } })).to.equal(false);
      });
    });

    describe('strings', () => {
      it('should support support labelize', async () => {
        for (const test of [
          [ 'cat', 'Cat' ],
          [ 'latestProjection', 'Latest Projection' ]
        ]) {
          expect(Tyr.labelize(test[0])).to.eql(test[1]);
        }
      });

      it('should support support pluralize', async () => {
        for (const test of [
          [ 'cat', 'cats' ],
          [ 'quiz', 'quizzes' ]
        ]) {
          expect(Tyr.pluralize(test[0])).to.eql(test[1]);
        }
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
        return Book.findAll({ query: { isbn: BookIsbn }, fields: { _id: 1 } }).then(function(docs) {
          expect(docs.length).to.be.eql(1);
          expect(docs[0].title).to.not.exist;
          expect(docs[0].isbn).to.be.eql(BookIsbn);
        });
      });

      it('should not include custom primaryKey if specifically excluded', function() {
        return Book.findOne({isbn: BookIsbn}, {isbn: 0}).then(function(doc) {
          expect(doc.isbn).to.not.exist;
        });
      });

      it('should work with findAndModify `fields` param', function() {
        return Book.findAndModify({
          query: { isbn: BookIsbn },
          update: { $set: { fakeProp: 'fake' } },
          fields: { title: 1 }
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

      it('should support $cloneDeep() on instances', async function() {
        const orig  = await Book.byId(BookIsbn);
        orig.nested = { a: 1 };

        const clone = orig.$cloneDeep();
        expect(clone.$id).to.eql(BookIsbn);
        expect(clone.$model).to.equal(orig.$model);
        expect(clone).to.not.equal(orig);
        expect(clone.nested).to.eql({ a: 1 });
        expect(clone.nested).to.not.equal(orig.nested);
      });

      it('should support $id on instances', function() {
        expect(Job.byLabel('Designer').$id).to.be.eql(3);
        expect(Job.byLabel('Software Lead').$id).to.be.eql(2);
      });

      it('should support $tyr on instances', function() {
        expect(Job.byLabel('Designer').$tyr).to.be.eql(Tyr);
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
          return Book.findAll({ query: { isbn: newIsbn } }).then(function(docs) {
            expect(docs.length).to.eql(1);
            expect(docs[0].title).to.eql('Datamodeling for Dummies');
          });
        });
      });

      it('should save existing objects', function() {
        var book = new Book({ isbn: newIsbn, description: 'Lovely' });

        return book.$save().then(function() {
          return Book.findAll({ query: { isbn: newIsbn } }).then(function(docs) {
            expect(docs.length).to.eql(1);
            expect(docs[0].description).to.eql('Lovely');
            // $save should replace entire doc
            expect(docs[0].title).to.not.exist;
          });
        });
      });

      it('should save arrays', async () => {
        try {
          await Role.save([
            new Role({ name: 'A-1' }),
            new Role({ name: 'A-2' }),
            new Role({ name: 'A-3' })
          ]);

          const roles = await Role.findAll({ query: { name: /^A-/ } });

          expect(roles.length).to.eql(3);
        } finally {
          await Role.db.remove({ name: /^A-/ });
        }
      });
    });

    describe('values', function() {
      it( 'should support valuesFor()', function() {
        var userStrings = [
          'An', 'Anon', 'Bill Doe', 'Developer', 'Doe', 'Eats at Chipotle way to much...',
          'George Doe', 'Jane', 'Jill', 'Jill Doe', 'John', 'Not a fan of construction companies...',
          'Tom Doe'
        ];

        return User.valuesFor(User.fieldsBy(field => field.type.def.name === 'string')).then(function(values) {
          return values.sort();
        }).should.eventually.eql(userStrings);
      });

      it( 'should support Tyranid.valuesBy()', function() {
        var allStrings = [
          '123 Construction', 'Acme Unlimited', 'Administrator', 'An', 'Anon', 'Bill Doe', 'Developer', 'Doe', 'Eats at Chipotle way to much...', 'Engineering',
          'George Doe', 'Home Gardening 101', 'Jane', 'Jill', 'Jill Doe', 'John', 'Not a fan of construction companies...',
          'Tom Doe', 'Tyranid User Guide', 'User', 'u00'
        ];

        return Tyr.valuesBy(field => field.collection.name !== 'TyrInstance' && field.type.def.name === 'string').then(function(values) {
          return values.sort();
        }).should.eventually.eql(allStrings);
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

      it('should support set', async () => {
        const u = await User.byId(3),
              np = u.$model.paths['name.first'].namePath;

        np.set(u, 'Molly');

        expect(u.name.first).to.eql('Molly');
      });

      it('should support set with arrays', async () => {
        const u = new User({
          name: {
            first: 'Joseph',
            suffices: [ 'Dr.', 'Mr.', 'Crazy' ]
          },
          siblings: [
            { name: 'Tom Doe' },
            { name: 'Mia Doe' },
            { name: 'George Doe' }
          ]
        });

        let np = u.$model.paths['name.suffices._'].namePath;
        np.set(u, 'Super');
        expect(u.name.suffices).to.eql(['Super', 'Super', 'Super']);

        np = u.$model.paths['name.suffices'].namePath;
        np.set(u, 'Super');
        expect(u.name.suffices).to.eql('Super');

        np = u.$model.paths['siblings._.name'].namePath;
        np.set(u, 'Thor');
        expect(u.siblings).to.eql([
          { name: 'Thor' },
          { name: 'Thor' },
          { name: 'Thor' }
        ]);
      });

      it('should support relative NamePaths', async () => {
        const u = await User.byId(3);

        const nameNp = User.paths.name.namePath,
              firstNp = nameNp.parsePath('first');
        expect(firstNp.toString()).to.eql('user:name/first');

        const name = nameNp.get(u);
        expect(name.first).to.eql('Jane');

        const first = firstNp.get(name);
        expect(first).to.eql('Jane');

        firstNp.set(name, 'Janet');
        expect(nameNp.get(u).first).to.eql('Janet');
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

    testPopulation.add();

    describe('client', function() {
      it('should fromClient', function() {
        var title = 'Browsers';
        var bookObj = { title, isbn: '5614c2f00000000000000000', serial: null };
        var book = Book.fromClient(bookObj);
        expect(book).to.be.an.instanceof(Book);
        expect(book.title).to.be.eql(title);
        expect(book.isbn).to.be.an.instanceof(ObjectId);
        expect(book.serial).to.be.null;
        expect(book.description).to.not.exist;
      });

      it('should fromClient array objects', function() {
        // note we're also testing that it does fromString conversions by passing in active and duration as string
        var userObj = { _id: 1, roles: [ { role: AdministratorRoleId.toString(), active: 'true', duration: '5' } ] };
        var user = User.fromClient(userObj);
        expect(user.roles[0].role).to.be.an.instanceof(ObjectId);
        expect(user.roles[0].active).to.eql(true);
        expect(user.roles[0].duration).to.eql(5);

        userObj = { _id: 1, roles: [ { active: 1, duration: 5 } ] };
        user = User.fromClient(userObj);
        expect(user.roles[0].active).to.eql(true);
        expect(user.roles[0].duration).to.eql(5);
      });

      it('should fromClient deeply nested objects', function() {
        // note we're also testing that it does fromString conversions by passing in active and duration as string
        var userObj = {
          _id: 1,
          siblings: [
            {
              name: 'Sasha',
              friends: [
                { age: '25' }
              ],
              scores: [
                '2.3'
              ]
            }
          ]
        };

        var user = User.fromClient(userObj);
        expect(user.siblings[0].friends[0].age).to.eql(25);
        expect(user.siblings[0].scores[0]).to.eql(2.3);
      });

      it('should support fromClient collection hooks', function() {
        var bookObj = { title: 'Browsers', isbn: '5614c2f00000000000000000', serial: null };
        var book = Book.fromClient(bookObj);
        expect(book.domain).to.equal('custom');
      });

      it('should deep fromClient', function() {
        var friendObj = { birthDate: '03-07-1969' };
        var friend = User.fromClient(friendObj, 'siblings.friends');
        expect(friend.birthDate).to.be.an.instanceof(Date);
        expect(friend).not.to.be.an.instanceof(User);
      });

      it('should allow parametric client flags', function() {
        return User.findAll({
          query: { age: { $exists: true } },
          sort: { _id: 1}
        })
        .then(function(users) {
          var clientData = User.toClient(users);
          expect(clientData[1].ageAppropriateSecret).to.be.eql('Eats at Chipotle way to much...');
          expect(clientData[0].ageAppropriateSecret).to.be.eql(undefined);
        });
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
          .then(newPeople => {
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

          const locs = await Location.findAll({ query: { name: 'Test Location' } });
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

      it( 'should upsert', async () => {

        await Role.db.remove({ name: 'foo' });

        let foo = new Role({ name: 'foo' });
        await foo.$update();
        expect(foo._id).to.exist;

        foo = await Role.findOne({ name: 'foo' });

        expect(foo).to.exist;

        await Role.db.remove({ name: 'foo' });
      });
    });

    describe('byIds()', () => {
      it( 'should not be parallel by default', async () => {
        const users = await User.byIds([1, 1, 2, 99999, 1]);

        expect(users.length).to.eql(2);
      });

      it( 'should support parallel option', async () => {
        const users = await User.byIds([1, 1, 2, 99999, 1], { parallel: true });

        expect(users.length).to.eql(5);
        expect(users[0] === users[1]).to.be.true;
        expect(users[0] === users[2]).to.be.false;
        expect(users[3]).to.be.null;
        expect(users[0] === users[4]).to.be.true;
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
        await User.update({ _id: 4 }, { $set: { title: 'Software Engineer' } });
        const user = await User.byId(4);
        expect(user.title).to.be.eql('Software Engineer');
      });

      it( 'should update with `options` param', async () => {
        await User.update({ _id: 4 }, { $set: { title: 'Software Engineer' } }, { multi: false });
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

      it('should return no validation errors on a valid data', function() {
        var user = new User({ name: { first: 'Jane' }, age: 5 });

        expect(user.$validate().length).to.be.eql(0);
      });

      it('should return validate errors on invalid data', function() {
        var user = new User({ age: 5.1 });
        expect(user.$validate().length).to.be.eql(2);
      });

      it('should support Field.validate()', async () => {
        const book = new Book({ pages: 2000 });

        await Book.fields.pages.validate(book);

        book.pages = 15000;

        try {
          await Book.fields.pages.validate(book);
          throw new Error('said an invalid book was valid');
        } catch (err) {
          expect(/too big for the library/.test(err.reason)).to.eql(true);
        }
      });

      it('should validate on saves', async () => {
        const book = new Book({ pages: 15000 });

        try {
          await book.$save();
          await Book.remove({ query: { pages: 15000 } });
          throw new Error('saved an invalid book');
        } catch (err) {
          expect(/too big for the library/.test(err.reason)).to.eql(true);
        }
      });
    });

    describe('timestamps', function() {
      it( 'should set updatedAt', function() {
        User.def.timestamps = true;
        let updatedAt;
        return User.byId(1).then(function(user) {
          user.age = 33;
          user.$update().then(function() {
            expect(user.updatedAt).to.exist;
            ({ updatedAt } = user);
            user.age = 34;
            return user.$update();
          }).then(function() {
            expect(user.updatedAt).to.not.equal(updatedAt);
          });
        });
      });

      it('should set createdAt', function() {
        User.def.timestamps = true;
        return User.save({ _id: 123454321, name: { first: 'Jacob' } }).then(function(user) {
          let {createdAt, updatedAt} = user;
          expect(user.createdAt).to.exist;
          expect(user.updatedAt).to.exist;
          user.age = 99;
          return user.$update().then(function() {
            expect(user.createdAt).to.equal(createdAt);
            expect(user.updatedAt).to.not.equal(updatedAt);
            return User.db.remove({ _id: user._id });
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
        const createdAt = new Date('Jan 9 1986');
        return User.findAndModify({ query: { _id: 1003 }, update: { title: 'Good Boy', goldStars: 3, createdAt }, upsert: true, new: true }).then(function(result) {
          var user = result.value;
          expect(user.createdAt).to.be.eql(createdAt);
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

    describe('toClient', function() {
      it( 'should support call post-processing functions', () => {
        const user = new User({ name: { first: 'Jane', last: 'Smith' }, age: 5 });
        user.foo = 'bar';
        user.bar = 'foo';
        const userc = user.$toClient();

        expect(userc.foo).to.be.undefined;
        expect(userc.bar).to.eql('foo');
      });

      it( '_id should be included by default with fields', async () => {
        const user = await User.byId(4);
        const userc = user.$toClient({ fields: { name: 1 } });

        expect(_.keys(userc).length).to.eql(2);
        expect(userc._id).to.eql(4);
      });

      it( '_id should be excluded if requested', async () => {
        const user = await User.byId(4);
        const userc = user.$toClient({ fields: { _id: 0, name: 1 } });

        expect(_.keys(userc).length).to.eql(1);
        expect(userc._id).to.be.undefined;
      });

      it( 'should support conditional toClient values', () => {
        let user = new User({ _id: 222, name: { first: 'Some', last: 'User' }, ssn: '111-23-1232', favoriteColor: 'blue' });
        let userc = user.$toClient();
        expect(_.keys(userc)).to.eql(['_id', 'name', 'fullName']);

        user = new User({ _id: 222, name: { first: 'Some', last: 'User' }, ssn: '111-23-1232', favoriteColor: 'blue' });
        userc = user.$toClient({ fields: { name: 1, ssn: 1 } });
        expect(_.keys(userc)).to.eql(['_id', 'name', 'ssn']);

        user = new User({ _id: 222, name: { first: 'Some', last: 'User' }, ssn: '111-23-1232', favoriteColor: 'blue' });
        userc = user.$toClient({ fields: { name: 1, ssn: 1, favoriteColor: 1 } });
        expect(_.keys(userc)).to.eql(['_id', 'name', 'ssn', 'favoriteColor']);
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
            expect(err.message).to.match(/Invalid option "3"/);
          });
      });

      it('should throw on an invalid event', async function() {
        return Tyr.warn({ m: 'test', e: 'bad_event' })
          .then(() => assert(false, 'no exception thrown'))
          .catch(err => {
            expect(err.message).to.match(/Invalid event.*"bad_event"/);
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

    describe('collection.links()', function() {
      it('should work with no options', () => {
        const links = User.links();
        expect(links.length).to.be.eql(12);
      });

      it('should work with incoming', () => {
        const links = User.links({ direction: 'incoming' });
        expect(links.length).to.be.eql(6);
      });

      it('should work with outgoing', () => {
        const links = User.links({ direction: 'outgoing' });
        expect(links.length).to.be.eql(6);
      });

      it('should work with relate', () => {
        let links = User.links({ relate: 'ownedBy' });
        expect(links.length).to.be.eql(1);

        links = User.links({ relate: 'associate' });
        expect(links.length).to.be.eql(11);
      });
    });

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

    describe('isObject', function() {
      it('test if something is an object', () => {
        const tests = [
          [ 1,        false ],
          [ {},       true ],
          [ oid1,     false ],
          [ { a: 1 }, true ]
        ];

        for (const test of tests) {
          expect(Tyr.isObject(test[0])).to.be.eql(test[1]);
        }
      });
    });

    describe('parseBson', function() {
      it('pass through regular values but parse bson objects', () => {
        const tests = [
          [ 1,                                            1    ],
          [ { _bsontype: 'ObjectID', id: 'Ugò¨8©tüo:Z' }, oid2 ]
        ];

        for (const test of tests) {
          expect(Tyr.parseBson(test[0])).to.be.eql(test[1]);
        }
      });
    });

    describe('arraySort', function() {
      it('should take a mongo sort-style object', () => {
        const myArray = [ { b: 1 }, { b: 'alpha' }, {}, { b: 'alpha', c: 2 } ];
        Tyr.arraySort(myArray, { b: 1, c: -1 });
        expect(myArray).to.eql(
          [ {}, { b: 1 }, { b: 'alpha', c: 2 }, { b: 'alpha' } ]
        );
      });

      it('should sort heterogenous values like mongo', () => {
        const myArray = [
          { a: 1 },
          {},
          { a: 'alpha' },
          { a: { c: 'foo' } },
          { a: { a: 'bar' } },
          { a: {} },
          { a: 3 },
          { a: new Date('2016-12-1') },
          { a: null },
        ];
        Tyr.arraySort(myArray, { a: 1 });
        expect(myArray).to.eql([
          {},
          { a: null },
          { a: 1 },
          { a: 3 },
          { a: 'alpha' },
          { a: {} },
          { a: { a: 'bar' } },
          { a: { c: 'foo' } },
          { a: new Date('2016-12-1') },
        ]);
      });
    });

    describe('$slice', () => {
      it('support an empty options array', async () => {
        const u = await User.byId(3, { fields: { name: 1 } });
        expect(u.siblings).to.be.undefined;

        await u.$slice('siblings');
        expect(u.siblings.length).to.eql(2);
      });

      it('support skip and limit', async () => {
        const u = await User.byId(3, { fields: { name: 1 } });
        await u.$slice('siblings', { skip: 1, limit: 1 });
        expect(u.siblings[0]).to.be.undefined;
        expect(u.siblings[1].name).to.eql('Bill Doe');
        expect(u.siblings.length).to.eql(2);
      });

      it('support sort', async () => {
        const u = await User.byId(3, { fields: { name: 1 } });
        await u.$slice('siblings', { skip: 1, limit: 1, sort: { name: 1 } });
        expect(u.siblings[0]).to.be.undefined;
        expect(u.siblings[1].name).to.eql('Jill Doe');
        expect(u.siblings.length).to.eql(2);
      });

      it('support where', async () => {
        const u = await User.byId(3, { fields: { name: 1 } });
        await u.$slice('siblings', { where: v => v.name.startsWith('Jill') });
        expect(u.siblings[0].name).to.eql('Jill Doe');
        expect(u.siblings.length).to.eql(1);
      });

      it('support population', async () => {
        const u = await User.byId(2, { fields: { name: 1 } });

        await u.$slice('roles');
        expect(u.roles.length).to.eql(2);

        delete u.roles;
        await u.$slice('roles', { populate: { role: $all } });
        expect(u.roles.length).to.eql(2);
        expect(u.roles[0].role$.name).to.eql('Administrator');
        expect(u.roles[1].role$.name).to.eql('User');
      });
    });

    describe('references', () => {
      it('find a single reference', async () => {
        const refs = await User.references({ id: 3 });
        expect(refs.length).to.eql(4);
      });

      it('find an array of references', async () => {
        const refs = await User.references({ ids: [1, 3] });
        expect(refs.length).to.eql(5);
      });

      it('should support exclude', async () => {
        const refs = await User.references({ ids: [1, 3], exclude: Tyr.byName.organization });
        expect(refs.length).to.eql(4);
      });

      it('should support idsOnly', async () => {
        const refs = await User.references({ ids: [1, 3], idsOnly: true });
        expect(refs.length).to.eql(5);
        for (const r of refs) {
          expect(_.keys(r)).to.eql(['_id']);
        }
      });
    });

    describe('express', () => {
      const urlPrefix = 'http://localhost:' + expressPort;

      before(async done => {
        const app = express(),
              user = await User.byId(1);

        app.use(bodyParser.json());

        Tyr.connect({
          app,
          auth: (req, res, next) => {
            req.user = user; // "log in" user 1
            return next();
          },
          noClient: true
        });

        const http = app.listen(expressPort, () => {
          //console.log('Express listening on port ' + expressPort)
          done(null, db);
        });

        Tyr.connect({ http });
      });

      it('should not expose /custom route on non-express collections', async () => {
        const result = await fetch(urlPrefix + '/api/role/custom');
        expect(result.status).to.eql(404);
      });

      it('should expose socket.io', async () => {
        const result = await fetch(urlPrefix + '/socket.io/socket.io.js');
        expect(result.status).to.eql(200);
      });

      it('should support fields', async () => {
        let result = await fetch(urlPrefix + '/api/user/custom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ organization: 1 })
        });
        let json = await result.json();
        expect(_.keys(json.fields)).to.eql(['acmeY', 'custom']);

        // should also merge nested fields
        expect(_.keys(json.fields.custom.fields)).to.eql(['nested1', 'nested2']);

        expect(json.fields.custom.fields.nested1.label).to.eql('Nested 1');

        result = await fetch(urlPrefix + '/api/organization/custom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ foo: 1 })
        });

        json = await result.json();
        expect(_.keys(json.fields)).to.eql([]);
      });
    });

    /**
     *
     * tests of code generated for express route
     *
     */
    describe('Client code generation', () => {

      it('Should include all collections', async () => {
        const code = generateClientLibrary();

        await new Promise((res, rej) => {
          jsdom.env({
            html: '<div></div>',
            src: [jquerySource, lodashSource, code],
            done(err, window) {
              if (err) return rej(err);
              const window$Tyr = window.Tyr;
              window$Tyr.init();

              if (window$Tyr !== window$Tyr.Tyr) {
                throw new Error(`no named Tyr export on client`);
              }

              // TODO:  need to refactor the following so that we can run the (some of) the same tests we run
              //        on the server on the client

              // expect that the server side tyr collections
              // are all in the client side tyr
              Tyr.collections.forEach(col => {
                if (!(col.def.client === false) &&
                    !(col.def.name in window$Tyr.byName)) {
                  throw new Error(`Collection ${col.def.name} not present in client`);
                }
              });

              if (Tyr.pluralize('daisy') !== 'daisies') {
                throw new Error('Tyr.pluralize not working on client');
              }

              res();
            }
          });
        });
      });
    });

    testEvent.add();
    testQuery.add();
    testDiff.add();
    testHistorical.add();
    testUnit.add();
  });
});
