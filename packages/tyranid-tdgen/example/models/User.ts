import { Tyr } from 'tyranid';

export default new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    email: { is: 'email' },
    teamId: { is: 'mongoid' },
    skills: {
      is: 'array',
      of: {
        is: 'object',
        fields: {
          years: { is: 'integer' },
          name: { is: 'string' }
        }
      }
    }
  }
});
