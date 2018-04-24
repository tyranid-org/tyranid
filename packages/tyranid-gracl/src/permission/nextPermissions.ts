import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { Hash } from '../interfaces';
import { formatPermissionType } from './formatPermissionType';
import { parsePermissionString } from './parsePermissionString';

/**
 * Recurse up the permissions hierarhcy, by finding the direct parent permissions of
 * a given permission string.
 *
 * For example, if edit and delete are parents of 'view',
 * nextPermissions(plugin, 'view-user') === [ 'edit-user', 'delete-user' ];
 */
export function nextPermissions(
  plugin: GraclPlugin,
  permissionString: string
): string[] {
  const components = parsePermissionString(plugin, permissionString);
  // get general permissions from action
  const actionParents = _.get(
    plugin.permissionHierarchy,
    `${components.action}.parents`,
    []
  ) as Array<Hash<string>>;
  // if a specific action-collection permission is set in the hierarchy
  const permissionStringParents = _.get(
    plugin.permissionHierarchy,
    `${permissionString}.parents`,
    []
  ) as Array<Hash<string>>;

  return _.chain(actionParents)
    .concat(permissionStringParents)
    .map('name')
    .uniq()
    .map((name: string) => {
      // we need to split the name, as it may include a specific collection
      // for inheritance
      const parentPermComponents = parsePermissionString(plugin, name);

      if (!parentPermComponents.action) {
        return '';
      } else {
        return formatPermissionType(plugin, {
          action: parentPermComponents.action,
          // if there was a specific collection attached to the parent permission
          // use that, otherwise use the same collection as the last permission
          collection:
            parentPermComponents.collection || components.collection || ''
        });
      }
    })
    .compact()
    .uniq()
    .value();
}
