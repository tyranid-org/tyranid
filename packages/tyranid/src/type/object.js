import * as _ from 'lodash';
import Type from '../core/type';
import { UserError } from '../core/userError';
import Tyr from '../tyr';

const ObjectType = new Type({
  name: 'object',

  compile(compiler, field) {
    const def = field.def;

    if (def.fields) {
      compiler.fields(field.path, field, def.fields);
    }

    if (def.keys && !def.of) {
      throw compiler.err(
        field.path,
        '"of" must be specified if "keys" is present'
      );
    } else if (!def.keys && def.of) {
      throw compiler.err(
        field.path,
        '"keys" must be specified if "of" is present'
      );
    }

    compiler.type(field, 'keys');
    compiler.type(field, 'of');
  },

  fromClient(field, value) {
    if (!value) {
      return value;
    }

    const fields = field.fields;

    if (!_.size(fields)) {
      // this is defined as just an empty object, meaning it's 100% dynamic, grab everything

      // TODO:  this should probably clone the value ?
      return value;
    } else {
      const obj = {};

      _.each(value, function(v, k) {
        const field = fields[k];

        if (field) {
          if (!field.type) {
            throw new Error(
              'collection missing type ("is"), missing from schema?'
            );
          }

          obj[k] = field.type.fromClient(field, v);
        }
      });

      return obj;
    }
  },

  format(field, value) {
    const { fields } = field;
    let s = '';
    let first = true;

    if (typeof value !== 'object') return value;

    if (fields) {
      const values = [];
      for (const name in fields) {
        const field = fields[name];
        if (field.type.name === 'mongoid') continue;
        values.push(field ? field.format(value[name]) : value[name]);
      }

      return Tyr.mapAwait(values, values => {
        let i = 0;
        for (const name in fields) {
          const field = fields[name];
          if (field.type.name === 'mongoid') continue;
          const v = values[i++];
          if (v === undefined || v === null || v === '') continue;

          if (first) first = false;
          else s += ', ';

          s += `${field ? field.label : name}: ${v}`;
        }

        return s;
      });
    } else {
      for (const name in value) {
        const value = value[name];

        if (first) first = false;
        else s += ', ';

        s += `${name}: ${value[name]}`;
      }

      return s;
    }
  },

  validate(field, obj) {
    const errors = [];

    if (obj) {
      _.each(field.fields, function(field, fieldName) {
        const fieldDef = field.def;

        if (!fieldDef.get) {
          const type = field.type;

          const error = type.validate(field, obj[fieldName]);

          if (error instanceof UserError) {
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
