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

export interface AccessExplainationResult {
  explainations: Explaination[];
  resourceId: string;
  subjectId: string;
  hasAccess: boolean;
}

export interface Explaination {
  /**
   * list of uids from child to parent
   */
  permissionId?: string;
  permissionType?: string;
  property?: string;
  resourcePath: string[];
  subjectPath: string[];
  type: ExplainationType;
}

/**
 * format id as uid
 *
 * @param colName
 * @param id
 */
function toUid(colName: string, id: ObjectID | string) {
  return Tyr.byName[colName].idToUid(id);
}

/**
 * create explaination objects for a given match result + query
 */
export function explain(
  subjectId: string,
  debug: DebugResult,
  result: MatchResult,
  query: {}
): Explaination[] {
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
          subjectId,
          debug.subjects,
          isInSet ? debug.positive : debug.negative,
          result.match ? ExplainationType.ALLOW : ExplainationType.DENY,
          reason.propertyPath
        )
      );
    }
  }

  if (!out.length) {
    out.push({
      resourcePath: [],
      subjectPath: [],
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
  subjectId: string,
  subjectGraph: Map<string, string[]>,
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
        subjectPath: [node.subjectId],
        permissionType: node.type,
        property,
        resourcePath: [nodeUid],
        type: ExplainationType.ALLOW
      }
    ];
  }

  const out: Explaination[] = [];

  /**
   * recurse up parent chain, building explaination objects with uid path
   */

  let currentNodes = [
    {
      type,
      resourcePath: [nodeUid],
      parents: Array.from(node.parents)
    }
  ];

  while (currentNodes.length) {
    const nextNodes: (Explaination & { parents: string[] })[] = [];

    for (const current of currentNodes) {
      const { parents, resourcePath } = current;

      for (const parent of parents) {
        const next = graph.get(parent);

        if (!next) {
          throw new Error(`No node found for parentId = ${parent}`);
        }

        const parentUid = toUid(next.collectionName, parent);
        const nextPath = [...resourcePath, parentUid];

        if (!('parents' in next)) {
          const subjectPaths = getSubjectPaths(
            subjectId,
            next.subjectId,
            subjectGraph
          );

          for (const subjectPath of subjectPaths) {
            out.push({
              type,
              resourcePath: nextPath,
              subjectPath,
              permissionId: next.permission.toString(),
              permissionType: next.type,
              property
            });
          }
        } else {
          nextNodes.push({
            type,
            resourcePath: nextPath,
            subjectPath: [],
            parents: Array.from(next.parents)
          });
        }
      }
    }

    currentNodes = nextNodes;
  }

  return out;
}

/**
 * walk subject graph to find all possible connections between
 * start and end subjects
 */
function getSubjectPaths(
  startId: string,
  endId: string,
  subjectGraph: Map<string, string[]>
): string[][] {
  if (startId === endId) {
    return [[endId]];
  }

  const parents = subjectGraph.get(startId);
  if (!parents || !parents.length) {
    return [[]];
  }

  const out: string[][] = [];
  for (const parent of parents) {
    if (parent === endId) {
      out.push([startId, endId]);
    } else {
      const next = getSubjectPaths(parent, endId, subjectGraph);

      for (const nextPath of next) {
        if (next.length) {
          out.push([startId, ...nextPath]);
        }
      }
    }
  }

  return out;
}

/**
 * human readable version of permission explaination
 */
export function formatExplainations(result: AccessExplainationResult): string {
  let out = `The subject (${result.subjectId}) is ${
    result.hasAccess ? 'allowed' : 'denied'
  } access to resource (${result.resourceId}):`;

  for (const expl of result.explainations) {
    out += '\n\t';

    switch (expl.type) {
      case ExplainationType.DENY:
      case ExplainationType.ALLOW: {
        out += `- The subject is ${result.hasAccess ? 'allowed' : 'denied'} ${
          expl.permissionType
        } access through permission ${expl.permissionId}.`;
        out += `\n\t  > Resource Hierarchy:`;
        out += `\n\t\t${expl.resourcePath.join(' -> ')}`;
        out += `\n\t  > Subject Hierarchy:`;
        out += `\n\t\t${expl.subjectPath.join(' -> ')}`;
        break;
      }

      case ExplainationType.UNSET: {
        out += `No relevant permissions are set for this resource.`;
        break;
      }
    }
  }

  return out;
}
