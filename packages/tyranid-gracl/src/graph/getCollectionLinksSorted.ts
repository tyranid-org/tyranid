import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

/**
 * Get a list of all links in a given collection schema,
 * sorted by the name of the linked collection -- cached
 */
export function getCollectionLinksSorted<
  IdType extends Tyr.AnyIdType,
  D extends Tyr.Document<IdType>
>(
  plugin: GraclPlugin,
  col: Tyr.CollectionInstance<IdType, D>,
  opts: { direction: string; relate?: string } = { direction: 'outgoing' }
): Tyr.FieldInstance[] {
  const collectionFieldCache = plugin.sortedLinkCache;
  const hash = `${col.def.name}:${_.toPairs(opts)
    .map(e => e.join('='))
    .sort()
    .join(':')}`;

  if (collectionFieldCache[hash]) {
    return collectionFieldCache[hash];
  }

  const linkFields = col.links(opts);

  // sort fields by link collection name
  const links = _.chain(linkFields)
    .groupBy(field => field.link!.def.name)
    .map((colLinks: Tyr.FieldInstance[], colName: string) => {
      /**
       * multiple links to collection?
       */
      if (colLinks.length > 1) {
        const filtered = colLinks.filter(
          field =>
            !!(field.def as Tyr.FieldDefinition & {
              graclTypes?: string[] | string;
            }).graclTypes
        );

        /**
         * no graclType links? use first available...
         *
         * TODO: multiple?
         */
        if (filtered.length === 0) {
          return colLinks.slice(0, 1);
          /**
           * one? use it
           */
        } else if (filtered.length === 1) {
          return filtered;
        } else {
          throw new Error(
            `Multiple links to ${colName} for collection ${
              col.def.name
            } have graclTypes`
          );
        }
      } else {
        return colLinks;
      }
    })
    .flatten()
    .sortBy((field: Tyr.FieldInstance) => field.link && field.link.def.name)
    .value() as Tyr.FieldInstance[];

  return (collectionFieldCache[hash] = links);
}
