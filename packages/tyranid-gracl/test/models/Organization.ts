import { Tyr } from 'tyranid';

export const Organization = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: { _id: { is: 'mongoid' }, name: { is: 'string' } }
});
