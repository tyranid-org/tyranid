
import Tyr from '../../src/tyranid';
import * as _ from 'lodash';

// this collection is intended to not be instantiated in the database and is used to test
// that tyranid functions if the given collection does not exist (yet)
export default class Phantom extends new Tyr.Collection({
  id: 'p01',
  dbName: 'PHANTOM',
  name: 'phantom',
  fields: {
    _id:     { is: 'mongoid' },
    name:    { is: 'string', labelField: true },
  }
}) {

}
