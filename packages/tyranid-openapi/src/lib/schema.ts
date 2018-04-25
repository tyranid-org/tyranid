import { Tyr } from 'tyranid';

import {
  ExtendedSchema,
  FieldSchemaOptions,
  IndividualCollectionSchemaOptions,
  SchemaContainer,
  SchemaOptions
} from '../interfaces';
import { each, error, options, pascal, upperSnake, someOf } from '../utils';

/**
 * strings for elements in property path
 * that do not have names
 */
const PATH_MARKERS = {
  ARRAY: '_',
  HASH: '[key: string]'
};

/**
 * Given a tyranid schema, produce an object schema
 * to insert into the Open API spec.
 *
 * @param def a tyranid collection schema schema object
 */
export function schema(
  def: Tyr.CollectionDefinitionHydrated,
  opts: IndividualCollectionSchemaOptions
) {
  const name = opts.name || def.name;
  const pascalName = pascal(name);

  let partitionName: string | undefined;
  if (opts.partialFilterExpression) {
    partitionName = opts.name;
  }

  /**
   * add direct check for organizationId for now,
   * should have hook functions later
   */
  if (!('organizationId' in def.fields)) {
    return error(`
      organizationId property must exist on collection
      to expose to public api, it does not exist on collection ${def.name}
    `);
  }

  const required = getRequiredChildProps(def);

  const out: SchemaContainer = {
    name,
    pascalName,
    id: def.id,
    schema: {
      ['x-tyranid-openapi-collection-id']: def.id,
      type: 'object',
      properties: schemaObject(def.fields, def.name, partitionName)
    } as {}
  };

  // if this is a partitioned collection...
  if (opts.partialFilterExpression) {
    out.schema['x-tyranid-openapi-partition-partial-filter-expression'] =
      opts.partialFilterExpression;
  }

  if (required.length) {
    out.schema.required = required;
  }

  return out;
}

/**
 * extend a given path with a new property
 *
 * @param path current path
 * @param next name of next property
 */
function extendPath(next: string, path?: string) {
  if (!path) return next;

  return `${path}.${next}`;
}

/**
 * Convert hash of tyranid fields to hash of Open API schema
 *
 * @param fields hash of tyranid field instances
 * @param path property path in schema of current field hash
 */
function schemaObject(
  fields: { [key: string]: Tyr.FieldInstance },
  path?: string,
  partitionName?: string
) {
  const properties: { [key: string]: ExtendedSchema } = {};

  each(fields, (field, name) => {
    const fieldOpts = options(field.def);

    if (!matchesPartition(fieldOpts, partitionName)) return;

    const prop = schemaType(field, extendPath(name, path), partitionName);
    const publicName = fieldOpts.name || name;
    if (prop) properties[publicName] = prop;
  });

  return properties;
}

/**
 * Translate a tyranid field to a Open API definition
 *
 * @param field tyranid schema field
 * @param path property path in schema of current field
 */
function schemaType(
  field: Tyr.FieldInstance,
  path: string,
  partitionName?: string,
  includeOverride?: boolean
) {
  const isIDField = field.name === '_id';
  if (!isIDField && !include(field, path) && !includeOverride) return;

  const linkCollection = field.def.link && Tyr.byName[field.def.link];

  // TODO: should links be refs?
  const type = linkCollection ? 'string' : field.def.is;

  const opts = options(field.def);
  if (!matchesPartition(opts, partitionName)) return;

  const methods = new Set(
    Array.isArray(opts.include)
      ? opts.include
      : opts.include === 'read' ? ['get'] : ['get', 'put', 'post', 'delete']
  );

  const readOnly =
    !methods.has('put') && !methods.has('post') && !methods.has('delete');

  const out: ExtendedSchema = {
    ['x-tyranid-openapi-name-path']: field.namePath.name,
    ['x-tyranid-openapi-name']: field.name
  };

  switch (type) {
    /**
     * string aliases
     */
    case 'password':
    case 'url':
    case 'string':
    case 'uid':
    case 'mongoid':
    case 'date':
    case 'email': {
      Object.assign(out, { type: 'string' });
      break;
    }

    case 'float':
    case 'double': {
      Object.assign(out, {
        type: 'number'
      });
      break;
    }

    /**
     * pass through types from tyranid
     */
    case 'boolean':
    case 'integer': {
      Object.assign(out, { type });
      break;
    }

    /**
     * array types
     */
    case 'array': {
      const element = field.of;
      if (!element) {
        return error(`
          field "${path}" is of type \`array\`
          but missing an \`of\` property
        `);
      }

      const itemType = schemaType(
        element,
        extendPath(PATH_MARKERS.ARRAY, path),
        partitionName,
        true
      );

      if (itemType) {
        Object.assign(out, {
          type: 'array',
          items: itemType
        });
      }
      break;
    }

    /**
     * nested objects
     */
    case 'object': {
      const keys = field.keys;
      const values = field.of;
      const subfields = field.fields;

      Object.assign(out, {
        type: 'object'
      });

      /**
       * if the sub object is a hash
       */
      if (keys) {
        if (!values) {
          return error(`
            field "${path}" is of type \`object\` and has a keys
            property but no values property.
          `);
        }

        const subType = schemaType(
          values,
          extendPath(PATH_MARKERS.HASH, path),
          partitionName
        );

        if (subType) out.additionalProperties = subType;
        if (field.fields) {
          const required = getRequiredChildProps(field);
          if (required.length) out.required = required;
        }
        break;
      }

      /**
       * if the sub object has a defined schema
       */
      if (!subfields) {
        return error(
          `field "${path}" is of type \`object\` but
          has no \`fields\` property`
        );
      }

      const subType = schemaObject(subfields, path, partitionName);
      if (subType) {
        out.properties = subType;
        const requiredProps = getRequiredChildProps(field);
        if (requiredProps.length) {
          out.required = requiredProps.filter(p => p in out.properties!);
        }
      }
      break;
    }

    default:
      return error(`field "${path}" is of unsupported type: ${type}`);
  }

  /**
   * add formats
   */
  switch (type) {
    case 'date':
    case 'password':
    case 'float':
    case 'double': {
      out.format = type;
      break;
    }

    case 'integer': {
      out.format = 'i32';
      break;
    }
  }

  if (Array.isArray(opts.include)) {
    out['x-tyranid-openapi-methods'] = opts.include;
  }

  if (isIDField || readOnly) {
    out.readOnly = true;
  }

  /**
   * add note from schema
   */
  if (opts.note || field.def.note) {
    out.description = (opts.note || field.def.note || '').replace(/\t+/gm, '');
  }

  /**
   * if property is link to enum collection,
   * add the enum values to schema
   */
  if (linkCollection && linkCollection.def.enum) {
    const description = [];
    out['x-tyranid-openapi-enum-collection-id'] = linkCollection.def.id;
    out.enum = (linkCollection as any).def.values.map(
      (v: { name?: string }) => {
        if (!v.name)
          throw new Error(
            `No name property for enum link ${linkCollection.def.name}`
          );
        return upperSnake(v.name);
      }
    );
  }

  if (linkCollection && !linkCollection.def.enum) {
    out['x-tyranid-openapi-object-id'] = true;
  }

  return out;
}

const INCLUDE_CACHE = {} as { [key: string]: boolean };
/**
 * Include field in schema
 *
 * @param field tyranid field instance
 */
export function include(field: Tyr.FieldInstance, path: string) {
  const name = field.name;

  if (path in INCLUDE_CACHE) return INCLUDE_CACHE[path];

  if (
    (field.fields &&
      someOf(field.fields, (f, n) => include(f, extendPath(n, path)))) ||
    (field.of && include(field.of, extendPath(name, path))) ||
    field.def.openAPI
  ) {
    return (INCLUDE_CACHE[path] = true);
  }

  return (INCLUDE_CACHE[path] = false);
}

/**
 * Get a list of child props marked required
 *
 * @param field root tyranid def or object field
 */
function getRequiredChildProps(
  field: Tyr.FieldInstance | Tyr.CollectionDefinitionHydrated
) {
  const props: string[] = [];

  if (!field.fields) return props;

  each(field.fields, (f, name) => {
    const opts = options(f.def);
    const propName = opts.name || name;
    if (
      f.def.openAPI &&
      ('required' in opts ? opts.required : f.def.required)
    ) {
      props.push(propName);
    }
  });

  return props;
}

/**
 * check if this field should be included in the partition
 *
 * @param opts field schema options
 * @param partition partition name (optional)
 */
function matchesPartition(opts: FieldSchemaOptions, partition?: string) {
  const optPartition = opts.partition;
  if (!partition || !optPartition) return true;
  if (Array.isArray(optPartition)) {
    return optPartition.indexOf(partition) >= 0;
  } else {
    return optPartition === partition;
  }
}
