import * as _ from 'lodash';
import { MatchResult, MatchResultType } from 'mongo-explain-match';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { DebugGraph, DebugGraphNode, DebugResult } from './query';

export const enum ExplainationType {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  UNSET = 'UNSET'
}

export interface Explaination {
  /**
   * list of uids from child to parent
   */
  permissionId?: string;
  permissionType?: string;
  property?: string;
  uidPath: string[];
  type: ExplainationType;
}

export function explain(debug: DebugResult, result: MatchResult, query: {}) {
  const out: Explaination[] = [];

  for (const reason of result.reasons) {
    const isInSet = result.match && reason.type === MatchResultType.IN_SET;
    const notInExclusion =
      !result.match && reason.type === MatchResultType.NOT_IN_SET;

    if (isInSet || notInExclusion) {
      const idFromQuery: ObjectID = _.get(query, reason.queryPath);
      out.push(
        ...getExplainationsForId(
          idFromQuery,
          debug.positive,
          result.match ? ExplainationType.ALLOW : ExplainationType.DENY,
          reason.propertyPath
        )
      );
    }
  }

  if (!out.length) {
    out.push({
      uidPath: [],
      type: ExplainationType.UNSET
    });
  }

  return out;
}

/**
 * given a node in the debug graph,
 * find the path of nodes leading to a permission
 */
function getExplainationsForId(
  id: ObjectID,
  graph: DebugGraph,
  type: ExplainationType,
  property: string
): Explaination[] {
  const node = graph.get(id.toString());

  if (!node) {
    throw new Error(`No node found for id = ${id}`);
  }

  const nodeUid = toUid(node.collectionName, id);

  /**
   * the node itself represents a direct permission
   */
  if (!('parents' in node)) {
    return [
      {
        permissionId: node.permission.toString(),
        permissionType: node.type,
        property,
        uidPath: [nodeUid],
        type: ExplainationType.ALLOW
      }
    ];
  }

  const out: Explaination[] = [];

  /**
   * recurse up parent chain, building explainiation objects with uid path
   */

  let currentNodes = [
    {
      type,
      uidPath: [nodeUid],
      parents: Array.from(node.parents)
    }
  ];

  while (currentNodes.length) {
    const nextNodes: (Explaination & { parents: string[] })[] = [];

    for (const current of currentNodes) {
      const { parents, uidPath } = current;

      for (const parent of parents) {
        const next = graph.get(parent);

        if (!next) {
          throw new Error(`No node found for parentId = ${parent}`);
        }

        const parentUid = toUid(next.collectionName, parent);
        const nextPath = [...uidPath, parentUid];

        if (!('parents' in next)) {
          out.push({
            type,
            uidPath: nextPath,
            permissionId: next.permission.toString(),
            permissionType: next.type,
            property
          });
        } else {
          nextNodes.push({
            type,
            uidPath: nextPath,
            parents: Array.from(next.parents)
          });
        }
      }
    }

    currentNodes = nextNodes;
  }

  return out;
}

function toUid(colName: string, id: ObjectID | string) {
  return Tyr.byName[colName].idToUid(id);
}
