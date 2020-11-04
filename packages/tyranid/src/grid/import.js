import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
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
      const collection = Tyr.byName[imp.collectionName];
      if (!collection) {
        console.error(
          `Could not find collection "${imp.collectionName}" -- aborting import`
        );
        return;
      }

      const file = fileField.path.get(imp);
      let mediaType = file.type;
      const dotIdx = file.filename.lastIndexOf('.');
      if (dotIdx != -1) {
        const fileExtension = file.filename.substring(dotIdx + 1).toLowerCase();

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
            path: field.path,
          })),
        filename: await fileField.type.def.downloadS3(fileField, imp),
        defaults: imp.defaults,
        opts: event.opts,
        save: true,
      };

      switch (mediaType) {
        case 'text/csv':
          await Tyr.csv.fromCsv(importOpts);
          break;

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'vnd/ms-excel':
          await Tyr.excel.fromExcel(importOpts);
          break;

        default:
          console.error(
            `Cannot import file ${file.filename} of media type "${mediaType}" -- aborting import`
          );
      }
    }
  },
});

export class Importer {
  static BLOCK_SIZE = 2000;

  constructor(
    opts /*: {
    collection,
    columns: { path: Tyr.PathInstance }[],
    defaults: { [name: string]: any },
    opts: standard tyr options object,
    save?: boolean
  }*/
  ) {
    Object.assign(this, opts);
  }

  async fromClient(path, v) {
    const field = path.tail;

    if (typeof v === 'string') {
      try {
        return field.fromClient(v);
      } catch (err) {
        // fromClient is not async so it won't look up database lookups, do that here
        const { link } = field;

        if (link) {
          const d = await link.byLabel(v, { projection: { _id: 1 } });
          if (d) return d._id;

          console.error(
            `Could not find a ${link.label} with a label of "${v}"`
          );
          return;
        }

        throw err;
      }
    }

    return v;
  }

  /**
   * This converts something like:
   *
   * Trip: { name: 'Lake Superior', origin: { name: 'Duluth' }, destination: { name: 'Thunder Bay' } }
   *
   * into
   *
   * Location: { _id: A, name: 'Duluth' }
   * Location: { _id: B, name: 'Thunder Bay' }
   * Trip: { _id: C, name: 'Lake Superior', origin: A, destination: B }
   *
   */
  async saveDocument(collection, doc) {
    const visit = async (parentPath, obj) => {
      for (const fieldName in obj) {
        if (!obj.hasOwnProperty(fieldName)) continue;

        const p = parentPath
          ? parentPath.walk(fieldName)
          : collection.parsePath(fieldName);

        const { tail } = p;
        switch (tail.type.name) {
          case 'link':
            const { link } = tail;
            const nestedDoc = await this.saveDocument(
              link,
              new link(obj[fieldName])
            );
            obj[fieldName] = nestedDoc.$id;
            break;
          case 'array':
            const { detail } = p;
            const arr = obj[fieldName];

            switch (detail.type.name) {
              case 'link':
                // array of links
                const { link } = detail;
                obj[fieldName] = await Promise.all(
                  arr.map(async v => {
                    const nestedDoc = await this.saveDocument(
                      link,
                      new link(v)
                    );
                    return nestedDoc.$id;
                  })
                );
                break;

              case 'object':
                // array of objects
                for (let ai = 0, alen = arr.length; ai < alen; ai++) {
                  await visit(path.walk(ai), arr[ai]);
                }
                break;

              case 'array':
              // array of arrays ... TODO
            }

            break;
          case 'object':
            await visit(p, obj[fieldName]);
            break;
        }
      }
    };

    await visit(undefined, doc);

    // find an existing document
    let query = {};

    const { paths } = collection;
    let foundAnyData = false;
    for (const pathName in paths) {
      const field = paths[pathName];
      const { path } = field;
      const v = path.get(doc);
      if (!v) continue;

      foundAnyData = true;
      if (field.def.unique) {
        query = { [path.spath]: v };
        break;
      } else {
        query[path.spath] = v;
      }
    }

    // console.log('IMPORT - query', JSON.stringify(query, null, 2));
    if (foundAnyData) {
      const existingDoc = await collection.findOne({
        query,
      });

      if (existingDoc) {
        let changesFound = false;

        for (const pathName in paths) {
          const field = paths[pathName];
          const { path } = field;
          const v = path.get(doc);
          const vExisting = path.get(existingDoc);
          if (v && v !== vExisting) {
            // console.log(
            //   `change found for path ${path.name}, new:${v} vs. existing:${vExisting}`
            // );
            path.set(existingDoc, v, { create: true });
            changesFound = true;
          }
        }

        if (changesFound) await existingDoc.$save();
        // console.log(
        //   `        - ${
        //     changesFound ? 'updating' : 'using'
        //   } existing ${JSON.stringify(existingDoc)}`
        // );
        return existingDoc;
      }

      // console.log('        - creating new');
      await doc.$save();
      return doc;
    }
  }

  async importRow(row /*: any[]*/) {
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

    for (let ci = 0, clen = columns.length; ci < clen; ci++) {
      const c = columns[ci];
      if (!c || c.get) continue;

      const { path } = c;

      let v = row[ci];

      v = await this.fromClient(path, v);

      path.set(doc, v, { create: true });
    }

    if (defaults) Object.assign(doc, defaults);

    if (save) await this.saveDocument(collection, doc);
    return doc;
  }
}

export default TyrImport;
