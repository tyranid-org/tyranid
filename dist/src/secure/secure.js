"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
const component_1 = require("../core/component");
const collection_1 = require("../core/collection");
const query_1 = require("../core/query");
const Secure = {};
tyr_1.default.mixin(Secure, component_1.default);
tyr_1.default.Secure = Secure;
/*

  TODO:  technically this method is redundant:

  (a) one way would be to run secureQuery() to get the query back,
      and then manually evaluate that code and make sure it matches the contents of the insert …
      but that is a bit of work (need to basically write a parser to parse the mongodb query API) (edited)

  (b) also, a huge hack / terrible way would be to insert the record, get the _id,
      then try to query for that _id using the user’s secureQuery() api and see if you can find

 */
collection_1.default.prototype.canInsert = function (document, permissionType, authObj) {
    const secure = tyr_1.default.secure;
    return secure ? secure.canInsert(this, document, permissionType, authObj) : true;
};
collection_1.default.prototype.secureQuery = function (query, permissionType, authObj) {
    const secure = tyr_1.default.secure;
    query = query || {};
    if (secure) {
        return tyr_1.default.mapAwait(secure.query(this, permissionType, authObj), q => q ? query_1.default.merge(query, q) : false);
    }
    return query;
};
collection_1.default.prototype.secureFindQuery = function (query, permissionType, authObj) {
    return tyr_1.default.mapAwait(this.secureQuery(query, permissionType, authObj), 
    // TODO: compare how fast this is compared to { _id: { $exists: false } }
        q => q ? q : { _id: null });
};
exports.default = Secure;
//# sourceMappingURL=secure.js.map