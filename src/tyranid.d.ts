/**
 *  Type definitions for tyranid.js
 */
import * as Express from 'express';
import * as mongodb from 'mongodb';

export = Tyranid;

declare namespace Tyranid {

  // declare properties of Tyr object
  export namespace Tyr {

    export const Field: FieldStatic;
    export const Type: TypeStatic;
    export const NamePath: NamePathStatic;
    export const Collection: CollectionStatic;
    export const $all: any;
    export const byId: CollectionsById;
    export const byName: CollectionsByName;
    export const collections: GenericCollection[];
    export const documentPrototype: any;
    export const secure: Secure;
    export const local: Local;
    export const query: QueryStatic;


    export function U(text: string): any;
    export function parseUid(uid: string): { collection: GenericCollection, id: IdType };
    export function labelize(name: string): string;
    export function config(opts: ConfigOptions): void;
    export function byUid(uid: string, options?: LookupQueryOptions): Promise<Document | null>;
    export function byUids(uidList: string[], options?: LookupQueryOptions): Promise<Document[]>;
    export function trace(opts: any): void;
    export function log(opts: any): void;
    export function info(opts: any): void;
    export function warn(opts: any): void;
    export function error(opts: any): void;
    export function fatal(opts: any): void;
    export function express(app: Express.Application, auth?: (req: Express.Request, res: Express.Response, next: Function) => {}): void;


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

      // methods
      $clone(): this;
      $insert(): Promise<this>;
      $populate(fields: any, denormal?: boolean): Promise<this>;
      $save(): Promise<this>;
      $toClient(): RawMongoDocument;
      $update(): Promise<this>;
      $validate(): ValidationError[];
    }


    export interface LookupQueryOptions extends BaseQueryOptions {

      /**
       * The standard MongoDB-style fields object that specifies the projection.
       */
      fields?: { [key: string]: number };

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
          fn: Function;
          fnClient: Function;
          fnServer: Function;
        }
      };
      values?: any[][];
    }


    export interface FieldDefinitionRaw {
      [key: string]: any;
      is?: string;
      client?: boolean;
      db?: boolean;
      label?: LabelType;
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
      query(
        collection: GenericCollection,
        method: 'view' | 'update' | 'insert' | 'delete'
      ): Promise<MongoQuery>;
    }

    export interface Local {
      user?: Document;
      req?: Express.Request;
      res?: Express.Response;
      define(propertyName: string): void;
    }


    export interface ConfigOptions {
      db: mongodb.Db,
      consoleLogLevel?: 'ERROR',
      dbLogLevel?: 'TRACE',
      secure?: Secure,
      cls?: boolean,
      validate?: { dir: string; fileMatch: string; }[],
      permissions?: {
        find: string,
        insert: string,
        update: string,
        remove: string
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
      new(doc: RawMongoDocument): T;

      fields: { [key: string]: FieldInstance };
      label: LabelType;
      labelField: FieldInstance;
      paths: { [key: string]: FieldInstance };
      def: CollectionDefinitionHydrated;
      db: mongodb.Collection;

      secureQuery(query: MongoQuery, perm: string, auth: Document): Promise<MongoQuery>;

      byId(id: IdType, options?: LookupQueryOptions): Promise<T | null>;
      byIds(ids: IdType[], projection?: any, options?: LookupQueryOptions): Promise<T[]>;
      byLabel(label: LabelType): Promise<T | null>;

      fieldsBy(filter: (field: FieldInstance) => boolean): FieldInstance[];
      fieldsFor(obj: any): Promise<FieldInstance[]>;
      idToUid(id: string | mongodb.ObjectID): string;

      fake(options: { n?: number, schemaOpts?: any, seed?: number }): Promise<T>;

      find(opts: LookupQueryOptions & { query: RawMongoDocument }): Cursor<T>;
      findAll(opts: LookupQueryOptions & { query: RawMongoDocument }): Promise<T[]>;
      findOne(opts: LookupQueryOptions & { query: RawMongoDocument }): Promise<T | null>;
      findAndModify(opts: FindAndModifyOptions): Promise<T | null>;

      fromClient(doc: RawMongoDocument, path?: string): T;
      fromClientQuery(query: MongoQuery): MongoQuery;
      toClient(doc: Document | Document[]): RawMongoDocument;

      idToLabel(id: string): Promise<string>;
      insert(doc: MaybeRawDocument): Promise<T>;
      isStatic(): boolean;

      links(opts: any): FieldInstance[];

      labelFor(doc: MaybeRawDocument): string;
      labels(text: string): LabelList;
      mixin(def: FieldDefinition): void;
      parsePath(text: string): NamePathInstance;
      populate(fields: any, documents?: T | T[], denormal?: boolean): CollectionCurriedMethodReturn;

      // mongodb methods
      remove(opts: LookupQueryOptions & { query: MongoQuery }): Promise<void>;
      save(rawDoc: any, opts?: ModificationQueryOptions): Promise<T>;
      update(opts: UpdateQueryOptions & { query: MongoQuery }): Promise<T[]>;
      updateDoc(doc: MaybeRawDocument): Promise<T>;
      valuesFor(fields: FieldInstance[]): any[];

      // hook methods
      boot(stage: string, pass: number): string | string[];
      plugin(fn: Function, opts?: any): CollectionInstance<T>;
      pre(methods: string | string[], cb: Function): CollectionInstance<T>;
      unhook(methods: string | string[]): CollectionInstance<T>;
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
      label: LabelType;
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

      pathName(idx: number): string;
      uniq(obj: any): any[];
      get(obj: any): any;
    }

    export interface TypeStatic {
      new (...args: any[]): TypeInstance;
      byName: { [key: string]: TypeInstance };
    }

    export interface TypeInstance {
      name: string;

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
