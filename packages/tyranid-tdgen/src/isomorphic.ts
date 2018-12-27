import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { baseInterface } from './base';
import { colInterface, enumIdAlias, enumStaticInterface } from './collection';
import { docInterface } from './document';
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

declare module 'tyranid-isomorphic' {

  export namespace Tyr {

    export interface MongoDocument {
      [key: string]: any;
    }

    export interface MongoQuery {
      [key: string]: any;
    }

    export interface Class<T> {
      new (...args: any[]): T;
    }

    export interface CollectionInstance<IdType = string, T extends Document<IdType> = Document<IdType>> extends Class<T> {
      byId(id: IdType, opts: any): Promise<T | null>;
      byIds(ids: IdType[], opts: any): Promise<T[]>;
      byLabel(label: string): Promise<T | null>;
      count(opts: any): Promise<number>;
      def: any /* collection def */;
      exists(opts: any): Promise<boolean>;
      fields: { [fieldName: string]: any /* Field */ };
      findAll(args: any): Promise<T[]>;
      findOne(args: any): Promise<T | null>;
      id: string;
      idToLabel(id: IdType): Promise<string>;
      idToUid(id: IdType): string;
      insert<I, A extends I[]>(docs: A, opts?: any): Promise<T[]>;
      insert<I>(doc: I): Promise<T>;
      insert(doc: any): Promise<any>;
      isStatic(): boolean;
      isUid(uid: string): boolean;
      label: string;
      labelField: any;
      labelFor(doc: T | object): string;
      labels(text: string): Promise<{ _id: IdType, [labelField: string]: string }[]>;
      labels(ids: string[]): Promise<{ _id: IdType, [labelField: string]: string }[]>;
      labels(_: any): Promise<{ _id: IdType, [labelField: string]: string }[]>;
      on(opts: any): () => void;
      parsePath(text: string): any /* NamePath */;
      paths: { [fieldPathName: string]: any /* Field */ };
      push(id: IdType, path: string, value: any, opts: any): Promise<void>;
      remove(id: IdType, justOne: boolean): Promise<void>;
      remove(query: any /* MongoDB-style query */, justOne: boolean): Promise<void>;
      save(doc: T | object): Promise<T>;
      save(doc: T[] | object[]): Promise<T[]>;
      save(doc: any): Promise<any>;
      subscribe(query: MongoQuery, cancel: boolean): Promise<void>;
      updateDoc(doc: T | MongoDocument, opts: any): Promise<T>;
      values: T[];
    }

    export interface Document<IdType = string> {
      $clone(): this;
      $cloneDeep(): this;
      $id: IdType;
      $label: string;
      $model: CollectionInstance<IdType, this>;
      $remove(opts: any): Promise<void>;
      $save(opts: any): Promise<this>;
      $slice(path: string, opts: any): Promise<void>;
      $toPlain(): object;
      $tyr: Tyr;
      $uid: string;
      $update(opts: any): Promise<this>;
    }

    export interface Inserted<IdType = string> extends Document<IdType> {
      _id: IdType;
    }

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
    const { id, name } = col.def;
    const collectionInterfaceName = names.collection(name);
    const alias = col.def.enum && enumIdAlias(col);

    bases.push(baseInterface(col, { commentLineWidth }));
    docs.push(docInterface(col));
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

    const staticName = c.def.enum
      ? `,
                ${names.isomorphic(names.enumStatic(name))}`
      : '';

    docs.push(`
    /**
     * ${names.format(output)} base document definition for ${colName}.
     */
    ${output === 'client' ? 'export ' : ''}interface ${names.base(name)}
      extends ${isoName}<${idType}, Inserted> {}

    /**
     * ${names.format(output)} document definition for ${colName},
     * extends isomorphic base interface ${names.base(name)}.
     */
    ${output === 'client' ? 'export ' : ''}interface ${docName}
      extends Inserted,
              ${names.base(name)} {}
    `);

    cols.push(`
    /**
     * ${names.format(output)} collection definition.
     */
    ${output === 'client' ? 'export ' : ''}interface ${colName}
      extends Tyr.CollectionInstance<${docName}>${staticName} {}
    `);

    if (c.def.enum)
      aliases.push(pad(`export type ${aliasName} = ${isoAlias};`, 2));
  });

  return `

    /**
     * documents inserted into the db and given _id
     */
    interface Inserted extends Tyr.Document {
      _id: ${idType}
    }

    ${docs.join('\n').trim()}

    ${cols.join('\n').trim()}

    ${aliases.join('\n').trim()}
  `;
}
