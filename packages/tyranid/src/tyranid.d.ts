/**
 *  Type definitions for tyranid.js
 */
import * as Express from 'express';
import * as mongodb from 'mongodb';

/**
 *
 * TODO:
 *  - separate static vs database collections for different methods/ return types
 *  - Units are not a real collection and need separate typings
 *
 */

export = Tyranid;

declare namespace Tyranid {
  // declare properties of Tyr object
  export namespace Tyr {
    export const Collection: CollectionStatic;
    export const Event: EventStatic;
    export const Field: FieldStatic;
    export const Log: CollectionInstance;
    export const NamePath: NamePathStatic;
    export const Type: TypeStatic;

    export const $all: any;
    export const byId: CollectionsById;
    export const byName: CollectionsByName;
    export const collections: CollectionInstance[] & CollectionsByName;
    export const db: mongodb.Db;
    export const documentPrototype: any;
    export const local: Local;
    export const options: ConfigOptions;
    export const query: QueryStatic;
    export const secure: Secure;

    export function U(text: string | TemplateStringsArray | number): any;
    export function parseUid(
      uid: string
    ): { collection: CollectionInstance; id: IdType };
    export function labelize(name: string): string;
    export function pluralize(str: string): string;
    export function config(opts: ConfigOptions): Promise<void>;
    export function connect(opts: ConnectOptions): void;
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
    export function isObjectId<T>(
      obj: T | mongodb.ObjectID
    ): obj is mongodb.ObjectID;

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
      a: string | IdType | null | undefined,
      b: string | IdType | null | undefined
    ): boolean;
    export function indexOf(arr: any[], item: any): number;
    export function addToSet(set: any[], item: any): void;
    export function pullAll(arr: any[], item: any): void;
    export function cloneDeep<T>(obj: T): T;
    export function arraySort(
      arr: any[],
      order: { [key: string]: number }
    ): void;
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

    export type MongoQuery = RawMongoDocument;
    export type MaybeRawDocument = Document | RawMongoDocument;
    export type LabelType = string;
    export type IdType = mongodb.ObjectID;
    export type LabelList = Array<{ [labelField: string]: string }>;
    export type BootStage = 'compile' | 'link' | 'post-link';

    export interface Class<T> {
      new (...args: any[]): T;
    }

    type RawDocument<Base> = { [K in keyof Base]: Base[K] };

    /**
     *  Generic tyranid document object.
     */
    export interface Document {
      // universal properties
      $id: IdType;
      $model: CollectionInstance<this>;
      $uid: string;
      $label: string;
      $tyr: typeof Tyr;

      // methods
      $remove(opts?: { auth?: Tyr.Document }): Promise<void>;
      $clone(): this;
      $cloneDeep(): this;
      $insert(opts?: { auth?: Tyr.Document }): Promise<this>;
      $populate(fields: any, denormal?: boolean): Promise<this>;
      $save(opts?: { timestamps?: boolean }): Promise<this>;
      $toClient(opts?: Options_ToClient): RawMongoDocument;
      $toPlain(): RawMongoDocument;
      $update(fields?: any): Promise<this>;
      $validate(): ValidationError[];
      $replace(replacements: any): Promise<this>;
      $copy(replacements: any, props?: Array<keyof this>): this;
      $slice(prop: string, opts?: Options_Slice): Promise<this>;
      $asOf(time: Date, fields?: any): void;
      $toRaw(): RawMongoDocument;
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
       */
      fields?:
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
        OptionsHistorical,
        OptionsPopulate,
        OptionsProjection,
        OptionsPlain {}

    export interface Options_FindByIds
      extends Options_FindById,
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
      | { [key: string]: PopulationOption };

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
      label?: LabelType;
      help?: string;
      note?: string;
      enum?: boolean;
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
      label?: LabelType;
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
      fromClient?: (opts: object) => void;
      toClient?: (opts: object) => void;
    }

    export interface FieldDefinitionRaw {
      [key: string]: any;
      is?: string;
      client?: boolean | (() => boolean);
      custom?: boolean;
      db?: boolean;
      historical?: boolean;
      defaultValue?: any;

      label?: LabelType | (() => string);
      help?: string;
      placeholder?: string;

      deprecated?: string | boolean;
      note?: string;

      required?: boolean;
      validate?: (field: FieldInstance) => Promise<string | undefined>;

      of?: FieldDefinition;
      cardinality?: string;

      fields?: FieldsObject;
      keys?: FieldDefinition;

      denormal?: any;
      link?: string;
      relate?: 'owns' | 'ownedBy' | 'associate';
      where?: any;

      in?: string;
      min?: number;
      max?: number;
      step?: number;

      labelField?: boolean;
      pattern?: RegExp;
      minlength?: number;
      maxlength?: number;

      granularity?: string;

      get?: Function;
      getClient?: Function;
      getServer?: Function;
      set?: Function;
      setClient?: Function;
      setServer?: Function;
    }

    /**
     *  Configuration definition for tyranid field.
     */
    export interface FieldDefinition extends FieldDefinitionRaw {
      def?: FieldDefinitionRaw;
      pathLabel?: string;
    }

    export type CollectionCurriedMethodReturn =
      | Function
      | Promise<Document | Document[]>;

    export interface CollectionsByName {
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

    export type LogLevel =
      | 'TRACE'
      | 'LOG'
      | 'INFO'
      | 'WARN'
      | 'ERROR'
      | 'FATAL';

    export interface ConfigOptions {
      db?: mongodb.Db;
      consoleLogLevel?: LogLevel | false;
      externalLogLevel?: LogLevel | false;
      dbLogLevel?: LogLevel | false;
      externalLogger?: (obj: any) => void | Promise<void>;
      fixer?: {
        accessKey: string;
        every?: number;
      };
      secure?: Secure;
      cls?: boolean;
      validate?: ValidationPattern[];
      pregenerateClient?: boolean;
      indexes?: boolean;
      minify?: boolean;
      permissions?: {
        find: string;
        insert: string;
        update: string;
        remove: string;
      };
      migration?: {
        migrate?: boolean;
        list?: string[];
        dir?: string;
        waitingOnMigration?: boolean;
      };
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
      new <T extends Document = Document>(
        def: CollectionDefinition
      ): CollectionInstance<T>;
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
    export interface CollectionInstance<T extends Tyr.Document = Tyr.Document>
      extends Component {
      fields: { [key: string]: FieldInstance };
      label: LabelType;
      labelField: FieldInstance;
      paths: { [key: string]: FieldInstance };
      def: CollectionDefinitionHydrated;
      db: mongodb.Collection;
      id: string;

      // Collection instance constructor
      new (doc?: RawMongoDocument): T;

      secureQuery(
        query: MongoQuery,
        perm: string,
        auth: Document
      ): Promise<MongoQuery>;

      byId(
        id: IdType | string | number,
        options?: Options_FindById
      ): Promise<T | null>;
      byIds(
        ids: Array<IdType | number | string>,
        options?: Options_FindByIds
      ): Promise<T[]>;
      byLabel(label: LabelType, forcePromise?: boolean): Promise<T | null>;

      count(opts: Options_Count): Promise<number>;

      exists(opts: Options_Exists): Promise<boolean>;

      fieldsBy(filter: (field: FieldInstance) => boolean): FieldInstance[];
      fieldsFor(obj: any): Promise<{ [key: string]: FieldInstance }>;
      idToUid(id: string | mongodb.ObjectID): string;

      fake(options: {
        n?: number;
        schemaOpts?: any;
        seed?: number;
      }): Promise<T>;

      find(opts: Options_FindCursor): Promise<Cursor<T>>;
      findAll(opts: Options_FindMany): Promise<T[] & { count?: number }>;
      findOne(opts: Options_FindOne): Promise<T | null>;

      /** @deprecated */
      findOne(id: mongodb.ObjectID, proj?: any): Promise<T | null>;

      findAndModify(opts: Options_FindAndModify): Promise<{ value: T } | null>;

      fire(event: EventInstance | EventDefinition): void;

      fromClient(doc: RawMongoDocument, path?: string): T;
      fromClientQuery(query: MongoQuery): MongoQuery;
      toClient(
        doc:
          | undefined
          | null
          | Document
          | Document[]
          | RawMongoDocument
          | RawMongoDocument[]
      ): RawMongoDocument;

      idToLabel(id: any): Promise<string>;
      insert<I, A extends I[]>(docs: A, opts?: Options_Insert): Promise<T[]>;
      insert<I>(doc: I): Promise<T>;
      isStatic(): boolean;

      isUid(str: string): boolean;

      links(opts?: any): FieldInstance[];

      labelFor(doc: MaybeRawDocument): string;
      labels(text: string | string[]): LabelList;

      migratePatchToDocument(progress?: (count: number) => void): Promise<void>;
      mixin(def: FieldDefinition): void;

      on(opts: EventOnOptions): () => void;

      parsePath(text: string): NamePathInstance;

      populate<R>(
        fields: string | string[] | { [key: string]: any }
      ): (docs: R) => Promise<R>;
      populate(fields: any, document: T, denormal?: boolean): Promise<T>;
      populate(fields: any, documents: T[], denormal?: boolean): Promise<T[]>;

      push(
        id: IdType | string | number,
        path: string,
        prop: any
      ): Promise<void>;
      pull(
        id: IdType | string | number,
        path: string,
        fn: (p: any) => boolean
      ): Promise<void>;

      references(opts: {
        id?: any;
        ids?: any;
        idsOnly?: boolean;
        exclude?: Array<CollectionInstance<Tyr.Document>>;
      }): Promise<Tyr.Document[]>;

      subscribe(query: MongoQuery, cancel?: boolean): void;

      customFields(): Promise<{ [key: string]: FieldInstance }>;

      // mongodb methods
      remove(opts: Options_Remove): Promise<void>;
      save(rawDoc: any, opts?: Options_Save): Promise<T>;
      update(opts: Options_Update & { query: MongoQuery }): Promise<T[]>;
      updateDoc(doc: MaybeRawDocument, opts?: Options_UpdateDoc): Promise<T>;
      valuesFor(fields: FieldInstance[]): Promise<any[]>;
    }

    /**
     *  Tyranid field
     */
    export interface FieldStatic {
      new (...args: any[]): FieldInstance;
    }

    export interface FieldInstance {
      collection: CollectionInstance;
      db: boolean;
      def: FieldDefinition;
      name: string;
      namePath: NamePathInstance;
      of?: FieldInstance;
      parent?: FieldInstance;
      pathLabel: string;
      path: string;
      spath: string;
      in: any;
      keys?: FieldInstance;
      label: LabelType | (() => string);
      link?: CollectionInstance;
      type: TypeInstance;
      fields?: { [key: string]: FieldInstance };

      labelify(value: any): Promise<any>;
      labels(text?: string): LabelList;
      validate(obj: {}): Promise<void>;
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
}
