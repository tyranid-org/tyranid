import * as faker from 'faker';
import { Tyr } from 'tyranid';

export type SanitizeConfig = boolean | 'name' | 'email' | 'lorem';

export interface SanitizeOptions {
  /**
   * desired name of the output database
   */
  outDbName?: string;
  /**
   * number of documents to batch insert at a time
   */
  batchSize?: number;
  /**
   * verbose progress logging
   */
  verbose?: boolean;
  /**
   * sanitize each collection serially (defaults to concurrently)
   */
  serial?: boolean;
  /**
   * faker.js seed
   */
  seed?: number;
}

export interface WalkState {
  path: string;
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
    seed
  } = opts;

  const { log, error } = createLogger(opts);
  const admin = await Tyr.db.admin();
  const existingDbs = await admin.listDatabases();
  if (
    existingDbs.databases.find((d: { name: string }) => d.name === outDbName)
  ) {
    return error(`Dabased named ${outDbName} already exists.`);
  }

  if (seed) faker.seed(seed);

  log(
    `Creating santized version of ${
      Tyr.db.databaseName
    } in new database: ${outDbName}`
  );

  const outDb = Tyr.db.db(outDbName);

  /**
   * - for each collection
   * - create cursor of all docs
   * - for each doc, scramble text fields with 'sanitize: true' fields
   * - insert into new db with given name...
   */
  const sanitizeCollection = async (collection: Tyr.CollectionInstance) => {
    let skip = 0;
    let total = 0;
    const sanitizer = createDocumentSanitizer(collection.def, opts);
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
      total += docs.length;
      await outCollection.insertMany(docs.map(sanitizer));
      log(`sanitized ${total} docs from collection ${collection.def.name}`);
      docs = await next();
    }
  };

  const collections = Tyr.collections.filter(c => !c.def.internal);

  if (opts.serial) {
    for (const collection of collections) {
      await sanitizeCollection(collection);
    }
  } else {
    await Promise.all(collections.map(sanitizeCollection));
  }
}

/**
 * sanitize a single document given its schema
 *
 * @param def
 * @param doc
 */
function createDocumentSanitizer(
  def: Tyr.CollectionDefinitionHydrated,
  opts: SanitizeOptions
) {
  const { log } = createLogger(opts);

  /**
   * document walker
   *
   * @param doc
   * @param fields
   */
  const walk = (
    value: Tyr.RawMongoDocument,
    fieldDef: Tyr.FieldDefinition,
    state: WalkState
  ) => {
    const { is } = fieldDef;
    if (!is || !value) return value;

    switch (is) {
      case 'array': {
        const { of } = fieldDef;
        if (!of) return [];

        return value.map((i: Tyr.RawMongoDocument) =>
          walk(i, of, extendPaths('[]', state))
        );
      }

      case 'object': {
        const fields = fieldDef.fields;
        if (!fields) return value;
        const out: Tyr.RawMongoDocument = {};
        for (const field in fields) {
          const innerFieldDef = fields[field].def;
          if (!innerFieldDef) {
            out[field] = value[field];
          } else {
            out[field] = walk(
              value[field],
              innerFieldDef,
              extendPaths(field, state)
            );
          }
        }
        return out;
      }

      default: {
        const sanitizeConfig = fieldDef.sanitize;
        return getSanitizedValue(value, sanitizeConfig);
      }
    }
  };

  /**
   * return sanitizer
   */
  return (doc: Tyr.RawMongoDocument) => {
    const out: Tyr.RawMongoDocument = {};
    const state = extendPaths(def.name);
    for (const field in def.fields) {
      out[field] = walk(
        doc[field],
        def.fields[field].def,
        extendPaths(field, state)
      );
    }
    return out;
  };
}

function getSanitizedValue<D>(
  defaultValue: D,
  sanitizeConfig?: SanitizeConfig
) {
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

function createLogger(opts: SanitizeOptions) {
  const { verbose } = opts;
  const format = (str: string) => `tyranid-sanitize: ${str}`;
  const log = (str: string) => verbose && console.log(format(str));
  const error = (str: string) => {
    throw new Error(str);
  };

  return {
    format,
    log,
    error
  };
}

function extendPaths(path: string, state: WalkState = { path: '' }): WalkState {
  return {
    ...state,
    path: `${state.path}.${path}`
  };
}
