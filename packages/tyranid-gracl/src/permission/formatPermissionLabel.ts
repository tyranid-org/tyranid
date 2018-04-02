import { startCase } from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { getPermissionObject } from './getPermissionObject';
import { parsePermissionString } from './parsePermissionString';

/**
 * Given a permission string, like `view-user`
 * and returns a human readable formatted permission like "View User"
 *
 * -- if the permission was given a format function, that is used
 */
export function formatPermissionLabel(
  plugin: GraclPlugin,
  perm: string
): string {
  const components = parsePermissionString(plugin, perm);
  const obj = getPermissionObject(plugin, perm);
  const format = obj && obj.format;

  if (format) {
    if (typeof format === 'string') {
      return format;
    } else {
      return format(components.action, components.collection);
    }
  } else {
    return startCase(perm);
  }
}
