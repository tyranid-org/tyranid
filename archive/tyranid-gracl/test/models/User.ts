import { Tyr } from 'tyranid';

export const User = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    teamIds: {
      is: 'array',
      of: {
        link: 'team',
        relate: 'ownedBy',
        graclTypes: ['subject', 'resource']
      }
    },
    organizationId: { link: 'organization' }
  }
});
