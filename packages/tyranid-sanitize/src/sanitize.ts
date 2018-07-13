import * as faker from 'faker';
import { Tyr } from 'tyranid';

export type SanitizeConfig = boolean | 'name' | 'email' | 'lorem';

interface SanitizeOptions {
  outDbName?: string;
  batchSize?: number;
  verbose?: boolean;
}

/**
 * sanatize a database based on tyranid schema
 *
 * @param tyr
 * @param opts
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
        await outCollection.insertMany(docs.map(sanitizer));
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
  /**
   * document walker
   *
   * @param doc
   * @param fields
   */
  const walk = (
    doc: Tyr.RawMongoDocument,
    fields: Record<string, Tyr.FieldInstance>
  ) => {
    const out: Tyr.RawMongoDocument = {};

    for (const field in def.fields!) {
      const fieldDef = def.fields![field]!;
      const { is } = fieldDef.def;

      switch (is) {
        case 'array': {
          break;
        }

        case 'object': {
          out[field] = walk(doc, fieldDef.fields!);
          break;
        }

        default: {
          const value = fieldDef.namePath.get(doc);
          const sanitizeConfig = fieldDef.def.def!.sanitize;
          out[field] = getSanitizedValue(sanitizeConfig, value);
          break;
        }
      }
    }

    return out;
  };

  /**
   * return sanitizer
   */
  return (doc: Tyr.RawMongoDocument) => walk(doc, def.fields);
}

function getSanitizedValue<D>(sanitizeConfig: SanitizeConfig, defaultValue: D) {
  if (!sanitizeConfig) return defaultValue;
  switch (sanitizeConfig) {
    case 'name':
      return faker.name.findName();
    case 'email':
      return faker.internet.email();
    case 'lorem':
      return faker.lorem.sentences();
    default:
      return faker.lorem.text();
  }
}
