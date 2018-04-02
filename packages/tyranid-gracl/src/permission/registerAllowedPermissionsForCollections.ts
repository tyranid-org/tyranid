import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { SchemaGraclConfigObject } from '../interfaces';
import { formatPermissionType } from './formatPermissionType';

/**
 * Examine the schema definitions of all tyranid collections and look for
 * configuration around what permissions should be used with the collection
 *
 * See: getAllowedPermissionsForCollection.ts
 */
export function registerAllowedPermissionsForCollections(plugin: GraclPlugin) {
  if (!plugin.permissionHierarchy) {
    plugin.error(
      `Must create permissions hierarchy before registering allowed permissions`
    );
  }

  const crudPermissions = [...plugin.crudPermissionSet];

  Tyr.collections.forEach(col => {
    const config = _.get(col, 'def.graclConfig', {}) as SchemaGraclConfigObject;

    if (config.permissions) {
      const hasExcludeConfig = !!(
        config.permissions.exclude || config.permissions.excludeCollections
      );

      const hasIncludeConfig = !!(
        config.permissions.include || config.permissions.includeCollections
      );

      let allowedSet: Set<string> | undefined;

      if (hasExcludeConfig && !hasIncludeConfig) {
        let excludeSet = new Set();

        if (config.permissions.exclude) {
          excludeSet = new Set(config.permissions.exclude);
        }

        if (config.permissions.excludeCollections) {
          _.chain(config.permissions.excludeCollections)
            .map(collection =>
              _.map(
                crudPermissions,
                action =>
                  action &&
                  formatPermissionType(plugin, {
                    action,
                    collection
                  })
              )
            )
            .flatten()
            .compact()
            .each(excludeSet.add.bind(excludeSet))
            .value();
        }

        allowedSet = new Set<string>();
        for (const p of plugin.setOfAllPermissions) {
          if (p && !excludeSet.has(p)) {
            allowedSet.add(p);
          }
        }
      }

      if (hasIncludeConfig) {
        allowedSet = new Set<string>();
        if (config.permissions.include) {
          allowedSet = new Set(config.permissions.include);
        }

        if (config.permissions.includeCollections) {
          _.chain(config.permissions.includeCollections)
            .map(collection =>
              _.map(
                crudPermissions,
                action =>
                  action &&
                  formatPermissionType(plugin, {
                    action,
                    collection
                  })
              )
            )
            .flatten()
            .compact()
            .each(allowedSet.add.bind(allowedSet))
            .value();
        }
      }

      // if flagged as this collection only,
      // add all crud permissions with this collection to allowed mapping
      if (config.permissions.thisCollectionOnly) {
        allowedSet = new Set(
          _.chain(crudPermissions)
            .map(action => {
              if (!action) {
                return ''; // TODO: strictNullCheck hack
              } else {
                return formatPermissionType(plugin, {
                  action,
                  collection: col.def.name
                });
              }
            })
            .compact()
            .value()
        );
      }

      if (allowedSet) {
        plugin.permissionRestrictions.set(col.def.name, allowedSet);
      }
    }
  });
}
