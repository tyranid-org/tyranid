
import Tyr from '../tyr';

import Component  from '../core/component';
import Collection from '../core/collection';
import Query      from '../core/query';


const Secure = {


};

Tyr.mixin(Secure, Component);

Tyr.Secure = Secure;

Collection.prototype.secureQuery = async function(query, permissionType, user) {
  const secure = Tyr.secure;

  query = query || {};

  if (secure) {
    query = Query.merge(query, await secure.query(this, permissionType, user));
  }

  return query;
};

export default Secure;
