import { topologicalSort } from 'gracl';
import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import {
  Hash,
  PermissionHierarchy,
  PermissionTypeList,
  PermissionHierarchyNode
} from '../interfaces';
import { parsePermissionString } from '../permission/parsePermissionString';

/**
 * validate and insert provided permissionHierarchy into model
 */
export function constructPermissionHierarchy(plugin: GraclPlugin) {
  plugin.log(`constructing permissions hierarchy...`);

  if (!plugin.graclHierarchy) {
    plugin.error(
      `Must build subject/resource hierarchy before creating permission hierarchy`
    );
  }

  /**
   * Run topological sort on permissions values,
     checking for circular dependencies / missing nodes
   */
  const sorted = _.compact(
    topologicalSort(
      _.map(plugin.permissionTypes, perm => {
        if (perm.abstract === undefined && !perm.collection) {
          plugin.error(
            `Must set { abstract: true | false } property for all permission types ` +
              `unless it is a collection-specific permission ` +
              `permission ${JSON.stringify(
                perm
              )} does not have "abstract" or "collection" property`
          );
        }

        const singleParent = perm.parent;
        if (singleParent) {
          perm.parents = [singleParent];
        }

        /**
     *  Check for non-abstract permissions (as parents) which will not have a
        node listed in the permissionType list, but whose "action" should
        be a node in the list.
     */
        const parents = perm.parents as string[];
        if (parents) {
          if (!Array.isArray(parents)) {
            plugin.error(
              `parents of permission type must be given as an array!`
            );
          }

          const colParents = [] as string[];
          for (const parent of parents) {
            // if we have an <action>-<collection> permission...
            if (parent && /-/.test(parent)) {
              if (!perm.abstract && !perm.collection) {
                plugin.error(
                  `Cannot set collection-specific permission to be the parent of a non-abstract permission!`
                );
              }

              const parsed = parsePermissionString(plugin, parent);

              if (
                !(
                  parsed.collection &&
                  plugin.graclHierarchy.resources.has(parsed.collection)
                )
              ) {
                plugin.error(
                  `Collection ${parsed.collection} in permission ` +
                    `"${parent}" does not exist in the resource hierarchy!`
                );
              }

              // add it to the list of parents of this nodes, to insure the action
              // is a listed valid permission given to the plugin
              if (parsed.action) {
                colParents.push(parsed.action);
              } else {
                plugin.error(`parent permission had no action! ${parent}`);
              }
            } else if (parent) {
              colParents.push(parent);
            }
          }
          perm.collection_parents = _.uniq(colParents);
        }

        return perm;
      }),
      'name',
      'collection_parents'
    )
  ) as PermissionTypeList;

  const duplicates = new Set();
  const exist = new Set();

  for (const perm of sorted) {
    const name = perm && perm.name;
    if (name && exist.has(name)) {
      duplicates.add(name);
    } else if (name) {
      exist.add(name);
    }
  }

  if (duplicates.size) {
    plugin.error(
      `Duplicate permission types provided: ${[...duplicates].join(', ')}`
    );
  }

  const hierarchy: PermissionHierarchy = {};

  _.each(sorted, node => {
    const name = node.name;
    const parents = (node.parents || []) as string[];
    const abstract = node.abstract || false;
    const collection = node.collection || false;

    if (!(abstract || collection)) {
      plugin.crudPermissionSet.add(name);
    }

    hierarchy[name] = {
      name,
      abstract,
      collection,
      format: node.format,
      // need to add parents, that may be non-abstract nodes that don't directly exist in hierarchy
      parents: _.map(parents, (p: string) => {
        const hierarchyParent = hierarchy[p];

        if (abstract && hierarchyParent && !hierarchyParent.abstract) {
          plugin.error(
            `If a permission is abstract, it either needs an abstract parent ` +
              `or a parent that references a specific collection.`
          );
        }

        if (hierarchyParent) {
          return hierarchyParent;
        }

        const parsed = parsePermissionString(plugin, p);
        const action = parsed.action;

        if (abstract && !parsed.collection) {
          plugin.error(
            `Parent permissions of abstract permission must ` +
              `themseleves be abstract or reference a specific collection. ` +
              `Abstract permission ${name} has parent permission ${p} which is not specific to a collection`
          );
        }

        if (
          !(
            parsed.collection &&
            plugin.graclHierarchy.resources.has(parsed.collection)
          )
        ) {
          plugin.error(
            `Collection ${parsed.collection} in permission ` +
              `"${p}" does not exist in the resource hierarchy!`
          );
        }

        // the non-abstract parent, must itself have a parent in the hierarchy...
        const subParents: Array<PermissionHierarchyNode> = [];
        if (action) {
          subParents.push(hierarchy[action]);
        } else {
          plugin.error(`No parent of action in permission ${p} exists!`);
        }

        return {
          name: p,
          parents: subParents
        };
      })
    };
  });

  // store the hierarchy and set of all permissions
  plugin.permissionHierarchy = hierarchy;
  plugin.setOfAllPermissions = new Set(plugin.getAllPossiblePermissionTypes());
}
