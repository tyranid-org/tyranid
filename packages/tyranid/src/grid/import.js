import Tyr from '../tyr';

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
    user: { link: 'user?' },
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
      console.log('imp.collectionName', imp.collectionName);
      const collection = Tyr.byName[imp.collectionName];
      if (!collection) {
        console.error(`Could not find collection "${imp.collectionName}" -- aborting import`);
        return;
      }

      const file = fileField.path.get(imp);
      let mediaType = file.type;
      const dotIdx = file.filename.lastIndexOf('.');
      if (dotIdx != -1) {
        const fileExtension = file.filename.substring(dotIdx+1).toLowerCase();

        switch (fileExtension) {
          case 'csv':
            // web browsers import csv files as vnd.ms-excel so that it opens up a spreadsheet like excel instead
            // of a text editor, but here we need to know if it is CSV or Excel
            mediaType = 'text/csv';
            break;
        }
      }

      const importOpts = {
        collection,
        columns: Object.values(collection.fields)
          .filter(field => !field.readonly && field.relate !== 'ownedBy')
          .map(field => ({
            path: field.path
          })),
        filename: await fileField.type.def.downloadS3(fileField, imp),
        defaults: imp.defaults,
        opts: event.opts,
        save: true
      };

      switch (mediaType) {
        case 'text/csv':
          await Tyr.csv.fromCsv(importOpts);
          break;

        case 'vnd/ms-excel':
          await Tyr.excel.fromExcel(importOpts);
          break;

        default:
          console.error(`Cannot import file ${file.filename} of media type "${mediaType}" -- aborting import`);
      }
    }
  },
});

export class Importer {
  static BLOCK_SIZE = 2000;

  /*

     /. fix import "Name, Account #, Name" ... i.e. two names on import columns

     /. lookup ids by label asynchronously if it isn't static

     /. recursively create nested objects

     /. make sure tests pass

   */

  constructor(opts/*: {
    collection,
    columns: { path: Tyr.PathInstance }[],
    defaults: { [name: string]: any },
    opts: standard tyr options object,
    save?: boolean
  }*/) {
    Object.assign(this, opts);
  }

  async importRow(row/*: any[]*/) {
    let { collection, columns, defaults, save } = this;

    if (defaults && !this.defaultsProcessed) {
      defaults = this.defaults = await collection.fromClient(
        defaults,
        undefined,
        this.opts
      );
      this.defaultsProcessed = true;
    }

    const doc = new collection({});

    for (let ci = 0, clen = columns.length; ci<clen; ci++) {
      const c = columns[ci];
      if (!c || c.get) continue;

      const { path } = c;
      const field = path.tail;

      let v = row[ci];

      if (typeof v === 'string') v = field.fromClient(v);

      console.log('path.name', path.name, 'v', JSON.stringify(v));
      path.set(doc, v, { create: true });
    }

    if (defaults) Object.assign(doc, defaults);

    if (save) await doc.$save();

    return doc;
  }
}

export default TyrImport;
