import * as io from 'socket.io-client';
import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid/client' {
  export namespace Tyr {
    export type anny = any;

    export interface MongoDocument {
      [key: string]: any;
    }

    export interface MongoQuery {
      [key: string]: any;
    }

    export interface Class<T> {
      new (...args: any[]): T;
    }

    export interface AccessResult {
      allowed: boolean;
      reason: string;
      fields?: {
        effect: 'allow' | 'deny';
        names: string[];
      };
    }

    export interface CollectionsByName {
      [key: string]: CollectionInstance;
    }

    export interface CollectionsByClassName {
      [key: string]: CollectionInstance;
    }

    export interface CollectionsById {
      [key: string]: CollectionInstance;
    }

    export const byId: CollectionsById;
    export const byName: CollectionsByName;
    export const collections: CollectionInstance[] & CollectionsByClassName;

    export const init: () => void;
    export function parseUid(
      uid: string
    ): { collection: CollectionInstance<AnyIdType>; id: AnyIdType };
    export function labelize(name: string): string;
    export function pluralize(str: string): string;
    export const setSocketLibrary: (library: typeof io) => void;
    export const reconnectSocket: () => void;

    export type AnyIdType = string | number;
    export type ObjIdType = string;

    export interface NamePathStatic extends Isomorphic.NamePathStatic {}
    export interface NamePathInstance extends Isomorphic.NamePathInstance {}

    export interface FieldDefinitionRaw extends Isomorphic.FieldDefinitionRaw {}

    export interface FieldDefinition extends Isomorphic.FieldDefinition {}

    export interface FieldStatic extends Isomorphic.FieldStatic {
      new (...args: any[]): FieldInstance;
    }

    export interface FieldInstance extends Isomorphic.FieldInstance {
      collection: CollectionInstance;
      def: FieldDefinition;
      fields?: { [key: string]: FieldInstance };
      keys?: FieldInstance;
      label: string | (() => string);
      link?: CollectionInstance;
      name: string;
      namePath: NamePathInstance;
      of?: FieldInstance;
      parent?: FieldInstance;
      path: string;
      pathLabel: string;
      readonly: boolean;
      type: TypeInstance;

      labels(
        doc: Tyr.Document,
        text?: string,
        opts?: any
      ): Promise<Tyr.Document[]>;
    }

    export interface CollectionInstance<
      IdType extends AnyIdType = AnyIdType,
      T extends Document<IdType> = Document<IdType>
    > extends Class<T> {
      byId(id: IdType, opts?: any): Promise<T | null>;
      byIds(ids: IdType[], opts?: any): Promise<T[]>;
      byLabel(label: string): Promise<T | null>;
      cache(document: T): void;
      count(opts: any): Promise<number>;
      def: any /* collection def */;
      exists(opts: any): Promise<boolean>;
      fields: { [fieldName: string]: Tyr.FieldInstance };
      findAll(args: any): Promise<T[] & { count?: number }>;
      findOne(args: any): Promise<T | null>;
      id: string;
      idToLabel(id: IdType): Promise<string>;
      idToUid(id: IdType | string): string;
      insert<I, A extends I[]>(docs: A, opts?: any): Promise<T[]>;
      insert<I>(doc: I): Promise<T>;
      insert(doc: any): Promise<any>;
      isStatic(): boolean;
      isUid(uid: string): boolean;
      label: string;
      labelField: any;
      labelFor(doc: T | object): string;
      labels(text: string): Promise<T[]>;
      labels(ids: string[]): Promise<T[]>;
      labels(_: any): Promise<T[]>;
      on(opts: any): () => void;
      parsePath(text: string): Tyr.NamePathInstance;
      paths: { [fieldPathName: string]: Tyr.FieldInstance };
      push(id: IdType, path: string, value: any, opts: any): Promise<void>;
      remove(id: IdType, justOne: boolean): Promise<void>;
      remove(
        query: any /* MongoDB-style query */,
        justOne: boolean
      ): Promise<void>;
      save(doc: T | object): Promise<T>;
      save(doc: T[] | object[]): Promise<T[]>;
      save(doc: any): Promise<any>;
      subscribe(query: MongoQuery | undefined, cancel?: boolean): Promise<void>;
      updateDoc(doc: T | MongoDocument, opts: any): Promise<T>;
      values: T[];
    }

    export interface Document<IdType extends AnyIdType = AnyIdType> {
      $access?: AccessResult;
      $cache(): this;
      $clone(): this;
      $cloneDeep(): this;
      $id: IdType;
      $label: string;
      $model: CollectionInstance<IdType, this>;
      $remove(opts: any): Promise<void>;
      $save(opts?: any): Promise<this>;
      $slice(path: string, opts: any): Promise<void>;
      $toPlain(): object;
      $tyr: typeof Tyr;
      $uid: string;
      $update(opts: any): Promise<this>;
    }

    export interface Inserted<IdType extends AnyIdType = AnyIdType>
      extends Document<IdType> {
      _id: IdType;
    }
  }
}
