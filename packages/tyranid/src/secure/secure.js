import Tyr from '../tyr';

import Component from '../core/component';
import Collection from '../core/collection';
import Document from '../core/document';
import Query from '../core/query';
import SecureError from './secureError';
import { extractAuthorization } from '../common';

const Secure = {};

Tyr.mixin(Secure, Component);

Tyr.Secure = Secure;

/*

  TODO:  technically this method is redundant:

  (a) one way would be to run secureQuery() to get the query back,
      and then manually evaluate that code and make sure it matches the contents of the insert …
      but that is a bit of work (need to basically write a parser to parse the mongodb query API) (edited)

  (b) also, a huge hack / terrible way would be to insert the record, get the _id,
      then try to query for that _id using the user’s secureQuery() api and see if you can find

 */
Collection.prototype.canInsert = function(document, permissionType, authObj) {
  const secure = Tyr.secure;

  return secure
    ? secure.canInsert(this, document, permissionType, authObj)
    : true;
};

Collection.prototype.secureQuery = function(query, permissionType, authObj) {
  const secure = Tyr.secure;

  query = query || {};

  if (secure) {
    return Tyr.mapAwait(
      secure.query(this, permissionType, authObj),
      q => (q ? Query.merge(query, q) : false)
    );
  }

  return query;
};

Collection.prototype.secureFindQuery = function(
  query,
  permissionType,
  authObj
) {
  return Tyr.mapAwait(
    this.secureQuery(query, permissionType, authObj),
    // TODO: compare how fast this is compared to { _id: { $exists: false } }
    q => (q ? q : { _id: null })
  );
};

export default Secure;
