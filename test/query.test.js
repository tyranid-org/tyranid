
import * as chai                 from 'chai';
import * as mongodb              from 'mongodb';

import Tyr                       from '../src/tyranid';

const {
  ObjectId
} = mongodb;

const {
  expect,
  assert
} = chai;

export function add() {
  describe('query.js', () => {
    const { intersection, matches, merge } = Tyr.query,
          i1 = '111111111111111111111111',
          i2 = '222222222222222222222222',
          i3 = '333333333333333333333333',
          i4 = '444444444444444444444444';

    describe('merge()', function() {
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
        testl(
          { $or: [ { blog: 1 }, { org: 1 } ], $and: [ { a1: 1 }, { b1: 1 } ] },
          { $or: [ { foo: 1  }, { bar: 2 } ], $and: [ { c1: 1 }            ] },
          { $and: [
            { $or: [ { blog: 1 }, { org: 1 } ] },
            { $or: [ { foo: 1  }, { bar: 2 } ] },
            { a1: 1 },
            { b1: 1 },
            { c1: 1 },
          ] }
        );
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

    describe('intersection()', () => {
      function test(v1, v2, expected) {
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
        test({ a: [ObjectId(i1), ObjectId(i2)] }, { a: ObjectId(i1) }, undefined);
        test({ a: [1, 2, 3] }, { a: [1, 2] }, undefined);
        test({ a: [1, 2, 3] }, { a: [4, 5] }, undefined);
      });

      it('should intersect queries that use $in', () => {
        test({ a: { $in: [1, 2] } }, { a: 1 }, { a: 1 });
        test({ a: { $in: [ObjectId(i1), ObjectId(i2)] } }, { a: ObjectId(i1) }, { a: ObjectId(i1) });
        test({ a: { $in: [1, 2, 3] } }, { a: { $in: [1, 2] } }, { a: { $in: [1, 2] } });
        test({ a: { $in: [ObjectId(i1), ObjectId(i2), ObjectId(i3)] } }, { a: { $in: [ObjectId(i1), ObjectId(i2)] } }, { a: { $in: [ObjectId(i1), ObjectId(i2)] } });
        test({ a: { $in: [1, 2, 3] } }, { a: { $in: [4, 5] } }, undefined);
      });

      it('should support comparison operators', () => {
        test({ a: { $lt: 2 } }, { a: 1 }, { a: 1 });
        test({ a: { $gt: 2 } }, { a: 1 }, undefined);
        test({ a: { $lt: 2 } }, { a: { $gt: 0 } }, { a: { $lt: 2, $gt: 0 } });
      });

      it('should support logical operators', () => {
        test(
          { $or: [ { blog: 1 }, { org: 1 } ] },
          { $and: [ { a1: 1 }, { b1: 1 } ] },
          { $or: [ { blog: 1 }, { org: 1 } ],
            $and: [ { a1: 1 }, { b1: 1 } ] }
        );
      });
    });

    describe('matches()', () => {
      function test(q, v, expected) {
        expect(matches(q, v)).to.eql(expected);
      }

      it('should work with empty queries', () => {
        test({}, { foo: 1 }, true);
      });

      it('should work with simple queries', () => {
        test({ foo: 2 },         { foo: 1 },         false);
        test({ foo: 1 },         { foo: 1 },         true);
        test({ foo: 1, bar: 2 }, { foo: 1 },         false);
        test({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }, true);
      });
    });

    describe('fromClientQuery', function() {
      let Book, User;

      before(() => {
        Book = Tyr.byName.book;
        User = Tyr.byName.user;
      });

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
  });
}
