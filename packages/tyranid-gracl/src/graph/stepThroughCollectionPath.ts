import * as _ from 'lodash';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { findLinkInCollection } from './findLinkInCollection';

export async function stepThroughCollectionPath<
  P extends Tyr.Document,
  N extends Tyr.Document
>(
  plugin: GraclPlugin,
  ids: ObjectID[],
  previousCollection: Tyr.CollectionInstance<P>,
  nextCollection: Tyr.CollectionInstance<N>,
  debug?: boolean
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
  const nextCollectionId = primaryKey.field;

  if (debug) {
    const childMap = new Map<string, string[]>();
    const nextCollectionIdStrings = new Set();

    await Promise.all(
      ids.map(async id => {
        const docs = await nextCollection.findAll({
          query: { [nextCollectionLinkField.spath]: { $in: [id] } },
          fields: { _id: 1, [nextCollectionId]: 1 }
        });

        childMap.set(
          id.toString(),
          docs.map(doc => {
            const docId = _.get(doc, nextCollectionId).toString();
            nextCollectionIdStrings.add(docId);
            return docId;
          })
        );
      })
    );

    return {
      childMap,
      nextCollectionIds: Array.from(nextCollectionIdStrings).map(
        id => new ObjectID(id)
      )
    };
  }

  // get the objects in the second to last collection of the path using
  // the ids of the last collection in the path
  const nextCollectionDocs = await nextCollection.findAll({
    query: { [nextCollectionLinkField.spath]: { $in: ids } },
    fields: { _id: 1, [nextCollectionId]: 1 }
  });

  // extract their primary ids using the primary field
  return {
    nextCollectionIds: _.map(
      nextCollectionDocs,
      nextCollectionId
    ) as ObjectID[],
    childMap: new Map<string, string[]>()
  };
}
