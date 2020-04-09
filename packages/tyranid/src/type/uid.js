import * as _ from 'lodash';
import Tyr from '../tyr';
import Collection from '../core/collection';
import Type from '../core/type';

function validateUidCollection(validator, path, collection) {
  function fail() {
    throw validator.err(
      path,
      `Unknown collection referenced in a uid "of" -- ${JSON.stringify(
        collection,
        null,
        2
      )}`
    );
  }

  if (collection instanceof Collection) {
    if (!Tyr.byId[collection.id]) {
      fail();
    }
  } else if (typeof collection === 'string') {
    if (!Tyr.byId[collection] && !Tyr.byName[collection]) {
      fail();
    }
  } else {
    fail();
  }
}

const UidType = new Type({
  name: 'uid',
  typescript: 'string',
  compile(compiler, field) {
    if (compiler.stage !== 'link') return;
    let of = field.def.of;

    if (!of) {
      return;
    }

    if (!Array.isArray(of)) {
      of = [of];
    }

    field.of = of.map(cid => {
      validateUidCollection(compiler, field.pathName, cid);
      return cid instanceof Tyr.Collection
        ? cid
        : Tyr.byId[cid] || Tyr.byName[cid];
    });
  },
});

Collection.prototype.isUid = function(uid) {
  return uid && uid.substring(0, 3) === this.id;
};

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
    id: idType.fromString ? idType.fromString(strId) : strId,
  };
};

/** @isomorphic */
Tyr.byUid = function(uid, opts) {
  const p = Tyr.parseUid(uid);
  return p.collection.byId(p.id, opts);
};

Tyr.byUids = async function(uids, opts) {
  const byColId = {};

  for (const uid of uids) {
    const { collection, id } = Tyr.parseUid(uid),
      colId = collection.id;

    const colUids = byColId[colId];
    if (!colUids) {
      byColId[colId] = [id];
    } else {
      colUids.push(id);
    }
  }

  const docsByUid = {};

  await Promise.all(
    _.map(byColId, async (ids, colId) => {
      const docs = await Tyr.byId[colId].byIds(ids, opts);

      for (const doc of docs) {
        docsByUid[doc.$uid] = doc;
      }
    })
  );

  return uids.map(uid => docsByUid[uid]);
};

export default UidType;
