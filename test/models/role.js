import Tyr from '../../src/tyranid';
import _ from 'lodash';


export default class Role extends new Tyr.Collection({
  id: 'r00',
  name: 'role',
  fields: {
    _id:     { is: 'mongoid' },
    name:    { is: 'string', labelField: true },
  }
}) {

  static async search(text) {
    return this.find({ name: new RegExp(_.escapeRegExp(text)) });
  }
}
