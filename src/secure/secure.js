
import Tyr from '../tyr';

import Component  from '../core/component';
import Collection from '../core/collection';
import query      from '../core/query';

const Secure = {


};

Tyr.mixin(Secure, Component);

Tyr.Secure = Secure;

Collection.prototype.secureQuery = function(query) {
  const secure = Tyr.secure;

  query = query || {};

  if (secure) {
    query = query.merge(query, secure.query(this));
  }

  return query;
};

export default Secure;
