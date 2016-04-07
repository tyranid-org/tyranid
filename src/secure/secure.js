
import Tyr from '../tyr';

import Component  from '../core/component';
import Collection from '../core/collection';
import Query      from '../core/query';


const Secure = {


};

Tyr.mixin(Secure, Component);

Tyr.Secure = Secure;

Collection.prototype.secureQuery = function(query, permissionType, user) {
  const secure = Tyr.secure;

  query = query || {};

  if (secure) {
    return Tyr.mapAwait(secure.query(this, permissionType, user), q => Query.merge(query, q));
  }

  return query;
};

Collection.prototype.secureFindQuery = async function(query, permissionType, user) {
  return Tyr.mapAwait(
    this.secureQuery(query, permissionType, user),
    // TODO: compare how fast this is compared to { _id: { $exists: false } }
    q => q ? q : { _id: null }
  );
};

export default Secure;
