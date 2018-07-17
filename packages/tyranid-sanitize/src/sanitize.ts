import * as faker from 'faker';
import { Tyr } from 'tyranid';

export type SanitizeConfig = boolean | 'name' | 'email' | 'lorem';

export interface SanitizeOptions {
  outDbName?: string;
  batchSize?: number;
  verbose?: boolean;
  serial?: boolean;
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
    verbose = false
  } = opts;

  const { log, error } = createLogger(opts);
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

  const outDb = Tyr.db.db(outDbName);

  /**
   * - for each collection
   * - create cursor of all docs
   * - for each doc, scramble text fields with 'sanitize: true' fields
   * - insert into new db with given name...
   */
  const sanitizeCollection = async (collection: Tyr.CollectionInstance) => {
    let skip = 0;
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
      await outCollection.insertMany(docs.map(sanitizer));
      docs = await next();
    }
  };

  if (opts.serial) {
    for (const collection of Tyr.collections) {
      await sanitizeCollection(collection);
    }
  } else {
    await Promise.all(Tyr.collections.map(sanitizeCollection));
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
  const { log, error } = createLogger(opts);

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
    log(`property: ${state.path}`);
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
        return walkObject(value, fieldDef.fields!, state);
      }

      default: {
        const sanitizeConfig = fieldDef.sanitize;
        return getSanitizedValue(sanitizeConfig, value);
      }
    }
  };

  /**
   * walk an object's properties
   *
   * @param value
   * @param fieldDef
   */
  const walkObject = (
    value: Tyr.RawMongoDocument,
    fieldDef: Tyr.FieldDefinition,
    state: WalkState
  ) => {
    log(`object: ${state.path}`);

    const out: Tyr.RawMongoDocument = {};
    for (const field in fieldDef.fields!) {
      out[field] = walk(
        value,
        fieldDef.fields![field].def!,
        extendPaths(field, state)
      );
    }
    return out;
  };

  /**
   * return sanitizer
   */
  return (doc: Tyr.RawMongoDocument) => {
    const out: Tyr.RawMongoDocument = {};
    for (const field in def.fields) {
      out[field] = walk(
        doc[field],
        def.fields[field].def,
        extendPaths(field, { path: def.name })
      );
    }
    return out;
  };
}

function getSanitizedValue<D>(
  sanitizeConfig?: SanitizeConfig,
  defaultValue?: D
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
