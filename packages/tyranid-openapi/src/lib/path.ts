import { Parameter, Path, Schema } from 'swagger-schema-official';
import { Tyr } from 'tyranid';
import {
  ExtendedSchema,
  IndividualCollectionSchemaOptions,
  Method,
  PathContainer,
  SchemaContainer
} from '../interfaces';
import {
  each,
  error,
  options,
  pascal,
  pick,
  pluralize,
  isPartitionedOptions
} from '../utils';
import * as baseParameters from './base-find-parameters';
import ErrorResponse from './error-schema';
import { createScope, requireScopes } from './security';

const MAX_ARRAY_ITEMS = 200;

/**
 * Given a tyranid schema, produce an object path
 * to insert into the Open API spec.
 *
 * @param def a tyranid collection schema definition object
 */
export function path(
  def: Tyr.CollectionDefinitionHydrated,
  opts: IndividualCollectionSchemaOptions,
  lookup: { [key: string]: SchemaContainer }
): PathContainer {
  const methods = new Set(opts.methods || ['all']);
  const includeMethod = (route: string) =>
    methods.has(route) || methods.has('all');
  const lookupName = pascal(opts.name || def.name);
  const schemaDef = lookup[lookupName];
  const baseCollectionName = pluralize(schemaDef.name);
  const baseRouteParameters: Parameter[] = [];

  const { pascalName, schema } = schemaDef;
  const cloneSchema = () =>
    JSON.parse(JSON.stringify(schemaDef.schema)) as ExtendedSchema;

  const putSchema = cloneSchema();
  const postSchema = cloneSchema();

  putSchema.properties = makeOptional(
    filterNotReadOnly(putSchema.properties || {})
  );
  putSchema.properties!._id = schemaDef.schema.properties!._id;
  putSchema.required = ['_id'];

  postSchema.properties = filterNotReadOnly(postSchema.properties || {});

  let baseCollectionRoute = baseCollectionName;

  let parentScopeBase = '';

  let tag = baseCollectionName;

  /**
   * find id linking to parent
   */
  if (opts.parent) {
    const parentField = each(def.fields, (field, name) => {
      if (field.link && field.link.def.name === opts.parent) {
        return { field, name };
      }
    });

    if (!parentField) {
      return error(`
        collection ${def.name} has no property linking
        to collection ${opts.parent}
      `);
    }

    const parentId = parentField.field.link!.def.id;
    const parentColDef = Tyr.byId[parentId].def;
    const parentOpts = options(parentColDef);
    if (isPartitionedOptions(parentOpts)) {
      throw new Error(`Can't have a partitioned collection as parent`);
    }
    const parentName = pascal(parentOpts.name || parentColDef.name);

    const parentDef = lookup[parentName];
    if (!parentDef) {
      return error(`
        parent collection (${parentField.field.link!.def.name})
        is not exposed to the public api
      `);
    }

    /**
     * add route parameter
     */
    baseRouteParameters.push(({
      name: parentField.name,
      type: 'string',
      in: 'path',
      required: true,
      description: 'ID of linked ' + parentDef.name,
      ['x-tyranid-openapi-object-id']: true
    } as {}) as Parameter);

    /**
     * remove parent link id from post schema
     */
    delete putSchema.properties![parentField.name];
    delete postSchema.properties![parentField.name];

    parentScopeBase = pluralize(parentDef.name);
    tag = parentScopeBase;

    /**
     * /metrics/{metricId}/metricTargets -> /metrics/{metricId}/targets
     */
    let subRouteName = baseCollectionName;
    if (baseCollectionRoute.indexOf(parentDef.name) === 0) {
      const removed = baseCollectionRoute.replace(parentDef.name, '');
      subRouteName = removed.charAt(0).toLocaleLowerCase() + removed.slice(1);
    }

    /**
     * add route base
     *
     * TODO: we probably want to topologically sort the routes
     *       so we can create parent routes first and then
     *       append child routes to the created parent route
     */
    baseCollectionRoute = [
      pluralize(parentDef.name),
      `{${parentField.name}}`,
      subRouteName
    ].join('/');
  }

  if (!schemaDef) {
    return error(`
      No schema definition found for collection id = ${def.id}
    `);
  }

  const out = {
    id: def.id,
    base: baseCollectionName,
    paths: [] as { route: string; path: Path }[]
  };

  const common = {
    ['x-tyranid-openapi-collection-id']: def.id,
    tags: [tag]
    // https://github.com/CrossLead/tyranid-openapi/issues/17
  } as any; // TODO: hack for typings for now

  const returns = {
    produces: ['application/json']
  };

  const parameters = (...params: Parameter[]) => {
    return {
      parameters: [...baseRouteParameters, ...params]
    };
  };

  const addScopes = (scope: 'read' | 'write') => {
    const scopes = [];

    if (parentScopeBase) {
      scopes.push(createScope(parentScopeBase, scope));
    }

    if (!parentScopeBase || !opts.useParentScope) {
      scopes.push(createScope(baseCollectionName, scope));
    }

    return requireScopes(...scopes);
  };

  const schemaRef = toRef(pascalName);

  const idParameter: Parameter = {
    name: '_id',
    in: 'path',
    type: 'string',
    description: `ID of the ${pascalName} object`,
    required: true
  };

  (idParameter as any)['x-tyranid-openapi-object-id'] = true;

  /**
   *
   * base routes
   *
   */
  const baseRoutes = {
    route: `/${baseCollectionRoute}`,
    path: {} as Path
  };
  out.paths.push(baseRoutes);

  /**
   * GET /<collection>/
   */
  if (includeMethod('get')) {
    const filteredSchema = filterSchemaForMethod('get', schemaDef.schema);
    if (!filteredSchema) throw new Error(`No schema for get after filtering`);

    baseRoutes.path.get = {
      ...common,
      ...returns,
      ...parameters(...baseParameters.DEFAULT_PARAMETERS),
      ...addScopes('read'),
      summary: `retrieve multiple ${pascalName} objects`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(
          `array of ${pascalName} objects`,
          {
            type: 'array',
            maxItems: MAX_ARRAY_ITEMS,
            items: filteredSchema
          },
          {
            paging: {
              type: 'object',
              description: 'Parameter settings for next page of results',
              properties: (() => {
                const props = {
                  $limit: pick(baseParameters.LIMIT, [
                    'type',
                    'description',
                    'default'
                  ]),
                  $skip: pick(baseParameters.SKIP, [
                    'type',
                    'description',
                    'default'
                  ]),
                  $sort: pick(baseParameters.SORT, [
                    'type',
                    'description',
                    'default'
                  ])
                };

                props.$skip.default = props.$limit.default;
                return props;
              })()
            }
          }
        )
      }
    };
  }

  /**
   * POST /<collection>/
   */
  if (includeMethod('post')) {
    const filteredBodySchema = filterSchemaForMethod('post', postSchema);
    if (!filteredBodySchema)
      throw new Error(`No schema for post after filtering`);

    const filteredResponseSchema = filterSchemaForMethod(
      'post',
      schemaDef.schema
    );
    if (!filteredResponseSchema)
      throw new Error(`No schema for post after filtering`);

    baseRoutes.path.post = {
      ...common,
      ...returns,
      ...addScopes('write'),
      ...parameters({
        name: 'data',
        in: 'body',
        description: `Array of new ${pascalName} objects`,
        required: true,
        schema: {
          type: 'array',
          maxItems: MAX_ARRAY_ITEMS,
          items: filteredBodySchema
        }
      }),
      summary: `create new ${pascalName} objects`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`created ${pascalName} objects`, {
          type: 'array',
          maxItems: MAX_ARRAY_ITEMS,
          items: filteredResponseSchema
        })
      }
    };
  }

  /**
   * PUT /<collection>/
   */
  if (includeMethod('put')) {
    const filteredBodySchema = filterSchemaForMethod('put', putSchema);
    if (!filteredBodySchema)
      throw new Error(`No schema for put after filtering`);

    const filteredResponseSchema = filterSchemaForMethod(
      'put',
      schemaDef.schema
    );
    if (!filteredResponseSchema)
      throw new Error(`No schema for put after filtering`);

    baseRoutes.path.put = {
      ...common,
      ...returns,
      ...addScopes('write'),
      ...parameters({
        name: 'data',
        in: 'body',
        description: `Modified ${pascalName} objects`,
        required: true,
        schema: {
          type: 'array',
          maxItems: MAX_ARRAY_ITEMS,
          items: filteredBodySchema
        }
      }),
      summary: `update multiple ${pascalName} objects`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`updated ${pascalName} objects`, {
          type: 'array',
          maxItems: MAX_ARRAY_ITEMS,
          items: filteredResponseSchema
        })
      }
    };
  }

  /**
   * DELETE /<collection>/
   */
  if (includeMethod('delete')) {
    baseRoutes.path.delete = {
      ...common,
      ...addScopes('write'),
      ...parameters({
        name: '_id',
        in: 'query',
        type: 'array',
        maxItems: MAX_ARRAY_ITEMS,
        items: {
          type: 'string',
          ['x-tyranid-openapi-object-id']: true
        } as Schema,
        description: `IDs of the ${pascalName} objects to delete`,
        required: true
      }),
      summary: `delete multiple ${pascalName} object`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`deletes the ${pascalName} objects`)
      }
    };
  }

  /**
   *
   * single id routes
   *
   */
  const singleIdRoutes = {
    route: `/${baseCollectionRoute}/{_id}`,
    path: {} as Path
  };
  out.paths.push(singleIdRoutes);

  /**
   * GET /<collection>/{_id}
   */
  if (includeMethod('get')) {
    singleIdRoutes.path.get = {
      summary: `retrieve an individual ${pascalName} object`,
      ...common,
      ...returns,
      ...addScopes('read'),
      ...parameters(idParameter),
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`sends the ${pascalName} object`, schemaRef)
      }
    };
  }

  /**
   * PUT /<collection>/{_id}
   */
  if (includeMethod('put')) {
    singleIdRoutes.path.put = {
      ...common,
      ...returns,
      ...addScopes('write'),
      ...parameters(idParameter, {
        name: 'data',
        in: 'body',
        description: `Modified ${pascalName} object`,
        required: true,
        schema: (() => {
          /**
           * remove _id from required properties on put with `_id` in path
           */
          const clone = JSON.parse(JSON.stringify(putSchema)) as ExtendedSchema;
          const required = (clone.required || []).filter(p => p !== '_id');
          if (required.length) {
            clone.required = required;
          } else {
            delete clone.required;
          }
          return clone;
        })()
      }),
      summary: `update single ${pascalName} object`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`updated ${pascalName} object`, schemaRef)
      }
    };
  }

  /**
   * DELETE /<collection>/{_id}
   */
  if (includeMethod('delete')) {
    singleIdRoutes.path.delete = {
      ...common,
      ...addScopes('write'),
      ...parameters(idParameter),
      summary: `delete an individual ${pascalName} object`,
      responses: {
        ...denied(),
        ...invalid(),
        ...tooMany(),
        ...internalError(),
        ...success(`deletes the ${pascalName} object`)
      }
    };
  }

  /**
   * remove any path entries that don't have any methods
   */
  out.paths = out.paths.filter(p => !!Object.keys(p.path).length);

  return out;
}

/**
 * rate limiter response
 */
function tooMany() {
  return {
    429: {
      description: 'too many requests',
      schema: errorRef('ErrorTooManyRequests')
    }
  };
}

/**
 * create a 403 response
 *
 * @param description message for denial
 */
function denied(description = 'permission denied') {
  return {
    403: {
      description,
      schema: errorRef('ErrorPermissionDenied')
    }
  };
}

/**
 * create a 500 response
 *
 * @param description message for denial
 */
function internalError() {
  return {
    500: {
      description: 'Internal server error',
      schema: errorRef('ErrorInternalServer')
    }
  };
}

/**
 * create a 200 response
 * @param description success message
 * @param schema [optional] schema of response body
 */
function success(
  description: string,
  schema?: ExtendedSchema,
  meta: { [key: string]: ExtendedSchema } = {}
) {
  return {
    200: {
      description,
      schema: {
        type: 'object',
        properties: {
          status: { type: 'number', enum: [200] },
          message: { type: 'string' },
          ...meta,
          ...(schema ? { data: schema } : {})
        }
      }
    }
  };
}

/**
 * create a 400 error object
 *
 * @param description response message
 */
function invalid(description = 'invalid request') {
  return {
    400: {
      description,
      schema: errorRef('ErrorInvalidRequest')
    }
  };
}

/**
 * Return properties filtered by not readonly
 *
 * @param schemaHash properties field of a schema
 */
function filterNotReadOnly(schemaHash: { [key: string]: Schema }) {
  const keys = Object.keys(schemaHash);
  const out: { [key: string]: Schema } = {};

  for (const key of keys) {
    if (!schemaHash[key].readOnly) {
      out[key] = { ...schemaHash[key] };
      const props = schemaHash[key].properties;
      const items = schemaHash[key].items;
      if (props) {
        out[key].properties = filterNotReadOnly(props);
      }
      if (items) {
        if (Array.isArray(items)) {
          out[key].items = items.map(item => {
            const { filteredItem } = filterNotReadOnly({ filteredItem: item });
            return filteredItem;
          });
        } else {
          const { filteredItems } = filterNotReadOnly({ filteredItems: items });
          out[key].items = filteredItems;
        }
      }
    }
  }

  return out;
}

/**
 * Make all properties in schema optional
 *
 * @param schemaHash properties field of a schema
 */
function makeOptional(schemaHash: { [key: string]: Schema }) {
  const keys = Object.keys(schemaHash);
  const out: { [key: string]: Schema } = {};

  for (const key of keys) {
    out[key] = { ...schemaHash[key] };
    delete out[key].required;
    const props = schemaHash[key].properties;
    const items = schemaHash[key].items;
    if (props) {
      out[key].properties = makeOptional(props);
    }
    if (items) {
      if (Array.isArray(items)) {
        out[key].items = items.map(item => {
          const { filteredItem } = makeOptional({ filteredItem: item });
          return filteredItem;
        });
      } else {
        const { filteredItems } = makeOptional({ filteredItems: items });
        out[key].items = filteredItems;
      }
    }
  }

  return out;
}

/**
 * Filter schema to include properties for specific methods, if listed
 *
 * @param method HTTP verb
 * @param schema schema with possible method metadata
 */
function filterSchemaForMethod(
  method: Method,
  schema: ExtendedSchema
): ExtendedSchema | void {
  if (!includePropertyForMethod(method, schema)) return;

  switch (schema.type) {
    case 'array': {
      const items = schema.items!;
      const filtered = Array.isArray(items)
        ? items.map(item => filterSchemaForMethod(method, item))
        : filterSchemaForMethod(method, items);
      if (filtered) {
        const updated = {
          ...schema,
          items: filtered
        } as ExtendedSchema;
        return updated;
      }
      return;
    }

    case 'object': {
      const out: ExtendedSchema = { ...schema, properties: {} };
      each(
        schema.properties as { [key: string]: ExtendedSchema },
        (prop, name) => {
          const result = filterSchemaForMethod(method, prop);
          if (result) {
            out.properties![name] = result;
          }
        }
      );
      if (Array.isArray(out.required)) {
        out.required = out.required.filter(p => p in out.properties!);
      }
      return out;
    }

    default:
      return schema;
  }
}

/**
 * Check if a swagger schema has method metadata
 *
 * @param method HTTP verb
 * @param schema extended schema to check for methods metadata
 */
function includePropertyForMethod(method: Method, schema: ExtendedSchema) {
  const methods: Method[] | void = schema['x-tyranid-openapi-methods'];
  return !methods || methods.indexOf(method) !== -1;
}

/**
 * Return ref object for error
 *
 * @param name name of error response
 */
function errorRef(name: keyof typeof ErrorResponse) {
  return toRef(name);
}

/**
 * Create ref object for schema
 *
 * @param name schema name
 */
function toRef(name: string) {
  return {
    $ref: `#/definitions/${name}`
  };
}
