import { GraclPlugin } from '../classes/GraclPlugin';
import { parsePermissionString } from './parsePermissionString';

/**
 * Make sure that a formatted permission string like `view-user` actually
 * exists in the permissions hierarchy
 */
export function validatePermissionExists(plugin: GraclPlugin, perm: string) {
  if (!perm) {
    return plugin.error('no permission given!');
  }

  const components = parsePermissionString(plugin, perm);

  if (!(components.action && plugin.permissionHierarchy[components.action])) {
    return plugin.error(`Invalid permission type: ${components.action}`);
  }

  if (
    components.collection &&
    !plugin.graclHierarchy.resources.has(components.collection)
  ) {
    return plugin.error(
      `Collection "${components.collection}" has no ` +
        `resource class and thus can't be used with permission "${components.action}"`
    );
  }
}
