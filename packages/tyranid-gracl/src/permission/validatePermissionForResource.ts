import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { validateAsResource } from '../graph/validateAsResource';
import { formatPermissionType } from './formatPermissionType';
import { isCrudPermission } from './isCrudPermission';
import { parsePermissionString } from './parsePermissionString';
import { validatePermissionExists } from './validatePermissionExists';

/**
 * Make sure that a permission can be used with a given collection,
 * as there may be permissions that are excluded from use with a collection.
 *
 * See: getAllowedPermissionsForCollection.ts
 */
export function validatePermissionForResource(
  plugin: GraclPlugin,
  permissionString: string,
  resourceCollection: Tyr.CollectionInstance
) {
  const name = resourceCollection.def.name;

  if (isCrudPermission(plugin, permissionString)) {
    const action = parsePermissionString(plugin, permissionString).action;
    const formatted = !action
      ? permissionString
      : formatPermissionType(plugin, { collection: name, action });

    plugin.error(
      `Cannot use raw crud permission "${permissionString}" ` +
        `without attached resource. Did you mean ${formatted}?`
    );
  }

  validateAsResource(plugin, resourceCollection);
  validatePermissionExists(plugin, permissionString);

  const restrictions = plugin.permissionRestrictions.get(name);
  if (restrictions) {
    if (!restrictions.has(permissionString)) {
      plugin.error(
        `Tried to use permission "${permissionString}" with collection "${name}" ` +
          `but "${name}" is restricted to the following permissions: ` +
          [...restrictions.values()].join(', ')
      );
    }
  }
}
