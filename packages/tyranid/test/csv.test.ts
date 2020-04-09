import * as chai from 'chai';

import { Tyr } from 'tyranid';
import { extractProjection } from '../src/core/projection';
import { TypeQueryNode } from 'typescript';

const { expect } = chai;

export function add() {
  const { User } = Tyr.collections;

  describe('csv.js', () => {
    it('should create and parse a csv file', async () => {
      const users = await User.findAll({ query: { name: { $exists: true } } });

      const csvDef: Tyr.CsvDef<Tyr.User> & { documents: Tyr.User[] } = {
        collection: User,
        documents: users,
        columns: [
          { field: 'name.first' },
          { field: 'name.last' },
          {
            field: 'name',
            get(doc) {
              const { name } = doc;
              return name ? name.first + ' ' + name.last : 'Unnamed';
            },
          },
          { field: 'job' },
          { field: 'age' },
        ],
        filename: 'foo.csv',
      };

      await Tyr.csv.toCsv(csvDef);

      const readUsers = await Tyr.csv.fromCsv(csvDef);

      expect(readUsers.length).to.eql(users.length);

      for (let i = 0; i < users.length; i++) {
        const user = users[i],
          readUser = readUsers[i];

        expect(user.name?.first).to.eql(readUser.name?.first);
        expect(user.age).to.eql(readUser.age);
      }
    });
  });
}
