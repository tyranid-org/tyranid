
import _    from 'lodash';

import diff from '../diff/diff';

import { ObjectId } from 'mongodb';

function link(collection) {
  const _historicalFields = {};

  _.each(collection.fields, field => {
    if (field.def.historical) {
      _historicalFields[field.name] = field;
    }
  });

  collection._historicalFields = _historicalFields;
}

function preserveInitialValues(collection, doc) {
  const orig = {};

  _.each(collection._historicalFields, field => {
    const n = field.name,
          v = doc[n];

    if (n === 'userId') {
      console.log('from db', v);
      console.log('is ObjectId', v instanceof ObjectId);
      console.log('eq', v.equals(ObjectId('55d8152d74c0bf80d3260df6')));
    }

    if (v !== undefined) {
      orig[n] = v;
    }
  });

  doc.$orig = orig;

  Object.defineProperty(doc, '$orig', {
    enumerable:   false,
    configurable: false
  });
}

function snapshot(collection, doc, patchProps) {
  const $orig = doc.$orig;

  if (!$orig) {
    return;
  }

  const p = diff.diffObj(doc, doc.$orig, collection._historicalFields);
  if (doc.userId) {
    console.log('doc u', doc.userId instanceof ObjectId);
    console.log('a1', doc.$orig.userId.constructor.name);
    console.log('a2', doc.$orig.userId.equals(doc.userId));
    console.log('$orig u', doc.$orig.userId instanceof ObjectId);
    console.log('$orig j', JSON.stringify(doc.$orig.userId, null, 2));
    console.log('patch u', p.userId );
  }
  if (_.isEmpty(p) && _.isEmpty(patchProps)) {
    // TODO:  do we need some way of looking at the patch props and seeing it contains something that is useful in its own right to store?
    //        (for example, like a user comment?)
    return;
  }

  let arr = doc._history;
  if (!arr) {
    doc._history = arr = [];
  }

  const so = {
    o: new Date().getTime(),
    p
  };

  if (patchProps) {
    _.assign(so, patchProps);
  }

  arr.push(so);
  preserveInitialValues(collection, doc);
}

function asOf(collection, doc, date) {

  if (date instanceof Date) {
    date = date.getTime();
  }

  const history = doc._history;

  for (let hi = history.length - 1; hi >= 0; hi--) {
    const h = history[hi];

    if (h.o < date) {
      break;
    }

    diff.patchObj(doc, h.p);
  }
}


export default {
  asOf,
  link,
  preserveInitialValues,
  snapshot
};
