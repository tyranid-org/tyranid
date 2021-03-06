import Tyr from '../../src/tyranid';

export const Trip = new Tyr.Collection({
  id: 't03',
  name: 'trip',
  client: true,
  express: {
    rest: true,
  },
  fields: {
    _id: { is: 'mongoid' },
    tripCode: { is: 'string', unique: true },
    name: { is: 'string', labelField: true },
    origin: { link: 'location' },
    destination: { link: 'location' },
  },
});
