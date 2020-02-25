import { TypeReference } from 'typescript';

export namespace Tyr {
  /**
   * This is meant as a trigger to indicate that you are typing something
   * as "any" for now but which might have a better type for it but you do not
   * have time at the moment to figure out the right type.
   *
   * For example, read:
   *
   * ... = (something as Tyr.anny);
   *
   * as:
   *
   * ... = (something as any); // TODO:  figure out a better type
   */
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

  export type Metadata =
    | CollectionInstance
    | FieldInstance
    | NamePathInstance
    | Document;

  interface ErrorOptions {
    message?: string;
    suffix?: string;
    technical?: string;
    rowNumber?: number;
    lineNumber?: number;
    columnNumber?: number;
  }

  export interface AppErrorStatic {
    new (opts?: string | ErrorOptions): UserError;
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
    new (opts?: string | ErrorOptions): SecureError;
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
    new (opts: string | ErrorOptions): UserError;
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

  export interface TypeStatic {
    byName: { [key: string]: TypeInstance };

    new (...args: any[]): TypeInstance;
  }

  export interface TypeDefinition {
    name: string;
    typescript?: string;
  }

  export interface TypeInstance {
    name: string;
    def: TypeDefinition;
    create(field: FieldInstance): any;
    compare(field: FieldInstance, a: any, b: any): number;
    format(field: FieldInstance, value: any): string;
  }

  export interface FieldDefinitionRaw {
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

    deprecated?: string | boolean;
    note?: string;

    required?: boolean;
    validate?: (field: FieldInstance) => Promise<string | undefined>;

    of?: string | FieldDefinition;
    cardinality?: string;

    fields?: FieldsObject;
    keys?: string | FieldDefinition;

    denormal?: MongoDocument;
    link?: string;
    relate?: 'owns' | 'ownedBy' | 'associate';
    where?: any;

    in?: string;
    min?: number;
    max?: number;
    step?: number;

    labelField?: boolean | { uses: string[] };
    pattern?: RegExp;
    minlength?: number;
    maxlength?: number;

    granularity?: string;

    computed?: boolean;
    get?: Function;
    getClient?: Function;
    getServer?: Function;
    set?: Function;
    setClient?: Function;
    setServer?: Function;
  }

  export interface FieldDefinition extends FieldDefinitionRaw {
    def?: FieldDefinitionRaw;
    pathLabel?: string;
  }

  export interface FieldStatic {
    new (...args: any[]): FieldInstance;
  }

  export interface FieldInstance {
    $metaType: 'field';

    collection: CollectionInstance;
    computed: boolean;
    db: boolean;
    def: FieldDefinition;
    dynamicSchema?: any;
    name: string;
    namePath: NamePathInstance;
    of?: FieldInstance;
    parent?: FieldInstance;
    pathLabel: string;
    readonly: boolean;
    path: string;
    spath: string;
    in: any;
    keys?: FieldInstance;
    label: string | (() => string);
    link?: CollectionInstance;
    relate?: 'owns' | 'ownedBy' | 'associate';
    type: TypeInstance;
    fields?: { [key: string]: FieldInstance };
    method: string;

    format(value: any): string;
    labelify(value: any): Promise<any>;
    labels(
      doc: Tyr.Document,
      text?: string,
      opts?: any
    ): Promise<Tyr.Document[]>;
    isAux(): boolean;
    isDb(): boolean;
    validate(obj: {}): Promise<string | undefined>;
  }

  export interface NamePathStatic {
    new (...args: any[]): NamePathInstance;

    decode(path: string): string;
    encode(path: string): string;
    populateNameFor(name: string, denormal: boolean = false): string;
    resolve(
      collection: CollectionInstance,
      parentPath?: NamePathInstance,
      path?: NamePathInstance | string
    ): NamePathInstance;
  }

  export interface NamePathInstance {
    $metaType: 'path';

    detail: FieldInstance;
    name: string;
    identifier: string;
    path: string[];
    spath: string;
    fields: FieldInstance[];
    pathLabel: string;
    tail: FieldInstance;

    parsePath(path: string): NamePathInstance;
    pathName(idx: number): string;
    uniq(obj: any): any[];
    get(obj: any): any;
    set<D extends Tyr.Document<AnyIdType>>(
      obj: D,
      value: any,
      opts?: { create?: boolean; ignore?: boolean }
    ): void;
    walk(path: string | number): NamePathInstance;
  }

  export type IdType<D extends Document> = D extends Document<infer ID>
    ? ID
    : never;

  export interface CollectionStatic {}

  export interface CollectionInstance<
    D extends Document<AnyIdType> = Document<AnyIdType>
  > extends Class<D> {
    $metaType: 'collection';

    byId(id: IdType<D>, opts?: any): Promise<D | null>;
    byIds(ids: IdType<D>[], opts?: any): Promise<D[]>;
    byLabel(label: string): Promise<D | null>;
    count(opts: any): Promise<number>;
    def: any /* collection def */;
    exists(opts: any): Promise<boolean>;
    fields: { [fieldName: string]: FieldInstance };
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
    parsePath(text: string): NamePathInstance;
    paths: { [fieldPathName: string]: FieldInstance };
    push(id: IdType<D>, path: string, value: any, opts: any): Promise<void>;
    remove(id: IdType<D>, justOne: boolean): Promise<void>;
    remove(
      query: any /* MongoDB-style query */,
      justOne: boolean
    ): Promise<void>;
    save(doc: D | object): Promise<D>;
    save(doc: D[] | object[]): Promise<D[]>;
    save(doc: any): Promise<any>;
    subscribe(query: MongoQuery, cancel: boolean): Promise<void>;
    updateDoc(doc: D | MongoDocument, opts: any): Promise<D>;
    values: D[];
  }

  export interface Document<ID extends AnyIdType = AnyIdType> {
    $access?: AccessResult;
    $clone(): this;
    $cloneDeep(): this;
    $id: ID;
    $isNew: boolean;
    $label: string;
    $metaType: 'document';
    $model: CollectionInstance<this>;
    $remove(opts: any): Promise<void>;
    $save(opts: any): Promise<this>;
    $slice(path: string, opts: any): Promise<void>;
    $toPlain(): object;
    $tyr: typeof Tyr;
    $uid: string;
    $update(opts: any): Promise<this>;
  }

  export interface Inserted<ID> extends Document<ID> {
    _id: ID;
  }
}
