import * as fs from 'fs';
import * as csv from 'fast-csv';

import Tyr from '../tyr';
import { Importer } from './import';
import { pathify } from './grid';

async function toCsv(opts) {
  let { collection, documents, filename, stream, columns } = opts;

  if (!documents) documents = [];
  if (!collection) collection = documents.length && documents[0];

  await pathify(collection, columns);

  const csvStream = csv.format({ headers: true });

  if (!stream) {
    if (!filename)
      throw new Tyr.AppError(
        'Either "filename" or "stream" must be specified in toCsv()'
      );

    stream = fs.createWriteStream(filename);
  }

  csvStream.pipe(stream);

  return new Promise(async (resolve, reject) => {
    try {
      csvStream.on('end', resolve);

      for (const document of documents) {
        const writeObj = {};

        for (const column of columns) {
          let { label, path, get } = column;
          if (!path) continue;

          if (!label) label = path.pathLabel;

          const field = path.tail;
          const type = field?.type;
          const value = get ? get(document) : path.get(document);

          writeObj[label] = type ? await type.format(field, value) : '' + value;
        }

        csvStream.write(writeObj);
      }

      csvStream.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function fromCsv(opts) {
  let { collection, filename, stream, columns, defaults, save } = opts;

  if (!collection)
    throw new Tyr.AppError('"collection" must be specified in fromCsv()');

  if (!stream) {
    if (!filename)
      throw new Tyr.AppError(
        'Either "filename" or "stream" must be specified in fromCsv()'
      );

    stream = fs.createReadStream(filename);
  }

  await pathify(collection, columns);

  const importer = new Importer({
    collection,
    columns,
    defaults,
    opts: opts.opts,
    save,
  });

  return new Promise(async (resolve, reject) => {
    try {
      const documents = [];
      const clen = columns.length;

      stream
        .pipe(csv.parse({ headers: true }))
        .on('error', reject)
        .on('data', async rowByLabel => {
          const row = [];
          for (let ci = 0; ci < clen; ci++) {
            const c = columns[ci];
            let { label, path, get } = c;
            if (get) continue;

            if (!label) label = path.pathLabel;

            row[ci] = rowByLabel[label];
          }

          documents.push(row);
        })
        .on('end', async (/*rowCount*/) => {
          resolve(
            await Promise.all(
              documents.map(d => importer.importRow(d))
            )
          );
        });
    } catch (err) {
      reject(err);
    }
  });
}

Tyr.csv = {
  toCsv,
  fromCsv,
};
