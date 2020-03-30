import Collection from '../core/collection';

// TODO:  rename to componentConfig

// TODO:  some way for components to indicate what features they support

const tableConfigField = {
  is: 'object',
  fields: {
    name: { is: 'string', required: true },
    hidden: { is: 'boolean' },
    width: { is: 'integer' },
    filterValue: { is: 'object' },
    sortDirection: { is: 'string', note: 'ascend, descend, or null' }
  }
};

const TableConfig = new Collection({
  id: '_tc',
  name: 'tyrTableConfig',
  express: { rest: true },
  internal: true,
  fields: {
    _id: { is: 'mongoid' },
    fields: {
      is: 'array',
      of: tableConfigField,
      required: true,
      defaultValue: []
    },

    // TODO: what type of component

    key: { is: 'string' },
    documentUid: { is: 'string', requried: true },
    userId: { link: 'user?' },
    collectionId: { is: 'string', requried: true },
    pageSize: { is: 'integer', defaultValue: 10 }
  },
  indexes: [
    {
      key: { documentUid: 1, userId: 1, key: 1 }
    },
    {
      key: { collectionId: 1, userId: 1, key: 1 }
    }
  ]
});

export default TableConfig;
