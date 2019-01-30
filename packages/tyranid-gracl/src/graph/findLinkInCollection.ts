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
  DIdType extends Tyr.AnyIdType,
  D extends Tyr.Document<DIdType>,
  LIdType extends Tyr.AnyIdType,
  L extends Tyr.Document<LIdType>
>(
  plugin: GraclPlugin,
  col: Tyr.CollectionInstance<DIdType, D>,
  linkCollection: Tyr.CollectionInstance<LIdType, L>
): Tyr.FieldInstance {
  const links = getCollectionLinksSorted(plugin, col);
  const index = binaryIndexOf(
    links,
    linkCollection,
    compareCollectionWithField
  );

  return links[index];
}
