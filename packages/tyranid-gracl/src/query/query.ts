import { baseCompare } from 'gracl';
import * as _ from 'lodash';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { Hash, Permission } from '../interfaces';
import { PermissionsModel } from '../models/PermissionsModel';
import { createHierarchicalQuery } from './createHierarchicalQuery';

import { formatPermissionType } from '../permission/formatPermissionType';
import { getPermissionParents } from '../permission/getPermissionParents';
import { parsePermissionString } from '../permission/parsePermissionString';
import { validatePermissionExists } from '../permission/validatePermissionExists';

import { getCollectionLinksSorted } from '../graph/getCollectionLinksSorted';
import { getShortestPath } from '../graph/getShortestPath';
import { stepThroughCollectionPath } from '../graph/stepThroughCollectionPath';

/**
 *  Method for creating a specific query based on a schema object
 *
 * @example
 * ```javascript
 * // create a mongodb query object which filters queries to the user
 * // collection to only users that `req.user` can view
 * const restrictionQuery = await query(Tyr.secure, Tyr.byName.user, 'view', req.user);
 * ```
 */
export async function query(
  plugin: GraclPlugin,
  queriedCollection: Tyr.CollectionInstance,
  permissionType: string,
  subjectDocument = Tyr.local.user
): Promise<boolean | {}> {
  const queriedCollectionName = queriedCollection.def.name;

  if (plugin.unsecuredCollections.has(queriedCollectionName)) {
    plugin.log(
      `skipping query modification for ${queriedCollectionName} as it is flagged as unsecured`
    );
    return {};
  }

  if (!permissionType) {
    plugin.error(`No permissionType given to GraclPlugin.query()`);
  }

  if (!plugin.graclHierarchy) {
    plugin.error(
      `Must call GraclPlugin.boot() before using GraclPlugin.query()`
    );
  }

  // ensure that permission exists before trying to filter query
  validatePermissionExists(plugin, permissionType);

  const components = parsePermissionString(plugin, permissionType);

  if (components.action) {
    permissionType = formatPermissionType(plugin, {
      action: components.action,
      collection: components.collection || queriedCollectionName
    });
  } else {
    plugin.error(`no action for permission ${permissionType}`);
  }

  // if no subjectDocument, no restriction...
  if (!subjectDocument) {
    plugin.log(
      `No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`
    );
    return false;
  }

  if (!subjectDocument.$model) {
    plugin.error(
      `The subjectDocument passed to GraclPlugin.query() must be a tyranid document!`
    );
  }

  if (!plugin.graclHierarchy.resources.has(queriedCollectionName)) {
    plugin.log(
      `Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`
    );
    return {};
  }

  // get all permission actions in order...
  const permissionTypes = [permissionType].concat(
    getPermissionParents(plugin, permissionType)
  );

  /**
   *  Iterate through permissions action hierarchy, getting access
   */
  const getAccess = (permission: Permission) => {
    let perm: boolean | undefined;
    for (const type of permissionTypes) {
      if (permission.access && type && permission.access[type] === true) {
        // short circuit on true
        return true;
      } else if (
        permission.access &&
        type &&
        permission.access[type] === false
      ) {
        // continue on false, as superior permissions may be true
        perm = false;
      }
    }
    return perm;
  };

  // extract subject and resource Gracl classes
  const ResourceClass = plugin.graclHierarchy.getResource(
    queriedCollectionName
  );
  const SubjectClass = plugin.graclHierarchy.getSubject(
    subjectDocument.$model.def.name
  );
  const subject = new SubjectClass(subjectDocument);

  plugin.log(
    `restricting query for collection = ${queriedCollectionName} ` +
      `permissionType = ${permissionType} ` +
      `subject = ${subject.toString()}`
  );

  const errorMessageHeader =
    `Unable to construct query object for ${queriedCollection.name} ` +
    `from the perspective of ${subject.toString()}`;

  // get list of all ids in the subject hierarchy,
  // as well as the names of the classes in the resource hierarchy
  const subjectHierarchyIds = await subject.getHierarchyIds();
  const resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
  const permissionsQuery = {
    subjectId: { $in: subjectHierarchyIds },
    resourceType: { $in: resourceHierarchyClasses },
    $or: permissionTypes.map(perm => {
      return {
        [`access.${perm}`]: { $exists: true }
      };
    })
  };

  const permissions = await PermissionsModel.findAll({
    query: permissionsQuery
  });

  // no permissions found, return no restriction
  if (!Array.isArray(permissions) || permissions.length === 0) {
    plugin.log(`No permissions found, returning false`);
    return false;
  }

  interface ResourceMapEntries {
    resourcePermissions: Map<string, Permission>;
    collection: Tyr.CollectionInstance;
  }

  const resourceMap = (permissions as Permission[]).reduce(
    (map: Map<string, ResourceMapEntries>, perm: Permission) => {
      const resourceCollectionName = perm.resourceType as string;
      const resourceId = perm.resourceId as string;

      const perms = map.get(resourceCollectionName) || {
        collection: Tyr.byName[resourceCollectionName],
        resourcePermissions: new Map()
      };

      if (!map.has(resourceCollectionName)) {
        map.set(resourceCollectionName, perms);
      }

      perms.resourcePermissions.set(resourceId, perm);
      return map;
    },
    new Map<string, ResourceMapEntries>()
  );

  // loop through all the fields in the collection that we are
  // building the query string for, grabbing all fields that are links
  // and storing them in a map of (linkFieldCollection => Field)
  const queriedCollectionLinkFields = getCollectionLinksSorted(
    plugin,
    queriedCollection
  ).reduce((map, field: Tyr.FieldInstance) => {
    if (field.def.link) {
      map.set(field.def.link, field);
    }
    return map;
  }, new Map<string, Tyr.FieldInstance>());

  const queryMaps: Hash<Map<string, Set<string>>> = {
    positive: new Map<string, Set<string>>(),
    negative: new Map<string, Set<string>>()
  };

  const resourceArray = Array.from(resourceMap.values());
  resourceArray.sort((a, b) => {
    const aDepth = plugin.graclHierarchy
      .getResource(a.collection.def.name)
      .getNodeDepth();
    const bDepth = plugin.graclHierarchy
      .getResource(b.collection.def.name)
      .getNodeDepth();
    return baseCompare(bDepth, aDepth);
  });

  const alreadySet = new Set<string>();

  // extract all collections that have a relevant permission set for the requested resource
  for (let i = 0, l = resourceArray.length; i < l; i++) {
    const { collection, resourcePermissions } = resourceArray[i];

    const collectionName = collection.def.name;
    const isQueriedCollection = queriedCollectionName === collectionName;

    let queryRestrictionSet = false;
    if (
      queriedCollectionLinkFields.has(collectionName) ||
      isQueriedCollection
    ) {
      const permissionArray = [...resourcePermissions.values()];

      for (const permission of permissionArray) {
        const access = getAccess(permission);
        switch (access) {
          // access needs to be exactly true or false
          case true:
          case false:
            const key = access ? 'positive' : 'negative';
            const uid = permission.resourceId;
            // if a permission was set by a collection of higher depth, keep it...
            if (alreadySet.has(uid)) {
              continue;
            } else {
              alreadySet.add(uid);
            }
            const accessSet = queryMaps[key].get(collectionName) || new Set();
            if (!queryMaps[key].has(collectionName)) {
              queryMaps[key].set(collectionName, accessSet);
            }
            accessSet.add(Tyr.parseUid(uid).id);
            break;
        }
        queryRestrictionSet = true;
      }
    } else {
      // otherwise, we need determine how to restricting a query of this object by
      // permissions concerning parents of this object...
      /**
        Example:

        SETUP: want to query for all posts from database, have permissions
          set for access to posts on posts, blogs, and organizations...

        - for the permissions set on posts specifically, we can just add something like...

          {
            _id: { $in: [ <post-ids>... ] }
          }

        - for the blog permissions, since there is a "blogId" link property on posts,
          we can just add...

          {
            _id: { $in: [ <postIds>... ] },
            blogId: { $in: [ <blogIds>... ] }
          }

        - for the organizations, as there is no organiationId property on the posts,
          we need to find a "path" between posts and organiations (using the pre-computed paths)

            - take all organizationIds present on permissions
            - find all blogs in all those organizations, store in $BLOGS
            - add $BLOGS to query, not overriding permissions set above
      */

      // get computed shortest path between the two collections
      const path = getShortestPath(plugin, queriedCollection, collection);

      if (!path.length) {
        plugin.error(
          `${errorMessageHeader}, as there is no path between ` +
            `collections ${queriedCollectionName} and ${collectionName} in the schema.`
        );
      }

      // remove end of path (which should equal the collection of interest on the permission)
      const pathEndCollectionName = path.pop() || plugin._NO_COLLECTION;

      if (collectionName !== pathEndCollectionName) {
        plugin.error(
          `Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid`
        );
      }

      // assert that the penultimate path collection exists as a link on the queriedCollection
      if (!queriedCollectionLinkFields.has(path[1])) {
        plugin.error(
          `Path returned for collection pair ${queriedCollectionName} and ${collectionName} ` +
            `must have the penultimate path exist as a link on the collection being queried, ` +
            `the penultimate collection path between ${queriedCollectionName} and ${collectionName} ` +
            `is ${path[1]}, which is not linked to by ${queriedCollectionName}`
        );
      }

      let positiveIds: ObjectID[] = [];
      let negativeIds: ObjectID[] = [];

      for (const permission of resourcePermissions.values()) {
        // grab access boolean for given permissionType
        const access = getAccess(permission);
        switch (access) {
          // access needs to be exactly true or false
          case true:
            positiveIds.push(Tyr.parseUid(permission.resourceId).id);
            break;
          case false:
            negativeIds.push(Tyr.parseUid(permission.resourceId).id);
            break;
        }
      }

      const pathEndCollection = Tyr.byName[pathEndCollectionName];
      const nextCollection = Tyr.byName[_.last(path) as string];

      positiveIds = await stepThroughCollectionPath(
        plugin,
        positiveIds,
        pathEndCollection,
        nextCollection
      );
      negativeIds = await stepThroughCollectionPath(
        plugin,
        negativeIds,
        pathEndCollection,
        nextCollection
      );

      // the remaining path collection is equal to the collection we are trying to query,
      // we don't need to do another link in the path, as the current path collection
      // has a link that exists on the queried collection
      let pathCollectionName = pathEndCollectionName;
      const nextCollectionName = nextCollection.def.name;

      while (path.length >= 2) {
        // break if we are one edge away
        if (path.length === 2 && path[0] === queriedCollectionName) {
          break;
        }

        const pathCollection =
          Tyr.byName[
            (pathCollectionName = path.pop() || plugin._NO_COLLECTION)
          ];
        const nextPathCollection = Tyr.byName[_.last(path) as string];

        if (!pathCollection) {
          plugin.error(
            `${errorMessageHeader}, invalid collection name given in path! collection: ${pathCollectionName}`
          );
        }

        /**
         * we need to recursively collect objects along the path,
           until we reach a collection that linked to the queriedCollection
         */
        positiveIds = await stepThroughCollectionPath(
          plugin,
          positiveIds,
          pathCollection,
          nextPathCollection
        );
        negativeIds = await stepThroughCollectionPath(
          plugin,
          negativeIds,
          pathCollection,
          nextPathCollection
        );
      }

      // now, "nextCollectionName" should be referencing a collection
      // that is directly linked to by queriedCollection,
      // and positive / negativeIds should contain ids of documents
      // from <nextCollectionName>
      const linkedCollectionName = nextCollectionName;

      const addIdsToQueryMap = (access: boolean) => (id: string | ObjectID) => {
        const accessString = access ? 'positive' : 'negative';
        const altAccessString = access ? 'negative' : 'positive';
        const resourceUid = Tyr.byName[linkedCollectionName].idToUid(id);

        if (alreadySet.has(resourceUid)) {
          return;
        } else {
          alreadySet.add(resourceUid);
        }

        const accessSet =
          queryMaps[accessString].get(linkedCollectionName) || new Set();
        if (!queryMaps[accessString].has(linkedCollectionName)) {
          queryMaps[accessString].set(linkedCollectionName, accessSet);
        }

        // if the id was set previously, by a lower level link,
        // dont override the lower level
        const map = queryMaps[altAccessString].get(linkedCollectionName);

        if (!map || !map.has(id.toString())) {
          accessSet.add(id);
        }
      };

      // add the ids to the query maps
      _.each(positiveIds, addIdsToQueryMap(true));
      _.each(negativeIds, addIdsToQueryMap(false));
      queryRestrictionSet = true;
    }

    if (!queryRestrictionSet) {
      plugin.error(
        `${errorMessageHeader}, unable to set query restriction ` +
          `to satisfy permissions relating to collection ${collectionName}`
      );
    }
  }

  const resultingQuery = createHierarchicalQuery(
    plugin,
    queryMaps,
    queriedCollection
  ) as Hash<{}>;

  return resultingQuery;
}
