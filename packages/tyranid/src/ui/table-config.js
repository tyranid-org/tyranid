import Collection from '../core/collection';

const tableConfigField = {
  is: 'object',
  fields: {
    name: { is: 'string', required: true },
    hidden: { is: 'boolean' },
    width: { is: 'integer' }
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
