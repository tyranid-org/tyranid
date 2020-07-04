import Tyr from './tyr';

const TyrImport = new Tyr.Collection({
  id: '_im',
  name: 'tyrImport',
  internal: true,
  express: {
    rest: true,
  },
  fields: {
    _id: { is: 'mongoid' },
    collectionName: { is: 'string' },
    file: { is: 's3' },
    on: { is: 'datetime' },
    by: { link: 'user?' },
    defaults: { is: 'object' },
  },
  async fromClient(opts) {
    const user = opts.req.user;

    if (!this.on) this.on = new Date();
    if (!this.by) this.by = user._id;
  },
});

TyrImport.on({
  type: 'insert',
  when: 'post',
  async handler(event) {
    const fileField = TyrImport.fields.file;

    for (const imp of await event.documents) {
      const collection = Tyr.byName[imp.collectionName];

      // TODO:  is this a CSV file then fromCsv else fromExcel

      const docs = await Tyr.excel.fromExcel({
        collection,
        columns: Object.values(collection.fields)
          .filter(field => !field.readonly && field.relate !== 'ownedBy')
          .map(field => ({
            field: field.name,
          })),
        filename: await fileField.type.def.downloadS3(fileField, imp),
      });

      if (imp.defaults) {
        const assigning = await collection.fromClient(
          imp.defaults,
          undefined,
          event.opts
        );

        for (const doc of docs) {
          Object.assign(doc, assigning);
        }
      }

      for (const doc of docs) {
        await doc.$save();
      }
    }
  },
});

export default TyrImport;
