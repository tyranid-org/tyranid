import { GraclPlugin } from '../classes/GraclPlugin';
import { parsePermissionString } from './parsePermissionString';

/**
 * Each database collection could have specific permissions
 * that are allowed to be used with it.
 *
 * @example
 * ```javascript
new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  graclConfig: {
    permissions: {
      excludeCollections: [
        'user', 'blog', 'post'
      ],
      exclude: [
        'view_alignment_triangle_private'
      ]
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: { is: 'string' } },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: [ 'resource' ]
    }
  }
})
 * ```
 *
 * The above collection will only be allowed to be used with permissions that don't include the
 * user, blog, and post collections. Additionally, the abstract permission `view_alignment_triangle_private`
 * cannot be used with the collection.
 */
export function getAllowedPermissionsForCollection(
  plugin: GraclPlugin,
  collectionName: string
) {
  const restriction = plugin.permissionRestrictions.get(collectionName);

  const childResources = new Set(
    plugin.graclHierarchy
      .getChildResources(collectionName)
      .map(r => r.displayName)
  );

  // add own name
  childResources.add(collectionName);

  const preFiltered = restriction
    ? [...restriction]
    : [...plugin.setOfAllPermissions];

  // filter permissions, excluding collection specific perms that
  // are not child resources of this collection
  return preFiltered.filter(perm => {
    const components = parsePermissionString(plugin, perm);
    return !components.collection || childResources.has(components.collection);
  });
}
