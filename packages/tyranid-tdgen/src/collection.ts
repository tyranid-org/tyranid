import { Tyr } from 'tyranid';
import * as _ from 'lodash';
import * as names from './names';
import { pad, wrappedUnionType } from './util';

/**
 * produce union type alias for enum id values
 */
export function enumIdAlias(col: Tyr.CollectionInstance): string | void {
  if (!col.def.enum)
    throw new Error(
      `Non-enum collection passed to generateEnumCollectionIdTypeAlias`
    );

  const { name, values = [] } = col.def;

  if (!values.length) {
    throw new Error(`Enum type with no values provided: ${col.def.name}`);
  }

  if (!('_id' in values[0])) return;

  return `
    /**
     * Type alias for enum id values in "${name}" collection
     */
    export type ${names.id(name)} =
      ${wrappedUnionType(values, '_id', 3)};
    `;
}

/**
 * generate interface for individual tyranid collection
 */
export function colInterface(col: Tyr.CollectionInstance) {
  const { name } = col.def;
  const colName = names.collection(name);
  const docName = names.document(name);
  const staticProps = col.def.enum
    ? `,\n${pad(names.enumStatic(name), 7)}`
    : '';

  return `
    /**
     * Type definition for "${name}" collection
     */
    export interface ${colName}<IdType = string>
      extends CollectionInstance<IdType, ${docName}<IdType>>${staticProps} {}
    `;
}

export function enumStaticInterface(col: Tyr.CollectionInstance) {
  const { name, id, fields } = col.def;
  const colName = names.collection(name);
  const staticName = names.enumStatic(name);
  if (!col.def.enum)
    throw new Error(`Cannot generate static interface for non-enum collection`);

  const properties: string[] = [];

  if (!fields) throw new Error(`Collection "${name}" has no fields!`);

  const rows = _.sortBy(col.def.values || [], 'name');

  if (rows.length && 'name' in fields) {
    for (const row of rows) {
      let obj = '{';
      for (const key of Object.keys(row) as (keyof typeof row)[]) {
        if (typeof row[key] !== 'undefined') {
          let propType: string;
          switch (typeof row[key]) {
            case 'string':
              propType = `'${row[key]}'`;
              break;
            case 'number':
              propType = `${row[key]}`;
              break;
            default:
              propType = 'any';
          }

          obj += '\n';
          obj += pad(`${key}: ${propType};`, 4);
        }
      }
      obj += '\n';
      obj += pad('}', 3);

      let enumPropName = _.snakeCase((<any>row)['name']).toUpperCase();

      // need to wrap in quotes if starting with digit
      if (/[0-9]/.test(enumPropName[0])) {
        enumPropName = `"${enumPropName}"`;
      }

      properties.push(`\n      ${enumPropName}: ${obj};`);
    }
  }

  return `
  /**
   * Static properties for enum collection "${colName}"
   */
  export interface ${staticName} ${!properties.length
    ? '{}'
    : `{
    ${properties.join('\n')}

  }`}
  `;
}
