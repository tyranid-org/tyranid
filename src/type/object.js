
const _ = require('lodash'); // client-side

import Type from '../classes/Type';
import ValidationError from '../classes/ValidationError';


const ObjectType = new Type({
  name: 'object',
  fromClient(field, value) {
    if (!value) {
      return value;
    }

    const fields = field.def.fields;

    if (!_.size(fields)) {
      // this is defined as just an empty object, meaning it's 100% dynamic, grab everything
      return value;

    } else {
      const obj = {};

      _.each(value, function(v, k) {
        const field = fields[k];

        if (field) {
          if (!field.type) {
            throw new Error('collection missing type ("is"), missing from schema?');
          }

          obj[k] = field.type.fromClient(field, v);
        }
      });

      return obj;
    }

  },
  validate(field, obj) {
    const errors = [];

    if (obj) {
      _.each(field.def.fields, function(field, fieldName) {
        const fieldDef = field.def;

        if (!fieldDef.get) {
          const type = field.type;

          const error = type.validate(field, obj[fieldName]);

          if (error instanceof ValidationError) {
            errors.push(error);
          } else if (Array.isArray(error)) {
            Array.prototype.push.apply(errors, error);
          }
        }
      });
    }

    return errors;
  }
});

export default ObjectType;
