import { GraclPlugin } from '../classes/GraclPlugin';
import { PermissionType, PermissionHierarchyNode } from '../interfaces';

// get the original supplied permissions object passed to the
// plugin on instantiation
export function getPermissionObject(
  plugin: GraclPlugin,
  permissionString: string
): PermissionHierarchyNode | undefined {
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
