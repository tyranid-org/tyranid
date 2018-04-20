import { Graph, SchemaNode } from 'gracl';
import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { SchemaGraclConfigObject, TyrSchemaGraphObjects } from '../interfaces';

import { createSchemaNode } from './createSchemaNode';
import { getCollectionLinksSorted } from './getCollectionLinksSorted';

/**
 * Create full gracl hierarhcy of subject and resource instances
 * based on the relations defined in the tyranid collection schema
 *
 * (see https://github.com/CrossLead/gracl/blob/master/lib/classes/Graph.ts)
 */
export function createGraclHierarchy(plugin: GraclPlugin) {
  const collections = Tyr.collections;

  const graclGraphNodes = {
    subjects: {
      links: [],
      parents: []
    } as TyrSchemaGraphObjects,
    resources: {
      links: [],
      parents: []
    } as TyrSchemaGraphObjects
  };

  // loop through all collections, retrieve
  // ownedBy links
  collections.forEach(col => {
    const linkFields = getCollectionLinksSorted(plugin, col, {
      relate: 'ownedBy',
      direction: 'outgoing'
    });
    const graclConfig = _.get(
      col,
      'def.graclConfig',
      {}
    ) as SchemaGraclConfigObject;
    const graclTypeAnnotation = _.get(graclConfig, 'types', []) as string[];
    const collectionName = col.def.name;

    // if no links at all, skip
    if (!(linkFields.length || graclTypeAnnotation.length)) {
      return;
    }

    // validate that we can only have one parent of each field.
    if (linkFields.length > 1) {
      plugin.error(
        `tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
          `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`
      );
    }

    const [field] = linkFields;
    const graclType = _.get(field || {}, 'def.graclTypes', graclTypeAnnotation);

    // if no graclType property on this collection, skip the collection
    if (!(graclType && graclType.length)) {
      return;
    }

    while (graclType.length) {
      const currentType = graclType.pop();
      switch (currentType) {
        case 'subject':
          if (field) {
            graclGraphNodes.subjects.links.push(field);
            graclGraphNodes.subjects.parents.push(field.link!);
          } else {
            graclGraphNodes.subjects.parents.push(col);
          }
          break;
        case 'resource':
          if (field) {
            graclGraphNodes.resources.links.push(field);
            graclGraphNodes.resources.parents.push(field.link!);
          } else {
            graclGraphNodes.resources.parents.push(col);
          }
          break;
        default:
          plugin.error(
            `Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`
          );
          break;
      }
    }
  });

  const schemaMaps = {
    subjects: new Map<string, SchemaNode>(),
    resources: new Map<string, SchemaNode>()
  };

  for (const type of ['subjects', 'resources']) {
    let nodes: Map<string, SchemaNode>;
    let tyrObjects: TyrSchemaGraphObjects;

    let graclType: string;
    if (type === 'subjects') {
      nodes = schemaMaps.subjects;
      tyrObjects = graclGraphNodes.subjects;
      graclType = 'subject';
    } else {
      nodes = schemaMaps.resources;
      tyrObjects = graclGraphNodes.resources;
      graclType = 'resource';
    }

    _.each(tyrObjects.links, node => {
      const name = node.collection.def.name;
      /**
       * Create node in Gracl graph with a custom getParents() method
       */
      nodes.set(
        name,
        createSchemaNode(plugin, node.collection, graclType, node)
      );
    });

    _.each(tyrObjects.parents, parent => {
      const name = parent.def.name;
      if (!nodes.has(name)) {
        nodes.set(name, createSchemaNode(plugin, parent, graclType));
      }
    });
  }

  plugin.graclHierarchy = new Graph({
    subjects: Array.from(schemaMaps.subjects.values()),
    resources: Array.from(schemaMaps.resources.values())
  });

  // find all the child resources of each resource
  plugin.graclHierarchy.resources.forEach(resource => {
    const childName = resource.displayName || resource.name;
    if (!plugin.resourceChildren.has(childName)) {
      plugin.resourceChildren.set(childName, new Set<string>());
    }
    _.each(resource.getHierarchyClassNames(), parentName => {
      if (parentName === childName) {
        return;
      }
      if (!plugin.resourceChildren.has(parentName)) {
        plugin.resourceChildren.set(parentName, new Set<string>());
      }
      const parent = plugin.resourceChildren.get(parentName);
      if (parent) {
        parent.add(childName);
      }
    });
  });
}
