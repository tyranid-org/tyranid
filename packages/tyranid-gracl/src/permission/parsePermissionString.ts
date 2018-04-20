import { GraclPlugin } from '../classes/GraclPlugin';

export function parsePermissionString(plugin: GraclPlugin, perm: string) {
  if (!perm) {
    plugin.error(`Tried to split empty permission!`);
  }

  const [action, collection] = perm.split('-');
  return { action, collection };
}
