import { Tyr } from 'tyranid';

export const Team = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  graclConfig: {
    permissions: {
      includeCollections: ['team', 'user', 'chart', 'post', 'blog'],
      include: ['abstract_view_chart']
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: ['subject', 'resource']
    }
  }
});
