import * as fs from 'fs';

import * as csv from 'fast-csv';

import Tyr from './tyr';

async function pathify(collection, columns) {
  for (const column of columns) {
    const { path } = column;

    if (!(path instanceof Tyr.Path)) {
      try {
        column.path = collection.parsePath(path);
      } catch {
        column.path = (await collection.findField(path))?.path;
      }
    }
  }
}

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
  let { collection, filename, stream, columns } = opts;

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

  return new Promise(async (resolve, reject) => {
    try {
      const documents = [];

      stream
        .pipe(csv.parse({ headers: true }))
        .on('error', reject)
        .on('data', row => {
          const doc = new collection({});

          for (const column of columns) {
            let { label, path, get } = column;
            if (get) continue;

            if (!label) label = path.pathLabel;

            const field = path.tail;
            const type = field?.type;

            path.set(doc, type.fromString(row[label]), {
              create: true,
            });
          }

          documents.push(doc);
        })
        .on('end', (/*rowCount*/) => {
          resolve(documents);
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
