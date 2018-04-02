import * as _ from 'lodash';
import * as faker from 'faker';

import Collection from './core/collection';

/**
 * Recurse into schema and populate fake document
 */
function fakeField(field) {
  const def = _.get(field, 'is.def') || field.def;

  if (!def)
    throw new Error(
      'No field.def property to fake on! ' + JSON.stringify(field)
    );

  switch (def.name) {
    case 'integer':
    case 'float':
    case 'double':
    case 'number':
      return faker.random.number();

    case 'email':
      return faker.internet.email();

    case 'url':
      return faker.internet.url();

    case 'date':
      const date = faker.date.past();
      date.setMilliseconds(0);
      return date;

    case 'image':
      return faker.image.avatar();

    case 'link':
    case 'mongoid':
      let i = 24,
        s = '';
      while (i--) s += faker.random.number(15).toString(16);
      return ObjectId(s);

    case 'boolean':
      return faker.random.boolean();

    case 'array':
      return _.range(2).map(() => fakeField(field.of));

    case 'object':
      const key = def.name === 'link' ? 'link.def.fields' : 'fields';

      return _.reduce(
        _.get(field, key),
        (out, value, key) => {
          out[key] = fakeField(value);
          return out;
        },
        {}
      );

    // default to string
    default:
      return faker.name.lastName();
  }
}

function fakeDocument(schema) {
  const doc = {};
  _.each(schema, (field, name) => {
    doc[name] = fakeField(field);
  });
  return doc;
}

Collection.prototype.fake = async function({ n, schemaOpts, seed } = {}) {
  // get doc schema
  const collection = this,
    schema = await collection.fieldsFor(schemaOpts);

  // seed if provided, else reset
  faker.seed(seed);

  if (n === undefined) {
    return new collection(fakeDocument(schema));
  } else {
    const out = [];
    while (n--) out.push(new collection(fakeDocument(schema)));
    return out;
  }
};
