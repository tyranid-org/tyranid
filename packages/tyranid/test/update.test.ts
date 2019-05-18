import * as chai from 'chai';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

const { ObjectId } = mongodb;

const O = (ObjectId as any) as (id: string) => mongodb.ObjectId;

const { expect } = chai;

export function add() {
  describe('update.js', () => {
    const { intersection, matches, merge } = Tyr.query,
      i1 = '111111111111111111111111',
      i2 = '222222222222222222222222',
      i3 = '333333333333333333333333',
      i4 = '444444444444444444444444';

    describe('fromClientUpdate', () => {
      let Book: Tyr.BookCollection, User: Tyr.UserCollection;

      before(() => {
        Book = Tyr.byName.book;
        User = Tyr.byName.user;
      });

      it('should variation 1', () => {
        const title = 'Browsers';
        const clientUpdate = {
          $set: {
            title,
            isbn: '5614c2f00000000000000000'
          }
        };
        const serverUpdate = Book.fromClientUpdate(clientUpdate);
        expect(serverUpdate.$set.title).to.be.eql(title);
        expect(serverUpdate.$set.isbn).to.be.an.instanceof(O);
      });

      it('should support support paths strings', () => {
        const clientUpdate = {
          'name.first': 'An'
        };
        const serverUpdate = User.fromClientQuery(clientUpdate);
        expect(serverUpdate['name.first']).to.be.eql('An');
      });

      it('should support fail on invalid paths strings', () => {
        const clientUpdate = {
          $set: {
            'name.foo': 'An'
          }
        };

        expect(() => {
          User.fromClientUpdate(clientUpdate);
        }).to.throw(/cannot find/i);
      });
    });
  });
}
