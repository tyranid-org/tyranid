import { Tyr } from 'tyranid';
import * as names from './names';
import { addField, addComment, commentsFor } from './base';
import { pad } from './util';

/**
 * generate interface for tyranid document type
 */
export function docInterface(col: Tyr.CollectionInstance): string {
  const { name } = col.def;
  const interfaceName = names.document(name);
  const baseName = names.base(name);
  const colName = names.collection(name);

  return `
    /**
     * Document returned by collection "${name}" <${colName}>
     */
    export interface ${interfaceName}<ObjIdType = string, ObjContainer = Inserted<string>, NumContainer = Inserted<number>>
      extends Inserted<${names.idType(col)}>,
              ${baseName}<ObjIdType, ObjContainer, NumContainer> {${docMethods(
    col,
    'isomorphic'
  )}}`;
}

export function docMethods(
  col: Tyr.CollectionInstance,
  output: 'server' | 'client' | 'isomorphic'
): string {
  const { def } = col;
  const { methods } = def;

  let s = '';

  if (methods) {
    for (const methodName in methods) {
      const method = methods[methodName];
      const { params, return: returns } = method;

      switch (output) {
        case 'isomorphic':
          if (!method.fn && !(method.fnClient && method.fnServer)) continue;
          break;
        case 'server':
          if (!method.fn && !method.fnServer) continue;
          break;
        case 'client':
          if (!method.fn && !method.fnClient) continue;
          break;
      }

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

      s += addComment(method, 3, tags);
      s += `
        ${methodName}(`;

      if (params) {
        for (const paramName in params) {
          const param = params[paramName] as Tyr.FieldInstance;
          /*if (i++) */ s += ',';
          s += '\n';
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

      s += '): ';
      s += returns
        ? addField({
            name: 'return',
            field: returns as Tyr.FieldInstance,
            indent: 4,
            noPopulatedProperty: true
          })
        : 'void';
      s += ';';
    }
  }

  if (s)
    s += `
    `;

  return s;
}
