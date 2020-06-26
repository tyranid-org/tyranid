import Tyr from './tyr';

// TODO:  add this to tyranid and implement some sort of "auto" type
const Counter = new Tyr.Collection({
  id: '_cn',
  internal: true,
  name: 'counter',
  dbName: 'counters',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    value: { is: 'integer', required: true },
  },
  indexes: [{ key: { name: 1 }, unique: true }],
});

Tyr.nextId = async name => {
  const doc = await Counter.findAndModify({
    query: { name },
    update: { $inc: { value: 1 } },
    new: true,
    upsert: true,
  });

  if (!doc) {
    return new Date().getTime();
  }

  return doc.value.value;
};

Tyr.nextIds = async (
  name, // string
  fieldName, // string
  docs, // Tyr.Document[]
  asString // boolean
) => {
  const doc = await Counter.findAndModify({
    query: { name },
    update: { $inc: { value: docs.length } },
    new: true,
    upsert: true,
  });

  const finalVal = doc ? doc.value.value : docs.length;
  let val = finalVal;

  for (let i = docs.length - 1; i > -1; i--) {
    const doc = docs[i];
    doc[fieldName] = asString ? String(val) : val;
    val--;
  }

  return finalVal;
};

export default Counter;
