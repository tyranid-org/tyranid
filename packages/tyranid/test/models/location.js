import Tyr from '../../src/tyranid';

const Location = new Tyr.Collection({
  id: 'l00',
  name: 'location',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string', labelField: true }
  }
});

export default Location;
