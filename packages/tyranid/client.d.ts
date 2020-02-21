import * as io from 'socket.io-client';
import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid/client' {
  export namespace Tyr {
    export const Collection: CollectionStatic;
    export const Field: FieldStatic;
    export const Log: CollectionInstance;
    export const NamePath: NamePathStatic;
    export const Type: TypeStatic;

    export { AppError, SecureError, UserError } from Isomorphic;

    export type anny = any;

    export type Metadata =
      | CollectionInstance
      | FieldInstance
      | NamePathInstance
      | Document;

    export const local: {
      // TODO:  get this typed as "User" instead of "Document" via td-gen
      /*
       * The currently-logged in user.
       */
      user: Document;
    };

    export function mapAwait<T, U>(
      val: Promise<T> | T,
      map: (val: T) => U
    ): Promise<U> | U;

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

    export const ajax: (url: string, opts: any) => Promise<any>;
    export const aux = (
      collectionDefinition: CollectionDefinition,
      component?: React.Component
    ) => CollectionStatic;
    export const byId: CollectionsById;
    export const byName: CollectionsByName;
    export function clear(obj: object): void;
    export function compactMap<A, B>(
      arr: A[] | undefined,
      mapFn: (v: A) => B
    ): (B extends false
      ? never
      : B extends null
      ? never
      : B extends undefined
      ? never
      : B)[];
    export function clone<T>(obj: T): T;
    export function cloneDeep<T>(obj: T): T;
    export const collections: CollectionInstance[] & CollectionsByClassName;

    export const options: {
      whiteLabel?: (metadata: Metadata) => string | undefined;
    } = {};

    export const init: () => void;
    export function isSameId(
      a: AnyIdType | null | undefined,
      b: AnyIdType | null | undefined
    ): boolean;
    export function labelize(name: string): string;
    export function parseUid(
      uid: string
    ): { collection: CollectionInstance; id: AnyIdType };
    export function pluralize(str: string): string;
    export const reconnectSocket: () => void;
    export const setSocketLibrary: (library: typeof io) => void;
    export function singularize(str: string): string;
    export function unitize(count: number, unit: string): string;

    export type AnyIdType = string | number;
    export type ObjIdType = string;

    export interface NamePathStatic extends Isomorphic.NamePathStatic {
      new (...args: any[]): NamePathInstance;

      resolve(
        collection: CollectionInstance,
        parentPath?: Isomorphic.NamePathInstance,
        path?: Isomorphic.NamePathInstance | string
      ): NamePathInstance;
    }

    export interface NamePathInstance extends Isomorphic.NamePathInstance {
      detail: FieldInstance;
      fields: FieldInstance[];
      tail: FieldInstance;

      parsePath(path: string): NamePathInstance;
      set<D extends Isomorphic.Document<any>>(
        obj: D,
        value: any,
        opts?: { create?: boolean; ignore?: boolean }
      ): void;
      walk(path: string | number): NamePathInstance;
    }

    export interface TypeStatic extends Isomorphic.TypeStatic {
      byName: { [key: string]: TypeInstance };
      new (...args: any[]): TypeInstance;
    }
    export interface TypeDefinition extends Isomorphic.TypeDefinition {}
    export interface TypeInstance extends Isomorphic.TypeInstance {
      def: TypeDefinition;
      create(field: FieldInstance): any;
      compare(field: FieldInstance, a: any, b: any): number;
      fromString(value: any): string;
      format(field: FieldInstance, value: any): string;
    }

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

    export interface CollectionStatic extends Isomorphic.CollectionStatic {}

    export type IdType<D extends Document> = D extends Document<infer ID>
      ? ID
      : never;

    export interface CollectionInstance<
      D extends Document<AnyIdType> = Document<AnyIdType>
    > extends Class<D> {
      $metaType: 'collection';
      aux(fields: { [key: string]: FieldDefinition });
      byId(id: IdType<D>, opts?: any): Promise<D | null>;
      byIds(ids: IdType<D>[], opts?: any): Promise<D[]>;
      byIdIndex: { [id: string]: D };
      byLabel(label: string): Promise<D | null>;
      cache(document: D): void;
      count(opts: any): Promise<number>;
      def: any /* collection def */;
      exists(opts: any): Promise<boolean>;
      fields: { [fieldName: string]: Tyr.FieldInstance };
      fieldsFor(opts: {
        match?: MongoObject;
        query?: MongoQuery;
        custom?: boolean;
        static?: boolean;
      }): Promise<{ [key: string]: FieldInstance }>;
      findAll(args: any): Promise<D[] & { count?: number }>;
      findOne(args: any): Promise<D | null>;
      id: string;
      idToLabel(id: IdType<D>): Promise<string>;
      idToUid(id: IdType<D> | string): string;
      insert<I, A extends I[]>(docs: A, opts?: any): Promise<D[]>;
      insert<I>(doc: I): Promise<D>;
      insert(doc: any): Promise<any>;
      isAux(): boolean;
      isDb(): boolean;
      isSingleton(): boolean;
      isStatic(): boolean;
      isUid(uid: string): boolean;
      label: string;
      labelField: any;
      labelFor(doc: D | object): string;
      labelProjection(): any; // Mongo Projection
      labels(text: string): Promise<D[]>;
      labels(ids: string[]): Promise<D[]>;
      labels(_: any): Promise<D[]>;
      on(opts: any): () => void;
      parsePath(text: string): Tyr.NamePathInstance;
      paths: { [fieldPathName: string]: Tyr.FieldInstance };
      push(id: IdType<D>, path: string, value: any, opts: any): Promise<void>;
      remove(id: IdType<D>, justOne: boolean): Promise<void>;
      remove(
        query: any /* MongoDB-style query */,
        justOne: boolean
      ): Promise<void>;
      save(doc: D | object): Promise<D>;
      save(doc: D[] | object[]): Promise<D[]>;
      save(doc: any): Promise<any>;
      subscribe(query: MongoQuery | undefined, cancel?: boolean): Promise<void>;
      updateDoc(doc: D | MongoDocument, opts: any): Promise<D>;
      values: D[];
    }

    export interface Document<ID extends AnyIdType = AnyIdType>
      extends Isomorphic.Document<ID> {
      $access?: AccessResult;
      $cache(): this;
      $clone(): this;
      $cloneDeep(): this;
      $id: IdType<this>; // using "ID" wasn't working as well for some weird reason
      $label: string;
      $model: CollectionInstance<this>;
      $orig?: this;
      $remove(opts?: any): Promise<void>;
      $revert(): void;
      $save(opts?: any): Promise<this>;
      $slice(path: string, opts: any): Promise<void>;
      $snapshot(): void;
      $toPlain(): object;
      $tyr: typeof Tyr;
      $uid: string;
      $update(opts: any): Promise<this>;
    }

    export interface Inserted<ID extends AnyIdType = AnyIdType>
      extends Document<ID> {
      _id: ID;
    }
  }
}
