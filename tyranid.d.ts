/// <reference path="./typings/index.d.ts" />


/**
 *  Type definitions for tyranid.js
 */
import * as Express from 'express';
import * as mongodb from 'mongodb';

export default Tyr;

// declare properties of Tyr object
declare namespace Tyr {


  export type RawMongoDocument = {
    [key: string]: any;
  }

  export type MongoQuery = RawMongoDocument;
  export type TyranidOrRawDocument = Document | RawMongoDocument;
  export type LabelType = string;
  export type IdType = mongodb.ObjectID;
  export type LabelList = { [labelField: string]: string }[];
  export type TyranidClass<T> = {  new (...args: any[]): T; };
  export type BootStage = 'compile' | 'link' | 'post-link';



  /**
   *  Generic tyranid document object.
   */
  export interface Document {
    // arbitrary properties
    [key: string]: any;

    // universal properties
    $id: IdType;
    $model: Tyr.CollectionInstance;
    $uid: string;

    // methods
    $clone(): Document;
    $insert(): Promise<Document>;
    $populate(fields: any, denormal?: boolean): Promise<Document>;
    $save(): Promise<Document>;
    $toClient(): RawMongoDocument;
    $update(): Promise<Document>;
    $validate(): Tyr.ValidationError[];
  }





  /**
   *  Hash of strings -> fields
   */
  export type TyranidFieldsObject = {
    [fieldName: string]: TyranidFieldDefinition;
  }


  /**
   *  TyranidCollectionDefinition options for tyranid collection
   */
  export type TyranidCollectionDefinition = {
    [key: string]: any;
    id: string;
    name: string;
    dbName: string;
    label?: LabelType;
    help?: string;
    note?: string;
    enum?: boolean;
    client?: boolean;
    primaryKey?: {
      field: string;
      defaultMatchIdOnInsert?: boolean;
    };
    timestamps?: boolean;
    express?: {
      rest?: boolean;
      get?: boolean;
      post?: boolean;
      put?: boolean;
    };
    fields?: TyranidFieldsObject;
    methods?: {
      [methodName: string]: {
        fn: Function;
        fnClient: Function;
        fnServer: Function;
      }
    };
    values?: string[][];
  }


  /**
   *  Configuration definition for tyranid field.
   */
  export type TyranidFieldDefinition = {
    [key: string]: any;
    is?: string;
    client?: boolean;
    db?: boolean;
    label?: LabelType;
    pathLabel?: string;
    help?: string;
    note?: string;
    required?: boolean;
    defaultValue?: any;
    of?: TyranidFieldDefinition;
    fields?: TyranidFieldsObject;
    keys?: TyranidFieldDefinition;
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

  export type TyranidCollectionCurriedMethodReturn = Function | Promise<Document | Document[]>;

  const $all: any;
  const byId: { [key: string]: CollectionInstance };
  const byName: { [key: string]: CollectionInstance };
  const collections: CollectionInstance[];
  const documentPrototype: any;
  const secure: Secure;

  interface Secure {
    query(collection: CollectionInstance, method: 'view' | 'update' | 'insert' | 'delete'): Promise<MongoQuery>;
  }

  const local: {
    user?: Document;
    req?: Express.Request;
    res?: Express.Response;
    define(propertyName: string): void;
  };


  export type TyranidConfigOptions = {
    db: mongodb.Db,
    consoleLogLevel?: 'ERROR',
    dbLogLevel?: 'TRACE',
    secure?: Secure
  };


  function U(text: string): Unit;
  function parseUid(uid: string): { collection: CollectionInstance, id: IdType };
  function labelize(name: string): string;
  function config(opts: TyranidConfigOptions): void;
  function byUid(uid: string): Promise<Document>;
  function byUids(uidList: string[], options?: any): Promise<Document[]>;
  function trace(opts: any): void;
  function log(opts: any): void;
  function info(opts: any): void;
  function warn(opts: any): void;
  function error(opts: any): void;
  function fatal(opts: any): void;
  function express(app: Express.Application, auth?: (req: Express.Request, res: Express.Response, next: Function) => {}): void;

  export const Collection: Collection;

  interface Collection {
    // Collection instance constructor
    new(def: TyranidCollectionDefinition): CollectionInstance;
  }


  interface Component {
    boot(stage: string, pass: number): string | string[];
    clientCode(code: string): string;
    compileCollection(compiler: Compiler, field: Collection): void;
    compileField(compiler: Compiler, field: Field): void;
  }


  /**
   *  Tyranid collection class
   */
  interface CollectionInstance extends Component {

    // Collection instance constructor
    new(doc: RawMongoDocument): Document;

    fields: { [key: string]: Field };
    label: LabelType;
    labelField: Field;
    paths: { [key: string]: Field };
    def: TyranidCollectionDefinition;
    db: mongodb.Collection;

    secureQuery(query: MongoQuery, perm: string, auth: Document): Promise<MongoQuery>;

    byId(id: IdType): Promise<Document>;
    byIds(ids: IdType[], projection?: any, options?: any): Promise<Document[]>;
    byLabel(label: LabelType): Promise<Document>;

    fieldsBy(filter: (field: Field) => boolean): Field[];
    fieldsFor(obj: any): Promise<Field[]>;
    idToUid(id: string): string;

    fake(options: { n?: number, schemaOpts?: any, seed?: number }): Promise<Document>;

    find(...args: any[]): Promise<Document[]>;
    findAll(...args: any[]): Promise<Document[]>;
    findOne(...args: any[]): Promise<Document>;
    findAndModify(...args: any[]): Promise<Document>;

    fromClient(doc: RawMongoDocument, path?: string): Document;
    fromClientQuery(query: MongoQuery): MongoQuery;
    toClient(doc: Document): RawMongoDocument;

    idToLabel(id: string): Promise<string>;
    insert(doc: TyranidOrRawDocument): Promise<Document>;
    isStatic(): boolean;

    links(opts: any): Field[];

    labelFor(doc: TyranidOrRawDocument): string;
    labels(text: string): LabelList;
    mixin(def: TyranidFieldDefinition): void;
    parsePath(text: string): NamePath;
    populate(fields: any, documents?: Document | Document[], denormal?: boolean): TyranidCollectionCurriedMethodReturn;

    // mongodb methods
    remove(id: string | MongoQuery, justOne?: boolean): Promise<void>;
    save(doc: TyranidOrRawDocument | TyranidOrRawDocument[]): Promise<Document>;
    update(query: MongoQuery, update: MongoQuery, opts: MongoQuery): Promise<Document[]>;
    updateDoc(doc: TyranidOrRawDocument): Promise<Document>;
    valuesFor(fields: Field[]): any[];

    // hook methods
    boot(stage: string, pass: number): string | string[];
    plugin(fn: Function, opts: any): CollectionInstance;
    pre(methods: string | string[], cb: Function): CollectionInstance;
    unhook(methods: string | string[]): CollectionInstance;
  }

  /**
   *  Tyranid field
   */
  class Field {
    collection: CollectionInstance;
    db: boolean;
    def: TyranidFieldDefinition;
    name: string;
    namePath: NamePath;
    of: Field;
    parent: Field;
    pathLabel: string;
    path: string;
    spath: string;
    in: Units;
    keys: Field;
    label: LabelType;
    link: CollectionInstance;
    type: Type;

    labels(text?: string): LabelList;
  }


  class NamePath {
    detail: Field;
    name: string;
    path: string[];
    fields: Field[];
    pathLabel: string;
    tail: Field;

    pathName(idx: number): string;
    uniq(obj: any): any[];
    get(obj: any): any;
  }

  class Type {
    static byName: { [key: string]: Type };

    name: string;

    compile(compiler: Compiler, path: string, field: Field): void;
    fromString(str: string): any;
    fromClient(field: Field, value: any): any;
    format(field: Field, value: any): string;
    matches(namePath: NamePath, where: any, doc: TyranidOrRawDocument): boolean;
    query(namePath: NamePath, where: any, query: MongoQuery): Promise<void>;
    sortValue(namePath: NamePath, value: any): any;
    toClient(field: Field, value: any): any;
    validate(field: Field, value: any): ValidationError;
  }


  interface Unit extends CollectionInstance {
    parse(text: string): Unit;

    abbreviation: string;
    baseAdditive: number;
    baseMultiplier: number;
    factor: UnitFactor;
    formula: string;
    name: string;
    sid: string;
    type: UnitType;
    system: UnitSystem;
  }





  /**
   *  Error thrown in validation failure
   */
  class ValidationError {
    reason: string;
    field: Field;
    message: string;
    tostring(): string;
  }

  interface Units extends CollectionInstance {
    parse(text: string): Units;
    new(doc: RawMongoDocument): UnitsDocument;
  }

  class UnitsDocument extends Document {
    symbol: number;
    components: UnitDegree[];
    sid: string;
    type: UnitType;

    toString(): string;
    add(value: number, addUnits: Units, addValue: number): number;
    convert(value: number, to: Units): number;
    divide(by: Units): Units;
    invert(): Units;
    isCompatibleWith(units: Units): boolean;
    multiply(by: Units): Units;
    normal(): Units;
    subtract(value: number, subUnits: Units, subValue: number): number;
  }


  class UnitConversionError {
    from: Units;
    fromValue: number;
    message: string;
    to: Units;
    toString(): string;
  }


  interface UnitDegree extends CollectionInstance {
    new(doc: RawMongoDocument): UnitDegreeDocument;
  }

  class UnitDegreeDocument extends Document {
    degree: number;
    unit: Unit;
  }


  interface UnitFactor extends CollectionInstance {
    new(doc: RawMongoDocument): UnitFactorDocument;
  }


  class UnitFactorDocument extends Document {
    factor: number;
    prefix: string;
    symbol: string;
  }


  interface UnitSystem extends CollectionInstance {
    new(doc: RawMongoDocument): UnitFactorDocument;
  }

  class UnitSystemDocument extends Document {
    name: string;
  }


  interface UnitType extends CollectionInstance {
    new(doc: RawMongoDocument): UnitTypeDocument;
  }

  class UnitTypeDocument extends Document {
    abbreviation: string;
    formula: string;
    normal: string;
    note: string;
    symbol: string;
  }


  class Log {
    trace(opts: any): void;
    log(opts: any): void;
    info(opts: any): void;
    warn(opts: any): void;
    error(opts: any): void;
    fatal(opts: any): void;
    addEvent(name: string, label: string, notes: string): void;
  }


  class Compiler {}
}
