
import _ from 'lodash';


import Tyr      from '../tyr';
import NamePath from './namePath';


export default class Field {

  constructor(def) {
    this.def = def;
  }

  get label() {
    return _.result(this.def, 'label') || Tyr.labelize(this.name);
  }

  get namePath() {
    let np = this._np;
    if (!np) {
      np = this._np = new NamePath(this.collection, this.path);
    }
    return np;
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

Tyr.Field = Field;
