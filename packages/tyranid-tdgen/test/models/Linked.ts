import { Tyr } from 'tyranid';

export default new Tyr.Collection({
  id: 't01',
  name: 'linked',
  dbName: 'linked',
  fields: { _id: { is: 'mongoid' }, name: { is: 'string' } }
});
