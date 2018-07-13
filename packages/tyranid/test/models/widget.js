import tyr from '../../src/tyranid';

var Widget = new tyr.Collection({
  id: 'w01',
  name: 'widget',
  historical: 'document',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string', historical: true },
    alternate: { is: 'string' },
    tags: { is: 'array', of: 'string', historical: true },
    creator: { link: 'user', historical: true }
  }
});

export default Widget;
