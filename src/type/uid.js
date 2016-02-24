
const _ = require('lodash'); // client-side

import {
  collectionsById  ,
  collectionsByName,
} from '../common';

import Collection from '../core/collection';
import Type from '../core/type';


function validateUidCollection(validator, path, collection) {
  const unknownTypeErrMsg = 'Unknown Collection for uid "of".';

  if (collection instanceof Collection) {
    if (!collectionsById[collection.id]) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else if (typeof collection === 'string') {
    collection = collectionsByName[collection];
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

export default UidType;
