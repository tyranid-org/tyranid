import { Tyr } from 'tyranid';
import { documentMethods as dm } from './tyranid/documentMethods';

declare module 'tyranid' {
  namespace Tyr {
    /**
     * Add additional methods to Document interface
     */
    interface Document {
      $allow: typeof dm.$allow;
      $deny: typeof dm.$deny;
      $allowForThis: typeof dm.$allowForThis;
      $denyForThis: typeof dm.$denyForThis;
      $deniedAccessToThis: typeof dm.$deniedAccessToThis;
      $determineAccess: typeof dm.$determineAccess;
      $determineAccessToAllPermissionsForResources: typeof dm.$determineAccessToAllPermissionsForResources;
      $entitiesWithPermission: typeof dm.$entitiesWithPermission;
      $explainPermission: typeof dm.$explainPermission;
      $explainAccess: typeof dm.$explainAccess;
      $isAllowed: typeof dm.$isAllowed;
      $isAllowedForThis: typeof dm.$isAllowedForThis;
      $updatePermissions: typeof dm.$updatePermissions;
      $canAccessThis: typeof dm.$canAccessThis;
      $permissions: typeof dm.$permissions;
      $removePermissionAsResource: typeof dm.$removePermissionAsResource;
      $removePermissionAsSubject: typeof dm.$removePermissionAsSubject;
      $removeEntityPermission: typeof dm.$removeEntityPermission;
    }
  }
}
