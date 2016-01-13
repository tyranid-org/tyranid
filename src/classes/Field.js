
import _ from 'lodash';


// variables shared between classes
import {
  labelize
} from '../common';


export default class Field {

  constructor(def) {
    this.def = def;
  }

  get label() {
    return _.result(this.def, 'label') || labelize(this.name);
  }
}
