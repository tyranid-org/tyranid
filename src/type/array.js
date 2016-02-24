
const _ = require('lodash'); // client-side

import Field from '../core/field';
import Type from '../core/type';


const ArrayType = new Type({
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

export default ArrayType;
