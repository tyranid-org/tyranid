import {
  OAuth2ApplicationSecurity,
  Path,
  Security,
  Spec
} from 'swagger-schema-official';

import { Tyr as Tyranid } from 'tyranid';
import {
  ExtendedSchema,
  Options,
  PartitionedCollectionSchemaOptions,
  SchemaContainer,
  SchemaOptions,
  CollectionSchemaOptions
} from '../interfaces';
import {
  each,
  error,
  options,
  pluralize,
  validate,
  yaml,
  pascal,
  sortByName,
  isPartitionedOptions
} from '../utils';
import ErrorResponse from './error-schema';
import { path } from './path';
import { schema } from './schema';

import { collectionScopes, createSecurityDefinitions } from './security';

/**
 * Given an instance of tyranid, create a Open API api spec
 *
 * @param Tyr initialized tyranid object
 * @param options schema generation options
 */
export function spec(
  Tyr: typeof Tyranid,
  opts: Options & { yaml: true }
): string;
export function spec(
  Tyr: typeof Tyranid,
  opts?: Options & { yaml?: void | false }
): Spec;
export function spec(Tyr: typeof Tyranid, opts: Options = {}): Spec | string {
  const {
    version = '1.0.0',
    description = 'Public API generated from tyranid-open-api-spec',
    title = 'Public API',
    host = 'localhost:9000',
    basePath = '/',
    schemes = ['https']
  } = opts;

  const oauth2Scopes = {};

  const specObject = {
    swagger: '2.0',
    info: {
      description,
      title,
      version
    },
    basePath,
    schemes,
    host,
    paths: {} as { [key: string]: Path },
    definitions: {} as { [key: string]: ExtendedSchema }
  };

  const lookup = {} as { [key: string]: SchemaContainer };
  const collections = Tyr.collections.filter(c => c.def.openAPI);

  /**
   * create Open API object schemas for relevant collections / properties
   */
  const specList = collections.reduce((out, col) => {
    const virtualList = getIndividualOpts(col).map(individualOpts => {
      const result = schema(col.def, individualOpts);
      return {
        name: result.pascalName,
        result,
        schema: result.schema
      };
    });

    return [...virtualList, ...out];
  }, [] as { name: string; schema: ExtendedSchema; result: SchemaContainer }[]);

  /**
   * sort results by public name
   */
  specList.sort(sortByName);

  specList.forEach(item => {
    const { result, name, schema } = item;
    lookup[name] = result;
    specObject.definitions[name] = schema;
  });

  /**
   * add error refs
   */
  each(ErrorResponse, (schema, name) => {
    specObject.definitions[name] = schema;
  });

  /**
   * create routes referencing relevant schema
   */
  const pathItems = collections.reduce(
    (out, col) => {
      getIndividualOpts(col).forEach(indOpts => {
        const result = path(col.def, indOpts, lookup);
        const paths = result.paths;
        const name = pascal(indOpts.name || col.def.name);

        out.paths.push({ paths, name });

        if (!indOpts.parent || !indOpts.useParentScope) {
          out.scopes.push(collectionScopes(result.base, lookup[name].name));
        }
      });

      return out;
    },
    { paths: [], scopes: [] } as {
      paths: { paths: { route: string; path: Path }[]; name: string }[];
      scopes: { [x: string]: string }[];
    }
  );

  const { paths: pathsToAdd, scopes: scopesToAdd } = pathItems;

  // sort paths by public name
  pathsToAdd.sort(sortByName);

  pathsToAdd.forEach(item => {
    const { paths } = item;
    for (const p of paths) {
      specObject.paths[p.route] = p.path;
    }
  });

  scopesToAdd.forEach(scopes => {
    // add scopes for this collection
    Object.assign(oauth2Scopes, scopes);
  });

  const [scheme] = schemes;
  Object.assign(specObject, {
    securityDefinitions: createSecurityDefinitions(
      scheme + '://' + host,
      oauth2Scopes
    )
  });

  const result = validate(specObject);

  /**
   * validate schema before returning
   */
  if (!result.valid) {
    console.log(result.errors);
    return error(`
      generated schema is invalid, inspect schema annotations for problems
      or file an issue at https://github.com/CrossLead/tyranid-openapi/issues
    `);
  }

  return opts.yaml ? yaml(specObject) : specObject;
}

/**
 * get all virtual collection specs from a tyranid collection
 *
 * @param col tyranid collection
 */
function getIndividualOpts(col: Tyranid.CollectionInstance) {
  const colOpts = options(col.def);

  if (isPartitionedOptions(colOpts)) {
    const optList = colOpts.partition;

    // validate that all partitions have a restriction query
    optList.forEach(partition => {
      if (!partition.name) {
        throw new Error(
          `Partition has no name: ${JSON.stringify(partition, null, 2)}`
        );
      }
      if (!partition.partialFilterExpression) {
        throw new Error(
          `Partition has no partialFilterExpression: ${JSON.stringify(
            partition,
            null,
            2
          )}`
        );
      }
    });

    return optList;
  } else {
    return [colOpts];
  }
}
