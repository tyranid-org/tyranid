import { GraclPlugin } from '../classes/GraclPlugin';
import { getPermissionObject } from './getPermissionObject';
import { parsePermissionString } from './parsePermissionString';

// check if a permission is "crud", meaning it applies to all
// collections. For example, "view" could be crud, and then "view-user",
// and view-group could be set if the group and user collections exist in the
// system AND are resources.
export function isCrudPermission(
  plugin: GraclPlugin,
  permissionString: string
) {
  const components = parsePermissionString(plugin, permissionString);
  const perm = getPermissionObject(plugin, permissionString);
  return !components.collection && perm && !perm.abstract && !perm.collection;
}
