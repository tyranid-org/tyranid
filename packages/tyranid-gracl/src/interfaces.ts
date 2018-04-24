import { Tyr } from 'tyranid';

export interface Permission extends Tyr.Document {
  resourceId: string;
  subjectId: string;
  resourceType: string;
  subjectType: string;
  access: { [key: string]: boolean | void };
}

export interface Hash<T> {
  [key: string]: T;
}

export type PermissionTypeList = PermissionType[];

export interface PermissionType {
  abstract?: boolean;
  format?: string | ((action: string, collection?: string) => string);
  collection?: boolean;
  name: string;
  parents?: string[];
  parent?: string;
  collection_parents?: string[];
}

export interface PermissionHierarchyNode {
  name: string;
  abstract?: boolean;
  collection?: boolean;
  format?:
    | string
    | ((action: string, collection?: string | undefined) => string);
  parents: (PermissionHierarchyNode | { name: string; parents: Hash<{}>[] })[];
}

export type PermissionHierarchy = Hash<PermissionHierarchyNode>;

export interface PermissionExplaination {
  type: string;
  reason: string;
  access: boolean;
}

export interface PluginOptions {
  verbose?: boolean;
  permissionTypes?: PermissionTypeList;
}

export interface SchemaGraclConfigObject {
  permissions?: {
    thisCollectionOnly?: boolean;
    excludeCollections?: string[];
    includeCollections?: string[];
    include?: string[];
    exclude?: string[];
  };
  types?: Array<'string' | 'resource'>;
}

export interface TyrSchemaGraphObjects {
  links: Tyr.FieldInstance[];
  parents: Tyr.CollectionInstance[];
}
