import Tyr from '../../index';

const schema = {
  id: 'r00',
  name: 'role',
  fields: {
    _id:     { is: 'mongoid' },
    name:    { is: 'string', label: true },
  }
};

export default class Role extends new Tyr.Collection(schema) {}
