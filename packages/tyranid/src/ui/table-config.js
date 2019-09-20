import Tyr from '../tyr';
import Collection from '../core/collection';

const tableConfigField = {
  is: 'object',
  fields: {
    name: { is: 'string', required: true },
    hidden: { is: 'boolean' }
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
    documentUid: { is: 'string' },
    userId: { link: 'user?' },
    collectionId: { is: 'string' }
  },
  indexes: [
    {
      key: { documentUid: 1, userId: 1 }
    },
    {
      key: { collectionId: 1, userId: 1 }
    }
  ],
  fromClient(/*opts*/) {
    if (!this.collection && this.documentUid) {
      this.collectionId = Tyr.parseUid(this.documentUid).collection.id;
    }
  }
});

export default TableConfig;
