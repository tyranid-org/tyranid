import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { formatPermissionType } from './formatPermissionType';

/**
 *  Get a list of all possible permission strings in the plugin
 */
export function getAllPossiblePermissionTypes(plugin: GraclPlugin): string[] {
  if (plugin.allPossiblePermissionsCache) {
    return plugin.allPossiblePermissionsCache.slice();
  }

  const permissionSchema = plugin.permissionTypes;
  const allPermissions: string[] = [];
  const resourceCollections = Array.from(
    plugin.graclHierarchy.resources.keys()
  );

  for (let i = 0, l = permissionSchema.length; i < l; i++) {
    const perm = permissionSchema[i];
    if (perm.abstract || perm.collection) {
      allPermissions.push(perm.name);
    } else {
      for (const resourceCollection of resourceCollections) {
        const formatted = formatPermissionType(plugin, {
          action: perm.name,
          collection: resourceCollection
        });
        allPermissions.push(formatted);
      }
    }
  }

  return (plugin.allPossiblePermissionsCache = _.uniq(allPermissions)).slice();
}
