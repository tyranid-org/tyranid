import * as chai from 'chai';

import Tyr from '../src/tyranid';

const { expect } = chai;

export function add() {
  describe('fake.js', () => {
    let User;

    before(() => {
      User = Tyr.byName.user;
    });

    describe('fake.js', function () {
      describe('Fake data generation', function () {
        const seed = 100;

        it('faker: should successfully create valid document', async () => {
          const fakeDoc = await User.fake({ seed });
          expect(
            fakeDoc,
            'Fake document should be valid instance of user'
          ).to.be.instanceOf(User);
          fakeDoc.$validate();
        });

        it('faker: should produce same document given same seed', async () => {
          const fakeDoc1 = JSON.stringify(await User.fake({ seed }), null, 2),
            fakeDoc2 = JSON.stringify(await User.fake({ seed }), null, 2);

          expect(fakeDoc2).to.deep.equal(fakeDoc1);
        });
      });
    });
  });
}
