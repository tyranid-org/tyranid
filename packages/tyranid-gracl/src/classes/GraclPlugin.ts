import { Graph } from 'gracl';
import { Tyr } from 'tyranid';

import { PermissionsModel } from '../models/PermissionsModel';

import {
  Hash,
  PermissionHierarchy,
  PermissionTypeList,
  PluginOptions
} from '../interfaces';

import { query } from '../query/query';

import { mixInDocumentMethods } from '../tyranid/mixInDocumentMethods';

import { buildLinkGraph } from '../graph/buildLinkGraph';
import { createGraclHierarchy } from '../graph/createGraclHierarchy';
import { getObjectHierarchy } from '../graph/getObjectHierarchy';
import { tree, TreeNode } from '../graph/tree';

import { constructPermissionHierarchy } from '../permission/constructPermissionHierarchy';
import { formatPermissionLabel } from '../permission/formatPermissionLabel';
import { getAllowedPermissionsForCollection } from '../permission/getAllowedPermissionsForCollection';
import { getAllPossiblePermissionTypes } from '../permission/getAllPossiblePermissionTypes';
import { getPermissionChildren } from '../permission/getPermissionChildren';
import { getPermissionParents } from '../permission/getPermissionParents';
import { parsePermissionString } from '../permission/parsePermissionString';
import { registerAllowedPermissionsForCollections } from '../permission/registerAllowedPermissionsForCollections';

/**
 *  Security plugin for tyranid

  Example:

  ```js
  import { Tyr } from 'tyranid';
  import pmongo from 'promised-mongo';

  // import plugin class
  import { GraclPlugin } from 'tyranid-gracl';

  // instantiate
  const secure = new GraclPlugin();

  const db = pmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test');

  Tyr.config({
    db: db,
    validate: [
      { dir: root + '/test/models', fileMatch: '[a-z].js' }
    ],
    // add to tyranid config...
    secure: secure
  })
  ```

 */
export class GraclPlugin {
  public graclHierarchy!: Graph; // prettier-ignore
  public unsecuredCollections = new Set([PermissionsModel.def.name]);

  // some collections may have specific permissions
  // they are restricted to...
  public permissionRestrictions = new Map<string, Set<string>>();

  // plugin options
  public verbose!: boolean; // prettier-ignore
  public permissionHierarchy!: PermissionHierarchy; // prettier-ignore
  public setOfAllPermissions!: Set<string>; // prettier-ignore
  public crudPermissionSet = new Set<string>();
  public permissionsModel = PermissionsModel;
  public resourceChildren = new Map<string, Set<string>>();

  public _NO_COLLECTION = 'TYRANID_GRACL_NO_COLLECTION_NAME_FOUND';

  public permissionTypes: PermissionTypeList = [
    { name: 'edit' },
    { name: 'view', parents: ['edit'] },
    { name: 'delete' }
  ];

  public outgoingLinkPaths!: Hash<Hash<string>>; // prettier-ignore
  public permissionChildCache: Hash<string[]> = {};
  public allPossiblePermissionsCache!: string[]; // prettier-ignore
  public sortedLinkCache: Hash<Tyr.FieldInstance[]> = {};

  constructor(opts: PluginOptions = {}) {
    const plugin = this;

    if (
      opts.permissionTypes &&
      Array.isArray(opts.permissionTypes) &&
      opts.permissionTypes.length
    ) {
      plugin.permissionTypes = opts.permissionTypes;
    }

    plugin.verbose = opts.verbose || false;
  }

  /**
    Create Gracl class hierarchy from tyranid schemas,
    needs to be called after all the tyranid collections are validated
   */
  public boot(stage: Tyr.BootStage) {
    if (stage === 'post-link') {
      const plugin = this;

      plugin.log(`starting boot.`);

      mixInDocumentMethods(plugin);
      buildLinkGraph(plugin);
      createGraclHierarchy(plugin);
      constructPermissionHierarchy(plugin);
      registerAllowedPermissionsForCollections(plugin);

      if (plugin.verbose) {
        plugin.logHierarchy();
      }
    }
  }

  public createIndexes() {
    return PermissionsModel.createIndexes();
  }

  public query<T extends Tyr.Document>(
    queriedCollection: Tyr.CollectionInstance<T>,
    permissionType: string,
    subjectDocument?: Tyr.Document
  ) {
    return query(this, queriedCollection, permissionType, subjectDocument);
  }

  public log(message: string) {
    const plugin = this as GraclPlugin;
    if (plugin.verbose) {
      console.log(`tyranid-gracl: ${message}`); // tslint:disable-line
    }
    return plugin;
  }

  public logHierarchy() {
    const plugin = this;
    const hierarchy = getObjectHierarchy(plugin) as N;

    interface N {
      [key: string]: N;
    }

    function visit(obj: N): TreeNode[] {
      return Object.keys(obj).map(key => {
        const children = visit(obj[key]);
        const node = { label: key } as TreeNode;
        if (children.length) {
          node.nodes = children;
        }
        return node;
      });
    }

    plugin.log(
      tree({
        label: 'hierarchy',
        nodes: visit(hierarchy)
      })
    );
  }

  public error(message: string): never {
    throw new Error(`tyranid-gracl: ${message}`);
  }

  public parsePermissionString(perm: string) {
    return parsePermissionString(this, perm);
  }

  public getAllPossiblePermissionTypes() {
    return getAllPossiblePermissionTypes(this);
  }

  public getPermissionParents(perm: string) {
    return getPermissionParents(this, perm);
  }

  public getPermissionChildren(perm: string) {
    return getPermissionChildren(this, perm);
  }

  public getAllowedPermissionsForCollection(perm: string) {
    return getAllowedPermissionsForCollection(this, perm);
  }

  public formatPermissionLabel(perm: string) {
    return formatPermissionLabel(this, perm);
  }
}
