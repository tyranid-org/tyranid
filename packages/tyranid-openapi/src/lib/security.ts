import { Security } from 'swagger-schema-official';

/**
 * create security configuration given a hash of scopes
 *
 * TODO: should allow for multiple security def types
 *
 * @param host api host url
 * @param scopes hash of scopes
 */
export function createSecurityDefinitions(
  host: string,
  scopes: { [key: string]: string }
) {
  return {
    default: {
      type: 'oauth2',
      authorizationUrl: `${host}/oauth2/authorize`,
      tokenUrl: `${host}/oauth2/token`,
      flow: 'accessCode',
      scopes
    }
  };
}

/**
 * Create oauth2 schemas for a given object type
 *
 * @param name name of api object
 */
export function collectionScopes(route: string, name: string) {
  return {
    [createScope(route, 'read')]: `Read access to ${name} objects`,
    [createScope(route, 'write')]: `Write access to ${name} objects`
  };
}

/**
 * create array of required scopes for request
 *
 * @param name api object name
 * @param scopes list of scopes to require
 */
export function requireScopes(...scopes: string[]) {
  // TODO: fix typings
  /* tslint:disable */
  return {
    security: ([{ default: scopes }] as any) as Security[]
  };
  /* tslint:enable */
}

/**
 * properly format a scope
 *
 * @param collection name of collection
 * @param access name of access type (read/write)
 */
export function createScope(collection: string, access: 'read' | 'write') {
  return `${access}:${collection}`;
}
