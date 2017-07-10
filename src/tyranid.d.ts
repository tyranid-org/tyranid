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

    export const Field: FieldStatic;
    export const Type: TypeStatic;
    export const NamePath: NamePathStatic;
    export const Log: GenericCollection;
    export const Collection: CollectionStatic;
    export const $all: any;
    export const byId: CollectionsById;
    export const byName: CollectionsByName;
    export const collections: GenericCollection[];
    export const documentPrototype: any;
    export const secure: Secure;
    export const local: Local;
    export const query: QueryStatic;
    export const options: ConfigOptions;
    export const db: mongodb.Db;


    export function U(text: string | TemplateStringsArray | number): any;
    export function parseUid(uid: string): { collection: GenericCollection, id: IdType };
    export function labelize(name: string): string;
    export function config(opts: ConfigOptions): void;
    export function byUid(uid: string, options?: LookupQueryOptions): Promise<Document | null>;
    export function byUids(uidList: string[], options?: LookupQueryOptions): Promise<Document[]>;
    export function trace(opts: any): Promise<void>;
    export function log(opts: any): Promise<void>;
    export function info(id: number, message: string): Promise<void>;
    export function info(opts: any): Promise<void>;
    export function warn(message: string, err?: Error): Promise<void>;
    export function warn(opts: any): Promise<void>;
    export function error(opts: any): Promise<void>;
    export function fatal(opts: any): Promise<void>;
    export function express(app: Express.Application, auth?: (req: Express.Request, res: Express.Response, next: Function) => {}): void;
    export function valuesBy(predicate: (field: FieldInstance) => boolean): Promise<any[]>;
    export function generateClientLibrary(): string;

    export function validate(opts?: {
      glob?: string
    }): void;

    /**
     * utility methods
     */
    export function isEqual(a: any, b: any): boolean;
    export function indexOf(arr: any[], item: any): number;
    export function addToSet(set: any[], item: any): void;
    export function pullAll(arr: any[], item: any): void;
    export function cloneDeep<T>(obj: T): T;
    export function arraySort(arr: any[], order: { [key: string]: number }): void;

    export function forget(id: string): void;


    export interface Cursor<T> extends mongodb.Cursor {
      next(): Promise<T>;
      next(cb: mongodb.MongoCallback<T>): void;
      toArray(): Promise<T[]>;
    }


    export type RawMongoDocument = {
      [key: string]: any;
    }

    export type MongoQuery = RawMongoDocument;
    export type MaybeRawDocument = Document | RawMongoDocument;
    export type LabelType = string;
    export type IdType = mongodb.ObjectID;
    export type LabelList = { [labelField: string]: string }[];
    export type BootStage = 'compile' | 'link' | 'post-link';


    export interface Class<T> {
      new (...args: any[]): T;
    }


    export interface GenericCollection extends CollectionInstance<Tyr.Document> {}



    /**
     *  Generic tyranid document object.
     */
    export interface Document {
      // arbitrary properties
      [key: string]: any;

      // universal properties
      $id: IdType;
      $model: CollectionInstance<this>;
      $uid: string;
      $label: string;

      // methods
      $remove(opts?: { auth?: Tyr.Document }): Promise<void>;
      $clone(): this;
      $insert(opts?: { auth?: Tyr.Document }): Promise<this>;
      $populate(fields: any, denormal?: boolean): Promise<this>;
      $save(): Promise<this>;
      $toClient(opts?: LookupQueryOptions): RawMongoDocument;
      $update(fields?: any): Promise<this>;
      $validate(): ValidationError[];
      $replace(replacements: any): Promise<this>;
      $copy(replacements: any, props?: (keyof this)[]): this;
      $slice(prop: string, opts?: BaseQueryOptions): Promise<this>;

      createdAt?: Date;
      updatedAt?: Date;
    }


    export interface LookupQueryOptions extends BaseQueryOptions {

      /**
       * The standard MongoDB-style fields object that specifies the projection.
       */
      fields?: { [key: string]: number } | string | (string | { [key: string]: number })[];

      /**
       * The population fields to populate.
       */
      populate?: PopulationOption;

    }


    export interface UpdateQueryOptions extends ModificationQueryOptions {

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



    export interface FindAndModifyOptions extends UpdateQueryOptions, LookupQueryOptions {

      /**
       * raw mongodb query
       */
      query: MongoQuery;

      /**
       * whether or not to return a new document in findAndModify
       */
      new?: boolean;


      /**
       * whether or not to insert the document if it doesn't exist
       */
      upsert?: boolean;

    }



    export interface ModificationQueryOptions extends BaseQueryOptions {

      /**
       * Indicates if timestamps should be updated.
       * Defaults to the timestamps setting on the collection.
       */
      timestamps?: boolean;

    }


    /**
     * Options passed to database methods
     */
    export interface BaseQueryOptions {

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


      /**
       * Return the historical version of the doc
       */
      historical?: boolean;
    }


    /**
     * Fields to populate in a document
     */
    export type PopulationOption
      = string
      | string[]
      | { [key: string]: PopulationOption };




    /**
     *  Hash of strings -> fields
     */
    export type FieldsObject = {
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
      client?: boolean;
      timestamps?: boolean;
      values?: any[][];
      db?: mongodb.Db;
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
      express?: {
        rest?: boolean;
        get?: boolean;
        post?: boolean;
        put?: boolean;
      };
      fields?: FieldsObject;
      methods?: {
        [methodName: string]: {
          is: string;
          fn: Function;
          fnClient?: Function;
          fnServer?: Function;
        }
      };
      values?: any[][];
    }


    export interface FieldDefinitionRaw {
      [key: string]: any;
      is?: string;
      client?: boolean | (() => boolean);
      db?: boolean;
      label?: LabelType | (() => string);
      help?: string;
      note?: string;
      required?: boolean;
      defaultValue?: any;
      of?: FieldDefinition;
      fields?: FieldsObject;
      keys?: FieldDefinition;
      denormal?: any;
      link?: string;
      where?: any;
      in?: string;
      labelField?: boolean;
      get?: Function;
      getClient?: Function;
      getServer?: Function;
      set?: Function;
      setClient?: Function;
      setServer?: Function;
      relate?: 'owns' | 'ownedBy' | 'associate';
    }

    /**
     *  Configuration definition for tyranid field.
     */
    export interface FieldDefinition extends FieldDefinitionRaw {
      def?: FieldDefinitionRaw,
      pathLabel?: string;
    }

    export type CollectionCurriedMethodReturn
      = Function
      | Promise<Document | Document[]>;


    export interface CollectionsByName {
      [key: string]: GenericCollection;
    }

    export interface CollectionsById {
      [key: string]: GenericCollection;
    }


    export interface Secure {
      boot(state: BootStage): void;
      query(
        collection: GenericCollection,
        method: 'view' | 'update' | 'insert' | 'delete',
        auth?: Tyr.Document
      ): Promise<MongoQuery>;
      canInsert?: (collection: GenericCollection, doc: Tyr.Document, perm: string, auth: Tyr.Document) => Promise<boolean> | boolean;
    }

    export interface Local {
      user?: Document;
      req?: Express.Request;
      res?: Express.Response;
      define(propertyName: string): void;
    }



    export type ValidationPattern
      = FileMatchValidationPattern
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
      db?: mongodb.Db;
      consoleLogLevel?: LogLevel | false;
      externalLogLevel?: LogLevel | false;
      dbLogLevel?: LogLevel | false;
      externalLogger?: (obj: any) => void | Promise<void>;
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
      }
    }


    export interface CollectionStatic {
      // Collection instance constructor
      new(def: CollectionDefinition): GenericCollection;
    }


    export interface Component {
      boot(stage: string, pass: number): string | string[];
      clientCode(code: string): string;
      compileCollection(compiler: any, field: CollectionStatic): void;
      compileField(compiler: any, field: FieldInstance): void;
    }


    /**
     *  Tyranid collection class
     */
    export interface CollectionInstance<T extends Tyr.Document> extends Component {

      // Collection instance constructor
      new(doc?: RawMongoDocument): T;

      fields: { [key: string]: FieldInstance };
      label: LabelType;
      labelField: FieldInstance;
      paths: { [key: string]: FieldInstance };
      def: CollectionDefinitionHydrated;
      db: mongodb.Collection;
      id: string;

      secureQuery(query: MongoQuery, perm: string, auth: Document): Promise<MongoQuery>;

      byId(id: IdType | string | number, options?: LookupQueryOptions): Promise<T | null>;
      byIds(ids: (IdType| number | string)[], projection?: any, options?: LookupQueryOptions): Promise<T[]>;
      byLabel(label: LabelType, forcePromise?: boolean): Promise<T | null>;

      isUid(str: string): boolean;

      fieldsBy(filter: (field: FieldInstance) => boolean): FieldInstance[];
      fieldsFor(obj: any): Promise<FieldInstance[]>;
      idToUid(id: string | mongodb.ObjectID): string;

      fake(options: { n?: number, schemaOpts?: any, seed?: number }): Promise<T>;

      find(opts: LookupQueryOptions & { query: RawMongoDocument }): Promise<Cursor<T>>;
      findAll(opts: LookupQueryOptions & { query: RawMongoDocument }): Promise<T[]>;
      findOne(opts: LookupQueryOptions & { query: RawMongoDocument }): Promise<T | null>;
      findOne(id: mongodb.ObjectID, proj?: any): Promise<T | null>;
      findAndModify(opts: FindAndModifyOptions): Promise<{ value: T } | null>;

      fromClient(doc: RawMongoDocument, path?: string): T;
      fromClientQuery(query: MongoQuery): MongoQuery;
      toClient(doc: Document | Document[] | RawMongoDocument | RawMongoDocument[]): RawMongoDocument;

      idToLabel(id: any): Promise<string>;
      insert<I, A extends Array<I>>(docs: A): Promise<T[]>;
      insert<I>(doc: I): Promise<T>;
      isStatic(): boolean;

      links(opts?: any): FieldInstance[];

      labelFor(doc: MaybeRawDocument): string;
      labels(text: string): LabelList;
      mixin(def: FieldDefinition): void;
      parsePath(text: string): NamePathInstance;

      populate<R>(fields: string | string[] | { [key: string]: any }): (docs: R) => Promise<R>;
      populate(fields: any, document: T, denormal?: boolean): Promise<T>;
      populate(fields: any, documents: T[], denormal?: boolean): Promise<T[]>;

      push(id: IdType | string | number, path: string, prop: any): Promise<void>;
      pull(id: IdType | string | number, path: string, fn: (p: any) => boolean): Promise<void>;

      references(opts: { id?: any, ids?: any, idsOnly?: boolean, exclude?: CollectionInstance<Tyr.Document>[] }): Promise<Tyr.Document[]>;

      // mongodb methods
      remove(opts: LookupQueryOptions & { query: MongoQuery }): Promise<void>;
      save(rawDoc: any, opts?: ModificationQueryOptions): Promise<T>;
      update(opts: UpdateQueryOptions & { query: MongoQuery }): Promise<T[]>;
      updateDoc(doc: MaybeRawDocument): Promise<T>;
      valuesFor(fields: FieldInstance[]): Promise<any[]>;

      // hook methods
      boot(stage: string, pass: number): string | string[];
      plugin<O>(fn: (col: this, opts: O) => any, opts?: O): this;
      pre(methods: string | string[], cb: (next: <M extends T>(modified: M, ...args: any[]) => any, obj: T, ...otherArgs: any[]) => any): this;
      post(methods: string | string[], cb: (next: <M extends T>(modified: Promise<M>, ...args: any[]) => any, promise: Promise<T>) => any): this;
      unhook(methods: string | string[]): this;

    }

    /**
     *  Tyranid field
     */
    export interface FieldStatic {
      new (...args: any[]): FieldInstance;
    }

    export interface FieldInstance {

      collection: GenericCollection;
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
      link?: GenericCollection;
      type: TypeInstance;
      fields?: { [key: string]: FieldInstance };

      labels(text?: string): LabelList;
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
      new (sid: string, components: { degree: any, unit: any }[]): UnitsInstance;
    }

    export interface UnitsInstance {

    }


    export interface TypeStatic {
      new (...args: any[]): TypeInstance;
      byName: { [key: string]: TypeInstance };
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
      matches(namePath: NamePathInstance, where: any, doc: MaybeRawDocument): boolean;
      query(namePath: NamePathInstance, where: any, query: MongoQuery): Promise<void>;
      sortValue(namePath: NamePathInstance, value: any): any;
      toClient(field: FieldInstance, value: any): any;
      validate(field: FieldInstance, value: any): ValidationError;
    }

    /**
     *  Error thrown in validation failure
     */
    export interface ValidationErrorStatic {
      new (...args: any[]): ValidationError
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
