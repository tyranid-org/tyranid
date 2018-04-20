import { baseCompare, binaryIndexOf } from 'gracl';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { getCollectionLinksSorted } from './getCollectionLinksSorted';

function compareCollectionWithField(
  aCol: Tyr.CollectionInstance,
  bCol: Tyr.FieldInstance
) {
  const a = aCol.def.name;
  const b = bCol.link && bCol.link.def.name;

  return baseCompare(a, b);
}

/**
 *  Function to find if <linkCollection> appears on an outgoing link field
    on <col>, uses memoized <getCollectionFieldSorted> for O(1) field lookup
    and binary search for feild search => O(log(n)) lookup
 */
export function findLinkInCollection<
  D extends Tyr.Document,
  L extends Tyr.Document
>(
  plugin: GraclPlugin,
  col: Tyr.CollectionInstance<D>,
  linkCollection: Tyr.CollectionInstance<L>
): Tyr.FieldInstance {
  const links = getCollectionLinksSorted(plugin, col);
  const index = binaryIndexOf(
    links,
    linkCollection,
    compareCollectionWithField
  );

  return links[index];
}
