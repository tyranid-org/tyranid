import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

/**
 *  Construct a path from collection a to collection b using
    the pre-computed paths in plugin._outgoingLinkPaths
 */
export function getShortestPath(
  plugin: GraclPlugin,
  colA: Tyr.CollectionInstance,
  colB: Tyr.CollectionInstance
) {
  let a = colA.def.name;
  const b = colB.def.name;
  const originalEdge = `${a}.${b}`;
  const next = plugin.outgoingLinkPaths;

  if (!_.get(next, originalEdge)) {
    return [];
  }

  const path: string[] = [a];

  while (a !== b) {
    // tslint:disable-next-line
    a = _.get<any>(next, `${a}.${b}` as any);
    if (!a) {
      return [];
    }
    path.push(a);
  }

  return path;
}
