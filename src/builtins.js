import _ from 'lodash';

import Type from './classes/Type.js';
import Tyranid from './tyranid.js';
import Collection from './classes/Collection.js';
import ValidationError from './classes/ValidationError.js';
import { typesByName, collectionsById } from './common.js';


export function validateUidCollection(validator, path, collection) {
  let unknownTypeErrMsg = 'Unknown Collection for uid "of".';
  if (collection instanceof Collection) {
    if (!collectionsById[collection.id]) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else if (typeof collection === 'string') {
    collection = Tyranid.byName(collection);
    if (!collection) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else {
    throw validator.err(path, unknownTypeErrMsg);
  }
}


export const LinkType = new Type({
  name: 'link',
  fromClient(field, value) {
    let linkField = field.link.def.fields._id;
    return linkField.is.def.fromClient(linkField, value);
  },
  toClient(field, value) {
    return value ? (value instanceof ObjectId ? value.toString() : value) : value;
  }
});

export const UidType = new Type({
  name: 'uid',
  validateSchema (validator, path, field) {
    let of = field.of;

    if (!of) {
      return;
    }

    if (Array.isArray(of)) {
      _.each(of, function(v /*,k*/ ) {
        validateUidCollection(validator, path, v);
      });
    } else {
      validateUidCollection(validator, path, of);
    }
  }
});

export const BooleanType = new Type({ name: 'boolean' });

export const IntegerType = new Type({
  name: 'integer',
  fromString(s) {
    return parseInt(s, 10);
  },
  fromClient(field, value) {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    } else {
      return value;
    }
  },
  validate(path, field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new ValidationError(path, 'is not an integer');
    }
  }
});

export const StringType = new Type({ name: 'string' });

export const DoubleType = new Type({ name: 'double' });

export const ArrayType = new Type({
  name: 'array',
  fromClient(field, value) {
    if (Array.isArray(value)) {
      let ofField = field.of;
      return value.map(function(v) {
        return ofField.is.fromClient(ofField, v);
      });
    } else {
      return value;
    }
  },
  validateSchema(validator, path, field) {
    let of = field.of;

    if (!of) {
      throw validator.err(path, 'Missing "of" property on array definition');
    }

    if (_.isPlainObject(of)) {
      validator.field(path, of);
    } else {
      of = typesByName[of];
      if (!of) {
        throw validator.err(path, 'Unknown type for "of".');
      }

      field.of = { is: of.def.name };
      validator.field(path, field.of);
    }
  }
});

export const ObjectType = new Type({
  name: 'object',
  fromClient(field, value) {
    if (!value) {
      return value;
    }

    let obj = {};

    let fields = field.fields;
    _.each(value, function(v, k) {
      let field = fields[k];

      if (field) {
        if (!field.is ) {
          throw new Error('collection missing type ("is"), missing from schema?');
        }

        obj[k] = field.is.fromClient(field, v);
      }
    });

    return obj;
  },
  validate(path, def, obj) {
    let errors = [];

    if (obj) {
      _.each(def.fields, function(field, fieldName) {
        if (!field.get) {
          let error = field.is.validate(path + '.' + fieldName, field, obj[fieldName]);

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

export const MongoIdType = new Type({
  name: 'mongoid',
  fromString(str) {
    return ObjectId(str);
  },
  fromClient(field, value) {
    return value ? ObjectId(value) : undefined;
  },
  toClient(field, value) {
    return value ? value.toString() : value;
  }
});

export const EmailType = new Type({ name: 'email' });
export const UrlType = new Type({ name: 'url' });
export const PasswordType = new Type({ name: 'password', client: false });
export const ImageType = new Type({ name: 'image' });

export const DateType = new Type({
  name: 'date',
  fromString(s) {
    return s ? new Date(s) : s;
  },
  fromClient(field, value) {
    if (typeof value === 'string') {
      return new Date(value);
    }

    return value;
  },
  validate(path, field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(path, 'is not a date');
    }
  }
});
