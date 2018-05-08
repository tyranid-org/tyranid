import * as _ from 'lodash';
import { match, MatchResult, MatchResultType } from 'mongo-explain-match';
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { Hash, Permission, PermissionExplaination } from '../interfaces';
import { query } from '../query/query';

import {
  AccessExplainationResult,
  explain,
  Explaination,
  formatExplainations
} from '../query/explain';

import { createResource } from '../graph/createResource';
import { createSubject } from '../graph/createSubject';
import { findLinkInCollection } from '../graph/findLinkInCollection';
import { getGraclClasses } from '../graph/getGraclClasses';
import { getObjectHierarchy } from '../graph/getObjectHierarchy';
import { validateAsResource } from '../graph/validateAsResource';

import { formatPermissionType } from '../permission/formatPermissionType';
import { getPermissionParents } from '../permission/getPermissionParents';
import { isCrudPermission } from '../permission/isCrudPermission';
import { parsePermissionString } from '../permission/parsePermissionString';
import { validatePermissionExists } from '../permission/validatePermissionExists';

import { extractIdAndModel, validate } from '../tyranid/extractIdAndModel';

/**
 * The main model for storing individual permission edges
 */
export const PermissionsBaseCollection = new Tyr.Collection({
  id: '_gp',
  name: 'graclPermission',
  dbName: 'graclPermissions',
  fields: {
    _id: { is: 'mongoid' },
    subjectId: { is: 'uid', required: true },
    resourceId: { is: 'uid', required: true },
    subjectType: { is: 'string', required: true },
    resourceType: { is: 'string', required: true },
    access: {
      is: 'object',
      required: true,
      keys: { is: 'string' },
      of: { is: 'boolean' }
    }
  }
});

async function resolveSubjectAndResourceDocuments(
  resourceData: Tyr.Document | string,
  subjectData: Tyr.Document | string
) {
  const resourceDocument =
    typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

  if (!resourceDocument) {
    throw new Error(
      `No resourceDocument resolvable given: ${JSON.stringify(resourceData)}`
    );
  }

  const subjectDocument =
    typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

  if (!subjectDocument) {
    throw new Error(
      `No subjectDocument resolvable given: ${JSON.stringify(subjectData)}`
    );
  }

  return {
    resourceDocument,
    subjectDocument
  };
}

/**
  Collection to contain all permissions used by gracl
 */
export class PermissionsModel extends PermissionsBaseCollection {
  // error-checked method for retrieving the plugin instance attached to tyranid
  public static getGraclPlugin(): GraclPlugin {
    const plugin = Tyr.secure as GraclPlugin | undefined;
    if (!plugin) {
      return GraclPlugin.prototype.error(
        `No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`
      );
    }
    return plugin;
  }

  /**
   * For a given resource document, find all permission edges
   * that have it as the resource. Optionally return only direct (non inherited)
   * permission objects
   */
  public static async getPermissionsOfTypeForResource(
    resourceDocument: Tyr.Document,
    permissionType?: string,
    direct?: boolean
  ) {
    const plugin = PermissionsModel.getGraclPlugin();
    const resource = createResource(plugin, resourceDocument);

    const query = {
      resourceId: direct
        ? resourceDocument.$uid
        : {
            $in: await resource.getHierarchyIds()
          },
      ...(permissionType
        ? {
            [`access.${permissionType}`]: {
              $exists: true
            }
          }
        : {})
    };

    return PermissionsModel.findAll({ query });
  }

  /**
   * For a given subject document, find all permission edges
   * that have it as the subject. Optionally return only direct (non inherited)
   * permission objects
   */
  public static async getPermissionsOfTypeForSubject(
    subjectDocument: Tyr.Document,
    permissionType?: string,
    direct?: boolean
  ) {
    const plugin = PermissionsModel.getGraclPlugin();
    const subject = createSubject(plugin, subjectDocument);

    const query = {
      subjectId: direct
        ? subjectDocument.$uid
        : {
            $in: await subject.getHierarchyIds()
          },
      ...(permissionType
        ? {
            [`access.${permissionType}`]: {
              $exists: true
            }
          }
        : {})
    };

    return PermissionsModel.findAll({ query });
  }

  /**
   * check if a subject document has positive access
   * to a given resource document for a particular permission
   *
   * uses the methods within the separate `gracl` library's Resource class
   * (see: https://github.com/CrossLead/gracl/blob/master/lib/classes/Resource.ts)
   * and Subject class (https://github.com/CrossLead/gracl/blob/master/lib/classes/Subject.ts)
   */
  public static isAllowed(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string
  ): Promise<boolean> {
    return this.determineAccess(resourceData, permissionType, subjectData).then(
      result => result[permissionType]
    );
  }

  /**
   * Determine access to multiple permissions simultaneously
   */
  public static async determineAccess(
    resourceData: Tyr.Document | string,
    permissionsToCheck: string | string[],
    subjectData: Tyr.Document | string
  ): Promise<Hash<boolean>> {
    const plugin = PermissionsModel.getGraclPlugin();

    if (typeof subjectData === 'string') {
      validate(plugin, subjectData);
      subjectData = (await Tyr.byUid(subjectData)) as Tyr.Document;
    }

    if (!Array.isArray(permissionsToCheck)) {
      permissionsToCheck = [permissionsToCheck];
    }

    const resourceUid: string =
      typeof resourceData === 'string' ? resourceData : resourceData.$uid;

    const result = await PermissionsModel.determineAccesstoAllPermissions(
      subjectData,
      permissionsToCheck,
      [resourceUid]
    );

    return result[resourceUid];
  }

  /**
   * Explain why a subject has or does not have access to a resource
   * for a given permission
   *
   * uses the methods within the separate `gracl` library's Resource class
   * (see: https://github.com/CrossLead/gracl/blob/master/lib/classes/Resource.ts)
   * and Subject class (https://github.com/CrossLead/gracl/blob/master/lib/classes/Subject.ts)
   */
  public static async explainPermission(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string
  ): Promise<PermissionExplaination> {
    const plugin = PermissionsModel.getGraclPlugin();

    plugin.log(
      `Warning: results of $explainPermission may be different than $determineAccess / $isAllowed.` +
        ` $determineAccess should be seen as the main source of truth.`
    );
    validatePermissionExists(plugin, permissionType);

    extractIdAndModel(plugin, resourceData);
    extractIdAndModel(plugin, subjectData);

    const {
      resourceDocument,
      subjectDocument
    } = await resolveSubjectAndResourceDocuments(resourceData, subjectData);

    const { subject, resource } = getGraclClasses(
      plugin,
      resourceDocument,
      subjectDocument
    );

    const permObj = await resource.determineAccess(subject, permissionType);
    return permObj[permissionType];
  }

  public static async explainAccess(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string
  ): Promise<AccessExplainationResult>;
  public static async explainAccess(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string,
    format: true
  ): Promise<string>;
  public static async explainAccess(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string,
    format?: boolean
  ): Promise<AccessExplainationResult | string> {
    const plugin = PermissionsModel.getGraclPlugin();
    const {
      resourceDocument,
      subjectDocument
    } = await resolveSubjectAndResourceDocuments(resourceData, subjectData);

    const { query: queryResult, debug } = await query(
      plugin,
      resourceDocument.$model,
      permissionType,
      subjectDocument,
      true
    );

    const subjectId = subjectDocument.$uid;
    const resourceId = resourceDocument.$uid;
    const result = match(queryResult, resourceDocument.$toPlain());
    const explainations = explain(
      subjectId,
      resourceId,
      debug,
      result,
      queryResult
    );

    const accessResult: AccessExplainationResult = {
      hasAccess: result.match,
      explainations,
      resourceId,
      subjectId
    };

    if (format) {
      return formatExplainations(accessResult);
    }

    return accessResult;
  }

  /**
   * Create/update a permission edge document to
   * set a permission between a given resource and subject
   */
  public static async updatePermissions(
    resourceDocument: Tyr.Document | string,
    permissionChanges: { [key: string]: boolean },
    subjectDocument: Tyr.Document | string,
    attempt = 0
  ) {
    const plugin = PermissionsModel.getGraclPlugin();

    const $set: { [key: string]: boolean } = {};

    _.each(permissionChanges, (access, permissionType) => {
      if (permissionType) {
        validatePermissionExists(plugin, permissionType);
        $set[`access.${permissionType}`] = access;
      }
    });

    if (!resourceDocument) {
      throw new TypeError(`no resource given to updatePermissions`);
    }
    if (!subjectDocument) {
      throw new TypeError(`no subject given to updatePermissions`);
    }

    const resourceComponents = extractIdAndModel(plugin, resourceDocument);
    const subjectComponents = extractIdAndModel(plugin, subjectDocument);

    validateAsResource(plugin, resourceComponents.$model);

    // set the permission
    try {
      await PermissionsModel.db.findOneAndUpdate(
        {
          subjectId: subjectComponents.$uid,
          resourceId: resourceComponents.$uid
        },
        {
          $setOnInsert: {
            subjectId: subjectComponents.$uid,
            resourceId: resourceComponents.$uid,
            subjectType: subjectComponents.$model.def.name,
            resourceType: resourceComponents.$model.def.name
          },
          $set
        },
        { upsert: true }
      );
    } catch (error) {
      // hack for https://jira.mongodb.org/browse/SERVER-14322
      if (attempt < 10 && /E11000 duplicate key error/.test(error.message)) {
        return (await new Promise<Tyr.Document | null>((resolve, reject) => {
          setTimeout(() => {
            PermissionsModel.updatePermissions(
              resourceDocument,
              permissionChanges,
              subjectDocument,
              attempt++
            )
              .then(resolve)
              .catch(reject);
          }, 100);
        })) as Tyr.Document;
      } else if (/E11000 duplicate key error/.test(error.message)) {
        plugin.error(
          `Attempted to update permission 10 times, but recieved "E11000 duplicate key error" on each attempt`
        );
      }
      throw new Error(error);
    }

    if (typeof resourceDocument === 'string') {
      return Tyr.byUid(resourceDocument);
    } else {
      return resourceDocument;
    }
  }

  /**
   *  Given a uid, remove all permissions relating to that entity in the system
   */
  public static async deletePermissions(
    doc: Tyr.Document
  ): Promise<Tyr.Document> {
    const uid = doc.$uid;
    const plugin = PermissionsModel.getGraclPlugin();

    if (!uid) {
      plugin.error('No $uid property on document!');
    }

    await PermissionsModel.remove({
      query: {
        $or: [{ subjectId: uid }, { resourceId: uid }]
      }
    });

    return doc;
  }

  public static async determineAccesstoAllPermissions(
    subject: Tyr.Document,
    permissionsToCheck: string[],
    resourceUidList: string[] | Tyr.Document[]
  ) {
    const plugin = PermissionsModel.getGraclPlugin();
    const accessMap = {} as { [k: string]: { [k: string]: boolean } };

    const uidsToCheck: string[] =
      typeof resourceUidList[0] === 'string'
        ? (resourceUidList as string[])
        : (_.map(resourceUidList as Tyr.Document[], '$uid') as string[]);

    if (!plugin.graclHierarchy.subjects.has(subject.$model.def.name)) {
      plugin.error(
        `can only call $determineAccessToAllPermissions on a valid subject, ` +
          `${subject.$model.def.name} is not a subject.`
      );
    }

    const retrievedDocumentsPromise = Promise.all(
      _.map(permissionsToCheck, perm => {
        const tyranidOpts = {
          auth: subject,
          perm,
          fields: { _id: 1 }
        };

        return Tyr.byUids(uidsToCheck, tyranidOpts);
      })
    );

    // Hacky double cast for promise.all weirdness
    const retrievedDocumentMatrix = (await retrievedDocumentsPromise) as Tyr.Document[][];

    const permissionSetHash = _.reduce(
      retrievedDocumentMatrix,
      (out, documentList, index) => {
        const permission = permissionsToCheck[index];
        out[permission] = new Set(_.chain(documentList)
          .map('$uid')
          .compact()
          .value() as string[]);
        return out;
      },
      {} as Hash<Set<string>>
    );

    _.each(uidsToCheck, uid => {
      accessMap[uid] = {};
      _.each(permissionsToCheck, perm => {
        accessMap[uid][perm] = permissionSetHash[perm].has(uid);
      });
    });

    return accessMap;
  }

  // create mongodb indexes for the permission edges
  public static async createIndexes() {
    const plugin = PermissionsModel.getGraclPlugin();

    plugin.log(`Creating indexes...`);

    await PermissionsModel.db.createIndex(
      {
        subjectId: 1,
        resourceId: 1
      },
      { unique: true }
    );

    await PermissionsModel.db.createIndex(
      {
        resourceType: 1,
        subjectType: 1
      },
      { unique: false }
    );
  }

  public static async findEntitiesWithPermissionAccessToResource(
    accessType: 'allow' | 'deny',
    permissions: string[],
    doc: Tyr.Document
  ) {
    const plugin = PermissionsModel.getGraclPlugin();
    validateAsResource(plugin, doc.$model);

    if (!permissions.length) {
      plugin.error(
        `No permissions provided to findEntitiesWithPermissionAccessToResource()!`
      );
    }

    /**
     * Get hierarchy of permissions stemming from provided list
     */
    const permHierarchy = permissions.map(p => {
      const components = parsePermissionString(plugin, p);

      const formatted = formatPermissionType(plugin, {
        action: components.action,
        collection:
          components.collection ||
          (isCrudPermission(plugin, p) && doc.$model.def.name) ||
          undefined
      });

      validatePermissionExists(plugin, formatted);

      return [formatted, ...getPermissionParents(plugin, formatted)];
    });

    const permissionsAsResource = (await plugin.permissionsModel.findAll({
      query: {
        $and: [
          // for the given resource...
          { resourceId: doc.$uid },
          // get any permission docs with any of the possible permTypes
          {
            $or: permHierarchy.map(list => ({
              $or: list.map(permission => ({
                [`access.${permission}`]: { $exists: true }
              }))
            }))
          }
        ]
      }
    })) as Permission[];

    // get all subjects with direct permissions set for this resource,
    // does not yet include _all_ subjects down the heirarchy
    const subjectDocuments = await Tyr.byUids(permissionsAsResource.map(
      p => p.subjectId
    ) as string[]);

    const subjectsByCollection: Hash<Tyr.Document[]> = {};
    _.each(subjectDocuments, subject => {
      const colName = subject.$model.def.name;
      if (!subjectsByCollection[colName]) {
        subjectsByCollection[colName] = [];
      }
      subjectsByCollection[colName].push(subject);
    });

    const permsBySubjectId: Hash<Permission> = {};
    _.each(permissionsAsResource, perm => {
      permsBySubjectId[perm.subjectId] = perm;
    });

    // test if a given subject satisfies all required permissions
    const accessCache: Hash<boolean> = {};
    function filterAccess(subject: Tyr.Document, explicit = false) {
      const uid = subject.$uid;
      const hashKey = `${uid}-${explicit}`;

      if (hashKey in accessCache) {
        return accessCache[hashKey];
      }

      const perm = permsBySubjectId[uid] || { access: {} };

      return (accessCache[hashKey] = _.every(permHierarchy, list => {
        // check for explicit denies
        if (explicit) {
          const access = accessType === 'allow' ? false : true;
          return _.every(list, p => _.get(perm, `access.${p}`) !== access);
        } else {
          const access = accessType === 'allow' ? true : false;
          return _.some(list, p => _.get(perm, `access.${p}`) === access);
        }
      }));
    }

    interface Hierarchy {
      [key: string]: Hierarchy;
    }

    async function traverse(
      hierarchy: Hierarchy,
      parentCollectionNames: string[] = []
    ) {
      const collections = Object.keys(hierarchy);

      await Promise.all(
        _.map(collections, async collectionName => {
          const subjects = (subjectsByCollection[collectionName] = _.filter(
            subjectsByCollection[collectionName],
            s => filterAccess(s)
          ));

          const query: Tyr.MongoQuery = {
            $and: [{ _id: { $nin: _.map(subjects, '$id') } }]
          };

          // get link from child collection to parent collection
          if (parentCollectionNames.length) {
            const $or: Tyr.MongoQuery[] = [];

            for (const parentCollectionName of _.compact(
              parentCollectionNames
            )) {
              const parentSubjects = subjectsByCollection[parentCollectionName];
              const parentSubjectIds = _.map(parentSubjects, '$id');

              const link = findLinkInCollection(
                plugin,
                Tyr.byName[collectionName],
                Tyr.byName[parentCollectionName]
              );

              if (link) {
                $or.push({
                  [link.spath]: {
                    $in: parentSubjectIds
                  }
                });
              }
            }

            query.$and.push({ $or });

            // get all matching docs to query
            const inheritedSubjects = await Tyr.byName[collectionName].findAll({
              query
            });

            // filter out subjects which have an explicit deny/allow on any
            // of the required permissions
            const filteredDeniedSubjects = _.filter(
              inheritedSubjects,
              subject => filterAccess(subject, true)
            );

            subjectsByCollection[collectionName].push(
              ...filteredDeniedSubjects
            );
          }

          await traverse(hierarchy[collectionName], [
            collectionName,
            ...parentCollectionNames
          ]);
        })
      );
    }

    await traverse(getObjectHierarchy(plugin).subjects);

    return _(subjectsByCollection)
      .values()
      .flatten()
      .uniqBy('$uid')
      .compact()
      .value() as Tyr.Document[];
  }
}
