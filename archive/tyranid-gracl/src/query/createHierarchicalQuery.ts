import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { Hash } from '../interfaces';
import { createInQueries } from './createInQueries';

/**
 *  Creates mongo query with boolean expression
 *  that captures resource hierarchy constraints.
 *
 *  Basically, we want "lower" uids to supercede "higher" uids
 *
 *  say we have posts and blogs, and we want to allow a user to
 *  access a specific post in a blog that is otherwise denied
 *  we need the id of the post to supercede the deny implied
 *  by the blog within a $not/$nin expression
 *
 *  For example, if we have specific posts P that we want to allow,
 *  and Blogs B that we want to deny (but may contiain posts in P)
 *  we would do
 *
 *  matched_posts = P AND ((NOT B) OR P)
 *
 *  which would still return posts in P that are in blogs in B
 *
 *  To produce a boolean expression like above, we need to sort all the collections
 *  by their depth in the resource hierarchy
 */
export function createHierarchicalQuery(
  plugin: GraclPlugin,
  queryMaps: Hash<Map<string, Set<string>>>,
  queriedCollection: Tyr.CollectionInstance
): Hash<{}> | false {
  const positiveUids = queryMaps.positive;
  const negativeUids = queryMaps.negative;

  const positiveRestriction = createInQueries(
    plugin,
    queryMaps.positive,
    queriedCollection,
    '$in'
  );
  const negativeRestriction = createInQueries(
    plugin,
    queryMaps.negative,
    queriedCollection,
    '$nin'
  );

  const resultingQuery: Hash<{}> = {};
  const hasPositive = !!positiveRestriction.$or.length;
  const hasNegative = !!negativeRestriction.$and.length;
  /**
   * For each collection with negative restrictions, we need to create an OR clause
   * which excludes uids that are lower in the resource hierarchy and exist in the
   * positive list all the OR clauses should be wrapped in an and clause
   */
  if (hasNegative && hasPositive) {
    const negativeModifiedQuery: Hash<{}> = {};
    const $and: Array<Hash<{}>> = (negativeModifiedQuery.$and = []);

    negativeUids.forEach((uids, collectionName) => {
      if (!uids.size) {
        return;
      }
      const $or: Array<Hash<{}>> = [];
      const childCollectionNames = plugin.resourceChildren.get(collectionName);

      if (!childCollectionNames) {
        return plugin.error(
          `No childCollectionNames found for ${collectionName}`
        );
      }

      const excludeMap = new Map<string, Set<string>>();
      excludeMap.set(collectionName, uids);

      if (excludeMap.size) {
        $or.push(
          createInQueries(plugin, excludeMap, queriedCollection, '$nin')
        );
      }

      const includeMap = new Map<string, Set<string>>();
      childCollectionNames.forEach(name => {
        const positiveUidsForName = positiveUids.get(name);
        if (positiveUidsForName && positiveUidsForName.size) {
          includeMap.set(name, positiveUidsForName);
        }
      });

      if (includeMap.size) {
        $or.push(createInQueries(plugin, includeMap, queriedCollection, '$in'));
      }

      if ($or.length) {
        $and.push({ $or });
      }
    });

    resultingQuery.$and = [positiveRestriction, negativeModifiedQuery];
  } else if (hasNegative) {
    /**
     * if there are only negative restrictions set,
     * return false to deny all objects -- there must
     * be at least some positive permissions
     */
    return false;
  } else if (hasPositive) {
    Object.assign(resultingQuery, positiveRestriction);
  }

  return resultingQuery;
}
