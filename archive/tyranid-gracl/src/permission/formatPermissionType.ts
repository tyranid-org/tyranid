import { GraclPlugin } from '../classes/GraclPlugin';

/**
 * Inverse function of parsePermissionString. Given an action, and a collection, formats
 * the permission for usage by the plugin
 *
 *
 * @example
 * ```javascript
 * formatPermissionType(plugin, { action: 'view', collection: 'user' }) === 'view-user';
 * ```
 *
 * while this seems redundant, it allows you to pass a consistant
 * components type and always get the correct permission regardless
 * of whether the permission is crud or abstract.
 */
export function formatPermissionType(
  plugin: GraclPlugin,
  components: { action: string; collection?: string }
) {
  const hierarchyNode = plugin.permissionHierarchy[components.action];
  if (!hierarchyNode) {
    plugin.error(`Invalid permission type: ${components.action}`);
  }

  // if the permission is abstract, it should not be associated with
  // a specific collection, if there is a collection provided and it is not abstract, use it
  if (!hierarchyNode.abstract && components.collection) {
    return `${components.action}-${components.collection}`;
  }

  return components.action;
}
