"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const collection_1 = require("../core/collection");
const type_1 = require("../core/type");
function validateUidCollection(validator, path, collection) {
    const unknownTypeErrMsg = 'Unknown Collection for uid "of".';
    if (collection instanceof collection_1.default) {
        if (!tyr_1.default.byId[collection.id]) {
            throw validator.err(path, unknownTypeErrMsg);
        }
    }
    else if (typeof collection === 'string') {
        collection = tyr_1.default.byName[collection];
        if (!collection) {
            throw validator.err(path, unknownTypeErrMsg);
        }
    }
    else {
        throw validator.err(path, unknownTypeErrMsg);
    }
}
const UidType = new type_1.default({
    name: 'uid',
    compile(compiler, field) {
        const of = field.of;
        if (!of) {
            return;
        }
        if (Array.isArray(of)) {
            _.each(of, function (v /*,k*/) {
                validateUidCollection(compiler, field.path, v);
            });
        }
        else {
            validateUidCollection(compiler, field.path, of);
        }
    }
});
collection_1.default.prototype.isUid = function (uid) {
    return uid && uid.substring(0, 3) === this.id;
};
/** @isomorphic */
tyr_1.default.parseUid = function (uid) {
    const colId = uid.substring(0, 3);
    const col = tyr_1.default.byId[colId];
    if (!col) {
        throw new Error('No collection found for id "' + colId + '"');
    }
    const strId = uid.substring(3);
    const idType = col.fields[col.def.primaryKey.field].type;
    return {
        collection: col,
        id: idType.fromString ? idType.fromString(strId) : strId
    };
};
/** @isomorphic */
tyr_1.default.byUid = function (uid, opts) {
    const p = tyr_1.default.parseUid(uid);
    return p.collection.byId(p.id, opts);
};
tyr_1.default.byUids = async function (uids, opts) {
    const byColId = {};
    for (const uid of uids) {
        const { collection, id } = tyr_1.default.parseUid(uid), colId = collection.id;
        const colUids = byColId[colId];
        if (!colUids) {
            byColId[colId] = [id];
        }
        else {
            colUids.push(id);
        }
    }
    const docsByUid = {};
    await Promise.all(_.map(byColId, async (ids, colId) => {
        const docs = await tyr_1.default.byId[colId].byIds(ids, opts);
        for (const doc of docs) {
            docsByUid[doc.$uid] = doc;
        }
    }));
    return uids.map(uid => docsByUid[uid]);
};
exports.default = UidType;
//# sourceMappingURL=uid.js.map