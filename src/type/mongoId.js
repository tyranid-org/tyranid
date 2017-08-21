
import { ObjectId } from 'mongodb';

import Type from '../core/type';
import Tyr  from '../tyr';

export const MongoIdType = new Type({
  name: 'mongoid',
  generatePrimaryKeyVal() {
    return new ObjectId();
  },
  fromString(str) {
    return ObjectId(str);
  },
  fromClient(field, value) {
    if (value instanceof ObjectId) {
      return value;
    }

    if (value) {
      const str = value.toString();
      // we don't want to accept 12-byte strings from the client
      if (!Tyr.isValidObjectIdStr(str)) {
        throw new Error(`Invalid ObjectId for field ${field.name}`);
      }

      return ObjectId(str);
    }

    return value;
  },
  toClient(field, value) {
    return value ? value.toString() : value;
  }
});
