import Tyr from '../../src/tyranid';
import _ from 'lodash';

const schema = {
  id: 'r00',
  name: 'role',
  fields: {
    _id:     { is: 'mongoid' },
    name:    { is: 'string', label: true },
  }
};

export default class Role extends new Tyr.Collection(schema) {

  static async search(text) {
    return this.find({ name: new RegExp(_.escapeRegExp(text)) });
  }

}
