import { Tyr } from 'tyranid';

export const InventoryBaseCollection = new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  graclConfig: {
    permissions: {
      excludeCollections: ['user', 'blog', 'post'],
      exclude: ['view_alignment_triangle_private']
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: { is: 'string' } },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: ['resource']
    }
  }
});

export class Inventory extends (InventoryBaseCollection as Tyr.CollectionInstance) {}
