
import { ObjectId } from 'promised-mongo';

import Type from '../classes/Type';


export const MongoIdType = new Type({
  name: 'mongoid',
  generatePrimaryKeyVal() {
    return new ObjectId();
  },
  fromString(str) {
    return ObjectId(str);
  },
  fromClient(field, value) {
    // Following usually fails when called externally since caller probably
    // not using Tyranid's promised-mongo
    if (value instanceof ObjectId) {
      return value;
    }

    if (value) {
      const str = value.toString();
      // we don't want to accept 12-byte strings from the client
      if (str.length !== 24) {
        throw new Error('Invalid ObjectId');
      }

      return ObjectId(str);
    }

    //return undefined;
  },
  toClient(field, value) {
    return value ? value.toString() : value;
  }
});
