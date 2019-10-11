import Tyr from '../../src/tyranid';
import * as _ from 'lodash';

const Global = new Tyr.Collection({
  id: 'glb',
  name: 'global',
  aux: true,
  singleton: true,
  fields: {
    _id: { is: 'mongoid' },
    count: { is: 'integer' }
  }
});

export default Global;
