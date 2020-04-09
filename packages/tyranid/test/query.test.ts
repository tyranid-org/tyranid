import * as chai from 'chai';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

const { ObjectId } = mongodb;

const O = (ObjectId as any) as (id: string) => mongodb.ObjectId;

const { expect } = chai;

export function add() {
  describe('query.js', () => {
    const { intersection, matches, merge } = Tyr.query,
      i1 = '111111111111111111111111',
      i2 = '222222222222222222222222',
      i3 = '333333333333333333333333',
      i4 = '444444444444444444444444';

    describe('merge()', () => {
      function testl(
        v1: Tyr.MongoQuery | null,
        v2: Tyr.MongoQuery | null,
        expected: Tyr.MongoQuery | null | boolean
      ) {
        const merged = merge(v1, v2);
        // console.log('merged', merged);
        expect(merged).to.eql(expected);
      }

      function test(
        v1: Tyr.MongoQuery | null,
        v2: Tyr.MongoQuery | null,
        expected: Tyr.MongoQuery | null | boolean
      ) {
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
        const v = { foo: [1, 2, { bar: 3 }] };
        test({}, v, v);
      });

      it('should merge queries without duplication', () => {
        expect(merge({ org: 1 }, { org: 1 })).to.eql({ org: 1 });
      });

      it('should merge non-overlapping queries', () => {
        expect(merge({ org: 1 }, { user: 1 })).to.eql({ org: 1, user: 1 });
      });

      it('should detect equal ObjectIds', () => {
        expect(merge({ org: O(i1) }, { org: O(i1) })).to.eql({ org: O(i1) });
      });

      it('should work with $eq', () => {
        test({ org: { $eq: 1 } }, { org: 1 }, { org: 1 });
        test({ org: 1 }, { org: 2 }, false);
        test({ org: 1 }, { org: { $eq: 2 } }, false);
      });

      it('should work with $ne', () => {
        test({ org: { $ne: 1 } }, { org: 1 }, false);
        test({ org: { $ne: 1 } }, { org: 2 }, { org: 2 });
        testl(
          { org: { $ne: 1 } },
          { org: { $ne: 2 } },
          { org: { $nin: [1, 2] } }
        );
      });

      it('should work with $in', () => {
        test({ org: 1 }, { org: { $in: [1, 2] } }, { org: 1 });
        test({ org: { $in: [2, 3] } }, { org: { $in: [1, 2] } }, { org: 2 });
        test(
          { org: { $in: [2, 3, 4] } },
          { org: { $in: [1, 2, 4] } },
          { org: { $in: [2, 4] } }
        );
        test({ org: { $in: [2] } }, { org: 3 }, false);
        test({ org: { $in: [2] } }, { org: { $eq: 3 } }, false);
        test({ org: { $in: [2] } }, { org: { $in: [3] } }, false);
      });

      it('should work with $nin', () => {
        testl(
          { org: { $nin: [1, 2] } },
          { org: { $nin: [3, 4] } },
          { org: { $nin: [1, 2, 3, 4] } }
        );
        testl(
          { org: { $ne: 1, $nin: [3, 4] } },
          { org: { $ne: 2 } },
          { org: { $nin: [1, 2, 3, 4] } }
        );
      });

      it('should work with ObjectIds and $in/$nin', () => {
        test({ org: O(i1) }, { org: { $in: [O(i1), O(i2)] } }, { org: O(i1) });
        test(
          { org: { $in: [O(i2), O(i3)] } },
          { org: { $in: [O(i1), O(i2)] } },
          { org: O(i2) }
        );
        test(
          { org: { $in: [O(i2), O(i3), O(i4)] } },
          { org: { $in: [O(i1), O(i2), O(i4)] } },
          { org: { $in: [O(i2), O(i4)] } }
        );
        test({ org: { $in: [O(i2)] } }, { org: O(i3) }, false);
        test({ org: { $in: [O(i2)] } }, { org: { $in: [O(i3)] } }, false);
        testl(
          { org: { $nin: [O(i2)] } },
          { org: { $nin: [O(i3)] } },
          { org: { $nin: [O(i2), O(i3)] } }
        );
      });

      it('should merge compatible comparisons', () => {
        test(
          { count: { $ge: 1 } },
          { count: { $lt: 4 } },
          { count: { $ge: 1, $lt: 4 } }
        );
      });

      it('should work with composite queries', () => {
        test(
          { org: { $in: [O(i2)] }, name: 'Foo' },
          { org: { $in: [O(i3)] } },
          false
        );
        test(
          { org: 1, name: 'Foo' },
          { org: { $in: [1, 2] } },
          { org: 1, name: 'Foo' }
        );
        test({ org: { $in: [1, 2], $eq: 2 } }, { org: 2 }, { org: 2 });
      });

      it('should work with $and', () => {
        testl(
          { $and: [{ blog: 1 }, { org: 1 }] },
          { $and: [{ foo: 1 }, { bar: 2 }] },
          { $and: [{ blog: 1 }, { org: 1 }, { foo: 1 }, { bar: 2 }] }
        );
      });

      it('should work with $or', () => {
        testl(
          { $or: [{ blog: 1 }, { org: 1 }] },
          { $or: [{ foo: 1 }, { bar: 2 }] },
          {
            $and: [
              { $or: [{ blog: 1 }, { org: 1 }] },
              { $or: [{ foo: 1 }, { bar: 2 }] },
            ],
          }
        );
      });

      it('should work with $or and $ands together', () => {
        testl(
          { $or: [{ blog: 1 }, { org: 1 }], $and: [{ a1: 1 }, { b1: 1 }] },
          { $or: [{ foo: 1 }, { bar: 2 }], $and: [{ c1: 1 }] },
          {
            $and: [
              { $or: [{ blog: 1 }, { org: 1 }] },
              { $or: [{ foo: 1 }, { bar: 2 }] },
              { a1: 1 },
              { b1: 1 },
              { c1: 1 },
            ],
          }
        );
      });

      it('should work with nested $and/$or', () => {
        test(
          {
            $and: [
              { $or: [{ blogId: { $in: [O('56fc2aacbb4c31a277f9a454')] } }] },
              { $and: [{ _id: { $nin: [O('56fc2aacbb4c31a277f9a45b')] } }] },
            ],
          },
          {},
          {
            $and: [
              { $or: [{ blogId: { $in: [O('56fc2aacbb4c31a277f9a454')] } }] },
              { $and: [{ _id: { $nin: [O('56fc2aacbb4c31a277f9a45b')] } }] },
            ],
          }
        );
      });

      it("should merge $or's when there are sibling clauses present", () => {
        testl(
          {
            $or: [
              {
                a: 3,
              },
            ],
          },
          {
            $or: [
              {
                b: 'test',
              },
            ],
            _id: '5567f2ab387fa974fc6f3a70',
          },
          {
            $and: [
              {
                $or: [
                  {
                    a: 3,
                  },
                ],
              },
              {
                $or: [
                  {
                    b: 'test',
                  },
                ],
              },
            ],
            _id: '5567f2ab387fa974fc6f3a70',
          }
        );
      });
    });

    describe('intersection()', () => {
      function test(
        v1: Tyr.MongoQuery | null,
        v2: Tyr.MongoQuery | null,
        expected: Tyr.MongoQuery | undefined
      ) {
        expect(intersection(v1, v2)).to.eql(expected);
      }

      it('should intersect empty queries', () => {
        test(null, null, undefined);
        test(null, {}, undefined);
        test({}, {}, {});
        test({ foo: 1 }, null, undefined);
        test({ foo: 1 }, {}, { foo: 1 });
      });

      it('should intersect simple queries', () => {
        test({ a: 1 }, { b: 1 }, { a: 1, b: 1 });
        test({ a: 1 }, { a: 1 }, { a: 1 });
        test({ a: 1 }, { a: 2 }, undefined);
      });

      it('should intersect queries that have arrays', () => {
        test({ a: [1, 2] }, { a: 1 }, undefined);
        test({ a: [O(i1), O(i2)] }, { a: O(i1) }, undefined);
        test({ a: [1, 2, 3] }, { a: [1, 2] }, undefined);
        test({ a: [1, 2, 3] }, { a: [4, 5] }, undefined);
      });

      it('should intersect queries that use $in', () => {
        test({ a: { $in: [1, 2] } }, { a: 1 }, { a: 1 });
        test({ a: { $in: [O(i1), O(i2)] } }, { a: O(i1) }, { a: O(i1) });
        test(
          { a: { $in: [1, 2, 3] } },
          { a: { $in: [1, 2] } },
          { a: { $in: [1, 2] } }
        );
        test(
          { a: { $in: [O(i1), O(i2), O(i3)] } },
          { a: { $in: [O(i1), O(i2)] } },
          { a: { $in: [O(i1), O(i2)] } }
        );
        test({ a: { $in: [1, 2, 3] } }, { a: { $in: [4, 5] } }, undefined);
      });

      it('should support comparison operators', () => {
        test({ a: { $lt: 2 } }, { a: 1 }, { a: 1 });
        test({ a: { $gt: 2 } }, { a: 1 }, undefined);
        test({ a: { $lt: 2 } }, { a: { $gt: 0 } }, { a: { $lt: 2, $gt: 0 } });
      });

      it('should support logical operators', () => {
        test(
          { $or: [{ blog: 1 }, { org: 1 }] },
          { $and: [{ a1: 1 }, { b1: 1 }] },
          {
            $or: [{ blog: 1 }, { org: 1 }],
            $and: [{ a1: 1 }, { b1: 1 }],
          }
        );
      });
    });

    describe('matches()', () => {
      function test(
        q: Tyr.MongoQuery,
        v: Tyr.RawMongoDocument,
        expected: boolean
      ) {
        expect(matches(q, v)).to.eql(expected);
      }

      it('should work with empty queries', () => {
        test({}, { foo: 1 }, true);
      });

      it('should work with simple queries', () => {
        test({ foo: 2 }, { foo: 1 }, false);
        test({ foo: 1 }, { foo: 1 }, true);
        test({ foo: 1, bar: 2 }, { foo: 1 }, false);
        test({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }, true);
        test({ foo: [1] }, { foo: 1 }, true);
        test({ foo: [1, 2] }, { foo: 1 }, false);
        test({ foo: [1, 2] }, { foo: [1] }, false);
        test({ foo: [1, 2] }, { foo: [1, 2] }, true);
        test({ _id: O(i1) }, { _id: O(i1) }, true);
      });

      it('should work with $exists', () => {
        test(
          { foo: { bar: { $exists: false } } },
          { foo: { bar: true } },
          false
        );
        test({ foo: { bar: { $exists: true } } }, { foo: { bar: true } }, true),
          test(
            { foo: { bar: { $exists: false } } },
            { foo: { baz: true } },
            true
          );
      });

      it('should work with $in', () => {
        test({ foo: { $in: [1] } }, { foo: [2, 1] }, true);
        test({ foo: { $in: [3, 1] } }, { foo: [2, 1] }, true);
        test({ foo: { $in: [1, 2] } }, { foo: [1] }, true);
        test({ foo: { $in: [1, 2] } }, { foo: 1 }, true);
        test({ foo: { $in: [1, 2] } }, { foo: [3] }, false);
        test({ foo: { $in: [1, 2] } }, {}, false);
        test({ foo: { $in: [] } }, { foo: [1] }, false);
        test({ foo: { $in: [O(i1)] } }, { foo: [O(i1)] }, true);
      });

      it('should work with $eq', () => {
        test({ foo: { $eq: 1 } }, { foo: 1 }, true);
        test({ foo: { $eq: 1 } }, { foo: 3 }, false);
        test({ foo: { $eq: O(i1) } }, { foo: O(i1) }, true);
      });

      it('should work with $or', () => {
        test({ $or: [{ foo: 1 }, { bar: 1 }] }, { foo: 1 }, true);
        test({ $or: [{ foo: 1 }, { bar: 1 }] }, { bar: 1 }, true);
        test({ $or: [{ foo: 1 }, { bar: 1 }] }, {}, false);
        test({ $or: [{ foo: 1 }, { bar: 1 }] }, { bar: 2 }, false);
      });

      it('should work with $and', () => {
        test({ $and: [{ foo: 1 }, { bar: 1 }] }, { foo: 1 }, false);
        test({ $and: [{ foo: 1 }, { bar: 1 }] }, { bar: 1 }, false);
        test({ $and: [{ foo: 1 }, { bar: 1 }] }, {}, false);
        test({ $and: [{ foo: 1 }, { bar: 1 }] }, { foo: 1, bar: 1 }, true);
      });

      it('should work with $bitsAllClear', () => {
        test({ foo: { $bitsAllClear: 3 } }, { foo: 4 }, true);
        test({ foo: { $bitsAllClear: 3 } }, { foo: 1 }, false);
        test({ foo: { $bitsAllClear: 3 } }, { foo: 3 }, false);
      });

      it('should work with $bitsAllSet', () => {
        test({ foo: { $bitsAllSet: 3 } }, { foo: 3 }, true);
        test({ foo: { $bitsAllSet: 3 } }, { foo: 1 }, false);
        test({ foo: { $bitsAllSet: 3 } }, { foo: 7 }, true);
      });

      it('should work with $bitsAnyClear', () => {
        test({ foo: { $bitsAnyClear: 3 } }, { foo: 3 }, false);
        test({ foo: { $bitsAnyClear: 3 } }, { foo: 2 }, true);
        test({ foo: { $bitsAnyClear: 3 } }, { foo: 0 }, true);
      });

      it('should work with $bitsAnySet', () => {
        test({ foo: { $bitsAnySet: 3 } }, { foo: 3 }, true);
        test({ foo: { $bitsAnySet: 3 } }, { foo: 1 }, true);
        test({ foo: { $bitsAnySet: 3 } }, { foo: 7 }, true);
        test({ foo: { $bitsAnySet: 3 } }, { foo: 4 }, false);
      });

      it('should work with a combination of bit-wise operators', () => {
        test(
          { foo: { $bitsAnySet: 3, $bitsAllSet: 4, $bitsAllClear: 8 } },
          { foo: 5 },
          true
        );
        test(
          { foo: { $bitsAnySet: 3, $bitsAllSet: 4, $bitsAllClear: 8 } },
          { foo: 13 },
          false
        );
        test(
          { foo: { $bitsAnySet: 3, $bitsAllSet: 4, $bitsAllClear: 8 } },
          { foo: 4 },
          false
        );
        test(
          { foo: { $bitsAnySet: 3, $bitsAllSet: 4, $bitsAllClear: 8 } },
          { foo: 6 },
          true
        );
        test(
          { foo: { $bitsAnySet: 3, $bitsAllSet: 4, $bitsAllClear: 8 } },
          { foo: 7 },
          true
        );
      });

      it('should null-check nested object paths', () => {
        test({ foo: { bar: { baz: 3 } } }, {}, false);
        test({ foo: { bar: { baz: 3 } } }, { foo: {} }, false);
        test({ foo: { bar: { baz: 3 } } }, { foo: { bar: {} } }, false);
        test({ foo: { bar: { baz: 3 } } }, { foo: { bar: { baz: 4 } } }, false);
        test({ foo: { bar: { baz: 3 } } }, { foo: { bar: { baz: 3 } } }, true);
      });
    });

    describe('fromClientQuery', () => {
      let Book: Tyr.BookCollection,
        User: Tyr.UserCollection,
        Role: Tyr.RoleCollection;

      before(() => {
        Book = Tyr.byName.book;
        User = Tyr.byName.user;
        Role = Tyr.byName.role;
      });

      it('should variation 1', () => {
        const title = 'Browsers';
        const clientQuery = {
          title,
          isbn: '5614c2f00000000000000000',
        };
        const serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.title).to.be.eql(title);
        expect(serverQuery.isbn).to.be.an.instanceof(O);
      });

      it('should variation 2', () => {
        const clientQuery = {
          isbn: {
            $in: ['5614c2f00000000000000000', '5614c2f00000000000000001'],
          },
        };
        const serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.isbn.$in.length).to.be.eql(2);
        expect(serverQuery.isbn.$in[0]).to.be.an.instanceof(O);
        expect(serverQuery.isbn.$in[1]).to.be.an.instanceof(O);
      });

      it('should variation 3', () => {
        const clientQuery = {
          isbn: { $ne: '5614c2f00000000000000000' },
          title: { $exists: true },
        };
        const serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.title.$exists).to.be.eql(true);
        expect(serverQuery.isbn.$ne).to.be.an.instanceof(O);
      });

      it('should variation 4', () => {
        const clientQuery = {
          $or: [
            { title: { $exists: true } },
            { isbn: { $in: ['5614c2f00000000000000000'] } },
          ],
        };
        const serverQuery = Book.fromClientQuery(clientQuery);
        expect(serverQuery.$or[0].title.$exists).to.be.eql(true);
        expect(serverQuery.$or[1].isbn.$in.length).to.be.eql(1);
        expect(serverQuery.$or[1].isbn.$in[0]).to.be.an.instanceof(O);
      });

      it('should variation 5', () => {
        const clientQuery = {
          name: {
            first: { $eq: 'An' },
            last: 'Anon',
          },
        };
        const serverQuery = User.fromClientQuery(clientQuery);
        expect(serverQuery.name.first.$eq).to.be.eql('An');
        expect(serverQuery.name.last).to.be.eql('Anon');
      });

      it('should variation 6', () => {
        const stringId = '5d6829a446f48f8b741a466a';
        const clientQuery = {
          _id: stringId,
        };
        const serverQuery = Role.fromClientQuery(clientQuery);
        expect(new ObjectId(stringId).equals(serverQuery._id)).to.eql(true);
      });

      it('should support $in for array fields', () => {
        const clientQuery = {
          secretCodes: {
            $in: ['5614c2f00000000000000000', '5614c2f00000000000000001'],
          },
        };
        const serverQuery = User.fromClientQuery(clientQuery);
        expect(serverQuery.secretCodes.$in.length).to.be.eql(2);
        expect(serverQuery.secretCodes.$in[0]).to.be.an.instanceof(O);
        expect(serverQuery.secretCodes.$in[1]).to.be.an.instanceof(O);
      });

      it('should support support paths strings', () => {
        const clientQuery = {
          'name.first': 'An',
        };
        const serverQuery = User.fromClientQuery(clientQuery);
        expect(serverQuery['name.first']).to.be.eql('An');
      });

      it('should support fail on invalid paths strings', () => {
        const clientQuery = {
          'name.foo': 'An',
        };

        expect(() => {
          User.fromClientQuery(clientQuery);
        }).to.throw(/cannot find/i);
      });

      it('should support queries against denormalized properties', () => {
        const clientQuery = {
          'organization_.owner_.name.last': 'Anon',
        };
        const serverQuery = User.fromClientQuery(clientQuery);
        expect(serverQuery['organization_.owner_.name.last']).to.eql('Anon');
      });

      it('should support $exists', () => {
        const clientQuery = {
          organization: { $exists: false },
        };
        const serverQuery = User.fromClientQuery(clientQuery);
        const v = serverQuery.organization.$exists;
        expect(serverQuery.organization.$exists).to.eql(false);
      });
    });
  });
}
