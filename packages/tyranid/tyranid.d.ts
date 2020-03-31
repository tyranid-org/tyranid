/**
 *  Type definitions for tyranid.js
 */
import * as stream from 'stream';
import * as Express from 'express';
import * as mongodb from 'mongodb';
import { ObjectID } from 'mongodb';
import { tokenToString } from 'typescript';

export { ObjectID };

import { Tyr as Isomorphic } from './isomorphic';
import { Options } from 'graphql/utilities/buildClientSchema';
import { stream } from 'exceljs';

/**
 *
 * TODO:
 *  - separate static vs database collections for different methods/ return types
 *  - Units are not a real collection and need separate typings
 *
 */

/**
 * Minor shorthand for declaring a generated property in a field definition.
 *
 * i.e. "..., generated, ..." instead of "..., generated: true, ..."
 */
export const generated = true;

/**
 * Minor shorthand for declaring a readonly property in a field definition.
 *
 * i.e. "..., labelField ..." instead of "..., labelField: true, ..."
 */
export const labelField = true;

/**
 * Minor shorthand for declaring a readonly property in a field definition.
 *
 * i.e. "..., readonly, ..." instead of "..., readonly: true, ..."
 */
export const readonly = true;

/**
 * Minor shorthand for declaring a readonly property in a field definition.
 *
 * i.e. "..., required ..." instead of "..., required: true, ..."
 */
export const required = true;

// declare properties of Tyr object
export namespace Tyr {
  export import AccessResult = Isomorphic.AccessResult;
  export import Class = Isomorphic.Class;
  export import MongoQuery = Isomorphic.MongoQuery;
  export import MongoUpdate = Isomorphic.MongoUpdate;

  export interface MongoProjection {
    [key: string]: number;
  }

  export type Metadata =
    | CollectionInstance
    | FieldInstance
    | PathInstance
    | Document;

  export const mapAwait = Isomorphic.mapAwait;

  export type anny = any;

  export const Collection: CollectionStatic;
  export const Event: EventStatic;
  export const Field: FieldStatic;
  export const Log: CollectionInstance;
  export const Path: PathStatic;
  export const Type: TypeStatic;

  export { AppError, SecureError, UserError } from Isomorphic;

  export const $all: '$all';
  export const byId: CollectionsById;
  export const byName: CollectionsByName;
  export const collections: CollectionInstance[] & CollectionsByClassName;
  export const csv: CsvStatic;
  export const diff: DiffStatic;
  export const excel: ExcelStatic;
  export const mongoClient: mongodb.MongoClient;
  export const db: mongodb.Db;
  export const documentPrototype: any;
  export const local: Local;
  export const options: ConfigOptions;
  export const query: QueryStatic;
  export const secure: Secure;

  export type Numbering =
    | 'lowercase'
    | 'uppercase'
    | 'zero-based'
    | 'one-based'
    | 'roman'
    | 'roman-lowercase';

  export namespace functions {
    export function paths(fn: Function): String[];
  }

  export function U(text: string | TemplateStringsArray | number): any;
  export function parseUid(
    uid: string
  ): { collection: CollectionInstance; id: AnyIdType };

  export function capitalize(name: string): string;
  export function labelize(name: string): string;
  export function numberize(numbering: Numbering, num: number): string;
  export function ordinalize(num: number): string;
  export function pluralize(str: string): string;
  export function singularize(str: string): string;
  export function unitize(count: number, unit: string): string;

  export function projectify(obj: object | Path[]): MongoProjection;
  export function sanitize(opts?: SanitizeOptions): Promise<void>;
  export function config(opts: ConfigOptions): Promise<void>;
  export function connect(opts: ConnectOptions): void;
  export function createIndexes(): Promise<void>;
  export function byUid(
    uid: string,
    options?: Options_FindById
  ): Promise<Document | null>;
  export function byUids(
    uidList: string[],
    options?: Options_FindByIds
  ): Promise<Document[]>;
  export function trace(opts: any): Promise<void>;
  export function log(opts: any): Promise<void>;
  export function info(id: number, message: string): Promise<void>;
  export function info(opts: any): Promise<void>;
  export function warn(message: string, err?: Error): Promise<void>;
  export function warn(opts: any): Promise<void>;
  export function error(opts: any): Promise<void>;
  export function fatal(opts: any): Promise<void>;
  export function express(
    app: Express.Application,
    auth?: Express.RequestHandler
  ): void;
  export function valuesBy(
    predicate: (field: FieldInstance) => boolean
  ): Promise<any[]>;
  export function generateClientLibrary(): string;
  export function migrate(): Promise<void>;
  export function init(): void;

  export function validate(opts?: { glob?: string }): void;

  export function isValidObjectIdStr(str: string): boolean;
  export function isObject(obj: any): obj is object;
  export function isObjectId<T>(obj: T | ObjectID): obj is ObjectID;

  export function parseBson(bson: any): object;

  export function adaptIllegalKeyCharAndEliminateRecursion(
    obj: RawMongoDocument
  ): RawMongoDocument;

  export function isCompliant(spec: any, value: any): boolean;
  export function isCompliant(spec: any): (value: any) => boolean;

  /**
   * utility methods
   */
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
  export function isEqual(a: any, b: any): boolean;
  export function isSameId(
    a: AnyIdType | null | undefined,
    b: AnyIdType | null | undefined
  ): boolean;
  export function indexOf(arr: any[], item: any): number;
  export function addToSet(set: any[], item: any): void;
  export function pullAll(arr: any[], item: any): void;
  export function clone<T>(obj: T): T;
  export function cloneDeep<T>(obj: T): T;
  export function arraySort(arr: any[], order: { [key: string]: number }): void;
  export function sleep(ms: number): Promise<void>;
  export function sleepUntil(
    fn: () => boolean | Promise<boolean>,
    maxMs?: number,
    everyMs?: number
  ): Promise<void>;
  export function stringify(
    value: any,
    replacer?: (key: string | symbol, value: any) => any,
    spacing?: string | number
  ): string;

  export function forget(id: string): void;

  export interface Cursor<D> extends mongodb.Cursor {
    next(): Promise<D>;
    next(cb: mongodb.MongoCallback<D>): void;
    toArray(): Promise<D[]>;
  }

  export interface RawMongoDocument {
    [key: string]: any;
  }

  export type MaybeRawDocument = Document | RawMongoDocument;

  export type ObjIdType = ObjectID;
  export type AnyIdType = ObjIdType | number | string;

  export type BootStage = 'compile' | 'link' | 'post-link';

  type RawDocument<Base> = { [K in keyof Base]: Base[K] };

  /**
   *  Generic tyranid document object.
   */
  export interface Document<ID extends AnyIdType = AnyIdType>
    extends Isomorphic.Document<ID> {
    $access?: AccessResult;
    $asOf(time: Date, fields?: any): void;
    $checkAccess(opts: { perm?: string; auth?: Document }): this;
    $clone(): this;
    $cloneDeep(): this;
    $copy(replacements: any, props?: Array<keyof this> | '$all'): this;
    $get(path: string): any;
    $(strings: TemplateStringsArray, ...keys: string[]): any;
    $id: ID;
    $insert(opts?: Options_Insert): Promise<this>;
    $label: string;
    $metaType: 'document';
    $model: CollectionInstance<this>;
    $options: Options_AllFind;
    $populate(fields: any, denormal?: boolean): Promise<this>;
    $redact(): void;
    $remove(opts?: { auth?: Document }): Promise<void>;
    $replace(replacements: any): Promise<this>;
    $save(opts?: { timestamps?: boolean }): Promise<this>;
    $slice(prop: string, opts?: Options_Slice): Promise<void>;
    $toClient(opts?: Options_ToClient): RawMongoDocument;
    $toPlain(): RawMongoDocument;
    $toRaw(): RawMongoDocument;
    $tyr: typeof Tyr;
    $uid: string;
    $update(fields?: any): Promise<this>;
    $validate(): UserError[];
  }

  export interface Inserted<ID extends AnyIdType = AnyIdType>
    extends Document<ID> {
    _id: ID;
  }

  /*
   * Options
   */

  export interface OptionsAuth {
    /**
     * An authorization object (a user, group, role, etc.) to pass to a Secure
     * plug-in. Can also be "true" to auto-detect the current user.
     */
    auth?: Tyr.Document | null;

    /**
     * The permission to use when an auth object is specified.
     * Usually perm is inferred ('view' for finds, 'delete' for removes, ...)
     */
    perm?: string;
  }

  export interface OptionsCount {
    /**
     * Indicates that a count of the records should be added to the returned array.
     */
    count?: boolean;
  }

  /**
   * This provides a place to define options that are universal to all options methods
   */
  export interface OptionsCommon {}

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

  export interface OptionsHttpRequest {
    /**
     * The express Request
     */
    req?: Express.Request;
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
    extends OptionsAuth,
      OptionsCount,
      OptionsCommon,
      OptionsQuery {}

  export interface Options_FindById
    extends OptionsAuth,
      OptionsCaching,
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

  export interface Options_FindCursor extends Options_FindOne, OptionsWindow {}

  export interface Options_FindMany extends Options_FindCursor, OptionsCount {}

  export interface Options_AllFind extends Options_FindMany {}

  export interface Options_FindAndModify
    extends OptionsAuth,
      OptionsCommon,
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
    extends OptionsAuth,
      OptionsCommon,
      OptionsHistorical,
      OptionsTimestamps,
      OptionsHttpRequest {}

  export interface Options_Pushpull
    extends OptionsAuth,
      OptionsCommon,
      OptionsHistorical,
      OptionsTimestamps {}

  export interface Options_Remove
    extends OptionsAuth,
      OptionsCommon,
      OptionsQuery {}

  export interface Options_Save extends Options_Insert, Options_UpdateDoc {}

  export interface Options_Slice
    extends OptionsAuth,
      OptionsCommon,
      OptionsPopulate,
      OptionsWhere,
      OptionsWindow {}

  export interface Options_FromClient
    extends OptionsAuth,
      OptionsCommon,
      OptionsHttpRequest {}

  export interface Options_ToClient
    extends OptionsAuth,
      OptionsCommon,
      OptionsPost,
      OptionsProjection {}

  export interface Options_Update
    extends OptionsAuth,
      OptionsCommon,
      OptionsQuery,
      OptionsTimestamps,
      OptionsUpdate {}

  export interface Options_UpdateDoc
    extends OptionsAuth,
      OptionsCommon,
      OptionsHistorical,
      OptionsTimestamps {}

  export interface Options_All
    extends OptionsAuth,
      OptionsCommon,
      OptionsHistorical,
      OptionsHttpRequest,
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

  /**
   *  Hash of strings -> fields
   */
  export interface FieldsObject<
    D extends Document<AnyIdType> = Document<AnyIdType>
  > {
    [fieldName: string]: FieldDefinition<D>;
  }

  /**
   * field used for doc.$id
   */
  export interface PrimaryKeyField {
    field: string;
    defaultMatchIdOnInsert?: boolean;
  }

  export interface ParameterDefinition<D extends Document<AnyIdType>> {
    is?: string;
    label?: string;
    help?: string;
    deprecated?: string | boolean;
    note?: string;
    required?: boolean;
    of?: string | ServiceParameterDefinition<D>;

    cardinality?: string;

    fields?: FieldsObject<D>;
    keys?: string | ServiceParameterDefinition<D>;

    link?: string;
    where?: any;

    in?: string;
    min?: number;
    max?: number;
    step?: number;

    pattern?: RegExp;
    minlength?: number;
    maxlength?: number;

    granularity?: string;
  }

  export interface BaseMethodDefinition<D extends Document<AnyIdType>> {
    help?: string;
    note?: string;
    deprecated?: string | boolean;
    params?: {
      [parameterName: string]: FieldDefinition<D> | FieldInstance<D>;
    };
    return?: FieldDefinition<D> | FieldInstance<D>;
  }

  export interface ServiceParameterDefinition<D extends Document<AnyIdType>>
    extends ParameterDefinition<D> {}

  export interface ServiceMethodDefinition<D extends Document<AnyIdType>>
    extends BaseMethodDefinition<D> {
    /**
     * This is the full URL path for this service.  This will be automatically generated
     * if you do not specify one.  Recommended to leave this blank and go with auto-generated
     * URL.
     */
    route?: string;
  }

  export interface ServiceDefinition<D extends Document<AnyIdType>> {
    [methodName: string]: ServiceMethodDefinition<D>;
  }

  export interface MethodDefinition<D extends Document<AnyIdType>>
    extends BaseMethodDefinition<D> {
    fn: Function;
    fnClient?: Function;
    fnServer?: Function;
  }

  export interface MethodsDefinition<D extends Document<AnyIdType>> {
    [methodName: string]: MethodDefinition<D>;
  }

  /**
   * collection.def
   */
  export interface CollectionDefinitionHydrated<
    D extends Document<AnyIdType> = Document<AnyIdType>
  > {
    // always available on collection
    primaryKey: PrimaryKeyField;
    id: string;
    name: string;
    fields: { [key: string]: FieldInstance<D> };
    dbName?: string;
    aux?: boolean;
    singleton?: boolean;
    label?: string;
    help?: string;
    note?: string;
    enum?: boolean;
    tag?: boolean;
    static?: boolean;
    client?: boolean;
    timestamps?: boolean;
    preserveInitialValues?: Function | boolean;
    values?: any[][];
    db?: mongodb.Db;
    internal?: boolean;
    methods?: MethodsDefinition<D>;
    service?: ServiceDefinition<D>;
  }

  /**
   *  TyranidCollectionDefinition options for tyranid collection
   */
  export interface CollectionDefinition<D extends Document<AnyIdType>> {
    [key: string]: any;
    id: string;
    name: string;
    dbName?: string;
    aux?: boolean;
    label?: string;
    help?: string;
    note?: string;
    enum?: boolean;
    client?: boolean;
    primaryKey?: PrimaryKeyField;
    timestamps?: boolean;
    preserveInitialValues?: Function | boolean;
    express?: {
      rest?: boolean;
      get?: boolean;
      post?: boolean;
      put?: boolean;
      fields?: boolean;
      labels?: boolean;
    };
    fields?: FieldsObject<D>;
    methods?: MethodsDefinition<D>;
    values?: any[][];
    fromClient?: (opts: Options_FromClient) => void;
    toClient?: (opts: Options_ToClient) => void;
    routes?: (app: Express.Application, auth: Express.RequestHandler) => void;
    service?: ServiceDefinition<D>;
  }

  export type CollectionCurriedMethodReturn =
    | Function
    | Promise<Document | Document[]>;

  export interface CollectionsByName {
    [key: string]: CollectionInstance;
  }

  export interface CollectionsByClassName {
    [key: string]: CollectionInstance;
  }

  export interface CollectionsById {
    [key: string]: CollectionInstance;
  }

  export interface Secure {
    canInsert?: (
      collection: CollectionInstance,
      doc: Tyr.Document,
      perm: string,
      auth: Tyr.Document
    ) => Promise<boolean> | boolean;
    boot(state: BootStage): void;
    checkAccess?(
      doc: Tyr.Document,
      perm: string,
      auth: Tyr.Document,
      opts: { keepNonAccessible?: boolean }
    ): void;
    query(
      collection: CollectionInstance,
      method: 'view' | 'update' | 'insert' | 'delete',
      auth?: Tyr.Document
    ): Promise<MongoQuery | boolean>;
  }

  export interface Local {
    user?: Document;
    req?: Express.Request;
    res?: Express.Response;
    define(propertyName: string): void;
  }

  export type ValidationPattern =
    | FileMatchValidationPattern
    | GlobValidationPattern;

  export interface FileMatchValidationPattern {
    dir: string;
    fileMatch: string;
  }

  export interface GlobValidationPattern {
    glob: string;
  }

  export type LogLevel = 'TRACE' | 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

  export interface ExceptionOptions {
    defaultMessage: string;
    httpCode: number;
  }

  export interface SanitizeOptions {
    /**
     * desired name of the output database
     */
    outDbName?: string;
    /**
     * number of documents to batch insert at a time
     */
    batchSize?: number;
    /**
     * verbose progress logging
     */
    verbose?: boolean;
    /**
     * sanitize each collection serially (defaults to concurrently)
     */
    serial?: boolean;
    /**
     * faker.js seed
     */
    seed?: number;
    /**
     * sanitize every string field automatically
     */
    autoSanitize?: boolean;
  }

  export interface ConfigOptions {
    aws?: {
      bucket?: string;
      cloudfrontPrefix?: string;
    };
    cls?: boolean;
    consoleLogLevel?: LogLevel | false;
    csrf?: {
      cookie: string;
      header: string;
    };
    db?: mongodb.Db;
    dbLogLevel?: LogLevel | false;
    exceptions?: {
      app?: ExceptionOptions;
      secure?: ExceptionOptions;
      user?: ExceptionOptions;
    };
    externalLogger?: (obj: any) => void | Promise<void>;
    externalLogLevel?: LogLevel | false;
    fixer?: {
      accessKey: string;
      every?: number;
    };
    formats?: {
      [typeName: string]: string;
    };
    indexes?: boolean;
    meta?: {
      collection?: {
        [customFieldName: string]: {
          client?: boolean;
        };
      };
    };
    migration?: {
      migrate?: boolean;
      list?: string[];
      dir?: string;
      waitingOnMigration?: boolean;
    };
    minify?: boolean;
    mongoClient?: mongodb.MongoClient;
    permissions?: {
      find: string;
      insert: string;
      update: string;
      remove: string;
    };
    pregenerateClient?: boolean;
    sanitize?: SanitizeOptions;
    secure?: Secure;
    validate?: ValidationPattern[];
    whiteLabel?: (metadata: Metadata) => string;
    whiteLabelClient?: (metadata: Metadata) => string;
  }

  export interface ConnectOptions {
    http?: any;
    store?: any;
    app?: Express.Application;
    auth?: Express.RequestHandler;
    noClient?: boolean;
  }

  export interface Component {
    boot(stage: string, pass: number): Promise<string | string[] | void>;
    clientCode(code: string): string;
    compileCollection(compiler: any, field: CollectionStatic): void;
    compileField(compiler: any, field: FieldInstance): void;
  }

  /*
  Not sure why this simpler version doesn't work for inferring ID in Inserted<ID>
  export type IdType<D extends Document> = D extends Document<infer ID>
    ? ID
    : never;
   */
  export type IdType<D extends Document<AnyIdType>> = D extends Document<
    infer ID
  >
    ? ID
    : D extends Inserted<infer ID>
    ? ID
    : never;

  export interface CollectionStatic {
    // Collection instance constructor
    new <D extends Document<AnyIdType> = Document<AnyIdType>>(
      def: CollectionDefinition<D>
    ): CollectionInstance<D>;
  }

  /**
   *  Tyranid collection class
   */
  export interface CollectionInstance<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > extends Component, Class<D>, Isomorphic.CollectionInstance<D> {
    // Collection instance constructor
    new (doc?: RawMongoDocument): D;

    byId(id: IdType<D> | string, options?: Options_FindById): Promise<D | null>;
    byIds(
      ids: Array<IdType<D> | string>,
      options?: Options_FindByIds
    ): Promise<D[]>;
    byLabel(label: string, forcePromise?: boolean): Promise<D | null>;

    count(opts: Options_Count): Promise<number>;

    db: mongodb.Collection;
    def: CollectionDefinitionHydrated<D>;
    denormal?: MongoDocument;

    exists(opts: Options_Exists): Promise<boolean>;

    fields: { [key: string]: FieldInstance<D> };
    fieldsBy(filter: (field: FieldInstance<D>) => boolean): FieldInstance<D>[];
    fieldsFor(opts: {
      match?: MongoObject;
      query?: MongoQuery;
      custom?: boolean;
      static?: boolean;
    }): Promise<{ [key: string]: FieldInstance<D> }>;

    fake(options: { n?: number; schemaOpts?: any; seed?: number }): Promise<D>;

    find(opts: Options_FindCursor): Promise<Cursor<D>>;
    findAll(opts?: Options_FindMany): Promise<D[] & { count?: number }>;
    findOne(opts: Options_FindOne): Promise<D | null>;
    findReferences(opts: {
      id?: any;
      ids?: any;
      idsOnly?: boolean;
      exclude?: Array<CollectionInstance<Document>>;
    }): Promise<Document[]>;

    /** @deprecated */
    findOne(id: IdType<D>, proj?: any): Promise<D | null>;

    findAndModify(opts: Options_FindAndModify): Promise<{ value: D } | null>;

    fire(event: EventInstance | EventDefinition): void;

    fromClient(
      doc: RawMongoDocument,
      path?: string,
      opts?: Options_FromClient
    ): Promise<D>;
    fromClientQuery(query: MongoQuery): MongoQuery;
    fromClientUpdate(update: MongoQuery): MongoUpdate;

    id: string;
    idToLabel(id: any): Promise<string>;
    idToUid(id: IdType<D> | string): string;

    insert<I, A extends I[]>(docs: A, opts?: Options_Insert): Promise<D[]>;
    insert<I extends object>(doc: I): Promise<D>;
    insert(doc: any): Promise<any>;

    isAux(): boolean;
    isDb(): boolean;
    isMethod(): boolean;
    isSingleton(): boolean;
    isStatic(): boolean;

    isUid(str: string): boolean;

    links(opts?: any): FieldInstance<D>[];

    label: string;
    labelField: FieldInstance<D>;
    labelFor(doc: MaybeRawDocument): string;
    labels(text: string): Promise<D[]>;
    labels(ids: string[]): Promise<D[]>;
    labels(_: any): Promise<D[]>;

    methodName?: string;
    migratePatchToDocument(progress?: (count: number) => void): Promise<void>;
    mixin(def: FieldDefinition<D>): void;

    on(opts: EventOnOptions<D>): () => void;

    parsePath(text: string): PathInstance;

    paths: { [key: string]: FieldInstance<D> };

    populate<R>(
      fields: string | string[] | { [key: string]: any }
    ): (docs: R) => Promise<R>;
    populate(fields: any, document: D, denormal?: boolean): Promise<D>;
    populate(fields: any, documents: D[], denormal?: boolean): Promise<D[]>;

    push(
      id: IdType<D> | string | number,
      path: string,
      prop: any,
      opts?: Options_Pushpull
    ): Promise<void>;
    pull(
      id: IdType<D> | string | number,
      path: string,
      fn: (p: any) => boolean,
      opts?: Options_Pushpull
    ): Promise<void>;

    remove(opts: Options_Remove): Promise<void>;
    removeReferences(opts: {
      id?: any;
      ids?: any;
      exclude?: Array<CollectionInstance<Document>>;
    }): Promise<void>;

    secureQuery(
      query: MongoQuery,
      perm: string,
      auth: Document
    ): Promise<MongoQuery>;

    save(rawDoc: D, opts?: Options_Save): Promise<D>;
    save(rawDoc: D[], opts?: Options_Save): Promise<D[]>;
    save(rawDoc: any, opts?: Options_Save): Promise<any>;

    subscribe(query: MongoQuery, cancel?: boolean): Promise<void>;

    toClient(
      doc:
        | undefined
        | null
        | Document
        | Document[]
        | RawMongoDocument
        | RawMongoDocument[]
    ): RawMongoDocument;

    update(opts: Options_Update & { query: MongoQuery }): Promise<D[]>;
    updateDoc(doc: MaybeRawDocument, opts?: Options_UpdateDoc): Promise<D>;

    values: D[];

    valuesFor(fields: FieldInstance<D>[]): Promise<any[]>;
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
      field: FieldInstance<D>
    ): Promise<string | false | undefined> | string | false | undefined;

    of?: string | FieldDefinition<D>;
    cardinality?: string;

    fields?: { [key: string]: string | FieldDefinition<D> };

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
    new (def: FieldDefinition, opts?: { [optionName]: any }): FieldInstance;
  }

  export interface FieldInstance<
    D extends Document<AnyIdType> = Document<AnyIdType>
  > {
    $metaType: 'field';

    aux: boolean;
    collection: CollectionInstance<D>;
    computed: boolean;
    db: boolean;
    def: FieldDefinition<D>;
    dynamicSchema?: any;
    generated: boolean;
    name: string;
    path: PathInstance;
    numbering?: Numbering;
    of?: FieldInstance<D>;
    parent?: FieldInstance<D>;
    pathLabel: string;
    readonly: boolean;
    pathName: string;
    spath: string;
    in: any;
    keys?: FieldInstance<D>;
    label: string | (() => string);
    link?: CollectionInstance;
    relate?: 'owns' | 'ownedBy' | 'associate';
    type: TypeInstance;
    fields?: { [key: string]: FieldInstance<D> };
    method: string;

    format(value: any): string;
    labelify(value: any): Promise<any>;
    labels(doc: Document, text?: string, opts?: any): Promise<Document[]>;
    validate(obj: {}):
      | Promise<string | false | undefined>
      | string
      | false
      | undefined;

    width?: number;
  }

  export interface PathStatic {
    new (
      base: CollectionInstance | FieldInstance,
      pathName: string,
      opts?: {
        skipArray?: boolean;
        method?: string;
      }
    ): PathInstance;

    resolve(
      collection: CollectionInstance,
      parentPath: PathInstance,
      path?: Tyr.PathInstance | string
    ): PathInstance;
    populateNameFor(name: string, denormal?: boolean): string;
  }

  export interface PathInstance extends Isomorphic.PathInstance {
    set<D extends Tyr.Document>(
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
    compile(compiler: any, path: string, field: FieldInstance): void;
    fromString(str: string): any;
    fromClient(field: FieldInstance, value: any): any;
    fromClientQuery(path: PathInstance, value: any): any;
    format(field: FieldInstance, value: any): string;
    matches(path: PathInstance, where: any, doc: MaybeRawDocument): boolean;
    query(path: PathInstance, where: any, query: MongoQuery): Promise<void>;
    toClient(field: FieldInstance, value: any): any;
    validate(field: FieldInstance, value: any): UserError;
    width?: number;
  }

  export interface UnitsStatic {
    new (
      sid: string,
      components: Array<{ degree: any; unit: any }>
    ): UnitsInstance;
  }

  export interface UnitsInstance {}

  export interface EventOnOptions<T> {
    from?: CollectionInstance;
    type: string;
    field?: string;
    handler: (
      event: EventInstance<T>
    ) => Promise<boolean | void> | boolean | void;
    when?: 'pre' | 'post' | 'both';
    order?: number;
  }

  export interface EventStatic {
    fire(event: EventInstance | EventDefinition): void;
  }

  export interface EventDefinition {
    broadcast?: boolean;
    collectionId?: string;
    collection?: CollectionInstance;
    dataCollectionId?: string;
    dataCollection?: CollectionInstance;
    date?: Date;
    document?: Document;
    documents?: Document[];
    fieldValue?: any;
    instanceId?: string;
    opts?: Options_All;
    query?: any;
    type: string;
    update?: any;
    when?: 'pre' | 'post';
  }

  export interface EventInstance<T extends Document> {
    broadcast?: boolean;
    collectionId: string;
    collection: CollectionInstance;
    dataCollectionId: string;
    dataCollection: CollectionInstance;
    date: Date;
    document?: Document;
    documents: Promise<T[]>;
    fieldValue?: any;
    instanceId?: string;
    opts?: Options_All;
    query?: any;
    type: string;
    update?: any;
    when: 'pre' | 'post';

    preventDefault(): void;
  }

  export interface DiffStatic {
    diffObj(
      a: RawMongoDocument,
      b: RawMongoDocument,
      props?: { [propName: string]: any }
    ): Tyr.RawMongoDocument;
    diffArr(a: any[], b: any[]): { [idx: number | string]: any };
    diffPropsObj(
      a: RawMongoDocument,
      b: RawMongoDocument
    ): (keyof a & keyof b)[];
    patchObj(a: any, patch: any, props?: { [propName: string]: any }): void;
    patchArr(a: any[], patch: any): void;
  }

  export interface QueryStatic {
    isQuery(doc: MongoQuery): boolean;
    matches(doc: MongoQuery, b: RawMongoDocument): boolean;
    merge(
      a: MongoQuery | null | undefined,
      b: MongoQuery | null | undefined
    ): MongoQuery;
    intersection(
      a: MongoQuery | null | undefined,
      b: MongoQuery | null | undefined
    ): MongoQuery | undefined;
  }

  //
  // File Formats
  //

  export interface FileFormatColumn<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > {
    field: string;
    get?(this: this, doc: D): any;
    label?: string;
  }

  export interface FileFormatDef<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > {
    collection: CollectionInstance<D>;
    columns: FileFormatColumn<D>[];
    filename?: string;
    stream?: stream.Writable;
  }

  //
  // File Format: Csv
  //

  export type CsvDef<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > = FileFormatDef<D> & {};

  export interface CsvStatic {
    toCsv<D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>>(
      opts: CsvDev<D> & {
        documents: D[];
      }
    ): Promise<void>;
    fromCsv<D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>>(
      opts: CsvDef<D> & { collection: CollectionInstance<D> }
    ): Promise<D[]>;
  }

  //
  // File Format: Excel
  //

  export type ExcelAlignment = {
    horizontal?:
      | 'left'
      | 'center'
      | 'right'
      | 'fill'
      | 'centerContinuous'
      | 'distributed'
      | 'justify';
    vertical?: 'top' | 'middle' | 'bottom' | 'distributed' | 'justify';
    wrapText?: boolean;
    indent?: number;
    readingOrder?: 'rtl' | 'ltr';
    textRotation?: number | 'vertical';
  };

  export type ExcelBorderStyle =
    | 'thin'
    | 'dotted'
    | 'dashDot'
    | 'hair'
    | 'dashDotDot'
    | 'slantDashDot'
    | 'mediumDashed'
    | 'mediumDashDotDot'
    | 'mediumDashDot'
    | 'medium'
    | 'double'
    | 'thick';

  export type ExcelBorder = {
    color?: string;
    style?: ExcelBorderStyle;
  };

  export type ExcelFillPattern =
    | 'none'
    | 'solid'
    | 'darkVertical'
    | 'darkGray'
    | 'mediumGray'
    | 'lightGray'
    | 'gray125'
    | 'gray0625'
    | 'darkHorizontal'
    | 'darkVertical'
    | 'darkDown'
    | 'darkUp'
    | 'darkGrid'
    | 'darkTrellis'
    | 'lightHorizontal'
    | 'lightVertical'
    | 'lightDown'
    | 'lightUp'
    | 'lightGrid'
    | 'lightTrellis'
    | 'lightGrid';

  export type ExcelPatternFill = {
    type: 'pattern';
    pattern?: ExcelFillPattern;
    fgColor?: string;
    bgColor?: string;
  };

  export type ExcelGradientFill = {
    type: 'gradient';
    gradient: 'angle' | 'path';
    degree?: number;
    center?: { left: number; top: number };
    stops?: { position: number; color: string }[];
  };

  export type ExcelFill = ExcelPatternFill | ExcelGradientFill;

  export type ExcelFont = {
    name?: string;
    family?: number;
    scheme?: 'major' | 'minor' | 'none';
    charset?: number;
    size?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    outline?: boolean;
    strike?: boolean;
    underline?: boolean;
    vertAlign?: 'superscript' | 'subscript';
  };

  export type ExcelStyle = {
    alignment?: ExcelAlignment;
    borderTop?: ExcelBorder;
    borderRight?: ExcelBorder;
    borderBottom?: ExcelBorder;
    borderLeft?: ExcelBorder;
    format?: string;
    color?: string;
    fill?: ExcelFill;
    font?: ExcelFont;
  };

  export interface ExcelColumn<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > extends FileFormatColumn<D> {
    cell?: ExcelStyle | ((doc: D) => ExcelStyle);
    header?: ExcelStyle;
    width?: number;
  }

  export interface ExcelDef<
    D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>
  > extends FileFormatDef<D> {
    collection: CollectionInstance;
    header?: {
      height?: number;
      extraRows: [
        {
          height?: number;
          columns: ({
            colspan?: number;
            label?: string;
          } & ExcelStyle)[];
        }
      ];
    };
    columns: ExcelColumn<D>[];
    images?: {
      path: string;
      location:
        | string
        | {
            tl: { col: number; row: number };
            br: { col: number; row: number };
            editAs?: 'oneCell' | 'absolute';
            ext?: { height: number; width: number };
          };
    }[];
  }

  export interface ExcelStatic {
    toExcel<D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>>(
      opts: ExcelDef<D> & { documents: D[] }
    ): Promise<void>;
    fromExcel<D extends Tyr.Document<AnyIdType> = Tyr.Document<AnyIdType>>(
      opts: ExcelDef<D>
    ): Promise<D[]>;
  }

  //
  // Type Catalog
  //

  export const catalog = {
    /**
     * This contains the type definition for the options field passed to a "findOne/findAll"-style query.
     *
     * This is useful for when you want to pass up to the server the current configuration of a Tyreant
     * TyrTable.
     */
    FindOpts: any
  };

  export type LogOption = string | Error | BaseTyrLog<ObjIdType>;

  export function trace(...args: LogOption[]): Promise<void>;
  export function log(...args: LogOption[]): Promise<void>;
  export function info(...args: LogOption[]): Promise<void>;
  export function warn(...args: LogOption[]): Promise<void>;
  export function error(...args: LogOption[]): Promise<void>;
  export function fatal(...args: LogOption[]): Promise<void>;
}
