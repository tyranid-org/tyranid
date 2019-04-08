import * as chai from 'chai';

import { Tyr } from 'tyranid';

// const { expect, assert } = chai;

export function add() {
  const { User } = Tyr.collections;

  describe('excel.js', () => {
    it('should create an excel file', async () => {
      const users = await User.findAll();
      await Tyr.excel.toExcel({
        collection: User,
        documents: users,
        columns: [{ field: 'name.first' }, { field: 'name.last' }],
        filename: 'foo.xlsx'
      });
    });
  });
}
