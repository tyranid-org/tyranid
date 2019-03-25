/**
 *  Type definitions for tyranid.js
 */
import * as Express from 'express';
import * as mongodb from 'mongodb';
import { ObjectID } from 'mongodb';
import { tokenToString } from 'typescript';

export { ObjectID };

import { Tyr as Isomorphic } from './isomorphic';
import { Options } from 'graphql/utilities/buildClientSchema';

/**
 *
 * TODO:
 *  - separate static vs database collections for different methods/ return types
 *  - Units are not a real collection and need separate typings
 *
 */

// declare properties of Tyr object
export namespace Tyr {
  export import AccessResult = Isomorphic.AccessResult;
  export import Class = Isomorphic.Class;
  export import MongoQuery = Isomorphic.MongoQuery;

  export const Collection: CollectionStatic;
  export const Event: EventStatic;
  export const Field: FieldStatic;
  export const Log: CollectionInstance;
  export const NamePath: NamePathStatic;
  export const Type: TypeStatic;

  export type anny = any;

  export const $all: '$all';
  export const byId: CollectionsById;
  export const byName: CollectionsByName;
  export const collections: CollectionInstance[] & CollectionsByClassName;
  export const mongoClient: mongodb.MongoClient;
  export const db: mongodb.Db;
  export const documentPrototype: any;
  export const local: Local;
  export const options: ConfigOptions;
  export const query: QueryStatic;
  export const secure: Secure;

  export namespace functions {
    export function paths(fn: Function): String[];
  }

  export function U(text: string | TemplateStringsArray | number): any;
  export function parseUid(
    uid: string
  ): { collection: CollectionInstance; id: AnyIdType };
  export function labelize(name: string): string;
  export function pluralize(str: string): string;
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
  export function isEqual(a: any, b: any): boolean;
  export function isSameId(
    a: AnyIdType | null | undefined,
    b: AnyIdType | null | undefined
  ): boolean;
  export function indexOf(arr: any[], item: any): number;
  export function addToSet(set: any[], item: any): void;
  export function pullAll(arr: any[], item: any): void;
  export function cloneDeep<T>(obj: T): T;
  export function arraySort(arr: any[], order: { [key: string]: number }): void;
  export function sleep(ms: number): Promise<void>;
  export function sleepUntil(
    fn: () => boolean | Promise<boolean>,
    maxMs?: number,
    everyMs?: number
  ): Promise<void>;

  export function forget(id: string): void;

  export interface Cursor<T> extends mongodb.Cursor {
    next(): Promise<T>;
    next(cb: mongodb.MongoCallback<T>): void;
    toArray(): Promise<T[]>;
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
  export interface Document<IdType extends AnyIdType = AnyIdType> {
    $access?: AccessResult;
    $asOf(time: Date, fields?: any): void;
    $checkAccess(opts: { perm?: string; auth?: Tyr.Document }): this;
    $clone(): this;
    $cloneDeep(): this;
    $copy(replacements: any, props?: Array<keyof this> | '$all'): this;
    $id: IdType;
    $insert(opts?: { auth?: Tyr.Document }): Promise<this>;
    $label: string;
    $model: CollectionInstance<IdType, this>;
    $options: Options_AllFind;
    $populate(fields: any, denormal?: boolean): Promise<this>;
    $redact(): void;
    $remove(opts?: { auth?: Tyr.Document }): Promise<void>;
    $replace(replacements: any): Promise<this>;
    $save(opts?: { timestamps?: boolean }): Promise<this>;
    $slice(prop: string, opts?: Options_Slice): Promise<void>;
    $toClient(opts?: Options_ToClient): RawMongoDocument;
    $toPlain(): RawMongoDocument;
    $toRaw(): RawMongoDocument;
    $tyr: typeof Tyr;
    $uid: string;
    $update(fields?: any): Promise<this>;
    $validate(): ValidationError[];
  }

  export interface Inserted<IdType extends AnyIdType = AnyIdType>
    extends Document<IdType> {
    _id: IdType;
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

  export interface OptionsProjection {
    /**
     * The standard MongoDB-style fields object that specifies the projection.
     * @deprecated use projection
     */
    fields?:
      | { [key: string]: number }
      | { _history?: boolean }
      | string
      | Array<string | { [key: string]: number }>;
    /**
     * The standard MongoDB-style fields object that specifies the projection.
     */
    projection?:
      | { [key: string]: number }
      | { _history?: boolean }
      | string
      | Array<string | { [key: string]: number }>;
  }

  export interface OptionsQuery {
    /**
     * raw mongodb query
     */
    query: MongoQuery;

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
      OptionsQuery {}

  export interface Options_FindById
    extends OptionsAuth,
      OptionsCaching,
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
      OptionsHistorical,
      OptionsTimestamps {}

  export interface Options_Remove extends OptionsAuth, OptionsQuery {}

  export interface Options_Save extends Options_Insert, Options_UpdateDoc {}

  export interface Options_Slice
    extends OptionsAuth,
      OptionsPopulate,
      OptionsWhere,
      OptionsWindow {}

  export interface Options_FromClient extends OptionsAuth, OptionsHttpRequest {}

  export interface Options_ToClient
    extends OptionsAuth,
      OptionsPost,
      OptionsProjection {}

  export interface Options_Update
    extends OptionsAuth,
      OptionsQuery,
      OptionsTimestamps,
      OptionsUpdate {}

  export interface Options_UpdateDoc
    extends OptionsAuth,
      OptionsHistorical,
      OptionsTimestamps {}

  export interface Options_All
    extends OptionsAuth,
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

  /**
   *  Hash of strings -> fields
   */
  export interface FieldsObject {
    [fieldName: string]: FieldDefinition;
  }

  /**
   * field used for doc.$id
   */
  export interface PrimaryKeyField {
    field: string;
    defaultMatchIdOnInsert?: boolean;
  }

  /**
   * collection.def
   */
  export interface CollectionDefinitionHydrated {
    // always available on collection
    primaryKey: PrimaryKeyField;
    id: string;
    name: string;
    fields: { [key: string]: FieldInstance };
    dbName?: string;
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
  }

  /**
   *  TyranidCollectionDefinition options for tyranid collection
   */
  export interface CollectionDefinition {
    [key: string]: any;
    id: string;
    name: string;
    dbName?: string;
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
    fields?: FieldsObject;
    methods?: {
      [methodName: string]: {
        is: string;
        fn: Function;
        fnClient?: Function;
        fnServer?: Function;
      };
    };
    values?: any[][];
    fromClient?: (opts: Options_FromClient) => void;
    toClient?: (opts: Options_ToClient) => void;
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

  export interface ConfigOptions {
    aws?: {
      bucket?: string;
      cloudfrontPrefix?: string;
    };
    cls?: boolean;
    consoleLogLevel?: LogLevel | false;
    db?: mongodb.Db;
    dbLogLevel?: LogLevel | false;
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
    secure?: Secure;
    validate?: ValidationPattern[];
  }

  export interface ConnectOptions {
    http?: any;
    store?: any;
    app?: Express.Application;
    auth?: Express.RequestHandler;
    noClient?: boolean;
  }

  export interface CollectionStatic {
    // Collection instance constructor
    new <
      IdType extends AnyIdType = AnyIdType,
      T extends Document<IdType> = Document<IdType>
    >(
      def: CollectionDefinition
    ): CollectionInstance<IdType, T>;
  }

  export interface Component {
    boot(stage: string, pass: number): Promise<string | string[] | void>;
    clientCode(code: string): string;
    compileCollection(compiler: any, field: CollectionStatic): void;
    compileField(compiler: any, field: FieldInstance): void;
  }

  /**
   *  Tyranid collection class
   */
  export interface CollectionInstance<
    IdType extends AnyIdType = AnyIdType,
    T extends Tyr.Document<IdType> = Tyr.Document<IdType>
  > extends Component, Class<T> {
    // Collection instance constructor
    new (doc?: RawMongoDocument): T;

    byId(id: IdType | string, options?: Options_FindById): Promise<T | null>;
    byIds(
      ids: Array<IdType | string>,
      options?: Options_FindByIds
    ): Promise<T[]>;
    byLabel(label: string, forcePromise?: boolean): Promise<T | null>;

    count(opts: Options_Count): Promise<number>;

    customFields(): Promise<{ [key: string]: FieldInstance }>;

    db: mongodb.Collection;
    def: CollectionDefinitionHydrated;

    exists(opts: Options_Exists): Promise<boolean>;

    fields: { [key: string]: FieldInstance };
    fieldsBy(filter: (field: FieldInstance) => boolean): FieldInstance[];
    fieldsFor(obj: any): Promise<{ [key: string]: FieldInstance }>;

    fake(options: { n?: number; schemaOpts?: any; seed?: number }): Promise<T>;

    find(opts: Options_FindCursor): Promise<Cursor<T>>;
    findAll(opts: Options_FindMany): Promise<T[] & { count?: number }>;
    findOne(opts: Options_FindOne): Promise<T | null>;

    /** @deprecated */
    findOne(id: IdType, proj?: any): Promise<T | null>;

    findAndModify(opts: Options_FindAndModify): Promise<{ value: T } | null>;

    fire(event: EventInstance | EventDefinition): void;

    fromClient(doc: RawMongoDocument, path?: string): T;
    fromClientQuery(query: MongoQuery): MongoQuery;

    id: string;
    idToLabel(id: any): Promise<string>;
    idToUid(id: IdType | string): string;

    insert<I, A extends I[]>(docs: A, opts?: Options_Insert): Promise<T[]>;
    insert<I extends object>(doc: I): Promise<T>;
    insert(doc: any): Promise<any>;

    isStatic(): boolean;

    isUid(str: string): boolean;

    links(opts?: any): FieldInstance[];

    label: string;
    labelField: FieldInstance;
    labelFor(doc: MaybeRawDocument): string;
    labels(text: string): Promise<T[]>;
    labels(ids: string[]): Promise<T[]>;
    labels(_: any): Promise<T[]>;

    migratePatchToDocument(progress?: (count: number) => void): Promise<void>;
    mixin(def: FieldDefinition): void;

    on(opts: EventOnOptions): () => void;

    parsePath(text: string): NamePathInstance;

    paths: { [key: string]: FieldInstance };

    populate<R>(
      fields: string | string[] | { [key: string]: any }
    ): (docs: R) => Promise<R>;
    populate(fields: any, document: T, denormal?: boolean): Promise<T>;
    populate(fields: any, documents: T[], denormal?: boolean): Promise<T[]>;

    push(id: IdType | string | number, path: string, prop: any): Promise<void>;
    pull(
      id: IdType | string | number,
      path: string,
      fn: (p: any) => boolean
    ): Promise<void>;

    references(opts: {
      id?: any;
      ids?: any;
      idsOnly?: boolean;
      exclude?: Array<CollectionInstance<AnyIdType, Tyr.Document>>;
    }): Promise<Tyr.Document[]>;

    remove(opts: Options_Remove): Promise<void>;

    secureQuery(
      query: MongoQuery,
      perm: string,
      auth: Document
    ): Promise<MongoQuery>;

    save(rawDoc: T, opts?: Options_Save): Promise<T>;
    save(rawDoc: T[], opts?: Options_Save): Promise<T[]>;
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

    update(opts: Options_Update & { query: MongoQuery }): Promise<T[]>;
    updateDoc(doc: MaybeRawDocument, opts?: Options_UpdateDoc): Promise<T>;

    values: T[];

    valuesFor(fields: FieldInstance[]): Promise<any[]>;
  }

  export interface FieldDefinitionRaw extends Isomorphic.FieldDefinitionRaw {}

  export interface FieldDefinition
    extends FieldDefinitionRaw,
      Isomorphic.FieldDefinition {}

  export interface FieldStatic extends Isomorphic.FieldStatic {
    new (...args: any[]): FieldInstance;
  }

  export interface FieldInstance extends Isomorphic.FieldInstance {
    collection: CollectionInstance;
    def: FieldDefinition;
    namePath: NamePathInstance;
    of?: FieldInstance;
    parent?: FieldInstance;
    keys?: FieldInstance;
    label: string | (() => string);
    link?: CollectionInstance;
    type: TypeInstance;
    fields?: { [key: string]: FieldInstance };

    labels(
      doc: Tyr.Document,
      text?: string,
      opts?: any
    ): Promise<Tyr.Document[]>;
  }

  export interface NamePathStatic {
    new (...args: any[]): NamePathInstance;
  }

  export interface NamePathInstance {
    detail: FieldInstance;
    name: string;
    path: string[];
    fields: FieldInstance[];
    pathLabel: string;
    tail: FieldInstance;

    parsePath(path: string): NamePathInstance;
    pathName(idx: number): string;
    uniq(obj: any): any[];
    get(obj: any): any;
    set<D extends Tyr.Document>(obj: D, prop: string): void;
  }

  export interface UnitsStatic {
    new (
      sid: string,
      components: Array<{ degree: any; unit: any }>
    ): UnitsInstance;
  }

  export interface UnitsInstance {}

  export interface EventOnOptions {
    type: string;
    handler: (event: EventDefinition | EventInstance) => Promise<boolean>;
    when?: 'pre' | 'post';
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

  export interface EventInstance {
    broadcast?: boolean;
    collectionId: string;
    collection: CollectionInstance;
    dataCollectionId: string;
    dataCollection: CollectionInstance;
    date: Date;
    document?: Document;
    documents: Promise<Document[]>;
    fieldValue?: any;
    instanceId?: string;
    opts?: Options_All;
    query?: any;
    type: string;
    update?: any;
    when: 'pre' | 'post';

    preventDefault(): void;
  }

  export interface TypeStatic {
    byName: { [key: string]: TypeInstance };

    new (...args: any[]): TypeInstance;
  }

  export interface TypeDefinition {
    name: string;
  }

  export interface TypeInstance {
    name: string;
    def: TypeDefinition;
    compare(field: FieldInstance, a: any, b: any): void;
    compile(compiler: any, path: string, field: FieldInstance): void;
    fromString(str: string): any;
    fromClient(field: FieldInstance, value: any): any;
    format(field: FieldInstance, value: any): string;
    matches(
      namePath: NamePathInstance,
      where: any,
      doc: MaybeRawDocument
    ): boolean;
    query(
      namePath: NamePathInstance,
      where: any,
      query: MongoQuery
    ): Promise<void>;
    sortValue(namePath: NamePathInstance, value: any): any;
    toClient(field: FieldInstance, value: any): any;
    validate(field: FieldInstance, value: any): ValidationError;
  }

  /**
   *  Error thrown in validation failure
   */
  export interface ValidationErrorStatic {
    new (...args: any[]): ValidationError;
  }

  export interface ValidationError {
    reason: string;
    field: FieldInstance;
    message: string;
    tostring(): string;
  }

  export interface QueryStatic {
    merge(a: MongoQuery, b: MongoQuery): MongoQuery;
  }
}
