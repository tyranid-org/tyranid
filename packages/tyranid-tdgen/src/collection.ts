import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import * as names from './names';
import { escapeString, pad, wrappedUnionType } from './util';
import { addField } from './base';

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
    export interface ${colName}<ObjIdType = string, ObjContainer = Inserted<string>, NumContainer = Inserted<number>>
      extends CollectionInstance<${names.idType(
        col
      )}, ${docName}<ObjIdType, ObjContainer, NumContainer>>${staticProps} {}
    `;
}

export function enumStaticInterface(col: Tyr.CollectionInstance) {
  const { name, id, fields } = col.def;
  const colName = names.collection(name);
  const docName = names.document(name);
  const staticName = names.enumStatic(name);
  if (!col.def.enum)
    throw new Error(`Cannot generate static interface for non-enum collection`);

  const properties: string[] = [];

  if (!fields) throw new Error(`Collection "${name}" has no fields!`);

  const rows = _.sortBy(col.def.values || [], 'name');

  if (rows.length && 'name' in fields) {
    for (const row of rows) {
      let obj = '{';
      for (const key of Object.keys(row) as Array<keyof typeof row>) {
        if (typeof row[key] !== 'undefined') {
          let propType: string;
          switch (typeof row[key]) {
            case 'string':
              propType = `'${escapeString(String(row[key]))}'`;
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
      obj += `      } & ${docName}<ObjIdType, ObjContainer, NumContainer>`;

      let enumPropName = _.snakeCase((row as any)['name']).toUpperCase();

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
  export interface ${staticName}<ObjIdType = string, ObjContainer = Inserted<string>, NumContainer = Inserted<number>> ${
    !properties.length
      ? '{}'
      : `{
    ${properties.join('\n')}

  }`
  }
  `;
}

export function colApiMethods(col: Tyr.CollectionInstance) {
  const { def: cdef } = col;
  const { api } = cdef;

  if (!api) return '';

  let s = '';

  for (const methodName in api) {
    const mdef = api[methodName];
    const { params, return: returns } = mdef;

    s += `
      ${methodName}(`;

    if (params) {
      let i = 0;
      for (const paramName in params) {
        const param = params[paramName] as Tyr.FieldInstance;
        if (i++) s += ', ';
        s += paramName;
        if (!param.def.required) s += '?';
        s += ': ';

        s += addField({
          name: paramName,
          field: param,
          indent: 4,
          noPopulatedProperty: true
        });
      }
    }

    s += '): Promise<';
    s += returns
      ? addField({
          name: 'return',
          field: returns as Tyr.FieldInstance,
          indent: 4,
          noPopulatedProperty: true
        })
      : 'void';
    s += '>;';
  }

  return s;
}

/**
 * generate the internal API interface for a tyranid collection
 */
export function colApi(
  col: Tyr.CollectionInstance,
  mode: 'server' | 'client' | 'isomorphic'
) {
  const { def: cdef } = col;
  const { api, name } = cdef;

  if (!api) return '';

  const colName = names.collection(name);

  switch (mode) {
    case 'isomorphic':
      return `
    /**
     * API definition for "${name}" collection
     */
    export interface ${colName}Api<ObjIdType = 'string'> {${colApiMethods(col)} 
    }\n`;

    case 'client':
      return `
    export interface ${colName}Api extends Isomorphic.${colName}Api<ObjIdType> {}`;

    case 'server':
      return `
    export interface ${colName}Api extends Isomorphic.${colName}Api<ObjIdType> {}`;
  }
}
