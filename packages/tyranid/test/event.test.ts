import * as chai from 'chai';
import * as _ from 'lodash';

import { Tyr } from 'tyranid';

const { expect } = chai;

export function add() {
  describe('event.js', () => {
    let User: Tyr.UserCollection, Book: Tyr.BookCollection;

    before(() => {
      User = Tyr.byName.user;
      Book = Tyr.byName.book;
    });

    it('should allow you to register events and unregister', async () => {
      const dereg = User.on({ type: 'remove', handler(/*event*/) {} });
      dereg();
    });

    it('should allow you to cancel removes on $remove()', async () => {
      const dereg = User.on({
        type: 'remove',
        handler(/*event*/) {
          throw new Error('stop');
        }
      });

      let u1;
      try {
        u1 = new User({ _id: 2001, name: { first: 'User', last: 'One' } });
        await u1.$save();

        await u1.$remove();
      } catch (err) {
      } finally {
        dereg();
      }

      u1 = await User.byId(2001);
      expect(u1).to.not.be.undefined;

      await u1!.$remove();

      u1 = await User.byId(2001);
      expect(u1).to.be.null;
    });

    it('should allow you to cancel removes on Collection.remove()', async () => {
      const dereg = User.on({
        type: 'remove',
        handler(/*event*/) {
          throw new Error('stop');
        }
      });

      let u1;
      try {
        u1 = new User({ _id: 2001, name: { first: 'User', last: 'One' } });
        await u1.$save();

        await User.remove({ query: { _id: 2001 } });
      } catch (err) {
      } finally {
        dereg();
      }

      u1 = await User.byId(2001);
      expect(u1).to.not.be.undefined;

      await User.remove({ query: { _id: 2001 } });

      u1 = await User.byId(2001);
      expect(u1).to.be.null;
    });

    it('should allow you to modify objects before saves', async () => {
      const dereg = Book.on({
        type: 'change',
        async handler(event) {
          for (const doc of await event.documents) {
            doc.pages = doc.pages ? doc.pages + 1 : 1;
          }
        }
      });

      try {
        let book = await Book.save({ title: 'events-1' });
        expect(book.pages).to.eql(1);

        book = await Book.findOne({ query: { title: 'events-1' } });
        expect(book.pages).to.eql(1);

        await book.$save();
        expect(book.pages).to.eql(2);

        book = await Book.findOne({ query: { title: 'events-1' } });
        expect(book.pages).to.eql(2);
      } finally {
        dereg();
        await Book.remove({ query: { title: 'events-1' } });
      }
    });

    it('should allow you to modify objects before bulk inserts', async () => {
      let invoked = 0;

      const dereg = Book.on({
        type: 'change',
        when: 'both',
        async handler(event) {
          invoked++;
          for (const doc of await event.documents) {
            if (event.when === 'pre') {
              doc.pages = doc.pages ? doc.pages + 1 : 1;
            } else {
              expect(doc.pages).to.eql(1);
              expect(doc._id).to.not.be.undefined;
            }
          }
        }
      });

      try {
        await Book.insert([
          { title: 'event-number-1' },
          { title: 'event-number-2' },
          { title: 'event-number-3' },
          { title: 'event-number-4' }
        ]);

        const books = await Book.findAll({ query: { title: /event-number/ } });
        expect(books.length).to.eql(4);

        for (const book of books) {
          expect(book.pages).to.eql(1);
        }

        expect(invoked).to.eql(2);
      } finally {
        dereg();
        await Book.remove({ query: { title: /event-number/ } });
      }
    });

    it('should work with distinction between insert, update, and change', async () => {
      let insertInvoked = 0,
        updateInvoked = 0,
        changeInvoked = 0;

      const dereg1 = Book.on({
        type: 'insert',
        async handler(event) {
          insertInvoked++;
        }
      });

      const dereg2 = Book.on({
        type: 'update',
        async handler(event) {
          updateInvoked++;
        }
      });

      const dereg3 = Book.on({
        type: 'change',
        async handler(event) {
          changeInvoked++;
        }
      });

      try {
        const book = await Book.save({ title: 'event-number-1' });
        expect([insertInvoked, updateInvoked, changeInvoked]).to.eql([1, 0, 1]);

        book.pages = 1;
        await book.$save();
        expect([insertInvoked, updateInvoked, changeInvoked]).to.eql([1, 1, 2]);
      } finally {
        dereg1();
        dereg2();
        dereg3();
        await Book.remove({ query: { title: /event-number/ } });
      }
    });

    it('should work with findAndModify()', async () => {
      let dereg;

      try {
        await Book.save([
          { title: 'event-number-1' },
          { title: 'event-number-2' },
          { title: 'event-number-3' },
          { title: 'event-number-4' }
        ]);

        let invoked = 0;

        dereg = Book.on({
          type: 'change',
          when: 'both',
          async handler(event) {
            expect(event.query).to.eql({ title: /event-number/ });
            expect(event.update.$set.description).to.eql('common');
            invoked++;
          }
        });

        await Book.findAndModify({
          query: { title: /event-number/ },
          update: { $set: { description: 'common' } }
        });

        expect(invoked).to.eql(2);
      } finally {
        dereg && dereg();
        await Book.remove({ query: { title: /event-number/ } });
      }
    });

    it('should not allow you to set up a pre find listener', async () => {
      expect(() => {
        User.on({ type: 'find', when: 'pre', handler() {} });
      }).to.throw();
    });

    it('should allow you to modify objects on reads', async () => {
      const dereg = User.on({
        type: 'find',
        async handler(event) {
          for (const doc of await event.documents) {
            (doc as any)['manufacturedId'] = 'ID' + doc._id;
          }
        }
      });

      try {
        const users = (await User.findAll({
          query: { _id: { $lte: 4 } },
          sort: { _id: 1 }
        })) as (Tyr.User & { manufacturedId: string })[];

        expect(users.length).to.eql(4);
        expect(users[0].manufacturedId).to.eql('ID1');
        expect(users[3].manufacturedId).to.eql('ID4');
      } finally {
        dereg();
      }
    });

    it('should allow you to modify objects on reads using a cursor with next()', async () => {
      const dereg = User.on({
        type: 'find',
        async handler(event) {
          for (const doc of await event.documents) {
            (doc as any)['manufacturedId'] = 'ID' + doc._id;
          }
        }
      });

      try {
        const cursor = await User.find({
          query: { _id: { $lte: 4 } }
        });

        let user;
        while ((user = await cursor.next())) {
          expect((user as any).manufacturedId).to.eql('ID' + user._id);
        }
      } finally {
        dereg();
      }
    });

    it('should allow you to modify objects on reads using a cursor with toArray()', async () => {
      const dereg = User.on({
        type: 'find',
        async handler(event) {
          for (const doc of await event.documents) {
            (doc as any)['manufacturedId'] = 'ID' + doc._id;
          }
        }
      });

      try {
        const cursor = await User.find({ query: { _id: { $lte: 4 } } });

        const users = await cursor.toArray();
        for (const user of users) {
          expect((user as any).manufacturedId).to.eql('ID' + user._id);
        }
      } finally {
        dereg();
      }
    });

    it('should only call find event handlers once per findAll() call', async () => {
      let invoked = 0;

      const dereg = User.on({
        type: 'find',
        async handler(event) {
          invoked++;
        }
      });

      try {
        const users = await User.findAll({ query: { _id: { $lte: 4 } } });

        expect(invoked).to.eql(1);
      } finally {
        dereg();
      }
    });

    it('should let you define custom events', async () => {
      let count = 0;

      User.on({
        type: 'myCustomEvent',
        async handler(event) {
          count++;
        }
      });

      await User.fire({
        type: 'myCustomEvent'
      });

      await Tyr.sleepUntil(() => !!count);
    });

    it('should allow access to the original options', async () => {
      const auth = new User({ name: { first: 'John', last: 'Doe' } });

      let foundAuth: Tyr.User | undefined;

      const dereg = Book.on({
        type: 'change',
        async handler(event) {
          foundAuth = event.opts!.auth as Tyr.User;
        }
      });

      try {
        await Book.save({ title: 'events-1' }, { auth });

        await Tyr.sleepUntil(() => foundAuth === auth);
      } finally {
        dereg();
        await Book.remove({ query: { title: 'events-1' } });
      }
    });
  });
}
