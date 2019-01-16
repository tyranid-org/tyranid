import * as _ from 'lodash';
import * as chai from 'chai';
import * as mongodb from 'mongodb';

import Tyr from '../src/tyranid';
import * as historical from '../src/historical/historical';

const { ObjectId } = mongodb;

const { expect, assert } = chai;

const { $all } = Tyr;

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

export function add() {
  describe('historical.js', () => {
    let Organization, Task, User, Widget;

    before(async () => {
      Organization = Tyr.byName.organization;
      Task = Tyr.byName.task;
      User = Tyr.byName.user;
      Widget = Tyr.byName.widget;
    });

    it('should create _historicalFields hash', () => {
      expect(User._historicalFields.age).to.eql(User.fields.age);
      expect(Widget._historicalFields.name).to.eql(Widget.fields.name);
    });

    it('should create preserveInitialValues()', () => {
      const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
      historical.preserveInitialValues(User, u);
      expect(u.$orig.age).to.eql(u.age);
      expect(u.$orig.name).to.be.undefined;
    });

    describe('historical: "document"', () => {
      let widgetHistoryDb;

      before(() => {
        widgetHistoryDb = historical.historicalDb(Widget);
      });

      beforeEach(async () => {
        await historical.historicalDb(Widget).removeMany({});
      });

      function widget1() {
        return new Widget({
          name: 'Foo',
          tags: ['Beta'],
          alternate: 'Blue'
        });
      }

      //it('snapshot should fail', () => {
      //const w = new Widget({ name: 'Foo' });
      //expect(() => historical.snapshot(undefined, Widget, w)).to.throw(/patch/);
      //});

      it('should $save()', async () => {
        const w = widget1();
        await w.$save();
        w.name = 'Bar';
        w.alternate = 'Red';
        await w.$save();

        const history = await (await widgetHistoryDb
          .find({})
          .sort({ _on: 1 })).toArray();
        expect(history.length).to.eql(2);
        expect(_.keys(history[0]).length).to.eql(6);
        expect(_.keys(history[1]).length).to.eql(7);

        for (const snapshot of history) {
          expect(snapshot.__id).to.eql(w._id);
          expect(snapshot._on).to.exist;
          expect(snapshot._partial).to.eql(false);
          expect(snapshot.name).to.be.defined;
          expect(snapshot.alterante).to.be.undefined;
        }
      });

      it('should $insert()', async () => {
        const w = widget1();
        await w.$insert();

        const history = await (await widgetHistoryDb
          .find({})
          .sort({ _on: 1 })).toArray();
        expect(history.length).to.eql(1);

        for (const snapshot of history) {
          expect(_.keys(snapshot).length).to.eql(6);
          expect(snapshot.__id).to.eql(w._id);
          expect(snapshot._on).to.exist;
          expect(snapshot._partial).to.eql(false);
          expect(snapshot.name).to.be.defined;
          expect(snapshot.alterante).to.be.undefined;
        }
      });

      it('should $update() with implicit fields', async () => {
        await widgetHistoryDb.remove({});

        let w = widget1();
        await w.$save();

        w = await Widget.byId(w._id);
        w.name = 'Bar';
        w.alternate = 'Red';
        await w.$update();

        const history = await (await widgetHistoryDb
          .find({})
          .sort({ _on: 1 })).toArray();
        expect(history.length).to.eql(2);
        expect(_.keys(history[0]).length).to.eql(6);
        expect(_.keys(history[1]).length).to.eql(7);

        for (const snapshot of history) {
          expect(snapshot._partial).to.eql(false);
          expect(snapshot.__id).to.eql(w._id);
          expect(snapshot._on).to.exist;
          expect(snapshot.name).to.be.defined;
          expect(snapshot.tags).to.be.defined;
          expect(snapshot.alterante).to.be.undefined;
        }
      });

      it('should $update() a subset', async () => {
        let w = widget1();
        await w.$save();

        w = await Widget.byId(w._id);
        w.name = 'Bar';
        w.alternate = 'Red';
        await w.$update({ fields: { name: 1, alternate: 1 } });

        const history = await (await widgetHistoryDb
          .find({})
          .sort({ _on: 1 })).toArray();
        expect(history.length).to.eql(2);
        expect(_.keys(history[0]).length).to.eql(6);
        expect(history[0]._partial).to.eql(false);
        expect(_.keys(history[1]).length).to.eql(5);
        expect(history[1]._partial).to.eql(true);

        for (const snapshot of history) {
          expect(snapshot.__id).to.eql(w._id);
          expect(snapshot._on).to.exist;
          expect(snapshot.name).to.be.defined;
          expect(snapshot.alterante).to.be.undefined;
        }
      });

      it('should $update() partially', async () => {
        await widgetHistoryDb.removeMany({});

        let w = widget1();
        await w.$save();

        w = await Widget.byId(w._id);
        w.name = 'Bar';
        w.alternate = 'Red';
        await w.$update({
          historical: 'partial'
        });

        const history = await (await widgetHistoryDb
          .find({})
          .sort({ _on: 1 })).toArray();
        expect(history.length).to.eql(2);
        expect(_.keys(history[0]).length).to.eql(6);
        expect(history[0]._partial).to.eql(false);
        expect(_.keys(history[1]).length).to.eql(5);
        expect(history[1]._partial).to.eql(true);

        for (const snapshot of history) {
          expect(snapshot.__id).to.eql(w._id);
          expect(snapshot._on).to.exist;
          expect(snapshot.name).to.be.defined;
          expect(snapshot.alterante).to.be.undefined;
        }
      });

      it('should support $asOf()', async () => {
        let w = new Widget({
          name: 'Foo',
          tags: ['Alpha'],
          alternate: 'Blue'
        });
        await w.$save({ asOf: new Date('2017-06-01') });

        w = await Widget.byId(w._id);
        w.tags = ['Beta'];
        await w.$update({ asOf: new Date('2017-07-01') });

        w = await Widget.findOne({
          query: { _id: w._id },
          asOf: new Date('2017-06-23')
        });

        expect(w.tags).to.eql(['Alpha']);
      });
    });

    describe('historical: "patch"', () => {
      it('should create snapshot()s', () => {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        historical.preserveInitialValues(User, u);
        u.age = 6;
        historical.snapshot(undefined, User, u);
        expect(u._history[0].p).to.eql({ age: [5] });
      });

      function user1() {
        const u = new User({ age: 5, name: { first: 'Amy', last: 'Tell' } });
        historical.preserveInitialValues(User, u);
        u.age = 6;
        historical.snapshot(undefined, User, u, {
          o: new Date('5-Oct-2016').getTime()
        });
        u.age = 7;
        historical.snapshot(undefined, User, u, {
          o: new Date('10-Oct-2016').getTime()
        });

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

      it('should support asOf() with partial data', () => {
        let u = user1();
        expect(u.age).to.eql(7);

        delete u.age;
        historical.asOf(User, u, new Date('8-Oct-2016').getTime(), { name: 1 });
        expect(u.age).to.be.undefined;

        u = user1();
        delete u.age;
        u.$asOf(new Date('8-Oct-2015'), { name: 1 });
        expect(u.age).to.be.undefined;
      });

      it('should preserveInitialValues() automatically on records read from the db', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });
        await amy.$save();

        amy = await User.byId(2001);

        expect(amy.$orig).to.eql({ age: 36 });

        await User.remove({ _id: 2001 });
      });

      it('should _history for $save()', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined;

        amy.age = 37;

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history[0].p).to.eql({ age: [36] });

        await User.remove({ _id: 2001 });
      });

      it('should support push()', async () => {
        let startTime = new Date();

        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36,
          address: {}
        });

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
          name: {
            first: 'Amy',
            last: 'Tell',
            suffices: ['The Awesome', 'Sr', 'The Nice']
          },
          address: {
            notes: ['one', 'two', 'three']
          },
          age: 36
        });

        await amy.$save();

        await User.pull(2001, 'name.suffices', v => v === 'Sr');

        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined; // name isn't historical
        expect(amy.name.suffices).to.eql(['The Awesome', 'The Nice']);

        await User.pull(2001, 'address.notes', v => v === 'two');

        amy = await User.byId(2001);

        expect(amy._history.length).to.eql(1);
        expect(amy.address.notes).to.eql(['one', 'three']);
      });

      it('should support historical $update()', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });

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

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });

        await amy.$save();

        amy = await User.byId(2001, { fields: { age: 1 } });
        amy.age = 37;
        expect(amy._history).to.be.undefined;
        await amy.$update();

        amy = await User.byId(2001);
        expect(amy.age).to.eql(37);
        expect(amy._history.length).to.eql(1);

        await User.remove({ _id: 2001 });
      });

      it('should support author and comment', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });
        await amy.$save();

        amy = await User.byId(2001, { fields: { age: 1 } });
        amy.age = 37;
        await amy.$update({ author: 'u001', comment: 'age was wrong' });

        amy = await User.byId(2001);
        expect(amy._history.length).to.eql(1);
        expect(amy._history[0].a).to.eql('u001');
        expect(amy._history[0].c).to.eql('age was wrong');

        await User.remove({ _id: 2001 });
      });

      //amy = await User.byId(2001, { fields: { _history: 0 } });

      it('should prevent $save()s on $historical documents', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });

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

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          address: { street: '123 Mayberry' }
        });

        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history).to.be.undefined;

        amy.address.street = '123 Juneberry';
        await amy.$save();
        amy = await User.byId(2001);

        expect(amy._history[0].p).to.eql({
          address: [1, { street: ['123 Mayberry'] }]
        });

        await User.remove({ _id: 2001 });
      });

      it('should support asOf on query methods', async () => {
        await User.remove({ _id: 2001 });

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36
        });

        await amy.$save();
        amy = await User.byId(2001);

        amy.age = 37;
        await amy.$save();

        const oAmy = await User.byId(amy._id, { asOf: new Date('8-Oct-2015') });
        expect(oAmy.$historical).to.be.true;
        expect(oAmy.age).to.eql(36);
      });

      it('should support asOf with populated documents', async () => {
        await User.remove({ _id: 2001 });
        await Organization.remove({ _id: 2001 });

        let cc = new Organization({
          _id: 2001,
          name: 'Concrete Crackers',
          owner: 2001
        });
        await cc.$save();
        cc = await Organization.byId(2001);
        cc.name = 'Concrete R Us';
        await cc.$save();

        let amy = new User({
          _id: 2001,
          name: { first: 'Amy', last: 'Tell' },
          age: 36,
          organization: 2001
        });
        await amy.$save();
        amy = await User.byId(2001);
        amy.age = 37;
        await amy.$save();

        const oAmy = await User.byId(amy._id, {
          asOf: new Date('8-Oct-2015'),
          populate: { organization: $all }
        });
        expect(oAmy.$historical).to.be.true;
        expect(oAmy.age).to.eql(36);
        const oCc = oAmy.organization$;
        expect(oCc.$historical).to.be.true;
        expect(oCc.name).to.eql('Concrete Crackers');
      });

      it('should support preserveInitialValues', async () => {
        await Task.remove({ _id: 203 });

        let task = new Task({ _id: 203, name: 'Alpha' });
        await task.$save();
        task = await Task.byId(203);

        expect(task.$orig).to.be.undefined;

        task = new Task({ _id: 203, name: 'Preservation' });
        await task.$save();
        task = await Task.byId(203);

        task.name = 'New';

        expect(task.$orig).to.exist;
        expect(task.$orig.name).to.eql('Preservation');

        await task.$remove();
      });
    });
  });
}
