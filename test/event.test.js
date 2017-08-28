
import * as _                    from 'lodash';
import * as chai                 from 'chai';
import * as mongodb              from 'mongodb';

import Tyr                       from '../src/tyranid';

const {
  ObjectId
} = mongodb;

const {
  expect,
} = chai;

export function add() {
  describe('event.js', () => {
    let User;

    before(() => {
      User = Tyr.byName.user;
    });

    it('should allow you to register events and unregister', async () => {
      const dereg = User.on({ type: 'remove', handler: (/*event*/) => {}});
      dereg();
    });

    it('should allow you to cancel removes', async () => {
      const dereg = User.on({ type: 'remove', handler: (/*event*/) => {
        throw new Error('stop');
      }});

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
      expect(u1).to.be.defined;

      await u1.$remove();

      u1 = await User.byId(2001);
      expect(u1).to.be.null;
    });
  });
}
