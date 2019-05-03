import * as _ from 'lodash';

import diff from '../diff/diff';

import Tyr from '../tyr';
import { OperationCanceledException } from '../../../../node_modules/typescript';

export function link(collection) {
  const _historicalFields = {};

  switch (collection.def.historical) {
    case 'patch':
    case 'document':
      break;
    default:
      throw new Error(
        `Collection ${collection.def.name} has invalid historical value: "${
          collection.def.historical
        }" must be either 'document' or 'patch'.`
      );
  }

  _.each(collection.fields, field => {
    if (field.def.historical) {
      _historicalFields[field.name] = field;
    }
  });

  collection._historicalFields = _historicalFields;
  collection._historicalFieldsLen = _.keys(_historicalFields).length;
}

export function preserveInitialValues(collection, doc, props) {
  let orig = doc.$orig;

  if (!orig) {
    doc.$orig = orig = {};

    Object.defineProperty(doc, '$orig', {
      enumerable: false,
      configurable: false
    });
  }

  if (props === true) {
    for (const n in doc.$model.fields) {
      const v = doc[n];

      if (v !== undefined) {
        orig[n] = Tyr.cloneDeep(v);
      }
    }
  } else {
    _.each(props || collection._historicalFields, field => {
      const n = field.name,
        v = doc[n];

      if (v !== undefined) {
        orig[n] = Tyr.cloneDeep(v);
      }
    });
  }
}

function isPartial(collection, fields) {
  // no fields means select all fields, so not partial
  if (!fields) {
    return false;
  }

  for (const fieldName in collection._historicalFields) {
    if (!(fieldName in fields)) {
      return true;
    }
  }

  return false;
}

export function snapshotPartial(
  opts,
  collection,
  doc,
  patchProps,
  diffProps,
  historyPresent
) {
  let $orig = doc.$orig;

  if (!$orig) {
    switch (collection.def.historical) {
      case 'document':
        $orig = {};
        break;
      case 'patch':
        return {}; // snapshot and diffProps are undefined; ... undefined means there was no snapshot needed
    }
  }

  let _diffProps;
  if (diffProps) {
    _diffProps = {};

    _.each(collection._historicalFields, (field, key) => {
      if (diffProps[key]) {
        _diffProps[key] = field;
      }
    });
  } else {
    _diffProps = collection._historicalFields;
  }

  let snapshot;

  switch (collection.def.historical) {
    case 'patch':
      const p = diff.diffObj(doc, doc.$orig, _diffProps);
      if (_.isEmpty(p) && _.isEmpty(patchProps)) {
        // TODO:  do we need some way of looking at the patch props and seeing it contains something that is useful in its own right to store?
        //        (for example, like a user comment?)
        return {}; // snapshot and diffProps are undefined; ... undefined means there was no snapshot needed
      }

      snapshot = {
        o: new Date().getTime(),
        p
      };

      assignPatchProps(collection, snapshot, patchProps);

      if (historyPresent !== false) {
        let arr = doc._history;
        if (!arr) {
          doc._history = arr = [];
        }

        arr.push(snapshot);
      }

      break;
    case 'document':
      snapshot = {
        __id: doc._id,
        _on: (opts && opts.asOf) || new Date()
      };

      assignPatchProps(collection, snapshot, patchProps);

      if (!doc._id) {
        // insert
        for (const key in _diffProps) {
          const v = doc[key];
          if (v !== undefined) {
            snapshot[key] = doc[key];
          }
        }

        snapshot._partial = false;
      } else {
        // update

        // if this is guaranteed to be a partial update anyway then do a differencing of fields
        // to make the update as small as possible since _partial is going to be true regardless.  But if all
        // the fields are there, then write out all the fields, even if they haven't changed, so that
        // we can set _partial to false.  This is a trade-off between size of updates and the # of records
        // $asOf() needs to traverse to reconstruct data.  We might want to re-evaluate this trade-off
        // based on how this performs in practice.  Note that policy also helps address the situation where
        // the document is updated outside of tyranid or using something like findAndModify() -- the changes
        // will get picked up on the next $save(), etc.
        const omitUnchangedValues =
          (opts && opts.historical === 'partial') ||
          isPartial(collection, _diffProps); // true
        let copyProps;

        if (omitUnchangedValues) {
          copyProps = {};

          for (const key in _diffProps) {
            if (!Tyr.isEqualInBson($orig[key], doc[key])) {
              copyProps[key] = 1;
            }
          }
        } else {
          copyProps = _diffProps;
        }

        for (const key in copyProps) {
          snapshot[key] = doc[key];
        }

        snapshot._partial = isPartial(collection, copyProps);
      }

      // here we are assuming if there is no _id, that it is an insert ... is that correct?
      doc.$_snapshot = snapshot;
      break;
  }

  return { snapshot, diffProps: _diffProps };
}

export function historicalDb(collection) {
  return Tyr.db.collection(collection.def.dbName + '_history');
}

export async function saveSnapshots(collection, docs) {
  if (Array.isArray(docs)) {
    const snapshots = docs.filter(doc => doc && doc.$_snapshot).map(doc => {
      const snapshot = doc.$_snapshot;
      delete doc.$_snapshot;
      snapshot.__id = doc._id;
      return snapshot;
    });

    if (snapshots.length) {
      await historicalDb(collection).insertMany(snapshots);
    }
  } else {
    const snapshot = docs.$_snapshot;
    if (snapshot) {
      snapshot.__id = docs._id;
      delete docs.$_snapshot;

      await historicalDb(collection).insertOne(snapshot);
    }
  }
}

export function snapshot(
  opts,
  collection,
  doc,
  patchProps,
  _diffProps,
  historyPresent
) {
  const { snapshot, diffProps } = snapshotPartial(
    opts,
    collection,
    doc,
    patchProps,
    _diffProps,
    historyPresent
  );

  if (diffProps) {
    preserveInitialValues(collection, doc, diffProps);
  }

  return snapshot;
}

export function snapshotPush(path, patchProps) {
  const snapshot = {
    o: new Date().getTime(),
    p: { [Tyr.NamePath.encode(path)]: 1 }
  };

  if (patchProps) {
    _.assign(snapshot, patchProps);
  }

  return snapshot;
}

export async function asOf(collection, doc, date, props) {
  switch (collection.def.historical) {
    case 'document':
      const hDb = historicalDb(collection);
      let earliest = await hDb.findOne(
        {
          __id: doc._id,
          _partial: false,
          _on: { $lte: date }
        },
        {
          sort: { _on: -1 }
        }
      );

      let datePredatesDocument = false;
      if (!earliest) {
        datePredatesDocument = true;
        // the document doesn't yet exist on this date ...

        // two options
        // (1) mark the document as being non-existant and update collection methods to translate non-existant documents
        //     into null
        //doc.$_exists = false;

        // (2) return the earliest version (even though the earliest version is after the specified date)
        earliest = await hDb.findOne(
          {
            __id: doc._id,
            _partial: false
          },
          {
            sort: { _on: 1 }
          }
        );
      }

      if (earliest) {
        let priorSnapshots;

        if (datePredatesDocument) {
          priorSnapshots = [earliest];
        } else {
          priorSnapshots = await (await hDb
            .find({
              __id: doc._id,
              _on: {
                $gte: earliest._on,
                $lte: date
              }
            })
            .sort({ _on: 1 })).toArray();
        }

        for (const snapshot of priorSnapshots) {
          for (const key in snapshot) {
            if (
              snapshot.hasOwnProperty(key) &&
              key !== '__id' &&
              key !== '_on' &&
              key !== '_id'
            ) {
              doc[key] = snapshot[key];
            }
          }
        }
      }

      break;

    case 'patch':
      if (date instanceof Date) {
        date = date.getTime();
      }

      if (doc.$historical) {
        throw new Error('Cannot $asOf() an already-historical document');
      }

      const history = doc._history;
      if (doc._history) {
        for (let hi = history.length - 1; hi >= 0; hi--) {
          const h = history[hi];

          if (h.o < date) {
            break;
          }

          diff.patchObj(doc, h.p, props);
        }

        Object.defineProperty(doc, '$historical', {
          enumerable: false,
          configurable: false,
          value: true
        });
      }

      break;

    default:
      throw new Error(
        `Collection "${collection.def.name}" is not historical, cannot $asOf()`
      );
  }
}

export function patchPropsFromOpts(opts) {
  let patchProps; // = undefined;

  if (opts) {
    const author = opts.author || opts.auth;
    if (author) {
      patchProps = patchProps || {};

      if (_.isString(author)) {
        patchProps.a = author;
      } else if (author.$uid) {
        patchProps.a = author.$uid;
      }
    }

    if (opts.comment) {
      patchProps = patchProps || {};
      patchProps.c = opts.comment;
    }
  }

  return patchProps;
}

function assignPatchProps(collection, snapshot, patchProps) {
  switch (collection.def.historical) {
    case 'document':
      if (patchProps) {
        if (patchProps.a) {
          snapshot._author = patchProps.a;
        }

        if (patchProps.c) {
          snapshot._comment = patchProps.a;
        }
      }
      break;
    case 'patch':
      _.assign(snapshot, patchProps);
      break;
  }
}

export async function syncIndexes(collection) {
  if (collection.def.historical === 'document') {
    await historicalDb(collection).createIndex({
      __id: 1,
      _on: 1
    });
  }
}

export async function migratePatchToDocument(collection, progress) {
  const historyDb = historicalDb(collection);

  const cursor = await collection.db.find();

  let opn = 0,
    opc = 0;

  // note each block count has multiple operations, so this is more like an op count of 512 * ~10
  const blockSize = 512;

  let bulkOp = historyDb.initializeUnorderedBulkOp();

  let doc;
  while ((doc = await cursor.next())) {
    migrateDocumentPatchToDocument(bulkOp, collection, doc);
    opn++;

    if (opn >= blockSize) {
      await bulkOp.execute();
      bulkOp = historyDb.initializeUnorderedBulkOp();
      opc += opn;
      opn = 0;

      progress && progress(opc);
    }
  }

  if (opn) {
    opc += opn;
    await bulkOp.execute();
    progress && progress(opc);
  }

  await collection.db.updateMany({}, { $unset: { _history: 1 } });
}

function migrateDocumentPatchToDocument(bulkOp, collection, doc) {
  const history = doc._history;

  if (history) {
    for (let hi = history.length - 1; hi >= 0; hi--) {
      const h = history[hi];

      diff.patchObj(doc, h.p);

      const snapshot = {
        __id: doc._id,
        _on: new Date(h.o),
        _partial: false
      };

      for (const fieldName in collection._historicalFields) {
        const v = doc[fieldName];

        if (v !== undefined) {
          snapshot[fieldName] = v;
        }
      }

      if (h.a) {
        snapshot._author = h.a;
      }

      if (h.c) {
        snapshot._comment = h.c;
      }

      bulkOp.insert(snapshot);
    }
  }
}
