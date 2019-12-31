import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import * as names from './names';
import { escapeString, pad, wrappedUnionType } from './util';
import { addField, addComment, commentsFor } from './base';

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
      extends CollectionInstance<${docName}<ObjIdType, ObjContainer, NumContainer>>${staticProps} {}
    `;
}

export function enumStaticInterface(col: Tyr.CollectionInstance) {
  const { name, fields } = col.def;
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

export function colServiceMethods(col: Tyr.CollectionInstance) {
  const { def: cdef } = col;
  const { service } = cdef;

  if (!service) return '';

  let s = '';

  for (const methodName in service) {
    const mdef = service[methodName];
    const { params, return: returns } = mdef;

    const tags = [];
    for (const paramName in params) {
      const param = params[paramName] as Tyr.FieldInstance;

      const comments = commentsFor(param.def);
      if (comments) {
        tags.push({
          tag: 'param ' + paramName,
          text: comments
        });
      }
    }

    if (returns) {
      const comments = commentsFor(returns.def);
      if (comments) {
        tags.push({
          tag: 'return',
          text: comments
        });
      }
    }

    s += addComment(mdef, 3, tags);

    /*
       TODO:  the typing of "this" here is sort of complicated ...

       when IMPLEMENTING a service, this has { auth?, source?, user?, req?, res? }

       but when INVOKING a service, there is no special requirement on this

       furthermore, a service can be invoked from the server, so it's not enough to just
       add the this stuff in the server definition and not in the client/isomorphic ones, since
       invokers on the server will run into a problem that their this does not implement { auth?, ... }

       this is a "implementer" vs "invoker" issue, not a "client" vs "server" issue
       j

       right now we're just dodging the issue by typing this to any

       possible solutions:

       *. solve threadlocal issue before tackling this issue
          - this is the cleanest solution and is also needed for other things

       o. generate a special implementor signature in the d.ts files
          that adds "this: ServiceThis" which is properly typed?

       o. have the service method request which context it needs (and/or scan the service method to look for references) and
          avoid using "this", i.e.:

          myServiceMethod: {
            params: {
              myParam: { is: 'string' },
              user: true,
              req: true,
              ...
            }
          }

          -. does not provide a way to pass in user/req/etc. to the service unless threadlocal is present

          this would generate a service like:
           
            implementor:           myServiceMethod(myParam: string, user: Tyr.User, req: express.Request, ...)

            server:                myServiceMethod(myParam: string, user: Tyr.User, req: express.Request, ...)
            server w/ threadlocal: myServiceMethod(myParam: string, ...)

            client:                myServiceMethod(myParam: string, ...)

            -. one caveat of this that unless we have threadlocal, the server and client apis are not isomorphic
            +. solves the issue of passing in user/req/etc. to the method when invoking service from the server

     */
    s += `
      ${methodName}(
        this: any`;

    if (params) {
      for (const paramName in params) {
        const param = params[paramName] as Tyr.FieldInstance;
        s += ',\n';
        s += pad(paramName, 4);
        if (!param.def.required) s += '?';
        s += ': ';

        s += addField({
          name: paramName,
          field: param,
          indent: 5,
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
 * generate the internal service interface for a tyranid collection
 */
export function colService(
  col: Tyr.CollectionInstance,
  mode: 'server' | 'client' | 'isomorphic'
) {
  const { def: cdef } = col;
  const { service, name } = cdef;

  if (!service) return '';

  const colName = names.collection(name);

  switch (mode) {
    case 'isomorphic':
      return `
    /**
     * Service definition for "${name}" collection
     */
    export interface ${colName}Service<ObjIdType = 'string'> {${colServiceMethods(
        col
      )} 
    }\n`;

    case 'client':
      return `
    export interface ${colName}Service extends Isomorphic.${colName}Service<ObjIdType> {}`;

    case 'server':
      return `
    export interface ${colName}Service extends Isomorphic.${colName}Service<ObjIdType> {}`;
  }
}
