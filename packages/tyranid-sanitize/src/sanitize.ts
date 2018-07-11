import * as faker from 'faker';
import { Tyr } from 'tyranid';

interface SanitizeOptions {
  outDbName?: string;
  batchSize?: number;
  verbose?: boolean;
}

/**
 * sanatize a database based on tyranid schema
 *
 * @param tyr
 */
export async function sanitize(tyr: typeof Tyr, opts: SanitizeOptions = {}) {
  const {
    outDbName = Tyr.db.databaseName + '____sanitized',
    batchSize = 200,
    verbose = false
  } = opts;

  const format = (str: string) => `tyranid-sanitize: ${str}`;
  const log = (str: string) => verbose && console.log(format(str));
  const error = (str: string) => {
    throw new Error(str);
  };

  const admin = await Tyr.db.admin();
  const existingDbs = await admin.listDatabases();
  if (existingDbs.databases.indexOf(outDbName) !== -1) {
    return error(`Dabased named ${outDbName} already exists.`);
  }

  log(
    `Creating santized version of ${
      Tyr.db.databaseName
    } in new database: ${outDbName}`
  );

  const outDb = await Tyr.db.db(outDbName).open();

  /**
   * - for each collection
   * - create cursor of all docs
   * - for each doc, scramble text fields with 'sanitize: true' fields
   * - insert into new db with given name...
   */
  await Promise.all(
    Tyr.collections.map(async collection => {
      let skip = 0;
      const sanitizer = createDocumentSanitizer(collection.def);
      const outCollection = outDb.collection(collection.def.dbName!);

      const next = async () => {
        const docs = await collection.findAll({
          query: {},
          skip,
          limit: batchSize
        });
        skip += batchSize;
        return docs;
      };

      let docs = await next();

      while (docs.length) {
        const sanitized = docs.map(sanitizer);
        await outCollection.insertMany(sanitized);
        docs = await next();
      }
    })
  );
}

/**
 * sanitize a single document given its schema
 *
 * @param def
 * @param doc
 */
function createDocumentSanitizer(def: Tyr.CollectionDefinitionHydrated) {
  return (doc: Tyr.RawMongoDocument) => {
    for (const field in def.fields) {
      const fieldDef = def.fields[field];
      switch (fieldDef.def.is) {
      //
      }
    }

    return doc;
  };
}
