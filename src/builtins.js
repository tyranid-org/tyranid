
const _ = require('lodash'); // client-side
const moment = require('moment'); // moment

import Tyr from './tyr';
import Field from './classes/Field';
import Type from './classes/Type';
import ValidationError from './classes/ValidationError';
import { validateUidCollection } from './common';
import { ObjectId } from 'promised-mongo';


export const LinkType = new Type({
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

export const UidType = new Type({
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

export const BooleanType = new Type({
  name: 'boolean',

  query(namePath, where, query) {
    switch (where) {
    case true:
      query[namePath.name] = true;
      break;
    case false:
      query[namePath.name] = { $ne: true };
      break;
    }
  },

  matches(namePath, where, doc) {
    if (where !== undefined) {
      const value = namePath.get(doc);
      return !where === !value;
    } else {
      return true;
    }
  },

  format(field, value) {
    return value ? 'Yes' : 'No';
  }
});

export const IntegerType = new Type({
  name: 'integer',

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const unit = field.def.in;
      if (unit) {
        field.in = Tyr.Units.parse(unit);
      }
    }
  },

  fromString(s) {
    return parseInt(s, 10);
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      if (!value.length) {
        return undefined;
      }

      const v = parseInt(value, 10);

      if (v.toString() !== value) {
        throw new Error(`Invalid integer on field ${field.name}: ${value}`);
      }
    } else {
      return value;
    }
  },

  format(field, value) {
    return value;
  },

  matches(namePath, where, doc) {
    if (where !== undefined) {
      const value = namePath.get(doc);

      for (const op in where) {
        const v = where[op];
        switch (op) {
        case '$lt': return value < v;
        case '$gt': return value > v;
        case '$eq': return value === v;
        }
      }
    } else {
      return true;
    }
  },

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = where;
    }
  },

  validate(field, value) {
    if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
      return new ValidationError(field, 'is not an integer');
    }
  }
});

export const StringType = new Type({
  name: 'string',

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = _.isArray(where) ? { $in: where } : where;
    }
  },

  matches(namePath, where, doc) {
    if (where) {
      let value = namePath.get(doc);
      if (value) {
        if (!_.isString(value)) {
          value = '' + value;
        }

        if (_.isArray(where)) {
          return where.indexOf(value) >= 0;
        } else if (where instanceof RegExp) {
          return value.match(where);
        } else {
          return value === where;
        }
      }
    }

    return true;
  }
});

export const DoubleType = new Type({
  name: 'double',

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const unit = field.def.in;
      if (unit) {
        field.in = Tyr.Unit.parse(unit);
      }
    }
  },

  format(field, value) {
    if (_.isNumber(value) && value !== Math.round(value)) {
      value = value.toFixed(2);
    }

    return value;
  },

  matches(namePath, where, doc) {
    if (where !== undefined) {
      const value = namePath.get(doc);

      for (const op in where) {
        const v = where[op];
        switch (op) {
        case '$lt': return value < v;
        case '$gt': return value > v;
        case '$eq': return value === v;
        }
      }
    } else {
      return true;
    }
  },

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = where;
    }
  }
});

export const ArrayType = new Type({
  name: 'array',

  compile(compiler, field) {
    let of = field.def.of;

    if (!of) {
      throw compiler.err(field.path, 'Missing "of" property on array definition');
    }

    if (!field.of) {
      if (_.isPlainObject(of)) {
        of = field.of = new Field(of);
      } else if (_.isString(of)) {
        of = Type.byName[of];
        if (!of) {
          if (compiler.stage === 'link') {
            throw compiler.err(field.path, 'Unknown type for "of".');
          }
        } else {
          field.of = new Field({ is: of.def.name });
        }
      } else {
        throw compiler.err(field.path, `Invalid "of":  ${of}`);
      }
    }

    if (field.of instanceof Field) {
      compiler.field(field.path + '._', field.of);
    }
  },

  fromClient(field, value) {
    if (Array.isArray(value)) {
      const ofField = field.of,
            ofFieldType = ofField.type;
      return value.map(v => ofFieldType.fromClient(ofField, v));
    } else {
      return value;
    }
  },

  async query(namePath, where, query) {
    let values = where.filter($=> $ !== 'None');
    let or;

    if (values.length !== where.length) {
      or = query.$or = query.$or || [];
      or.push({ [namePath.name]: { $size: 0 } });
      or.push({ [namePath.name]: { $exists: false } });
    }

    if (values.length) {
      const of = namePath.tail.of;

      const link = of.link;
      if (link) {
        values = await* values.map(async v => (await link.byLabel(v)).$id);
      }

      if (or) {
        or.push({ [namePath.name]: { $in: values } });
      } else {
        query[namePath.name] = { $in: values };
      }
    }
  },

  format(field, value) {
    return (value && value.length) || '';
  },

  sortValue(field, value) {
    return (value && value.length) || 0;
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

  format(field, value) {
    return value ? moment(value).format('DD-MM-YYYY') : '';
  },

  query(namePath, where, query) {
    if (where) {
      query[namePath.name] = {
        $gte: new Date(where.startDate),
        $lte: new Date(where.endDate)
      };
    }
  },

  matches(/*namePath, where, doc*/) {
    // TODO
    return true;
  },

  validate(field, value) {
    if (value !== undefined && !(value instanceof Date)) {
      return new ValidationError(field, 'is not a date');
    }
  }
});
