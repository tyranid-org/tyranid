import Collection from '../core/collection';

// TODO: rename to componentConfig

// TODO: some way for components to indicate what features they support

const configField = {
  is: 'object',
  fields: {
    name: { is: 'string', required: true },
    hidden: { is: 'boolean' },
    width: { is: 'integer' },
    filter: { is: 'object' },
    sortDirection: { is: 'string', note: 'ascend, descend, or null' },
  },
};

const ComponentConfig = new Collection({
  id: '_tc',
  name: 'tyrComponentConfig',
  express: { rest: true },
  internal: true,
  fields: {
    _id: { is: 'mongoid' },
    fields: {
      is: 'array',
      of: configField,
      required: true,
      defaultValue: [],
    },

    name: {
      is: 'string',
      help: 'Component Name (table, kanban, etc)',
      required: true,
    },
    key: {
      is: 'string',
      help:
        'Idenifier to distinguish between like type components used in different areas',
      defaultValue: 'default',
    },
    documentUid: { is: 'string', requried: true },
    userId: { link: 'user?' },
    collectionId: { is: 'string', requried: true },
    pageSize: { is: 'integer', defaultValue: 20 },
  },
  indexes: [
    {
      key: { documentUid: 1, userId: 1, key: 1 },
    },
    {
      key: { collectionId: 1, userId: 1, key: 1 },
    },
  ],
});

export default ComponentConfig;
