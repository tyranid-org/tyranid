import Field from './core/field';
import ValidationError from './core/validationError';
import { NamePathInstance } from './core/namePath';


/**
 *  External type definitions until we can move to the objects themselves
 */



export type RawMongoDocument = {
  [key: string]: any;
}

export type MongoQuery = RawMongoDocument;
export type TyranidOrRawDocument = Document | RawMongoDocument;
export type TyranidMongoOptions = any;
export type LabelType = string;
export type IdType = string;
export type LabelList = { _id: IdType, [labelField: string]: string }[];
export type TyranidClass<T> = {  new (...args: any[]): T; };
export type BootStage = 'compile' | 'link' | 'post-link';
export type Compiler = any;




/**
 *  Generic tyranid document object.
 */
export interface Document {
  // arbitrary properties
  [key: string]: any;

  // universal properties
  $id: IdType;
  $model: CollectionInstance;
  $uid: string;
  $label: string;

  // methods
  $clone(): Document;
  $insert(): Promise<Document>;
  $populate(fields: any, denormal?: boolean): Promise<Document>;
  $save(): Promise<Document>;
  $toClient(): RawMongoDocument;
  $update(): Promise<Document>;
  $validate(): ValidationError[];
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
  id: IdType;
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
  is?: IdType;
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


interface Secure {
  query(collection: CollectionInstance, method: 'view' | 'update' | 'insert' | 'delete'): Promise<MongoQuery>;
}


export interface Component {
  boot(stage: string, pass: number): string | string[];
  clientCode(code: string): string;
  compileCollection(compiler: Compiler, field: CollectionInstance): void;
  compileField(compiler: Compiler, field: Field): void;
}


/**
 *  Tyranid collection class
 */
export interface CollectionInstance extends Component {

  // Collection instance constructor
  new(doc: RawMongoDocument): Document;

  fields: { [key: string]: Field };
  label: LabelType;
  labelField: Field;
  paths: { [key: string]: Field };
  def: TyranidCollectionDefinition;
  db: any;
  id: string;
  byIdIndex: { [key: string]: Document };

  secureQuery(query: MongoQuery, perm: string, auth: Document): Promise<MongoQuery>;
  secureFindQuery(query: MongoQuery, perm: string, auth: Document): Promise<MongoQuery | boolean>;

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
  insert(doc: TyranidOrRawDocument, opts: TyranidMongoOptions): Promise<Document>;
  isStatic(): boolean;
  canInsert(...args: any[]): any;
  createCompiler(...args: any[]): any;


  links(opts: any): Field[];

  labelFor(doc: TyranidOrRawDocument): string;
  labels(text: string): LabelList;
  mixin(def: TyranidFieldDefinition): void;
  parsePath(text: string): NamePathInstance;
  populate(fields: any, documents?: Document | Document[], denormal?: boolean): TyranidCollectionCurriedMethodReturn;

  // mongodb methods
  remove(id: string | MongoQuery, justOne?: boolean): Promise<void>;
  save(doc: TyranidOrRawDocument | TyranidOrRawDocument[], opts: TyranidMongoOptions): Promise<Document>;
  update(query: MongoQuery, update: MongoQuery, opts: TyranidMongoOptions): Promise<Document[]>;
  updateDoc(doc: TyranidOrRawDocument): Promise<Document>;
  valuesFor(fields: Field[]): any[];

  // hook methods
  boot(stage: string, pass: number): string | string[];
  plugin(fn: Function, opts: any): CollectionInstance;
  pre(methods: string | string[], cb: Function): CollectionInstance;
  unhook(methods: string | string[]): CollectionInstance;
}
