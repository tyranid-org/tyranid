import * as AJV from 'ajv';
import { safeDump } from 'js-yaml';
import { Tyr } from 'tyranid';
import {
  CollectionSchemaOptions,
  FieldSchemaOptions,
  SchemaOptions,
  PartitionedCollectionSchemaOptions
} from './interfaces';

import { Parameter, Schema, Spec } from 'swagger-schema-official';

/**
 * Convert a string to PascalCase
 *
 * @param str string to convert to Pascal case
 */
export function pascal(str: string) {
  const bits = str
    .trim()
    .replace(/[^a-zA-Z0-9]+/gm, '_')
    .split('_');

  let out = '';
  for (const bit of bits) {
    out +=
      bit.length < 2
        ? (bit || '').toLocaleUpperCase()
        : bit.charAt(0).toLocaleUpperCase() + bit.slice(1);
  }

  return out;
}

/**
 * Throw error with library prefix
 *
 * @param message message to throw
 */
export function error(message: string): never {
  throw new Error(`tyranid-open-api-spec: ${message.replace(/\s+/g, ' ')}`);
}

/**
 * Convert object to yaml
 *
 * @param obj js object
 */
export function yaml(obj: object) {
  return safeDump(obj);
}

/**
 * return if value is defined
 *
 * @param val
 */
const returnOnDefined = <S>(val: S | undefined): val is S =>
  typeof val !== 'undefined';

/**
 * Iterate over properties in object
 *
 * @param obj javascript object
 * @param fn iteree function
 */
export function each<T, S>(
  obj: { [key: string]: T },
  fn: (element: T, field: string) => S,
  returnPredicate: (val: S) => boolean = returnOnDefined
) {
  for (const field in obj) {
    if (obj.hasOwnProperty(field)) {
      const result = fn(obj[field], field);
      if (returnPredicate(result)) return result;
    }
  }
}

/**
 * return if value is true
 *
 * @param val
 */
const returnOnTrue = (val: boolean | undefined): val is true => val === true;

/**
 * map over obj, short on true
 *
 * @param obj
 * @param fn
 */
export const someOf = <T>(
  obj: { [key: string]: T },
  fn: (element: T, field: string) => boolean | undefined
) => each<T, boolean | undefined>(obj, fn, returnOnTrue);

/**
 * Get options from schema
 *
 * @param def tyranid collection or field definition with optional Open API opts
 */
export function options(
  def: Tyr.CollectionDefinitionHydrated
): CollectionSchemaOptions;
export function options(def: Tyr.FieldDefinition): FieldSchemaOptions;
export function options(def: {
  openAPI?: CollectionSchemaOptions | FieldSchemaOptions | boolean;
}) {
  const openAPI = def.openAPI;
  const opts = (typeof openAPI === 'object' && openAPI) || {};

  return opts;
}

/**
 * Validate a spec against the openAPI spec schema
 *
 * @param spec open api spec object
 */
export function validate(spec: Spec) {
  const ajv = new AJV({ validateSchema: true });

  /* tslint:disable */
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
  const openAPIJSONSchema = require('swagger-schema-official/schema.json');
  /* tslint:enable */

  const result = ajv.validate(openAPIJSONSchema, spec);

  return {
    valid: result,
    errors: (ajv.errors || []).slice()
  };
}

/**
 * return subset object of obj
 *
 * @param obj javascript object
 * @param keys array of keys of obj
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]) {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    out[key] = obj[key];
  }
  return out;
}

/**
 * "My String" -> "MY_STRING"
 * @param str string
 */
export function upperSnake(str: string) {
  return str
    .split(/\s+/)
    .join('_')
    .toUpperCase();
}

/**
 * pluralize string
 * TODO: add better algorithm
 *
 * @param str string to pluralize
 */
export function pluralize(str: string) {
  return str.endsWith('s') ? str : str + 's';
}

/**
 * Detect whether or not options from a schema contain a partition
 *
 * @param opts tyranid schema options for openapi
 */
export function isPartitionedOptions(
  opts: CollectionSchemaOptions
): opts is PartitionedCollectionSchemaOptions {
  return !!(opts as any).partition;
}

export function sortByName(a: { name: string }, b: { name: string }) {
  const A = a.name;
  const B = b.name;

  return Number(A > B) - Number(A < B);
}
