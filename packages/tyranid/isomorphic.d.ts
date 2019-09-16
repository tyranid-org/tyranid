import { TypeReference } from 'typescript';

export namespace Tyr {
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

  export interface FieldDefinitionRaw {
    [key: string]: any;
    is?: string;
    client?: boolean | (() => boolean);
    custom?: boolean;
    db?: boolean;
    historical?: boolean;
    defaultValue?: any;

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

    labelField?: boolean;
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
    collection: CollectionInstance;
    computed: boolean;
    db: boolean;
    def: FieldDefinition;
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

    labelify(value: any): Promise<any>;
    labels(
      doc: Tyr.Document,
      text?: string,
      opts?: any
    ): Promise<Tyr.Document[]>;
    validate(obj: {}): Promise<void>;
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
    set<D extends Tyr.Document>(
      obj: D,
      prop: string,
      opts?: { create?: boolean; ignore?: boolean }
    ): void;
    walk(path: string | number): NamePathInstance;
  }

  export interface CollectionInstance<
    IdType,
    T extends Document<IdType> = Document<IdType>
  > extends Class<T> {
    byId(id: IdType, opts?: any): Promise<T | null>;
    byIds(ids: IdType[], opts?: any): Promise<T[]>;
    byLabel(label: string): Promise<T | null>;
    count(opts: any): Promise<number>;
    def: any /* collection def */;
    exists(opts: any): Promise<boolean>;
    fields: { [fieldName: string]: FieldDefinition };
    findAll(args: any): Promise<T[] & { count?: number }>;
    findOne(args: any): Promise<T | null>;
    id: string;
    idToLabel(id: IdType): Promise<string>;
    idToUid(id: IdType | string): string;
    insert<I, A extends I[]>(docs: A, opts?: any): Promise<T[]>;
    insert<I>(doc: I): Promise<T>;
    insert(doc: any): Promise<any>;
    isStatic(): boolean;
    isUid(uid: string): boolean;
    label: string;
    labelField: any;
    labelFor(doc: T | object): string;
    labels(text: string): Promise<T[]>;
    labels(ids: string[]): Promise<T[]>;
    labels(_: any): Promise<T[]>;
    on(opts: any): () => void;
    parsePath(text: string): NamePathInstance;
    paths: { [fieldPathName: string]: FieldDefinition };
    push(id: IdType, path: string, value: any, opts: any): Promise<void>;
    remove(id: IdType, justOne: boolean): Promise<void>;
    remove(
      query: any /* MongoDB-style query */,
      justOne: boolean
    ): Promise<void>;
    save(doc: T | object): Promise<T>;
    save(doc: T[] | object[]): Promise<T[]>;
    save(doc: any): Promise<any>;
    subscribe(query: MongoQuery, cancel: boolean): Promise<void>;
    updateDoc(doc: T | MongoDocument, opts: any): Promise<T>;
    values: T[];
  }

  export interface Document<IdType> {
    $access?: AccessResult;
    $clone(): this;
    $cloneDeep(): this;
    $id: IdType;
    $label: string;
    $model: CollectionInstance<IdType, this>;
    $remove(opts: any): Promise<void>;
    $save(opts: any): Promise<this>;
    $slice(path: string, opts: any): Promise<void>;
    $toPlain(): object;
    $tyr: typeof Tyr;
    $uid: string;
    $update(opts: any): Promise<this>;
  }

  export interface Inserted<IdType> extends Document<IdType> {
    _id: IdType;
  }
}
