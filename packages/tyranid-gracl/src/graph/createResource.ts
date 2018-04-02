import { Resource } from 'gracl';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

/**
 * Given a resource document, wrap it in a `gracl` Resource instance
 */
export function createResource(
  plugin: GraclPlugin,
  resourceDocument: Tyr.Document
): Resource {
  if (!(resourceDocument && resourceDocument.$uid)) {
    plugin.error(
      'No resource document provided (or Tyr.local.user is unavailable)!'
    );
  }

  const resourceCollectionName = resourceDocument.$model.def.name;
  const ResourceClass = plugin.graclHierarchy.getResource(
    resourceCollectionName
  );

  if (!ResourceClass) {
    plugin.error(
      `Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
    );
  }

  return new ResourceClass(resourceDocument);
}
