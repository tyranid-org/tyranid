
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

  get spath() {
    let sp = this._spath;
    if (!sp) {
      sp = this._spath = this.path.replace('._', '');
    }

    return sp;
  }

  get db() {
    return this.def.db !== false;
  }

  /** @private @isopmorphic */
  _calcPathLabel() {
    const p = this.parent,
          l = this.def.pathLabel || this.label;

    if (p) {
      const pl = p.pathLabel;

      if (pl) {
        return pl + ' ' + l;
      }
    }

    return l;
  }

  get pathLabel() {
    return this._calcPathLabel();
  }
}
