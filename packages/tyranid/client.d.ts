import * as io from 'socket.io-client';

import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid/client' {
  export namespace Tyr {
    export const Collection: CollectionStatic;
    export const Field: FieldStatic;
    export const Log: CollectionInstance;
    export const Path: PathStatic;
    export const Type: TypeStatic;

    export const $all = '$all';
    export const $label = '$label';

    export interface AppErrorStatic {
      new (opts?: string | Isomorphic.ErrorOptions): UserError;
    }
    export const AppError: AppErrorStatic;
    export interface AppError {
      message: string;
      field?: FieldInstance;
      technical?: string;
      rowNumber?: number;
      lineNumber?: number;
      columnNumber?: number;
      toString(): string;
    }

    export interface SecureErrorStatic {
      new (opts?: string | Isomorphic.ErrorOptions): SecureError;
    }
    export const SecureError: SecureErrorStatic;
    export interface SecureError {
      message: string;
      field?: FieldInstance;
      technical?: string;
      rowNumber?: number;
      lineNumber?: number;
      columnNumber?: number;
      toString(): string;
    }

    export interface UserErrorStatic {
      new (opts: string | Isomorphic.ErrorOptions): UserError;
    }
    export const UserError: UserErrorStatic;
    export interface UserError {
      message: string;
      field?: FieldInstance;
      technical?: string;
      rowNumber?: number;
      lineNumber?: number;
      columnNumber?: number;
      toString(): string;
    }

    export type anny = any;

    export type Metadata =
      | CollectionInstance
      | FieldInstance
      | PathInstance
      | Document;

    export interface Local {
      /*
       * The currently-logged in user.
       */
      user: User;

      /*
       * The currently-logged in user's date format.
       */
      dateFormat: string;

      /*
       * The currently-logged in user's time format.
       */
      timeFormat: string;

      /*
       * The currently-logged in user's datetime format.
       */
      dateTimeFormat: string;
    }

    export const local: Local;

    export type Numbering = Isomorphic.Numbering;
    export type ActionTraitType = Isomorphic.ActionTraitType;
    export type ActionTrait = Isomorphic.ActionTrait;

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

    export interface MongoProjection {
      [key: string]: number;
    }

    export interface Population {
      [key: string]: number | '$all' | '$label' | Population;
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

    export const fetch: (url: string, opts?: any) => Promise<any>;
    export function aux(
      collectionDefinition: CollectionDefinition,
      component?: React.Component
    ): CollectionInstance;
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
    export function assignDeep(obj: object, ...sources: object[]): object;
    export function clone<T>(obj: T): T;
    export function cloneDeep<T>(obj: T): T;
    export const collections: CollectionInstance[] & CollectionsByClassName;

    export const options: {
      env: 'development' | 'production';
      whiteLabel?: (metadata: Metadata) => string | undefined;
      formats?: {
        [typeName: string]: string;
      };
      jwt?: {
        accessToken?: string;
        refreshToken?: string;
      };
      stripe?: {
        test: {
          publishKey: string;
        };
        prod: {
          publishKey: string;
        };
      };
    };

    export const init: () => void;
    export function isCompliant(spec: any, value: any): boolean;
    export function isEqual(a: any, b: any): boolean;
    export function isObject(obj: any): obj is object;
    export function isSameId(
      a: AnyIdType | null | undefined,
      b: AnyIdType | null | undefined
    ): boolean;

    export function capitalize(name: string, all?: boolean): string;
    export function kebabize(str: string): string;
    export function labelize(name: string): string;
    export function numberize(numbering: Numbering, num: number): string;
    export function ordinalize(num: number): string;
    export function pluralize(str: string): string;
    export function singularize(str: string): string;
    export function snakize(str: string): string;
    export function unhtmlize(str: string): string;
    export function unitize(count: number, unit: string): string;

    export function parseUid(
      uid: string
    ): { collection: CollectionInstance; id: AnyIdType };
    export function byUid(
      uid: string,
      options?: any // Options_FindById
    ): Promise<Document | null>;
    export function projectify(obj: object | PathInstance[]): MongoProjection;
    export const reconnectSocket: () => void;
    export const setSocketLibrary: (library: typeof io) => void;
    export function serially<T, U>(
      values: T[],
      visitor: (value: T) => Promise<U>
    ): Promise<U[]>;

    export interface RawMongoDocument {
      [key: string]: any;
    }

    export type AnyIdType = string | number;
    export type ObjIdType = string;

    export interface PathStatic extends Omit<Isomorphic.PathStatic, 'resolve'> {
      new (...args: any[]): PathInstance;

      resolve(
        collection: CollectionInstance,
        parentPath?: PathInstance,
        path?: PathInstance | string
      ): PathInstance;
    }

    export interface PathInstance extends Isomorphic.PathInstance {
      detail: FieldInstance;
      fields: FieldInstance[];
      tail: FieldInstance;

      set<D extends Document<AnyIdType>>(
        obj: D,
        value: any,
        opts?: { create?: boolean; ignore?: boolean }
      ): void;
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

    export interface FieldDefinition<
      D extends Document<AnyIdType> = Document<AnyIdType>
    > {
      [key: string]: any;
      is?: string;
      client?: boolean | (() => boolean);
      custom?: boolean;
      db?: boolean;
      aux?: boolean;
      historical?: boolean;
      defaultValue?: any;

      //inverse?: boolean;

      label?: string | (() => string);
      help?: string;
      placeholder?: string;

      numbering?: Numbering;

      deprecated?: string | boolean;
      note?: string;

      required?: boolean;
      // this function needs to be bivariant, NOT contravariant -- so defining it like a method rather than a callback
      validate?(
        this: D,
        opts?: { field: FieldInstance<D>; trait?: ActionTrait }
      ): Promise<string | false | undefined> | string | false | undefined;

      of?: string | FieldDefinition<D>;
      cardinality?: string;

      fields?: { [key: string]: FieldDefinition<D> };
      keys?: string | FieldDefinition<D>;

      denormal?: MongoDocument;
      link?: string;
      relate?: 'owns' | 'ownedBy' | 'associate';
      where?: any;

      pathLabel?: string;

      in?: string;
      min?: number;
      max?: number;
      step?: number;

      labelField?: boolean | { uses: string[] };
      labelImageField?: boolean | { uses: string[] };
      orderField?: boolean | { uses: string[] };
      pattern?: RegExp;
      minlength?: number;
      maxlength?: number;

      granularity?: string;

      generated?: boolean;
      get?(this: D): any;
      getClient?(this: D): any;
      getServer?(this: D): any;
      set?(this: D, val: any): void;
      setClient?(this: D, val: any): void;
      setServer?(this: D, val: any): void;

      width?: number;
    }

    export interface FieldStatic {
      new (...args: any[]): FieldInstance;
    }

    export interface FieldInstance<
      D extends Document<AnyIdType> = Document<AnyIdType>
    > {
      $metaType: 'field';

      collection: CollectionInstance<D>;
      aux: boolean;
      computed: boolean;
      generated: boolean;
      db: boolean;
      def: FieldDefinition<D>;
      name: string;
      path: PathInstance;
      numbering?: Numbering;
      of?: FieldInstance<D>;
      parent?: this;
      pathLabel: string;
      pathName: string;
      readonly: boolean;
      spath: string;
      in: any;
      label: string | (() => string);
      link?: CollectionInstance;
      mediaType?: Tyr.MediaTypeId;
      relate?: 'owns' | 'ownedBy' | 'associate';
      type: TypeInstance;
      keys?: this;
      fields?: { [key: string]: this };
      method: string;
      populateName?: string;
      width?: number;

      schema?: any;
      dynamicMatch?: any;

      format(value: any): string;
      isId(): boolean;
      labelify(value: any): Promise<any>;
      labels(
        doc: Document,
        text?: string,
        opts?: { labelField?: string; limit?: number }
      ): Promise<Document[]>;
      validate(
        document: D,
        opts: { trait?: ActionTrait }
      ): Promise<string | false | undefined> | string | false | undefined;
    }

    export type DocumentType<
      C extends CollectionInstance
    > = C extends CollectionInstance<infer Document> ? Document : never;

    export type IdType<D extends Document> = D extends Document<infer ID>
      ? ID
      : never;

    export interface CollectionStatic extends Isomorphic.CollectionStatic {
      // Collection instance constructor
      new <D extends Document<AnyIdType> = Document<AnyIdType>>(
        def: any /* CollectionDefinition<D> */
      ): CollectionInstance<D>;
    }

    export interface CollectionInstance<
      D extends Document<AnyIdType> = Document<AnyIdType>
    > extends Class<D>, Isomorphic.CollectionInstance<D> {
      new (doc?: RawMongoDocument): D;

      aux(fields: { [key: string]: FieldDefinition<D> }): void;
      byId(id: IdType<D>, opts?: Options_FindById): Promise<D | null>;
      byIds(ids: IdType<D>[], opts?: Options_FindByIds): Promise<D[]>;
      byIdIndex: { [id: string]: D };
      byLabel(label: string): Promise<D | null>;
      cache(document: D, type?: 'remove' | undefined, silent?: boolean): void;
      count(opts?: Options_Count): Promise<number>;
      exists(opts: Options_Exists): Promise<boolean>;
      fields: { [fieldName: string]: FieldInstance<D> };
      fieldsFor(opts: {
        match?: MongoDocument;
        query?: MongoQuery;
        custom?: boolean;
        static?: boolean;
      }): Promise<{ [key: string]: Tyr.FieldInstance<D> }>;
      findAll(args: Options_FindMany): Promise<D[] & { count?: number }>;
      findOne(args: Options_FindOne): Promise<D | null>;
      id: string;
      idToLabel(id: IdType<D>): Promise<string>;
      idToUid(id: IdType<D> | string): string;
      insert<I, A extends I[]>(docs: A, opts?: Options_Insert): Promise<D[]>;
      insert<I>(doc: I): Promise<D>;
      insert(doc: any): Promise<any>;
      isAux(): boolean;
      isDb(): boolean;
      isSingleton(): boolean;
      isStatic(): boolean;
      isUid(uid: string): boolean;
      label: string;
      labelField: Tyr.FieldInstance;
      alternateLabelFields?: Tyr.FieldInstance[];
      labelImageField: any;
      orderField: any;
      labelFor(doc: D | object, opts?: { labelField: string }): string;
      labelProjection(labelField?: string): any; // Mongo Projection
      labels(text: string, opts?: { labelField?: string }): Promise<D[]>;
      labels(ids: string[], opts?: { labelField?: string }): Promise<D[]>;
      labels(_: any): Promise<D[]>;
      on(opts: any): () => void;
      parsePath(text: string): PathInstance;
      paths: { [fieldPathName: string]: FieldInstance<D> };
      push(
        id: IdType<D>,
        path: string,
        value: any,
        opts: Options_Pushpull
      ): Promise<void>;
      remove(id: IdType<D>, justOne: boolean): Promise<void>;
      remove(
        query: any /* MongoDB-style query */,
        justOne: boolean
      ): Promise<void>;
      save(doc: D | object): Promise<D>;
      save(doc: D[] | object[]): Promise<D[]>;
      save(doc: any): Promise<any>;
      subscribe(query: MongoQuery | undefined, cancel?: boolean): Promise<void>;

      update(opts: Options_Update & { query: MongoQuery }): any; // command result
      updateDoc(doc: D | MongoDocument, opts: Options_UpdateDoc): Promise<D>;
      values: D[];
    }

    export interface Document<ID extends AnyIdType = AnyIdType> {
      $access?: AccessResult;
      $cache(): this;
      $changed: boolean;
      $clone(): this;
      $cloneDeep(): this;
      $get(path: string): any;
      $(strings: TemplateStringsArray, ...keys: string[]): any;
      $id: IdType<this>;
      $isNew: boolean;
      $label: string;
      $metaType: 'document';
      $model: CollectionInstance<this>;
      $options: Options_AllFind;
      $orig?: this;
      $remove(opts?: any): Promise<void>;
      $revert(): void;
      $save(opts?: Options_Save): Promise<this>;
      $slice(path: string, opts: Options_Slice): Promise<void>;
      $snapshot(): void;
      $toPlain(): object;
      $tyr: typeof Tyr;
      $uid: string;
      $update(opts: Options_UpdateDoc): Promise<this>;
    }

    export interface Inserted<ID extends AnyIdType = AnyIdType>
      extends Document<ID> {
      _id: ID;
    }

    /*
     * Options
     */

    export interface OptionsCount {
      /**
       * Indicates that a count of the records should be added to the returned array.
       */
      count?: boolean;
    }

    /**
     * This provides a place to define options that are universal to all options methods
     */
    export interface OptionsCommon {
      timeout?: number;
    }

    export interface OptionsHistorical {
      /**
       * Return the historical version of the doc
       */
      historical?: boolean;
    }

    export interface OptionsKeepNonAccessible {
      /**
       * Indicates that results should not be filtered by security, but $checkAccess() should still be called.
       */
      keepNonAccessible?: boolean;
    }

    export interface OptionsParallel {
      /**
       * If specified this indicates that the documents will be returned in a parallel array to given list of
       * IDs/UIDs.  If the same id is given multiple times, the document instances will be shared.  If a
       * given identifier could not be found, then matching slots in the array will be undefined.
       */
      parallel?: boolean;
    }

    export interface OptionsPopulate {
      /**
       * The population fields to populate.
       */
      populate?: PopulationOption;
    }

    export type ProjectionOption =
      | { [key: string]: number }
      | { _history?: boolean }
      | string
      | Array<string | { [key: string]: number }>;

    export interface OptionsProjection {
      /**
       * The standard MongoDB-style fields object that specifies the projection.
       * @deprecated use projection
       */
      fields?: ProjectionOption;

      /**
       * The standard MongoDB-style fields object that specifies the projection.
       */
      projection?: ProjectionOption;
    }

    export interface OptionsQuery {
      /**
       * raw mongodb query
       */
      query?: MongoQuery;

      asOf?: Date;

      historical?: boolean;
    }

    export interface OptionsPlain {
      /**
       * Indicates that returned documents should be simple Plain 'ole JavaScript Objects (POJO)s.
       */
      plain?: boolean;
    }

    export interface OptionsCaching {
      /**
       * Indicates that the returned docuemnts should be returned from the cache if available
       */
      cached?: boolean;
    }

    export interface OptionsPost {
      /**
       * Provides a hook to do post-processing on the document.
       */
      post?: (opts: Options_All) => void;
    }

    export interface OptionsTimestamps {
      /**
       * Indicates if timestamps should be updated.
       * Defaults to the timestamps setting on the collection.
       */
      timestamps?: boolean;
    }

    export interface OptionsUpdate {
      /**
       * The standard MongoDB-style update object. 'insert' for inserts, etc.)
       * but you can override it with this option.
       */
      update: any;

      /**
       * multiple documents
       */
      multi?: boolean;
    }

    export interface OptionsWhere {
      /**
       * Applies a predicate that is applied to the dataset.
       */
      where?: (doc: any) => boolean;
    }

    export interface OptionsWindow {
      /**
       * The maximum number of documents to retrieve.
       */
      limit?: number;

      /**
       * The number of documents to skip.
       */
      skip?: number;

      /**
       * The standard MongoDB-style sort object.
       */
      sort?: { [key: string]: number };
    }

    /*
     * Options by operation
     */

    export interface Options_Count extends Options_Exists, OptionsQuery {}

    export interface Options_Exists
      extends OptionsCount,
        OptionsCommon,
        OptionsQuery {}

    export interface Options_FindById
      extends OptionsCaching,
        OptionsCommon,
        OptionsHistorical,
        OptionsKeepNonAccessible,
        OptionsPopulate,
        OptionsProjection,
        OptionsPlain {}

    export interface Options_FindByIds
      extends OptionsCaching,
        Options_FindById,
        OptionsKeepNonAccessible,
        OptionsParallel {}

    export interface Options_FindOne
      extends Options_FindById,
        OptionsQuery,
        OptionsWindow {}

    export interface Options_FindCursor
      extends Options_FindOne,
        OptionsWindow {}

    export interface Options_FindMany
      extends Options_FindCursor,
        OptionsCount {}

    export interface Options_AllFind extends Options_FindMany {}

    export interface Options_FindAndModify
      extends OptionsCommon,
        OptionsQuery,
        OptionsUpdate,
        OptionsProjection {
      /**
       * whether or not to return a new document in findAndModify
       */
      new?: boolean;

      /**
       * whether or not to insert the document if it doesn't exist
       */
      upsert?: boolean;
    }

    export interface Options_Insert
      extends OptionsCommon,
        OptionsHistorical,
        OptionsTimestamps {}

    export interface Options_Pushpull
      extends OptionsCommon,
        OptionsHistorical,
        OptionsTimestamps {}

    export interface Options_Remove extends OptionsCommon, OptionsQuery {}

    export interface Options_Save extends Options_Insert, Options_UpdateDoc {}

    export interface Options_Slice
      extends OptionsCommon,
        OptionsPopulate,
        OptionsWhere,
        OptionsWindow {}

    export interface Options_Update
      extends OptionsCommon,
        OptionsQuery,
        OptionsTimestamps,
        OptionsUpdate {}

    export interface Options_UpdateDoc
      extends OptionsCommon,
        OptionsHistorical,
        OptionsProjection,
        OptionsTimestamps {
      upsert?: boolean;
    }

    export interface Options_All
      extends OptionsCommon,
        OptionsHistorical,
        OptionsQuery,
        OptionsParallel,
        OptionsPlain,
        OptionsPopulate,
        OptionsPost,
        OptionsProjection,
        OptionsTimestamps,
        OptionsUpdate,
        OptionsWindow {}

    /**
     * Fields to populate in a document
     */
    export type PopulationOption =
      | string
      | string[]
      | { [key: string]: PopulationOption | 0 | 1 };

    export type LogOption = string | Error | Isomorphic.BaseTyrLog<ObjIdType>;

    export function trace(...args: LogOption[]): Promise<void>;
    export function log(...args: LogOption[]): Promise<void>;
    export function info(...args: LogOption[]): Promise<void>;
    export function warn(...args: LogOption[]): Promise<void>;
    export function error(...args: LogOption[]): Promise<void>;
    export function fatal(...args: LogOption[]): Promise<void>;

    export const query: QueryStatic;
    export interface QueryStatic {
      and(query: MongoQuery, spath: string, value: any): void;
      restrict(query: MongoQuery, doc: Tyr.Document): void;
    }
  }
}
