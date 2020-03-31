import { Node, Permission, SchemaNode, Subject } from 'gracl';
import * as _ from 'lodash';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { PermissionsModel } from '../models/PermissionsModel';
import { makeRepository } from '../tyranid/makeRepository';
import { findLinkInCollection } from './findLinkInCollection';
import { getShortestPath } from './getShortestPath';

/**
 *  Create a schema node for consumption by gracl.buildResourceHierarchy() or gracl.buildSubjectHierarchy()

  Example:

  ```js
  const resources = new Map<string, SchemaNode>();

  // given (node: Tyr.Field) and (name: string) ....
  resources.set(name, plugin.createSchemaNode(node.collection, graclType, node));

  const resourceHiearchy = Graph.buildResourceHierarchy(Array.from(resources.values()));
  ```
 */
export function createSchemaNode(
  plugin: GraclPlugin,
  collection: Tyr.CollectionInstance,
  type: string,
  node?: Tyr.FieldInstance
): SchemaNode {
  return {
    id: '$uid',
    name: collection.def.name,
    repository: makeRepository(plugin, collection, type),
    type,
    parent: node && node.link && node.link.def.name,

    async getPermission(this: Node, subject: Subject): Promise<Permission> {
      const subjectId = subject.getId();
      const resourceId = this.getId();

      const perm = await PermissionsModel.findOne({
        query: {
          subjectId,
          resourceId
        }
      });

      return (perm || {
        subjectId,
        resourceId: '',
        resourceType: '',
        subjectType: this.getName(),
        access: {}
      }) as Permission;
    },

    async getParents(this: Node): Promise<Node[]> {
      if (node) {
        const ParentClass = this.getParentClass();
        const parentPathode.collection.parsePath(node.path);

        let ids = parentPath.get(this.doc);

        if (ids && !(ids instanceof Array)) {
          ids = [ids];
        }

        // if no immediate parents, recurse
        // up resource chain and check for
        // alternate path to current node
        if (!(ids && ids.length)) {
          const hierarchyClasses = ParentClass.getHierarchyClassNames();
          const thisCollection = Tyr.byName[this.getName()];
          const doc = this.doc as Tyr.Document;

          hierarchyClasses.shift(); // remove parent we already tried

          // try to find a path between one of the hierarchy classes
          // (starting from lowest and recursing upward)
          while (hierarchyClasses.length) {
            const currentParent =
              hierarchyClasses.shift() || plugin._NO_COLLECTION;

            const currentParentCollection = Tyr.byName[currentParent];
            const path = getShortestPath(
              plugin,
              thisCollection,
              currentParentCollection
            );
            const CurrentParentNodeClass =
              type === 'resource'
                ? plugin.graclHierarchy.getResource(currentParent)
                : plugin.graclHierarchy.getSubject(currentParent);

            if (path.length && path.length >= 2) {
              let currentCollection =
                Tyr.byName[path.shift() || plugin._NO_COLLECTION];
              let nextCollection =
                Tyr.byName[path.shift() || plugin._NO_COLLECTION];
              let linkField = findLinkInCollection(
                plugin,
                currentCollection,
                nextCollection
              );

              const idProp = linkField.path.get(doc) || [];

              let linkIds: ObjectID[] = !idProp
                ? []
                : Array.isArray(idProp)
                ? idProp
                : [idProp];

              // this potential path has found a dead end,
              // we need to try another upper level resource
              if (!linkIds.length) {
                continue;
              }

              while (
                linkField.link &&
                linkField.link.def.name !== currentParent
              ) {
                currentCollection = nextCollection;
                nextCollection =
                  Tyr.byName[path.shift() || plugin._NO_COLLECTION];
                linkField = findLinkInCollection(
                  plugin,
                  currentCollection,
                  nextCollection
                );
                const nextDocuments = await currentCollection.byIds(linkIds);
                linkIds = _.chain(nextDocuments)
                  .map((d: Tyr.Document) => linkField.path.get(d))
                  .flatten()
                  .compact()
                  .value() as ObjectID[];
              }

              if (!linkIds.length) {
                continue;
              }

              const parentDocs = await nextCollection.byIds(linkIds);
              const parents = _.map(
                parentDocs,
                (d: Tyr.Document) => new CurrentParentNodeClass(d)
              );

              return parents;
            }
          }

          return [];
        }

        const linkCollection = node.link;
        const parentObjects = await (linkCollection &&
          linkCollection.byIds(ids));

        return _.map(parentObjects, doc => new ParentClass(doc));
      } else {
        return [];
      }
    }
  } as SchemaNode;
}
