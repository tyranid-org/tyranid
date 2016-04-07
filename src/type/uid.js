
const _ = require('lodash'); // client-side

import Tyr        from '../tyr';
import Collection from '../core/collection';
import Type       from '../core/type';


function validateUidCollection(validator, path, collection) {
  const unknownTypeErrMsg = 'Unknown Collection for uid "of".';

  if (collection instanceof Collection) {
    if (!Tyr.byId[collection.id]) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else if (typeof collection === 'string') {
    collection = Tyr.byName[collection];
    if (!collection) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else {
    throw validator.err(path, unknownTypeErrMsg);
  }
}

const UidType = new Type({
  name: 'uid',
  compile(compiler, field) {
    const of = field.of;

    if (!of) {
      return;
    }

    if (Array.isArray(of)) {
      _.each(of, function(v /*,k*/ ) {
        validateUidCollection(compiler, field.path, v);
      });
    } else {
      validateUidCollection(compiler, field.path, of);
    }
  }
});


Collection.prototype.isUid = function(uid) {
  return uid && uid.substring(0, 3) === this.id;
}


/** @isomorphic */
Tyr.parseUid = function(uid) {
  const colId = uid.substring(0, 3);

  const col = Tyr.byId[colId];

  if (!col) {
    throw new Error('No collection found for id "' + colId + '"');
  }

  const strId = uid.substring(3);

  const idType = col.fields[col.def.primaryKey.field].type;

  return {
    collection: col,
    id: idType.fromString(strId)
  };
}

/** @isomorphic */
Tyr.byUid = function(uid, opts) {
  const p = Tyr.parseUid(uid);
  return p.collection.byId(p.id, opts);
}

Tyr.byUids = async function(uids, opts) {
  const byColId = {};

  for (const uid of uids) {
    const { collection, id } = Tyr.parseUid(uid),
          colId = collection.id;

    const colUids = byColId[colId];
    if (!colUids) {
      byColId[colId] = [ id ];
    } else {
      colUids.push(id);
    }
  }

  const docsByUid = {};

  await Promise.all(_.map(byColId, async (ids, colId) => {
    const docs = await Tyr.byId[colId].byIds(ids, null, opts);

    for (const doc of docs) {
      docsByUid[doc.$uid] = doc;
    }
  }));

  return uids.map(uid => docsByUid[uid]);
};


export default UidType;
