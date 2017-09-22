
import Tyr from '../tyr';

async function syncIndexes(col) {
  const indexes = col.def.indexes;
  if (indexes && col.db) {
    let existingIndexes;

    try {
      existingIndexes = await col.db.indexes();
    } catch (err) {
      if (/no (collection|database)/.test(err.message)) {
        return;
      } else {
        throw err;
      }
    }

    const alwaysInclude = new Set(['_id_']);

    const existingIndexesByName = _.indexBy(existingIndexes, i => toName(i));
    const existingIndexesByKey = _.indexBy(existingIndexes, i => stableStringify(i.key));

    const create = [];
    const keep = [];

    // loop through indexes that we want to create
    for (const index of indexes) {
      const keyHash = stableStringify(index.key);
      const nameHash = toName(index);
      // there is a match for the key and the name (might not be the same matching index!)
      if (keyHash in existingIndexesByKey && nameHash in existingIndexesByName) {
        // the index in the tyranid array has an identical existing index,
        if (existingIndexesByKey[keyHash] === existingIndexesByName[nameHash]) {
          // we want to keep this one
          keep.push(existingIndexesByName[nameHash]);
          continue;
        } else {
          // here, an index in the tyranid array has two different matching
          // existing indexes. One matches by name and a different one matches by key
          indexCreationConflict(
            index,
            existingIndexesByKey[keyHash],
            existingIndexesByName[nameHash]
          );
        }
      } else {
        // there is no matching index (key or name)
        // OR
        // the index matches by key, but not by name,
        // OR
        // the index matches by name, but not key
        //
        // so we create the new one (and implicity drop any existing...)
        create.push(index);
      }
    }

    /**
     * make sure we don't try to create two indexes with the same name
     */
    const createIndexesByName = _.indexBy(create, i => toName(i));
    for (const index of create) {
      const name = toName(index);
      if (createIndexesByName[name] !== index) {
        throw new Error(`Tried to create two indexes named ${name} for collection ${col.def.name}`);
      }
    }

    /**
     * make sure we don't create two indexes with the same key
     */
    const createIndexesByKey = _.indexBy(create, i => stableStringify(i.key));
    for (const index of create) {
      const key = stableStringify(index.key);
      if (createIndexesByKey[key] !== index) {
        throw new Error(
          `Tried to create two indexes with key = ${
            JSON.stringify(index.key, null, 2)
          } for collection ${col.def.name}`
        );
      }
    }

    const remove = existingIndexes.filter(i =>
      !alwaysInclude.has(toName(i)) &&
      !keep.some(k => k === i)
    );

    await Promise.all(remove.map(i => col.db.dropIndex(i.key)));

    if (create.length) {
      try {
        await col.db.createIndexes(create);
      } catch (err) {
        console.error(`Problem when creating indexes on collection "${col.def.name}":\n\n`, create, '\n');
        throw err;
      }
    }
  }
}

function toName(index) {
  if ( index.name ) {
    return index.name;
  }
  let ret = "";
  const key = index.key;
  // TODO: this is potentially a bug,
  // as `for in` is based on property creation order
  for (const k in key) {
    if (ret.length) {
      ret += '_';
    }
    ret += k + '_' + key[k];
  }
  return ret;
}

function indexCreationConflict(want, have1, have2) {
  throw new Error(`
  Tyranid wants to create a new index:

  ${JSON.stringify(index, null, 2)}

  but two different indexes share its name and key respectively:

  - ${JSON.stringify(have1, null, 2)}

  - ${JSON.stringify(have2, null, 2)}
  `);
}

Tyr.createIndexes = async function() {
  for (const col of Tyr.collections) {
    await syncIndexes(col);
  }
};
