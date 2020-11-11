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
    endedAt: { is: 'datetime' },
    user: { link: 'user?' },
    defaults: { is: 'object' },
    issues: { is: 'text' },
    columns: {
      is: 'array',
      of: {
        is: 'object',
        fields: {
          path: { is: 'string' },
          createOnImport: { is: 'boolean' },
        },
      },
    },
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

    const importDoc = async imp => {
      try {
        const collection = Tyr.byName[imp.collectionName];
        if (!collection)
          throw `Could not find collection "${imp.collectionName}" -- aborting import.`;

        const file = fileField.path.get(imp);
        let mediaType = file.type;
        const dotIdx = file.filename.lastIndexOf('.');
        if (dotIdx != -1) {
          const fileExtension = file.filename
            .substring(dotIdx + 1)
            .toLowerCase();

          switch (fileExtension) {
            case 'csv':
              // web browsers import csv files as vnd.ms-excel so that it opens up a spreadsheet like excel
              // instead of a text editor, but here we need to know if it is CSV or Excel
              mediaType = 'text/csv';
              break;
          }
        }

        const importOpts = {
          collection,
          columns:
            imp.columns.map(c => ({
              ...c,
              path: collection.parsePath(c.path),
            })) ||
            Object.values(collection.fields)
              .filter(field => !field.readonly && field.relate !== 'ownedBy')
              .map(f => ({ path: f.path })),
          filename: await fileField.type.def.downloadS3(fileField, imp),
          defaults: imp.defaults,
          opts: event.opts,
          save: true,
          log: imp,
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
            throw `Cannot import file ${file.filename} of media type "${mediaType}" -- aborting import`;
        }
      } catch (err) {
        const m = err.message || 'Unknown error occured.';
        imp.issues = imp.issues || '';
        imp.issues += m + '\n';
        console.error(err);
      }
      imp.endedAt = new Date();

      console.log('Import complete.');
      await imp.$update({ fields: { endedAt: 1, issues: 1 } });
    };

    for (const imp of await event.documents) {
      importDoc(imp); // TODO: Move this into a backround service
    }
  },
});

export class Importer {
  constructor(
    opts /*: {
    collection,
    columns: { path: Tyr.PathInstance, createOnImport?: boolean }[],
    defaults: { [name: string]: any },
    opts: standard tyr options object,
    save?: boolean,
    log: (message: string) => void
  }*/
  ) {
    Object.assign(this, opts);
  }

  async fromClient(column, v) {
    const field = column.path.tail;

    if (typeof v === 'string') {
      try {
        return field ? field.fromClient(v) : v;
      } catch (err) {
        // fromClient is not async so it won't look up database lookups, do that here
        const link = field?.link;

        if (link) {
          const d = await link.byLabel(v, { projection: { _id: 1 } });
          if (d) return d._id;

          if (column.createOnImport) {
            const linkDoc = new link({ [link.labelField.pathName]: v });

            await linkDoc.$save(this.opts);

            return linkDoc._id;
          } else {
            this.log(`Could not find a ${link.label} with a label of "${v}".`);
            return;
          }
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
            const v = obj[fieldName];

            if (Tyr.isObject(v)) {
              const nestedDoc = await this.saveDocument(
                link,
                new link(obj[fieldName])
              );
              obj[fieldName] = nestedDoc?.$id;
            }

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
                    return nestedDoc?.$id;
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

    console.log('IMPORT - query', JSON.stringify(query, null, 2));
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
          if (v && !Tyr.isEqual(v, vExisting)) {
            console.log(
              `change found for path ${path.name}, new:${v} vs. existing:${vExisting}`
            );
            path.set(existingDoc, v, { create: true });
            changesFound = true;
          }
        }

        if (changesFound) await existingDoc.$save(this.opts);
        console.log(
          `        - ${
            changesFound ? 'updating' : 'using'
          } existing ${JSON.stringify(existingDoc)}`
        );
        return existingDoc;
      }

      console.log('        - creating new');
      await doc.$save(this.opts);
      return doc;
    }

    console.log(`        - didn't find any data`);
    //return undefined;
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

      if (typeof v === 'number') {
        // excel will convert strings to numbers if they are just numeric characters
        v = String(v);
      }

      v = await this.fromClient(c, v);

      path.set(doc, v, { create: true });
    }

    if (defaults) Object.assign(doc, defaults);

    if (save) await this.saveDocument(collection, doc);
    return doc;
  }
}

export default TyrImport;
