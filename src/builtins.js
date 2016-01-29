import _ from 'lodash';
import Field from './classes/Field';
import Type from './classes/Type';
import ValidationError from './classes/ValidationError';
import { typesByName, validateUidCollection } from './common';
import { ObjectId } from 'promised-mongo';


export const LinkType = new Type({
  name: 'link',
  fromClient(field, value) {
    const linkField = field.def.link.def.fields[field.def.link.def.primaryKey.field];
    return linkField.def.is.def.fromClient(linkField, value);
  },
  toClient(field, value) {
    return value ? (ObjectId.isValid(value.toString()) ? value.toString() : value) : value;
  }
});

export const UidType = new Type({
  name: 'uid',
  compile(compiler, path, field) {
    const of = field.of;

    if (!of) {
      return;
    }

    if (Array.isArray(of)) {
      _.each(of, function(v /*,k*/ ) {
        validateUidCollection(compiler, path, v);
      });
    } else {
      validateUidCollection(compiler, path, of);
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
  validate(field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new ValidationError(field, 'is not an integer');
    }
  }
});

export const StringType = new Type({ name: 'string' });

export const DoubleType = new Type({ name: 'double' });

export const ArrayType = new Type({
  name: 'array',
  fromClient(field, value) {
    if (Array.isArray(value)) {
      const ofField = field.def.of,
            ofFieldDefIs = ofField.def.is;
      return value.map(v => ofFieldDefIs.fromClient(ofField, v));
    } else {
      return value;
    }
  },
  compile(compiler, path, field) {
    let of = field.of;

    if (!of) {
      throw compiler.err(path, 'Missing "of" property on array definition');
    }

    if (_.isPlainObject(of)) {
      of = field.of = new Field(of);
    } else if (_.isString(of)) {
      of = typesByName[of];
      if (!of) {
        if (compiler.stage === 'link') {
          throw compiler.err(path, 'Unknown type for "of".');
        }
      } else {
        field.of = new Field({ is: of.def.name });
      }
    }

    if (field.of instanceof Field) {
      compiler.field(path + '._', field.of);
    }
  }
});

export const ObjectType = new Type({
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
          if (!field.def.is ) {
            throw new Error('collection missing type ("is"), missing from schema?');
          }

          obj[k] = field.def.is.fromClient(field, v);
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
          const fieldDefIs = fieldDef.is;

          const error = fieldDefIs.validate(field, obj[fieldName]);

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
    return value ? ObjectId(value.toString()) : undefined;
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
  validate(field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(field, 'is not a date');
    }
  }
});
