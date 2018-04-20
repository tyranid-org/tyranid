import * as _ from 'lodash';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { findLinkInCollection } from './findLinkInCollection';

/**
 * Given a list of ids, find all docs in (previousCollection) relating to those ids, and
 * pluck all ids on those docs which are links to (nextCollection)
 */
export async function stepThroughCollectionPath<
  P extends Tyr.Document,
  N extends Tyr.Document
>(
  plugin: GraclPlugin,
  ids: ObjectID[],
  previousCollection: Tyr.CollectionInstance<P>,
  nextCollection: Tyr.CollectionInstance<N>
) {
  // find the field in the current path collection which we need to get
  // for the ids of the next path collection
  const nextCollectionLinkField = findLinkInCollection(
    plugin,
    nextCollection,
    previousCollection
  );

  if (!nextCollectionLinkField) {
    plugin.error(
      `cannot step through collection path, as no link to collection ${
        nextCollection.def.name
      } ` + `from collection ${previousCollection.def.name}`
    );
  }

  const primaryKey = nextCollection.def.primaryKey;
  if (!primaryKey) {
    plugin.error(`No primary key for collection ${nextCollection.def.name}`);
    return []; // TODO: remove when compiler is bumped
  } else {
    const nextCollectionId = primaryKey.field;

    // get the objects in the second to last collection of the path using
    // the ids of the last collection in the path
    const nextCollectionDocs = await nextCollection.findAll({
      query: { [nextCollectionLinkField.spath]: { $in: ids } },
      fields: { _id: 1, [nextCollectionId]: 1 }
    });

    // extract their primary ids using the primary field
    return _.map(nextCollectionDocs, nextCollectionId) as ObjectID[];
  }
}
