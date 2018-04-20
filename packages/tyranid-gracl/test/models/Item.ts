import { Tyr } from 'tyranid';

export const Item = new Tyr.Collection({
  id: 'itm',
  name: 'item',
  dbName: 'items',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    userId: {
      link: 'user',
      relate: 'ownedBy',
      graclTypes: ['resource']
    }
  }
});
