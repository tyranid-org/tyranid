import Tyr from '../tyr';

const MarkupType = new Tyr.Collection({
  id: '_p1',
  name: 'tyrMarkupType',
  enum: true,
  internal: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true },
  },
  values: [
    ['_id', 'name'],

    [1, 'HTML'],
    [2, 'Markdown'],
    [3, 'SASS'], // ???
  ],
});

Tyr.MarkupType = MarkupType;
export default MarkupType;
