
import * as _    from 'lodash';

import diff from '../diff/diff';

import Tyr from '../tyr';


function link(collection) {
  const _historicalFields = {};

  _.each(collection.fields, field => {
    if (field.def.historical) {
      _historicalFields[field.name] = field;
    }
  });

  collection._historicalFields = _historicalFields;
}

function preserveInitialValues(collection, doc, props) {
  let orig = doc.$orig;

  if (!orig) {
    doc.$orig = orig = {};

    Object.defineProperty(doc, '$orig', {
      enumerable:   false,
      configurable: false
    });
  }

  _.each(props || collection._historicalFields, field => {
    const n = field.name,
          v = doc[n];

    if (v !== undefined) {
      orig[n] = Tyr.cloneDeep(v);
    }
  });
}

function snapshot(collection, doc, patchProps, diffProps, historyPresent) {
  const $orig = doc.$orig;

  if (!$orig) {
    return;
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

  const p = diff.diffObj(doc, doc.$orig, _diffProps);
  if (_.isEmpty(p) && _.isEmpty(patchProps)) {
    // TODO:  do we need some way of looking at the patch props and seeing it contains something that is useful in its own right to store?
    //        (for example, like a user comment?)
    return;// undefined; ... undefined means there was no snapshot needed
  }

  const so = {
    o: new Date().getTime(),
    p
  };

  if (patchProps) {
    _.assign(so, patchProps);
  }

  if (historyPresent !== false) {
    let arr = doc._history;
    if (!arr) {
      doc._history = arr = [];
    }

    arr.push(so);
  }

  preserveInitialValues(collection, doc, _diffProps);
  return so;
}

function snapshotPush(path, patchProps) {

  const snapshot = {
    o: new Date().getTime(),
    p: { [Tyr.NamePath.encode(path)]: 1 }
  };

  if (patchProps) {
    _.assign(snapshot, patchProps);
  }

  return snapshot;
}

function asOf(collection, doc, date, props) {

  if (!collection.def.historical) {
    throw new Error(`Collection "${collection.def.name}" is not historical, cannot $asOf()`);
  }

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
      enumerable:   false,
      configurable: false,
      value:        true
    });
  }
}

function patchPropsFromOpts(opts) {
  let patchProps;// = undefined;

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


export default {
  asOf,
  link,
  preserveInitialValues,
  snapshot,
  snapshotPush,
  patchPropsFromOpts
};
