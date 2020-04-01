import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import * as jsdom from 'jsdom';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';
import initModel from './model';
import Phantom from './models/phantom.model';
import RoleModel from './models/role'; // require to get extra link in prototype chain

import * as projection from '../src/core/projection';
import { generateClientLibrary } from '../src/express';
import './models/user';

import * as testCsv from './csv.test';
import * as testDiff from './diff.test';
import * as testEvent from './event.test';
import * as testExcel from './excel.test';
import * as testExpress from './express.test';
import * as testFake from './fake.test';
import * as testFunction from './function.test';
import * as testHistorical from './historical.test';
import * as testMath from './math.test';
import * as testPath from './path.test';
import * as testPopulation from './population.test';
import * as testQuery from './query.test';
import * as testUnit from './unit.test';
import * as testUpdate from './update.test';

const Role: Tyr.RoleCollection & {
  search(q: string): mongodb.Cursor<Tyr.Role>;
} = RoleModel as any;

const jquerySource = fs.readFileSync(
  require.resolve('jquery/dist/jquery.min.js'),
  'utf-8'
);
const lodashSource = fs.readFileSync(
  require.resolve('lodash/index.js'),
  'utf-8'
);
const momentSource = fs.readFileSync(
  require.resolve('moment/moment.js'),
  'utf-8'
);

const { ObjectID: ObjectId } = mongodb;

const { $all, Log } = Tyr;

const { expect, assert } = chai;

const fakeSecure = {
  boot() {},
  query(collection: any, perm: any, auth: any) {
    const query: any = {};
    if (collection.name === 'Book') {
      if (auth && auth.name.first === 'An') {
        query.title = /Tyranid/;
      } else if (auth && auth.name.first === 'Jane') {
        return false;
      }
    } else if (collection.name === 'Widget') {
      query.SECURED = {
        perm,
        auth: auth.$uid
      };
    }

    return query;
  },
  canInsert(
    collection: Tyr.CollectionInstance,
    doc: Tyr.Document,
    perm: string,
    auth: any
  ) {
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
  oid2 = new ObjectId('5567f2a8387fa974fc6f3a5a'),
  oid2_ = new ObjectId('5567f2a8387fa974fc6f3a5a'),
  oid3 = new ObjectId('aaa7f2a8387fa9abdc6f3ced'),
  oid3_ = new ObjectId('aaa7f2a8387fa9abdc6f3ced');

describe('tyranid', () => {
  let mongoClient = null;
  before(async () => {
    mongoClient = await mongodb.MongoClient.connect(
      'mongodb://localhost:27017/tyranid_test',
      { useNewUrlParser: true }
    );
    await Tyr.config({
      mongoClient,
      consoleLogLevel: 'ERROR',
      dbLogLevel: 'TRACE',
      secure: fakeSecure,
      indexes: true,
      meta: {
        collection: {
          customMeta1: {
            client: true
          },
          customMeta2: {
            client: false
          }
        }
      }
    });

    await Tyr.db.dropDatabase();
  });

  after(() => {
    Tyr.mongoClient.close();
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  describe('ObjectId utilities', () => {
    it('should support isValidObjectId()', () => {
      const tests: [string, boolean][] = [
        ['3', false],
        [new ObjectId().toString(), true],
        ['599a2e1453ceg2d33e99938c', false],
        ['599a2e145 ceg2d33e99938c', false],
        ['599a2e145ceg2d33e99938c', false],
        ['599a2e1453ce22d33e99938c', true]
      ];

      for (const test of tests) {
        const [value, expected] = test;
        expect(Tyr.isValidObjectIdStr(value)).to.eql(expected);
      }
    });
  });

  describe('Mongo object utilities', () => {
    it('should support adaptIllegalKeyCharAndEliminateRecursion()', () => {
      const r1 = {
        foo: 1
      };

      (r1 as any).bar = r1;

      const tests = [
        [{ foo: 1 }, { foo: 1 }],
        [{ $foo: 1 }, { _$foo: 1 }],
        [{ 'foo.bar': 1 }, { 'foo:bar': 1 }],
        [r1, { foo: 1, bar: '_recurse' }],
        [
          { foo: 1, bar: r1 },
          { foo: 1, bar: { foo: 1, bar: '_recurse' } }
        ],
        [
          { $foo: 1, bar: r1 },
          { _$foo: 1, bar: { foo: 1, bar: '_recurse' } }
        ],
        [
          { foo: 1, bar: { $foo: 1 } },
          { foo: 1, bar: { _$foo: 1 } }
        ],
        [
          {
            $or: [{ title: new RegExp('foo', 'i') }, { foo: { $in: [1, 2] } }]
          },
          {
            _$or: [{ title: new RegExp('foo', 'i') }, { foo: { _$in: [1, 2] } }]
          }
        ],
        [oid1, oid1],
        [{ foo: oid1 }, { foo: oid1 }]
      ];

      for (const test of tests) {
        const [value, expected] = test;
        expect(Tyr.adaptIllegalKeyCharAndEliminateRecursion(value)).to.eql(
          expected
        );
      }
    });
  });

  describe('lodash-like methods', () => {
    it('should support isEqual with OIDs', () => {
      expect(Tyr.isEqual([oid1, oid2, oid3], [oid1_, oid2_, oid3_])).to.be.true;
    });

    it('should support indexOf with OIDs', () => {
      expect(Tyr.indexOf([oid1, oid2, oid3], oid2_)).to.eql(1);

      expect(Tyr.indexOf([oid1, oid2], oid3_)).to.eql(-1);
    });

    it('should support addToSet', () => {
      const a = [oid1, oid2];

      Tyr.addToSet(a, oid2_);

      expect(a.length).to.eql(2);

      Tyr.addToSet(a, oid3);

      expect(Tyr.isEqual(a, [oid1, oid2, oid3_])).to.be.true;
    });

    it('should support isSameId()', () => {
      type MaybeId = null | mongodb.ObjectID | string | undefined;

      const tests: [MaybeId, MaybeId, boolean][] = [
        [null, null, true],
        [oid1, null, false],
        [undefined, oid1, false],
        [oid1, oid2, false],
        [oid1, oid1_, true],
        [oid1, oid1.toString(), true],
        [oid1.toString(), oid1.toString(), true],
        [oid1.toString(), oid2.toString(), false]
      ];

      for (const test of tests) {
        expect(Tyr.isSameId(test[0], test[1])).to.equal(test[2]);
      }
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
        [undefined, undefined, true],
        [undefined, null, false],
        [2, 2, true],
        [{ group: 1 }, { group: 1 }, true],
        [{ group: 1 }, { group: 2 }, false],
        [{ group: 1 }, { group: 1, another: 3 }, true],
        [{ group: 1 }, {}, false],
        [{ group: [1, 2] }, { group: 1 }, true],
        [{ group: [1, 2] }, { group: [1, 2] }, true],
        [{ group: [1, 2] }, { group: 3 }, false]
      ];

      for (const testCase of tests) {
        expect(Tyr.isCompliant(testCase[0], testCase[1])).to.equal(testCase[2]);

        expect(Tyr.isCompliant(testCase[0])(testCase[1])).to.equal(testCase[2]);
      }
    });

    it('should support stringify', () => {
      const tests = [
        [[3, 2], '[3,2]'],
        [oid1, `"${oid1.toString()}"`],
        [{ foo: oid1, bar: 3 }, `{"foo":"${oid1.toString()}","bar":3}`]
      ];

      for (const testCase of tests) {
        expect(Tyr.stringify(testCase[0])).to.equal(testCase[1]);
      }
    });
  });

  describe('projection utilities', () => {
    it('should support projection lookups', () => {
      expect(
        projection.resolveProjection({ default: { a: 1, b: 1 } }, 'default')
      ).to.eql({ a: 1, b: 1 });
    });

    it('should merge projections', () => {
      expect(
        projection.resolveProjection({ default: { a: 1, b: 1 } }, [
          'default',
          { c: 1 }
        ])
      ).to.eql({ a: 1, b: 1, c: 1 });
    });

    it('should support $minimal projections', () => {
      expect(
        projection.resolveProjection({ $minimal: { a: 1, b: 1 } }, { c: 1 })
      ).to.eql({ a: 1, b: 1, c: 1 });
    });

    it('should support $minimal option with minimal projections', () => {
      expect(
        projection.resolveProjection(
          { $minimal: { a: 1, b: 1 } },
          { c: 1, $minimal: false }
        )
      ).to.eql({ c: 1 });

      expect(
        projection.resolveProjection(
          { $minimal: { a: 1, b: 1 } },
          { c: 1, $minimal: true }
        )
      ).to.eql({ a: 1, b: 1, c: 1 });
    });

    it('should support complex projection options', () => {
      expect(
        projection.resolveProjection({ $minimal: { a: 1 }, foo: { b: 1 } }, [
          'foo',
          { c: 1 }
        ])
      ).to.eql({ a: 1, b: 1, c: 1 });

      expect(
        projection.resolveProjection({ $minimal: { a: 1 }, foo: { b: 1 } }, [
          'foo',
          { c: 1, $minimal: false }
        ])
      ).to.eql({ b: 1, c: 1 });
    });
  });

  describe('schema validation', () => {
    afterEach(() => {
      Tyr.forget('t00');
      Tyr.forget('t01');
      Tyr.forget('t02');
    });

    it('should error if no name is provided', () => {
      expect(() => {
        new Tyr.Collection({
          id: 't00',
          fields: {
            _id: { is: 'mongoid' }
          }
        } as any); // testing invalid config
      }).to.throw();
    });

    it('should throw if the name is not a string', () => {
      expect(() => {
        new Tyr.Collection({
          id: 't00',
          name: 3 as any, // testing invalid config
          fields: {
            _id: { is: 'mongoid' }
          }
        });
      }).to.throw();
    });

    /*
     * This test is disabled because we now require a collection to have a primary key field defined.
     * Possibly this decision will be reversed if we find a use case where it is valid.
     *
    it( 'should accept a present but empty fields array', () => {
      expect(() => {
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

    it('should throw if arrays do not contain a single value', () => {
      expect(() => {
        new Tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            emptyArray: []
          }
        });
      }).to.throw();
    });

    it('should support self-referential links', () => {
      expect(() => {
        new Tyr.Collection({
          id: 't00',
          name: 'test',
          fields: {
            _id: { is: 'mongoid' },
            self: { link: 'test' }
          }
        });
      }).to.not.throw();
    });

    it('should throw if a field is missing a definition', () => {
      expect(() => {
        new Tyr.Collection({
          id: 't01',
          name: 'test1',
          fields: {
            cat: 3 as any // testing invalid config
          }
        });
      }).to.throw(/Invalid field definition/i);

      expect(() => {
        new Tyr.Collection({
          id: 't02',
          name: 'test2',
          fields: {
            cat: [3]
          }
        });
      }).to.throw(/Unknown field definition/i);
    });

    /*
       Tyranid modifies field definitions with backreferences so therefore the defs are not reusable.

       However, you can still clone definitions before passing them on to Tyranid.
     */
    it('should support re-usable bits of metadata', () => {
      expect(() => {
        const Meta = {
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

  describe('with model', () => {
    let Job: Tyr.JobCollection,
      Organization: Tyr.OrganizationCollection,
      Department: Tyr.DepartmentCollection,
      User: Tyr.UserCollection,
      Task: Tyr.TaskCollection,
      Book: Tyr.BookCollection,
      Location: Tyr.LocationCollection,
      Widget: Tyr.WidgetCollection;
    // var Job2, Organization2, Department2, User2;
    const AdministratorRoleId = new ObjectId('55bb8ecff71d45b995ff8c83');
    const BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');

    before(async () => {
      // Test validate load models and byName
      await Tyr.validate({
        glob: __dirname + '/models/**/*.js'
        // dir: __dirname + '/models',
        // note, we want fileMatch to match the "subdir" directory to test that tyranid ignores directories
        // fileMatch: '[a-z].*'
      });

      Job = Tyr.byName.job;
      Organization = Tyr.byName.organization;
      Department = Tyr.byName.department;
      User = Tyr.byName.user;
      Task = Tyr.byName.task;
      Book = Tyr.byName.book;
      Location = Tyr.byName.location;
      Widget = Tyr.byName.widget;

      await initModel();
    });

    describe('collections', () => {
      it('Tyr.byName.X and Tyr.collections.X should be equivalent', () => {
        expect(Tyr.byName.unit).to.eql(Tyr.collections.Unit);
      });
    });

    describe('fields', () => {
      it('should support fields object', () => {
        expect(User.paths['name.first']).to.be.instanceof(Tyr.Field);
        expect(User.paths['roles._.role']).to.be.instanceof(Tyr.Field);
      });

      it('should support field.type', () => {
        expect(User.paths['name.first'].type).to.be.instanceof(Tyr.Type);
        expect(User.paths['roles._.role'].type).to.be.instanceof(Tyr.Type);
      });

      it('should support field.link', () => {
        expect(User.paths['roles._.role'].link).to.be.eql(Tyr.byName.role);
      });

      it('should support field.parent', () => {
        expect(User.paths['name.first'].parent!.name).to.be.eql('name');
        expect(User.paths['name'].parent).to.be.eql(User);
      });

      it('should support field.pathLabel', () => {
        expect(User.paths['name.first'].parent!.pathLabel).to.be.eql('Name');
        expect(User.paths['name.first'].pathLabel).to.be.eql('Name First Name');
        expect(User.paths['name.last'].pathLabel).to.be.eql('Name Last');
      });

      it('should support field groups', () => {
        expect(User.fields.$strings).to.be.undefined;
        expect(User.fields.oldName).to.not.be.undefined;
        expect(User.fields.oldName.type.def.name).to.eql('string');
        expect((User.fields.oldName as any).group).to.eql('$strings');
      });
    });

    describe('maps', () => {
      it('should support "keys"', () => {
        expect(Department.paths['checkouts'].keys).to.be.instanceof(Tyr.Field);
        expect(Department.paths['checkouts'].keys!.type.name).to.eql('uid');
      });

      it('should support "of"', () => {
        expect(Department.paths['checkouts'].of).to.be.instanceof(Tyr.Field);
        expect(Department.paths['checkouts'].of!.type.name).to.eql('double');
      });
    });

    describe('optional links', () => {
      it('should prune optional links to missing collections', () => {
        expect(User.fields.lochNess).to.be.undefined;
        expect(User.paths.lochNess).to.be.undefined;
        expect(User.def.fields.lochNess).to.be.undefined;
      });
    });

    describe('schema methods', () => {
      it('should support fieldsBy()', () => {
        expect(
          User.fieldsBy(field => field.type.def.name === 'string').map(
            field => field.spath
          )
        ).to.eql([
          'fullName',
          'name.first',
          'name.last',
          'name.suffices',
          'address.street',
          'address.notes',
          'oldName',
          'ssn',
          'favoriteColor',
          'ageAppropriateSecret',
          'siblings.name',
          'title'
        ]);
      });

      it('should support static methods in ES6 class defs', async () => {
        const cursor = await Role.search('Admin');
        return cursor.toArray().then((docs: Tyr.Role[]) => {
          expect(docs[0].name).to.equal('Administrator');
        });
      });
    });

    describe('mixin schemas', () => {
      it('should support mixin()', () => {
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
        return User.db.deleteOne({ _id: dynUserId });
      });

      it('should support matching fieldsFor()', async () => {
        const fields = await User.fieldsFor({
          match: { organization: 1 },
          static: true
        });
        expect(_.values(fields).length).to.be.eql(27);
      });

      it('should support unmatching fieldsFor()', async () => {
        const fields = await User.fieldsFor({
          match: { organization: 2 },
          static: true
        });
        expect(_.values(fields).length).to.be.eql(25);
      });

      it('should set dyn fields when inserting for matching objects', async () => {
        return User.insert({
          _id: dynUserId,
          organization: 1,
          name: { first: 'Dynamic', last: 'Schema' },
          acmeX: 999
        }).then(p => {
          expect((p as any).acmeX).to.be.eql(999);
        });
      });

      it('should NOT set dyn fields on insert for unmatching objects', async () => {
        return User.insert({
          _id: dynUserId,
          organization: 2,
          name: { first: 'Not', last: 'Dynamic' },
          acmeX: 999
        }).then(p => {
          expect((p as any).acmeX).to.not.exist;
        });
      });
    });

    describe('internal schemas', () => {
      it('should show internal collections as internal', () => {
        for (const c of Tyr.collections) {
          expect(!!c.def.internal).to.eql(c.id.startsWith('_'));
        }
      });
    });

    describe('secure', () => {
      it('should add properties passed to secure.query', async () => {
        const user = await User.findOne({ query: {} });
        const secured = await Widget.secureQuery({}, 'view', user!);
        expect(secured.SECURED).to.deep.equal({
          perm: 'view',
          auth: user!.$uid
        });
      });

      it('should stop inserts when not authorized', async () => {
        const anon = await User.findOne({ query: { 'name.first': 'An' } });
        const book = new Book();
        (expect(book.$insert({ auth: anon! })).to as any).eventually.throw(
          /access denied/
        );
      });

      it('should support secured find()s', async () => {
        const anon = await User.findOne({ query: { 'name.first': 'An' } });
        let books = await (
          await Book.find({
            query: {},
            projection: { title: 1 },
            auth: anon
          })
        ).toArray();

        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');

        const jane = await User.findOne({ query: { 'name.first': 'John' } });
        books = await (
          await Book.find({
            query: {},
            projection: { title: 1 },
            auth: jane
          })
        ).toArray();
        expect(books.length).to.eql(2);
      });

      it('should support secured find()s with a single options argument', async () => {
        const anon = await User.findOne({ query: { 'name.first': 'An' } });
        const books = await (
          await Book.find({
            query: {},
            projection: { title: 1 },
            auth: anon
          })
        ).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');
      });

      it('should support secured find()s with a query and an options argument', async () => {
        const anon = await User.findOne({ query: { 'name.first': 'An' } });
        const books = await (
          await Book.find({
            query: {},
            projection: { title: 1 },
            auth: anon
          })
        ).toArray();
        expect(books.length).to.eql(1);
        expect(books[0].title).to.eql('Tyranid User Guide');
      });

      it('should support secured find()s with a empty query / empty options argument', async () => {
        const books = await (await Book.find({ query: {} })).toArray();
        expect(books.length).to.eql(2);
      });

      it('should not find() with an _id contradiction', async () => {
        const jane = await User.findOne({ query: { 'name.first': 'Jane' } });
        let books = await (
          await Book.find({
            query: {},
            auth: jane
          })
        ).toArray();
        expect(books.length).to.eql(0);

        books = await (await Book.find({ query: {} })).toArray();
        expect(books.length).to.not.eql(0);
      });

      it('should not findAll() with an _id contradiction', async () => {
        const jane = await User.findOne({ query: { 'name.first': 'Jane' } });
        let books = await Book.findAll({ query: {}, auth: jane });
        expect(books.length).to.eql(0);

        books = await Book.findAll({ query: {} });
        expect(books.length).to.not.eql(0);
      });
    });

    describe('finding', () => {
      it('should find unwrapped objects', async () => {
        const docs = await User.db.find({ 'name.first': 'An' }).toArray();
        expect(docs.length).to.be.eql(1);
      });

      it('should find wrapped objects', async () => {
        const docs = await (
          await User.find({
            query: { 'name.first': 'An' }
          })
        ).toArray();
        expect(docs.length).to.be.eql(1);
        expect(docs[0]).to.be.an.instanceof(User);
      });

      it('should return a cursor', async () => {
        const docs = await (await User.find({ query: {} }))
          .skip(2)
          .limit(2)
          .sort({ 'name.first': -1 })
          .toArray();
        expect(docs.length).to.be.eql(2);
        expect(docs[0].name.first).to.be.eql('Jane');
        expect(docs[1].name.first).to.be.eql('An');
        expect(docs[0]).to.be.an.instanceof(User);
        expect(docs[1]).to.be.an.instanceof(User);
      });

      it('should findOne()', () => {
        return User.findOne({ query: { 'name.first': 'An' } }).then(doc => {
          expect(doc).to.be.an.instanceof(User);
        });
      });

      it('should findOne() with direct ObjectId', () => {
        return Role.findOne(AdministratorRoleId).then(doc => {
          // Not instanceof check since Role is a class
          expect(doc!.$model).to.be.eql(Tyr.byName.role);
        });
      });

      it('should findOne() with direct ObjectId + projection', () => {
        return Role.findOne(AdministratorRoleId, { _id: false }).then(doc => {
          expect(doc!.$model).to.be.eql(Tyr.byName.role);
          expect(doc!._id).to.not.exist;
          expect(doc!.name).to.exist;
        });
      });

      it('should findOne() with projection', async () => {
        const doc = await User.findOne({
          query: { 'name.first': 'An' },
          projection: { name: 1 }
        });
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc)).to.eql(['_id', 'name']);
      });

      it('should findOne() with a null projection', async () => {
        const doc = await User.findOne({ query: { 'name.first': 'An' } });
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc).length).to.be.greaterThan(3);
      });

      it('should findOne() with a null projection and options, 1', async () => {
        const doc = await User.findOne({
          query: { 'name.first': 'An' },
          projection: { name: 1 }
        });
        expect(doc).to.be.an.instanceof(User);
        expect(_.keys(doc)).to.eql(['_id', 'name']);
      });

      it('should findOne() with a null projection and options, 2', async () => {
        const doc = await User.findOne({ query: { 'name.first': 'John' } });
        expect(doc).to.be.an.instanceof(User);
        expect(doc!.name!.first).to.eql('John');
        expect(_.keys(doc).length).to.be.greaterThan(3);
      });

      it('should findOne() with just options', async () => {
        const doc = await User.findOne({
          query: { 'name.first': 'An' },
          projection: { name: 1 }
        });
        expect(doc).to.be.an.instanceof(User);
      });

      it('should findAll()', () => {
        return User.findAll({ query: { 'name.first': 'An' } }).then(docs => {
          expect(docs.length).to.be.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
        });
      });

      it('should findAll() with options', () => {
        return User.findAll({
          query: { 'name.first': /^J/ },
          skip: 1,
          limit: 1
        }).then(docs => {
          expect(docs.length).to.be.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
        });
      });

      it('should findAndModify()', () => {
        return User.findAndModify({
          query: { _id: 1 },
          update: { $set: { age: 32 } },
          new: true,
          historical: false
        }).then(result => {
          const user = result!.value;
          expect(user).to.be.an.instanceof(User);
          expect(user.age).to.be.eql(32);
        });
      });

      it('should byId()', () => {
        return User.byId(1).then(doc => {
          expect(doc).to.be.an.instanceof(User);
          expect(doc!._id).to.be.eql(1);
        });
      });

      it('should byId() with string conversions', () => {
        return User.byId('1').then(doc => {
          expect(doc).to.be.an.instanceof(User);
          expect(doc!._id).to.be.eql(1);
        });
      });

      it('should byId() with custom primaryKey', () => {
        // types don't support custom primary keys yet...
        return Book.byId(BookIsbn as any).then(doc => {
          expect(doc).to.be.an.instanceof(Book);
          expect(doc!._id).to.be.eql(1);
          expect(doc!.isbn).to.be.eql(BookIsbn);
        });
      });

      it('should support predefined projections', async () => {
        const u = await User.byId(4, { projection: 'nameAndAge' });
        expect(_.keys(u).length).to.eql(3);
      });

      it('should support projection merging', async () => {
        const u = await User.byId(4, {
          projection: ['nameAndAge', { organization: 1 }]
        });
        expect(_.keys(u).length).to.eql(4);
      });

      it('should support support exclusions', async () => {
        const u = await User.findOne({
          query: { _id: 4 },
          projection: { organization: 0 }
        });
        expect(u!.organization).to.be.undefined;
      });

      it('objects returned should have an $options property', () => {
        const opts = { query: { 'name.first': 'An' } };
        return User.findOne(opts).then(doc => {
          expect(doc!.$options).to.eql(opts);
        });
      });
    });

    describe('counting', () => {
      it('should support collection.count()', async () => {
        expect(
          await User.count({ query: { _id: { $in: [1, 2, 3, 4] } } })
        ).to.eql(4);
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
      it('should support support capitalize', async () => {
        for (const test of [
          ['cat', 'Cat'],
          ['latestProjection', 'LatestProjection']
        ]) {
          expect(Tyr.capitalize(test[0])).to.eql(test[1]);
        }
      });

      it('should support support labelize', async () => {
        for (const test of [
          ['cat', 'Cat'],
          ['latestProjection', 'Latest Projection']
        ]) {
          expect(Tyr.labelize(test[0])).to.eql(test[1]);
        }
      });

      it('should support support singularize', async () => {
        for (const test of [
          ['cats', 'cat'],
          ['quizzes', 'quiz'],
          ['industries', 'industry']
        ]) {
          expect(Tyr.singularize(test[0])).to.eql(test[1]);
        }
      });
      it('should support support pluralize', async () => {
        for (const test of [
          ['cat', 'cats'],
          ['quiz', 'quizzes']
        ]) {
          expect(Tyr.pluralize(test[0])).to.eql(test[1]);
        }
      });
    });

    describe('projections', () => {
      it('should support projections returning a cursor out of find (not a promise of a cursor)', async () => {
        const docs = await User.db
          .find({ 'name.first': 'An' })
          .limit(1)
          .toArray();
        expect(docs.length).to.be.eql(1);
      });

      it('should support projections', async () => {
        const docs = await (
          await User.db.find(
            { 'name.first': 'An' },
            { projection: { name: 1 } }
          )
        ).toArray();
        expect(docs.length).to.be.eql(1);
        expect(_.keys(docs[0]).length).to.be.eql(2);
      });

      it('should return custom primaryKey if not specified in projection', () => {
        return Book.findAll({
          query: { isbn: BookIsbn },
          projection: { _id: 1 }
        }).then(docs => {
          expect(docs.length).to.be.eql(1);
          expect(docs[0].title).to.not.exist;
          expect(docs[0].isbn).to.be.eql(BookIsbn);
        });
      });

      it('should not include custom primaryKey if specifically excluded', () => {
        return Book.findOne({
          query: { isbn: BookIsbn },
          projection: { isbn: 0 }
        }).then(doc => {
          expect(doc!.isbn).to.not.exist;
        });
      });

      it('should work with findAndModify `projection` param', () => {
        return Book.findAndModify({
          query: { isbn: BookIsbn },
          update: { $set: { fakeProp: 'fake' } },
          projection: { title: 1 }
        }).then(doc => {
          expect(doc!.value.isbn).to.be.eql(BookIsbn);
        });
      });

      it('should support label projections', async () => {
        expect(User.labelProjection()).to.eql({
          fullName: 1,
          name: 1,
          'name.first': 1,
          'name.last': 1
        });
      });
    });

    describe('fields', () => {
      it('model fields should be an instanceof Field', () => {
        expect(Job.def.fields.manager instanceof Tyr.Field).to.be.eql(true);
      });

      it('model fields should have name and path fields', () => {
        expect(Job.def.fields.manager.name).to.be.eql('manager');
        expect(
          (User.def.fields!.name.def.fields!.first as Tyr.FieldDefinition<
            Tyr.User
          >).name
        ).to.be.eql('first');
        expect(
          (User.def.fields!.name.def.fields!.first as Tyr.FieldDefinition<
            Tyr.User
          >).pathName
        ).to.be.eql('name.first');
      });
    });

    describe('documents', () => {
      it('should support $clone() on instances', async () => {
        const orig = await Book.byId(BookIsbn as any),
          clone = orig!.$clone();
        expect(clone.$id).to.eql(BookIsbn);
        expect(clone.$model).to.equal(orig!.$model);
        expect(clone).to.not.equal(orig);
      });

      it('should support $cloneDeep() on instances', async () => {
        const orig = await Book.byId(BookIsbn as any);
        (orig as any).nested = { a: 1 };

        const clone = orig!.$cloneDeep();
        expect(clone.$id).to.eql(BookIsbn);
        expect(clone.$model).to.equal(orig!.$model);
        expect(clone).to.not.equal(orig);
        expect((clone as any).nested).to.eql({ a: 1 });
        expect((clone as any).nested).to.not.equal((orig as any).nested);
      });

      it('should support $id on instances', async () => {
        expect((await Job.byLabel('Designer'))!.$id).to.be.eql(3);
        expect((await Job.byLabel('Software Lead'))!.$id).to.be.eql(2);
      });

      it('should support $tyr on instances', async () => {
        expect((await Job.byLabel('Designer'))!.$tyr).to.be.eql(Tyr);
      });

      it('should support $uid on instances', async () => {
        expect((await Job.byLabel('Designer'))!.$uid).to.be.eql('j003');
        expect((await Job.byLabel('Software Lead'))!.$uid).to.be.eql('j002');
      });
    });

    describe('labels', () => {
      it('should byLabel() on static collections', async () => {
        expect((await Job.byLabel('Designer'))!._id).to.be.eql(3);
        expect((await Job.byLabel('Software Lead'))!._id).to.be.eql(2);
      });

      it('should byLabel() on mongo collections', () => {
        return Organization.byLabel('Acme Unlimited').then(row => {
          expect(row!.name).to.be.eql('Acme Unlimited');
        });
      });

      it('should fail byLabel() on mongo collections on bad data', () => {
        return Organization.byLabel('Acme Unlimitedx').then(row => {
          expect(row).to.be.eql(null);
        });
      });

      it('should support $label on instances', async () => {
        expect((await Job.byLabel('Designer'))!.$label).to.be.eql('Designer');
        expect((await Job.byLabel('Software Lead'))!.$label).to.be.eql(
          'Software Lead'
        );
      });

      it('should support idToLabel on static collections both async and non-async', async () => {
        expect(Job.idToLabel(3)).to.be.eql('Designer');
        expect(Job.idToLabel(undefined)).to.be.eql('');
        expect(await Job.idToLabel(3)).to.be.eql('Designer');
      });

      it('should support idToLabel on non-static collections both async and non-async', async () => {
        expect(await Organization.idToLabel(1)).to.be.eql('Acme Unlimited');
        expect(await Organization.idToLabel(null)).to.be.eql('');
        expect(await User.idToLabel(1)).to.be.eql('An Anon');
      });

      it('should support labelify on fields', async () => {
        const user = new User({ job: 3 });
        expect(await User.paths.job.labelify(3)).to.be.eql('Designer');
      });

      it('should support label on collections', () => {
        expect(Job.label).to.be.eql('Job');
        expect(Task.label).to.be.eql('Issue');
      });

      it('should support label on fields', () => {
        expect(Job.def.fields.manager.label).to.be.eql('Manager');
        expect(Task.def.fields.assigneeUid.label).to.be.eql('Assignee UID');
        expect(User.def.fields.birthDate.label).to.be.eql('Dyn Birth Date');
      });

      it('should support labels()', async () => {
        const labels = await User.labels('John');

        expect(labels.length).to.eql(1);
        expect(labels[0].$label).to.eql('John Doe');
      });

      it('should support UID labels()', async () => {
        const task = new Task();
        const labels = await Task.fields.assigneeUid.labels(task, 'e');

        expect(labels.length).to.eql(4);
        expect(labels.map(l => l.$label).join()).to.eql(
          'Jane Doe,Jill Doe,John Doe,Engineering'
        );
      });
    });

    describe('saving', () => {
      const newIsbn = new ObjectId('561cabf00000000000000000');

      after(() => {
        return Book.db.deleteOne({ isbn: newIsbn });
      });

      it('should save new objects', () => {
        const book = new Book({
          isbn: newIsbn,
          title: 'Datamodeling for Dummies'
        });

        return book.$save().then(() => {
          return Book.findAll({ query: { isbn: newIsbn } }).then(docs => {
            expect(docs.length).to.eql(1);
            expect(docs[0].title).to.eql('Datamodeling for Dummies');
          });
        });
      });

      it('objects returned by save() should have their _id set', async () => {
        const loc = new Location({ name: 'Disneyland' });

        await loc.$save();

        expect(loc._id).to.not.be.undefined;

        await loc.$remove();
      });

      it('should save existing objects', () => {
        const book = new Book({ isbn: newIsbn, description: 'Lovely' });

        return book.$save().then(() => {
          return Book.findAll({ query: { isbn: newIsbn } }).then(docs => {
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
          await Role.db.deleteMany({ name: /^A-/ });
        }
      });
    });

    describe('values', () => {
      it('should support valuesFor()', () => {
        const userStrings = [
          'An',
          'An Anon',
          'Anon',
          'Bill Doe',
          'Developer',
          'Doe',
          'Eats at Chipotle way to much...',
          'Employee',
          'George Doe',
          'Jane',
          'Jane Doe',
          'Jill',
          'Jill Doe',
          'John',
          'John Doe',
          'Not a fan of construction companies...',
          'Tom Doe'
        ];

        return (User.valuesFor(
          User.fieldsBy(field => field.type.def.name === 'string')
        ).then(values => {
          return values.sort();
        }).should as any).eventually.eql(userStrings);
      });

      it('should support Tyranid.valuesBy()', () => {
        const allStrings = [
          '123 Construction',
          'Acme Unlimited',
          'Administrator',
          'An',
          'An Anon',
          'Anon',
          'Bill Doe',
          'Developer',
          'Doe',
          'Eats at Chipotle way to much...',
          'Employee',
          'Engineering',
          'George Doe',
          'Home Gardening 101',
          'Jane',
          'Jane Doe',
          'Jill',
          'Jill Doe',
          'John',
          'John Doe',
          'Not a fan of construction companies...',
          'Sundae',
          'Tom Doe',
          'Toxulin',
          'Tyranid User Guide',
          'User',
          'food',
          'toxic'
        ];

        return (Tyr.valuesBy(
          field =>
            !field.collection.name.startsWith('Tyr') &&
            !field.collection.name.startsWith('Unit') &&
            field.type.def.name === 'string'
        ).then(values => {
          return values.sort();
        }).should as any).eventually.eql(allStrings);
      });
    });

    describe('static data', () => {
      it('should contain instances of the enumeration class', () => {
        expect(Job.def.values!.length).to.eql(3);
      });

      it('should contain upper-undescore static names when a label is present', () => {
        expect(Job.SOFTWARE_LEAD._id).to.be.eql(2);
      });

      it('should support static data methods', () => {
        expect((Job.SOFTWARE_LEAD as any).isSoftware()).to.be.eql(true);
        expect((Job.DESIGNER as any).isSoftware()).to.be.eql(false);
      });

      it('it should support lookups by label in string data', () => {
        expect((Tyr.byName.unit.byLabel('dram') as any).system.name).to.be.eql(
          'english'
        );
        expect((Tyr.byName.unit.byLabel('meter') as any).system.name).to.be.eql(
          'metric'
        );
      });
    });

    describe('denormalization', () => {
      let julia: Tyr.User;
      const juliaMatch = { 'name.first': 'Julia', 'name.last': 'Doe' };

      before(() => {
        julia = new User({
          _id: 2000,
          name: { first: 'Julia', last: 'Doe' },
          organization: 1
        });
        return julia.$save();
      });

      after(() => {
        return User.db.deleteMany(juliaMatch);
      });

      it('denormalize on save', () => {
        return User.db.findOne(juliaMatch).then(doc => {
          expect(doc.organization_.name).to.be.eql('Acme Unlimited');
        });
      });
    });

    testPopulation.add();

    describe('client', () => {
      it('should fromClient', async () => {
        const title = 'Browsers';
        const bookObj = {
          title,
          isbn: '5614c2f00000000000000000',
          serial: null
        };
        const book = await Book.fromClient(bookObj);
        expect(book).to.be.an.instanceof(Book);
        expect(book.title).to.be.eql(title);
        expect(book.isbn).to.be.an.instanceof(ObjectId);
        expect(book.serial).to.be.null;
        expect(book.description).to.not.exist;
      });

      it('should fromClient array objects', async () => {
        // note we're also testing that it does fromString conversions by passing in active and duration as string
        let userObj: any = {
          _id: 1,
          roles: [
            {
              role: AdministratorRoleId.toString(),
              active: 'true',
              duration: '5'
            }
          ]
        };
        let user = await User.fromClient(userObj);
        expect(user.roles![0].role).to.be.an.instanceof(ObjectId);
        expect(user.roles![0].active).to.eql(true);
        expect(user.roles![0].duration).to.eql(5);

        userObj = { _id: 1, roles: [{ active: 1, duration: 5 }] };
        user = await User.fromClient(userObj);
        expect(user.roles![0].active).to.eql(true);
        expect(user.roles![0].duration).to.eql(5);
      });

      it('should fromClient deeply nested objects', async () => {
        // note we're also testing that it does fromString conversions by passing in active and duration as string
        const userObj = {
          _id: 1,
          siblings: [
            {
              name: 'Sasha',
              friends: [{ age: '25' }],
              scores: ['2.3']
            }
          ]
        };

        const user = await User.fromClient(userObj);
        expect(user.siblings![0].friends![0].age).to.eql(25);
        expect(user.siblings![0].scores![0]).to.eql(2.3);
      });

      it('should support fromClient collection hooks', async () => {
        const bookObj = {
          title: 'Browsers',
          isbn: '5614c2f00000000000000000',
          serial: null
        };
        const book = await Book.fromClient(bookObj);
        expect(book.domain).to.equal('custom');
      });

      it('should deep fromClient', async () => {
        const friendObj = { birthDate: '03-07-1969' };
        const friend = await User.fromClient(friendObj, 'siblings.friends');
        expect(friend.birthDate).to.be.an.instanceof(Date);
        expect(friend).not.to.be.an.instanceof(User);
      });

      it('should allow parametric client flags', () => {
        return User.findAll({
          query: { age: { $exists: true } },
          sort: { _id: 1 }
        }).then(users => {
          const clientData = User.toClient(users);
          expect(clientData[1].ageAppropriateSecret).to.be.eql(
            'Eats at Chipotle way to much...'
          );
          expect(clientData[0].ageAppropriateSecret).to.be.eql(undefined);
        });
      });

      it('should copy dynamic objects', async () => {
        const userObj = { name: { firstName: 'Foo' }, bag: { abc123: 5 } };
        const user = await User.fromClient(userObj);
        expect(user).to.be.an.instanceof(User);
        expect(user.bag).to.be.eql({ abc123: 5 });
      });

      it('links should fromClient by label or id', async () => {
        let userObj = { job: 'Designer' };
        const user = await User.fromClient(userObj);
        expect(user.job).to.be.eql(3);

        userObj = { job: 'Astronaut' };
        try {
          await User.fromClient(userObj);
          throw new Error('expected error to be thrown');
        } catch (err) {
          expect(/Invalid integer/.test(err.message)).to.eql(true);
        }
      });
    });

    describe('insert', () => {
      it('should set _id on the inserted document', async () => {
        try {
          await Location.db.deleteMany({});

          const l = new Location({ name: 'Test Location' });

          await l.$insert();

          expect(l._id).to.be.instanceof(ObjectId);
        } finally {
          await Location.db.deleteMany({});
        }
      });

      it('should generate an _id if Type.generatePrimaryKeyVal() defined', async () => {
        const r = new Role();
        const newRole = await r.$insert();
        expect(newRole._id).to.be.an.instanceOf(ObjectId);
      });

      it('should generate a custom primaryKey if Type.generatePrimaryKeyVal() defined', () => {
        const b = new Book();
        return b.$insert().then(newBook => {
          expect(newBook.isbn).to.be.an.instanceOf(ObjectId);
          expect(newBook._id).to.eql(newBook.isbn);
        });
      });

      it('should support defaultValues', () => {
        const p = new User({
          _id: 1000,
          organization: 1,
          department: 1,
          name: { first: 'Default', last: 'Employee' }
        });
        return p.$insert().then(newUser => {
          expect(newUser.title).to.be.eql('Employee');
          expect(newUser.goldStars).to.be.eql(0);
        });
      });

      it('should use specified _id', () => {
        const p = new User({
          _id: 200,
          organization: 1,
          department: 1,
          name: { first: 'New', last: 'User' },
          title: 'Developer'
        });
        return p.$insert().then(newUser => {
          expect(newUser._id).to.be.eql(200);
        });
      });

      it('should throw if _id already exists', () => {
        const p = new User({
          _id: 200,
          organization: 1,
          department: 1,
          name: { first: 'New', last: 'User' },
          title: 'Developer'
        });
        return (p.$insert().should as any).eventually.be.rejectedWith(Error);
      });

      it('should support bulk inserts like mongo insert', () => {
        const users = [
          new User({
            _id: 1001,
            organization: 1,
            department: 1,
            name: { first: 'First', last: 'User' },
            title: 'Developer'
          }),
          new User({
            _id: 1002,
            organization: 1,
            department: 1,
            name: { first: 'Second', last: 'User' },
            title: 'Developer'
          })
        ];
        return User.insert(users).then(newPeople => {
          expect(newPeople).to.be.instanceof(Array);
          expect(newPeople.length).to.be.eql(2);
          expect(newPeople[1].name.first).to.be.eql('Second');
        });
      });

      it('should not error when bulk inserting empty array', () => {
        return User.insert([]).then(newPeople => {
          expect(newPeople).to.be.instanceof(Array);
          expect(newPeople.length).to.be.eql(0);
        });
      });

      it('should return Document instances from insert()', async () => {
        try {
          await Location.db.deleteMany({});

          const l = await Location.insert(
            new Location({ name: 'Test Location' })
          );
          expect(l).to.be.instanceof(Location);

          // some checks here to make sure that we're properly returning the new ObjectId
          expect(l._id).to.be.instanceof(ObjectId);

          const locs = await Location.findAll({
            query: { name: 'Test Location' }
          });
          expect(locs.length).to.eql(1);
          expect(locs[0]._id).to.eql(l._id);
        } finally {
          await Location.db.deleteMany({});
        }
      });

      /*
      it('should insert quickly', async () => {
        const start = Date.now();
        try {
          const promises = [];
          for (let i=0; i<250; i++) {
            promises.push(Location.insertOne({ name: 'test 83272' }));
          }
          await Promise.all(promises);

          expect(Date.now() - start).is.lessThan(1000);
        } finally {
          await Location.deleteOne({ query: { name: 'test 83272' } });
        }
      });
      */
    });

    describe('$update()', () => {
      it('should update shallow', async () => {
        const savedUser = await User.byId(1);
        const clientUser = { _id: 1, organization: 2 };
        const user = await User.fromClient(clientUser);

        await user.$update();
        const newUser = await User.byId(1);

        await savedUser!.$save();
        expect(newUser!.title).to.be.eql('Developer');
      });

      it('should not replace', async () => {
        let dale = new User({
          _id: 2001,
          name: { first: 'Dale', last: 'Doe' },
          organization: 1
        });
        await dale.$save();
        dale = (await User.byId(2001))!;

        delete dale.name;
        dale.age = 32;
        await dale.$update();

        dale = (await User.byId(2001))!;

        await User.remove({ query: { _id: 2001 } });

        expect(dale.name.first).to.eql('Dale');
      });

      it('should upsert', async () => {
        await Role.db.deleteOne({ name: 'foo' });

        let foo = new Role({ name: 'foo' });
        await foo.$update({ upsert: true });
        expect(foo._id).to.exist;

        foo = (await Role.findOne({ query: { name: 'foo' } }))!;

        expect(foo).to.exist;

        await Role.db.deleteOne({ name: 'foo' });
      });
    });

    describe('byIds()', () => {
      it('should not be parallel by default', async () => {
        const users = await User.byIds([1, 1, 2, 99999, 1]);

        expect(users.length).to.eql(2);
      });

      it('should support parallel option', async () => {
        const users = await User.byIds([1, 1, 2, 99999, 1], { parallel: true });

        expect(users.length).to.eql(5);
        expect(users[0] === users[1]).to.be.true;
        expect(users[0] === users[2]).to.be.false;
        expect(users[3]).to.be.null;
        expect(users[0] === users[4]).to.be.true;
      });
    });

    describe('$save()', () => {
      it('should replace', async () => {
        let dale = new User({
          _id: 2001,
          name: { first: 'Dale', last: 'Doe' },
          organization: 1
        });
        await dale.$save();
        dale = (await User.byId(2001))!;

        delete dale.name;
        dale.age = 32;
        await dale.$save();

        dale = (await User.byId(2001))!;

        await User.remove({ query: { _id: 2001 } });

        expect(dale.name).to.be.undefined;
      });

      it('should set _id on new documents', async () => {
        try {
          await Location.db.deleteMany({});

          const l = new Location({ name: 'Test Location' });

          await l.$save();

          expect(l._id).to.be.instanceof(ObjectId);
        } finally {
          await Location.db.deleteMany({});
        }
      });
    });

    describe('update', () => {
      it('should update', async () => {
        await User.update({
          query: { _id: 4 },
          update: { $set: { title: 'Software Engineer' } }
        });
        const user = await User.byId(4);
        expect(user!.title).to.be.eql('Software Engineer');
      });

      it('should update with `options` param', async () => {
        await User.update({
          query: { _id: 4 },
          update: { $set: { title: 'Software Engineer' } },
          multi: false
        });
        const user = await User.byId(4);
        expect(user!.title).to.be.eql('Software Engineer');
      });
    });

    describe('remove', () => {
      it('should remove', async () => {
        const dale = new User({
          _id: 2001,
          name: { first: 'Dale', last: 'Doe' },
          organization: 1
        });
        await dale.$save();
        await User.remove({ query: { _id: 2001 } });
        expect(await User.byId(2001)).to.be.null;
      });
    });

    describe('uids', () => {
      it('should support collections ids', () => {
        expect(User.id).to.eql('u00');
      });

      it('should support collection.isUid()', () => {
        expect(User.isUid('u001')).to.eql(true);
        expect(User.isUid('o001')).to.eql(false);
      });

      it('should parse', () => {
        Tyr.parseUid('u001').should.eql({
          collection: User,
          id: 1
        });
      });

      it('should support byUid()', () => {
        return Tyr.byUid('u001').then(user => {
          expect(user).to.be.an.instanceof(User);
          expect(user!.$id).to.be.eql(1);
        });
      });

      it('should support byUids()', () => {
        return Tyr.byUids(['u001']).then(docs => {
          expect(docs.length).to.eql(1);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0].$id).to.be.eql(1);
        });
      });

      it('should support byUids() from multiple collections', () => {
        return Tyr.byUids(['u001', 't041', 'u003']).then(docs => {
          expect(docs.length).to.eql(3);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0].$id).to.be.eql(1);
          expect(docs[1]).to.be.an.instanceof(Organization);
          expect((docs[1] as any).name).to.be.eql('Acme Unlimited');
          expect(docs[2]).to.be.an.instanceof(User);
          expect((docs[2] as any).name.first).to.be.eql('Jane');
        });
      });

      it('should support byUids(), some of which are static', () => {
        return Tyr.byUids(['u001', 'j002', 'u003', 't041']).then(docs => {
          expect(docs.length).to.eql(4);
          expect(docs[0]).to.be.an.instanceof(User);
          expect(docs[0].$id).to.be.eql(1);
          expect(docs[1]).to.be.an.instanceof(Job);
          expect((docs[1] as any).name).to.be.eql('Software Lead');
          expect(docs[2]).to.be.an.instanceof(User);
          expect((docs[2] as any).name.first).to.be.eql('Jane');
          expect(docs[3]).to.be.an.instanceof(Organization);
          expect((docs[3] as any).name).to.be.eql('Acme Unlimited');
        });
      });
    });

    describe('validation', () => {
      it('should return no validation errors on a valid data', () => {
        const user = new User({ name: { first: 'Jane' }, age: 5 });

        expect(user.$validate().length).to.be.eql(0);
      });

      it('should return validate errors on invalid data', () => {
        const user = new User({ age: 5.1 });
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
          expect(/too big for the library/.test(err.message)).to.eql(true);
        }
      });

      it('should validate on saves', async () => {
        const book = new Book({ pages: 15000 });

        try {
          await book.$save();
          await Book.remove({ query: { pages: 15000 } });
          throw new Error('saved an invalid book');
        } catch (err) {
          expect(/too big for the library/.test(err.message)).to.eql(true);
        }
      });
    });

    describe('timestamps', () => {
      it('should set updatedAt', () => {
        User.def.timestamps = true;
        let updatedAt: number;
        return User.byId(1).then(user => {
          user!.age = 33;
          user!
            .$update()
            .then(() => {
              expect((user as any).updatedAt).to.exist;
              ({ updatedAt } = user as any);
              user!.age = 34;
              return user!.$update();
            })
            .then(() => {
              expect((user as any).updatedAt).to.not.equal(updatedAt);
            });
        });
      });

      it('should set createdAt', () => {
        User.def.timestamps = true;
        return User.save({ _id: 123454321, name: { first: 'Jacob' } }).then(
          user => {
            const { createdAt, updatedAt } = user as any;
            expect(user.createdAt).to.exist;
            expect((user as any).updatedAt).to.exist;
            user.age = 99;
            return user.$update().then(() => {
              expect(user.createdAt).to.equal(createdAt);
              expect((user as any).updatedAt).to.not.equal(updatedAt);
              return User.db.deleteOne({ _id: user._id });
            });
          }
        );
      });

      it('should support findAndModify()', () => {
        User.def.timestamps = true;
        return User.findAndModify({
          query: { _id: 2 },
          update: { $set: { age: 31 }, $setOnInsert: { title: 'Uh oh' } },
          new: true
        }).then(result => {
          const user = result!.value;
          expect(user.age).to.be.eql(31);
          expect((user as any).updatedAt).to.exist;
          expect(user.title).to.eql('Employee');
        });
      });

      it('should support findAndModify() with defaultValues on upsert', () => {
        return User.findAndModify({
          query: { _id: 1003 },
          update: {
            $set: { age: 31 },
            $setOnInsert: { name: { first: 'Bill', last: 'Gates' } }
          },
          upsert: true,
          new: true
        }).then(result => {
          const user = result!.value;
          expect(user.name.first).to.be.eql('Bill');
          expect(user.title).to.be.eql('Employee');
          expect(user.goldStars).to.be.eql(0);
        });
      });

      it('should support findAndModify() with complete doc replacement', async () => {
        const createdAt = new Date('Jan 9 1986');
        const result = await User.findAndModify({
          query: { _id: 1003 },
          update: { title: 'Good Boy', goldStars: 3, createdAt },
          upsert: true,
          new: true
        });

        const user = result!.value;
        expect(user.createdAt).to.be.eql(createdAt);
        expect(user.name).to.not.exist;
        expect(user.goldStars).to.be.eql(3);
        expect(user.title).to.be.eql('Good Boy');
      });

      it('should support findAndModify() upsert with complete doc replacement', () => {
        return User.findAndModify({
          query: { _id: 1004 },
          update: { age: 24 },
          upsert: true,
          new: true
        }).then(result => {
          const user = result!.value;
          expect(user.name).to.not.exist;
          expect(user.goldStars).to.be.eql(0); // defaultValue
          expect(user.age).to.be.eql(24);
          expect(user.title).to.be.eql('Employee'); // defaultValue
        });
      });

      it('should update the existing updatedAt in-line on $update()', async () => {
        const startAt = new Date();
        const dale = new User({
          _id: 2001,
          name: { first: 'Dale', last: 'Doe' },
          organization: 1
        });
        await dale.$save();

        const updatedAt = (dale as any).updatedAt;

        await Tyr.sleep(3);

        dale.age = 32;
        await dale.$update();

        expect((dale as any).updatedAt).to.not.eql(updatedAt);
        expect((dale as any).updatedAt.getTime()).to.be.at.least(
          startAt.getTime()
        );

        await User.remove({ query: { _id: 2001 } });
      });

      it('save() with timestamps set to false should not update timestamps', async () => {
        const updatedAt = new Date('2017-01-01');
        await User.db.insertOne({
          _id: 2001,
          name: { first: 'Dale', last: 'Doe' },
          organization: 1,
          updatedAt
        });

        let dale = await User.byId(2001);

        await dale!.$update({ query: { organization: 2 }, timestamps: false });

        dale = await User.byId(2001);
        expect((dale as any).updatedAt).to.eql(updatedAt);

        await User.save(
          { _id: 2001, name: { first: 'Dale', last: 'Doe' }, organization: 1 },
          { timestamps: false }
        );

        dale = await User.byId(2001);

        expect((dale as any).updatedAt).to.eql(undefined); // undefined because save() replaces

        await User.remove({ query: { _id: 2001 } });
      });
    });

    describe('toClient', () => {
      it('should support passing undefined / null to toClient()', () => {
        expect(User.toClient(undefined)).to.eql(undefined);
        expect(User.toClient(null)).to.eql(null);
      });

      it('should support call post-processing functions', () => {
        const user = new User({
          name: { first: 'Jane', last: 'Smith' },
          age: 5
        });
        (user as any).foo = 'bar';
        (user as any).bar = 'foo';
        const userc = user.$toClient();

        expect(userc.foo).to.be.undefined;
        expect(userc.bar).to.eql('foo');
      });

      it('_id should be included by default with fields', async () => {
        const user = await User.byId(4);
        const userc = user!.$toClient({ projection: { name: 1 } });

        expect(_.keys(userc).length).to.eql(2);
        expect(userc._id).to.eql(4);
      });

      it('_id should be excluded if requested', async () => {
        const user = await User.byId(4);
        const userc = user!.$toClient({ projection: { _id: 0, name: 1 } });

        expect(_.keys(userc).length).to.eql(1);
        expect(userc._id).to.be.undefined;
      });

      it('_history should be excluded by default', async () => {
        const user = await User.byId(4);
        (user as any)._history = [];
        let userc = user!.$toClient();

        expect(userc._history).to.be.undefined;

        userc = user!.$toClient({ projection: { _history: true } });
        expect(userc._history).to.not.be.undefined;
      });

      it('should support conditional toClient values', () => {
        let user = new User({
          _id: 222,
          name: { first: 'Some', last: 'User' },
          ssn: '111-23-1232',
          favoriteColor: 'blue'
        });
        let userc = user.$toClient();
        expect(_.keys(userc)).to.eql(['_id', 'name', 'fullName']);

        user = new User({
          _id: 222,
          name: { first: 'Some', last: 'User' },
          ssn: '111-23-1232',
          favoriteColor: 'blue'
        });
        userc = user.$toClient({ projection: { name: 1, ssn: 1 } });
        expect(_.keys(userc)).to.eql(['_id', 'name', 'ssn']);

        user = new User({
          _id: 222,
          name: { first: 'Some', last: 'User' },
          ssn: '111-23-1232',
          favoriteColor: 'blue'
        });
        userc = user.$toClient({
          projection: { name: 1, ssn: 1, favoriteColor: 1 }
        });
        expect(_.keys(userc)).to.eql(['_id', 'name', 'ssn', 'favoriteColor']);
      });

      it('should strip out $options', () => {
        const user = new User({
          _id: 222,
          name: { first: 'Some', last: 'User' },
          ssn: '111-23-1232',
          favoriteColor: 'blue'
        });
        user.$options = { query: {} };
        const userc = user.$toClient();
        expect(userc.$options).to.be.undefined;
      });
    });

    describe('computed properties', () => {
      it('should support computed properties', () => {
        const user = new User({
          name: { first: 'Jane', last: 'Smith' },
          age: 5
        });
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it('should work with CollectionInstance.toClient()', () => {
        const user = new User({
          name: { first: 'Jane', last: 'Smith' },
          age: 5
        }).$toClient();
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it('should work with POJO toClient()', () => {
        const user = { name: { first: 'Jane', last: 'Smith' }, age: 5 };
        const clientUser = User.toClient(user);
        expect(clientUser.fullName).to.be.eql('Jane Smith');
      });

      it('should be defined from finds', async () => {
        const user = await User.byId(1);
        expect(user!.fullName).to.be.eql('An Anon');
      });

      it('should show as readonly in Fields', async () => {
        expect(User.fields.fullName.readonly).to.be.eql(true);
        expect(User.fields.name.fields!.first.readonly).to.be.eql(false);
      });
    });

    describe('methods', () => {
      it('should support methods', () => {
        const child = new User({
          name: { first: 'Jane', last: 'Smith' },
          age: 5
        });
        expect(child.canDrink()).to.be.eql(false);

        const adult = new User({
          name: { first: 'Jill', last: 'Smith' },
          age: 32
        });
        expect(adult.canDrink()).to.be.eql(true);
      });

      it('should work with CollectionInstance.toClient()', () => {
        const user = new User({
          name: { first: 'Jane', last: 'Smith' },
          age: 5
        }).$toClient();
        expect(user.fullName).to.be.eql('Jane Smith');
      });

      it('should work with POJO toClient()', () => {
        const user = { name: { first: 'Jane', last: 'Smith' }, age: 5 };
        const clientUser = User.toClient(user);
        expect(clientUser.fullName).to.be.eql('Jane Smith');
      });
    });

    describe('phantom collections', () => {
      it('should let you query from phantom collections', async () => {
        const docs = await (Phantom as Tyr.CollectionInstance).findAll({
          query: {}
        });
        expect(docs.length).to.equal(0);
      });

      it('should let you query from phantom collections', async () => {
        const doc = await (Phantom as Tyr.CollectionInstance).findOne({
          query: {}
        });
        expect(doc).to.equal(null);
      });
    });

    describe('types', () => {
      it('should support Type.byName', () => {
        expect(Tyr.Type.byName.integer).to.exist;
      });
    });

    describe('logging', () => {
      const LogLevel = Tyr.byName.tyrLogLevel;

      beforeEach(async () => {
        await Log.db.deleteMany({});
      });

      afterEach(async () => {
        await Log.db.deleteMany({});
      });

      it('should log simple strings', async () => {
        await Tyr.info('test');

        const logs = await Tyr.Log.findAll({
          query: { c: { $ne: Log.id } }
        });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).m).to.be.eql('test');
        expect((logs[0] as any).l).to.be.eql(LogLevel.INFO._id);
      });

      it('should log objects', async () => {
        await Tyr.info({ m: 'test', e: 'http' });

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).m).to.be.eql('test');
        expect((logs[0] as any).l).to.be.eql(LogLevel.INFO._id);
        expect((logs[0] as any).e).to.be.eql('http');
      });

      it('should log errors', async () => {
        await Tyr.warn('test one', new Error('test'));

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).m).to.be.eql('test one');
        expect((logs[0] as any).l).to.be.eql(LogLevel.WARN._id);
        expect((logs[0] as any).st).to.match(/Error: test/);
      });

      it('should log errors, #2', async () => {
        await Tyr.info(new Error('test'));

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).m).to.be.eql('test');
        expect((logs[0] as any).st).to.match(/Error: test/);
      });

      it('should throw on invalid parameters', () => {
        return Tyr.info(3, 'test')
          .then(() => assert(false, 'no exception thrown'))
          .catch(err => {
            expect(err.message).to.match(/Invalid option "3"/);
          });
      });

      it('should throw on an invalid event', async () => {
        return Tyr.warn({ m: 'test', e: 'bad_event' })
          .then(() => assert(false, 'no exception thrown'))
          .catch(err => {
            expect(err.message).to.match(/Invalid event.*"bad_event"/);
          });
      });

      it('should allow events to be added', async () => {
        (Tyr.Log as any).addEvent('myEvent', 'My Event');

        await Tyr.info({ e: 'myEvent', m: 'a test' });

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).m).to.be.eql('a test');
        expect((logs[0] as any).e).to.be.eql('myEvent');
      });

      it('should log find()', async () => {
        await (await Book.find({ query: { title: 'foo' } })).toArray();

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).e).to.be.eql('db');
        expect((logs[0] as any).q).to.be.eql({ title: 'foo' });
        expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
      });

      it('should log findAll()', async () => {
        await Book.findAll({ query: { title: 'foo' } });

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).e).to.be.eql('db');
        expect((logs[0] as any).q).to.be.eql({ title: 'foo' });
        expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
      });

      it('should log a document.$save()', async () => {
        const cleanup = async () =>
          Location.remove({ query: { name: 'Mount Everest' } });

        await cleanup();

        try {
          await Location.save({ name: 'Mount Everest' });
          const loc = await Location.findOne({
            query: { name: 'Mount Everest' }
          });

          await Log.db.deleteMany({});

          await loc!.$save();

          const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
          expect(logs.length).to.be.eql(1);
          expect((logs[0] as any).e).to.be.eql('db');
          expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
        } finally {
          await cleanup();
        }
      });

      it('should log queries with regular expressions, #1', async () => {
        await Book.findAll({ query: { title: /foo/i } });

        // SLEEP-RETRY:  findAll doesn't await internal log calls so this can be a timing issue
        //               write something that will retry a test for up to 1s every 50ms before failing
        await Tyr.sleep(100);

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).e).to.be.eql('db');
        expect((logs[0] as any).q).to.be.eql({ title: /foo/i });
        expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
      });

      it('should log queries with regular expressions, #2', async () => {
        await Book.findAll({ query: { title: new RegExp('foo', 'i') } });

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).e).to.be.eql('db');
        expect((logs[0] as any).q).to.be.eql({ title: /foo/i });
        expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
      });

      it('should log queries with regular expressions, #3', async () => {
        await Book.findAll({
          query: {
            $or: [{ title: new RegExp('foo', 'i') }, { foo: { $in: [1, 2] } }]
          }
        });

        await Tyr.sleep(100); // SLEEP-RETRY

        const logs = await Log.findAll({ query: { c: { $ne: Log.id } } });
        expect(logs.length).to.be.eql(1);
        expect((logs[0] as any).e).to.be.eql('db');
        expect((logs[0] as any).q).to.be.eql({
          _$or: [{ title: /foo/i }, { foo: { _$in: [1, 2] } }]
        });
        expect((logs[0] as any).l).to.be.eql(LogLevel.TRACE._id);
      });
    });

    describe('collection.links()', () => {
      it('should work with no options', () => {
        const links = User.links();
        expect(links.length).to.be.eql(17);
      });

      it('should work with incoming', () => {
        const links = User.links({ direction: 'incoming' });
        expect(links.length).to.be.eql(9);
      });

      it('should work with outgoing', () => {
        const links = User.links({ direction: 'outgoing' });
        expect(links.length).to.be.eql(8);
      });

      it('should work with relate', () => {
        let links = User.links({ relate: 'ownedBy' });
        expect(links.length).to.be.eql(1);

        links = User.links({ relate: 'associate' });
        expect(links.length).to.be.eql(16);
      });
    });

    describe('Tyr.cloneDeep()', () => {
      it('should handle ObjectIds', () => {
        const o = { a: 1, b: oid1 };

        expect(o).to.not.eql(_.cloneDeep(o));
        expect(o).to.eql(Tyr.cloneDeep(o));
      });
    });

    describe('$copy() and $replace()', () => {
      it('should copy and not remove existing values', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$copy({ age: 6 });

        expect(u.name.first).to.eql('Amy');
        expect(u.age).to.eql(6);
      });

      it('should copy and remove existing values when passed an array of properties', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });

        u.$copy({ age: 6 }, ['age', 'name']);

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

    describe('$toPlain() and plain: true', () => {
      it('should support Document.$toPlain()', () => {
        const ud = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        const ur = ud.$toPlain();

        expect(ud).to.be.instanceof(User);
        expect(ur).to.not.be.instanceof(User);
        expect(ur.age).to.eql(ud.age);
        expect(ur.name).to.eql(ud.name);
      });

      it('should convert computed values', () => {
        const ud = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        const ur = ud.$toPlain();

        expect(ur.fullName).to.eql('Amy Tell');
      });

      it('should convert support plain: true', async () => {
        const u = await User.findOne({ query: { _id: 1 }, plain: true });

        expect(u).to.not.be.instanceof(User);
        expect(u!.fullName).to.eql('An Anon');
      });
    });

    describe('isObject', () => {
      it('test if something is an object', () => {
        const tests = [
          [1, false],
          [{}, true],
          [oid1, false],
          [{ a: 1 }, true]
        ];

        for (const test of tests) {
          expect(Tyr.isObject(test[0])).to.be.eql(test[1]);
        }
      });
    });

    describe('isObjectId', () => {
      it('test if something is an object', () => {
        const tests = [
          [1, false],
          [{}, false],
          [oid1, true],
          [{ a: 1 }, false]
        ];

        for (const test of tests) {
          expect(Tyr.isObjectId(test[0])).to.be.eql(test[1]);
        }
      });
    });

    describe('parseBson', () => {
      it('pass through regular values but parse bson objects', () => {
        const tests = [
          [1, 1],
          [{ _bsontype: 'ObjectID', id: 'Ugò¨8©tüo:Z' }, oid2]
        ];

        for (const test of tests) {
          expect(Tyr.parseBson(test[0])).to.be.eql(test[1]);
        }
      });
    });

    describe('arraySort', () => {
      it('should take a mongo sort-style object', () => {
        const myArray = [{ b: 1 }, { b: 'alpha' }, {}, { b: 'alpha', c: 2 }];
        Tyr.arraySort(myArray, { b: 1, c: -1 });
        expect(myArray).to.eql([
          {},
          { b: 1 },
          { b: 'alpha', c: 2 },
          { b: 'alpha' }
        ]);
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
          { a: null }
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
          { a: new Date('2016-12-1') }
        ]);
      });
    });

    describe('$slice', () => {
      it('support an empty options array', async () => {
        const u = await User.byId(3, { projection: { name: 1 } });
        expect(u!.siblings).to.be.undefined;

        await u!.$slice('siblings');
        expect(u!.siblings!.length).to.eql(2);
      });

      it('support skip and limit', async () => {
        const u = await User.byId(3, { projection: { name: 1 } });
        await u!.$slice('siblings', { skip: 1, limit: 1 });
        expect(u!.siblings![0]).to.be.undefined;
        expect(u!.siblings![1].name).to.eql('Bill Doe');
        expect(u!.siblings!.length).to.eql(2);
      });

      it('support sort', async () => {
        const u = await User.byId(3, { projection: { name: 1 } });
        await u!.$slice('siblings', { skip: 1, limit: 1, sort: { name: 1 } });
        expect(u!.siblings![0]).to.be.undefined;
        expect(u!.siblings![1].name).to.eql('Jill Doe');
        expect(u!.siblings!.length).to.eql(2);
      });

      it('support where', async () => {
        const u = await User.byId(3, { projection: { name: 1 } });
        await u!.$slice('siblings', { where: v => v.name.startsWith('Jill') });
        expect(u!.siblings![0].name).to.eql('Jill Doe');
        expect(u!.siblings!.length).to.eql(1);
      });

      it('support population', async () => {
        const u = await User.byId(2, { projection: { name: 1 } });

        await u!.$slice('roles');
        expect(u!.roles!.length).to.eql(2);

        delete u!.roles;
        await u!.$slice('roles', { populate: { role: $all } });
        expect(u!.roles!.length).to.eql(2);
        expect(u!.roles![0].role$!.name).to.eql('Administrator');
        expect(u!.roles![1].role$!.name).to.eql('User');
      });
    });

    describe('types', () => {
      it('should format dates and times', () => {
        const dateType = User.fields.birthDate;
        const dateTimeType = User.fields.createdAt;

        expect(
          dateType.type.format(dateType, new Date('2018-01-01 11:30:20Z'))
        ).to.eql('01-01-2018');

        expect(
          dateTimeType.type.format(
            dateTimeType,
            new Date('2018-01-01 11:30:20Z')
          )
        ).to.eql('01-01-2018 05:30:00 -06:00');
      });

      it('should format bitmask values', () => {
        const bitmaskType = User.fields.bitmaskedJobs;

        expect(bitmaskType.type.format(bitmaskType, 2)).to.eql('Software Lead');
        expect(bitmaskType.type.format(bitmaskType, 3)).to.eql(
          'Software Engineer, Software Lead'
        );
      });
    });

    describe('findReferences', () => {
      it('should find a single reference', async () => {
        const refs = await User.findReferences({ id: 3 });
        expect(refs.length).to.eql(4);
      });

      it('should find an array of references', async () => {
        const refs = await User.findReferences({ ids: [1, 3] });
        expect(refs.length).to.eql(7);
      });

      it('should support exclude', async () => {
        const refs = await User.findReferences({
          ids: [1, 3],
          exclude: [Tyr.byName.organization, Tyr.byName.widget]
        });
        expect(refs.length).to.eql(4);
      });

      it('should support idsOnly', async () => {
        const refs = await User.findReferences({ ids: [1, 3], idsOnly: true });
        expect(refs.length).to.eql(7);
        for (const r of refs) {
          expect(_.keys(r)).to.eql(['_id']);
        }
      });
    });

    describe('removeReferences', () => {
      const userId = 99,
        departmentId = 99;
      before(async () => {
        await User.insert({
          _id: userId,
          organization: 1,
          name: { first: 'test user', last: 'Anon' },
          title: 'Developer',
          job: 1
        });

        await Department.insert({
          _id: departmentId,
          name: 'References Dept',
          creator: 2,
          head: userId,
          permissions: { members: [userId, 3] }
        });
      });

      after(async () => {
        await User.remove({ query: { _id: userId } });
        await Department.remove({ query: { _id: departmentId } });
      });

      it('should remove references', async () => {
        let refs = await User.findReferences({ id: userId });
        expect(refs.length).to.eql(1);
        expect((refs[0] as Tyr.Department).name).to.eql('References Dept');

        await User.removeReferences({ id: userId });

        refs = await User.findReferences({ id: userId });
        expect(refs.length).to.eql(0);

        const department = (await Department.byId(departmentId))!;
        expect(department.head).to.be.undefined;
        expect(department.permissions!.members).to.eql([3]);
      });
    });

    describe('api', () => {
      it('should invoke server-side methods', async () => {
        expect(await User.canServe(2)).to.equal(true);
        expect(await User.canServe(3)).to.equal(false);
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

        require('fs').writeFileSync('foo_client.js', code);

        await new Promise((res, rej) => {
          jsdom.env({
            html: '<div></div>',
            src: [jquerySource, lodashSource, momentSource, code],
            done(
              err: Error,
              window: { Tyr: typeof Tyr & { Tyr: typeof Tyr } }
            ) {
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
                if (
                  !(col.def.client === false) &&
                  !(col.def.name in window$Tyr.byName)
                ) {
                  throw new Error(
                    `Collection ${col.def.name} not present in client`
                  );
                }
              });

              if (Tyr.pluralize('daisy') !== 'daisies') {
                throw new Error('Tyr.pluralize not working on client');
              }

              if (Tyr.unitize(1, 'daisy') !== '1 daisy') {
                throw new Error('Tyr.unitize not working on client');
              }

              res();
            }
          });
        });
      });
    });

    testPath.add();
    testCsv.add();
    testExcel.add();
    testExpress.add();
    testEvent.add();
    testFake.add();
    testFunction.add();
    testHistorical.add();
    testMath.add();
    testQuery.add();
    testUpdate.add();
    testDiff.add();
    testUnit.add();
  });
});
