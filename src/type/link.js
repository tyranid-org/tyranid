
const _ = require('lodash'); // client-side
import { ObjectId } from 'promised-mongo';

import Type from '../classes/Type';


const LinkType = new Type({
  name: 'link',
  fromClient(field, value) {
    const link = field.link,
          linkField = link.def.fields[field.link.def.primaryKey.field];

    try {
      return linkField.type.def.fromClient(linkField, value);
    } catch (err) {
      if (_.isString(value) && link.isStatic() && link.labelField) {
        // integer and ObjectId parse errors
        if (err.toString().match(/Invalid integer|24 hex/)) {
          const v = link.byLabel(value);

          if (v) {
            return v[link.def.primaryKey.field];
          }
        }
      }

      throw err;
    }
  },
  toClient(field, value) {
    return value ? (ObjectId.isValid(value.toString()) ? value.toString() : value) : value;
  },

  format(field, value) {
    return field.link.idToLabel(value);
  }
});

export default LinkType;
