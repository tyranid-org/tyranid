import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { baseInterface } from './base';
import {
  colInterface,
  enumIdAlias,
  enumStaticInterface,
  colService
} from './collection';
import { docInterface, docMethods } from './document';
import * as names from './names';
import { generateDefinitionPreamble } from './preamble';
import { pad, wrappedUnionType } from './util';
import { InterfaceGenerationOptions } from './util';

export interface GenerateModuleOptions {
  client?: boolean;
  commentLineWidth?: number;
}

/**
 *
 * Generate tyranid definition file for client usage
 *
 */
export function generateIsomorphicDefinitionFile(
  collections: Tyr.CollectionInstance[],
  passedOptions: InterfaceGenerationOptions = {}
) {
  const td = `${generateDefinitionPreamble(passedOptions)}

import 'tyranid/isomorphic';

declare module 'tyranid/isomorphic' {

  export namespace Tyr {

${generateIsomorphicInterfaces(collections, {
  client: true,
  commentLineWidth: passedOptions.commentLineWidth
})}
  }

}
`;

  return td;
}

export function generateIsomorphicInterfaces(
  collections: Tyr.CollectionInstance[],
  opts: GenerateModuleOptions = {}
) {
  const { client = false, commentLineWidth } = opts;
  const cols: string[] = [];
  const docs: string[] = [];
  const bases: string[] = [];
  const statics: string[] = [];
  const enumIds: string[] = [];
  const sorted = _.sortBy(collections, 'def.name');

  for (const col of sorted) {
    const alias = col.def.enum && enumIdAlias(col);

    bases.push(baseInterface(col, { commentLineWidth }));
    docs.push(docInterface(col));
    if (col.def.service) cols.push(colService(col, 'isomorphic'));
    cols.push(colInterface(col));
    if (alias) enumIds.push(alias);
    if (alias) statics.push(enumStaticInterface(col));
  }

  const definitions = `
    ${bases.join('')}
    ${docs.join('')}
    ${cols.join('')}
    ${statics.join('')}
    ${enumIds.join('')}
    ${generateCollectionLookups(collections, client, 'IdType')}

    /**
     * Union type of all current collection names
     */
    export type CollectionName =
      ${wrappedUnionType(sorted, 'def.name', 3)};

    /**
     * Union type of all current collection ids
     */
    export type CollectionId =
      ${wrappedUnionType(sorted, 'def.id', 3)};
    `;

  return definitions;
}

export function generateCollectionLookups(
  cols: Tyr.CollectionInstance[],
  exportInterfaces: boolean,
  typeParam = ''
) {
  const sorted = _.sortBy(cols, 'def.name');
  const byNameEntries: string[] = [];
  const collectionsEntries: string[] = [];
  const byIdEntries: string[] = [];

  for (const col of sorted) {
    const { id, name } = col.def;
    const collectionName = names.format(name);
    const collectionInterfaceName = names.collection(name);
    byNameEntries.push(
      `${name}: ${collectionInterfaceName}${typeParam ? `<${typeParam}>` : ''};`
    );
    collectionsEntries.push(
      `${collectionName}: ${collectionInterfaceName}${
        typeParam ? `<${typeParam}>` : ''
      };`
    );
    byIdEntries.push(
      `${id}: ${collectionInterfaceName}${typeParam ? `<${typeParam}>` : ''};`
    );
  }

  return `/**
     * Add lookup properties to Tyr.byName with extended interfaces
     */
    ${exportInterfaces ? 'export ' : ''}interface CollectionsByName${
    typeParam ? `<${typeParam} = string>` : ''
  } {
      ${byNameEntries.join('\n      ')}
    }

    /**
     * Add lookup properties to Tyr.collections with extended interfaces
     */
    ${exportInterfaces ? 'export ' : ''}interface CollectionsByClassName${
    typeParam ? `<${typeParam} = string>` : ''
  } {
      ${collectionsEntries.join('\n      ')}
    }

    /**
     * Add lookup properties to Tyr.byId with extended interfaces
     */
    ${exportInterfaces ? 'export ' : ''}interface CollectionsById${
    typeParam ? `<${typeParam} = string>` : ''
  } {
      ${byIdEntries.join('\n      ')}
    }
  `;
}

export function generateCommonTypes(
  collections: Tyr.CollectionInstance[],
  output: 'server' | 'client',
  idType = 'string'
) {
  const sorted = _.sortBy(collections, 'def.name');
  const docs: string[] = [];
  const cols: string[] = [];
  const aliases: string[] = [];

  sorted.forEach(c => {
    const name = c.def.name;
    const docName = names.document(name);
    const colName = names.collection(name);
    const isoName = names.isomorphic(names.base(name));
    const aliasName = names.id(name);
    const isoAlias = names.isomorphic(names.id(name));
    const idType = names.idType(c);

    const staticName = c.def.enum
      ? `,
                ${names.isomorphic(
                  names.enumStatic(name)
                )}<ObjIdType, Inserted<ObjIdType>, Inserted<number>>`
      : '';

    docs.push(`
    /**
     * ${names.format(output)} base document definition for ${colName}.
     */
    ${output === 'client' ? 'export ' : ''}interface ${names.base(name)}
      extends ${isoName}<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {${docMethods(
      c,
      output
    )}}

    /**
     * ${names.format(output)} document definition for ${colName},
     * extends isomorphic base interface ${names.base(name)}.
     */
    ${output === 'client' ? 'export ' : ''}interface ${docName}
      extends Inserted<${idType}>,
              ${names.base(name)} {}
    `);

    let cs = `
    /**
     * ${names.format(output)} collection definition.
     */
    ${output === 'client' ? 'export ' : ''}interface ${colName}
      extends Tyr.CollectionInstance<${idType}, ${docName}>${staticName}`;
    if (c.def.service)
      cs += `,
              ${colName}Service`;

    cs += ' {';
    if (c.def.service) {
      if (output === 'server')
        cs += `
      service: ${colName}Service;`;
    }

    cs += `
    }`;
    cols.push(cs);

    if (c.def.enum)
      aliases.push(pad(`export type ${aliasName} = ${isoAlias};`, 2));

    if (c.def.service) cols.push(colService(c, output));
  });

  return `

    ${docs.join('\n').trim()}

    ${cols.join('\n').trim()}

    ${aliases.join('\n').trim()}
  `;
}
