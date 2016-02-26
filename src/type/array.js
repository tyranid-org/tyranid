
import Type from '../core/type';


const ArrayType = new Type({
  name: 'array',

  compile(compiler, field) {
    compiler.type(field, 'of', true);
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
    if (!where.length) {
      // TODO:  need to figure out a cleaner way to handle this case?
      query.__foo__ = true;
      return;
    }

    let values = where.filter($=> $ !== '- None -');
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
