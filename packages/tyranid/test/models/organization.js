import tyr from '../../src/tyranid';

var Organization = new tyr.Collection({
  id: 't04',
  name: 'organization',
  historical: 'patch',
  express: {
    rest: true
  },
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true, historical: true },
    owner: {
      link: 'user',
      relate: 'ownedBy',
      historical: true,
      denormal: { name: 1 }
    }
  }
});

export default Organization;
