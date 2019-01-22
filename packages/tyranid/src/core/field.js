import * as _ from 'lodash';

import Tyr from '../tyr';
import NamePath from './namePath';
import ValidationError from './validationError';

export default class Field {
  constructor(def) {
    // "job: Job" is equivalent to "job: { link: Job }"
    if (def instanceof Tyr.Collection) {
      def = { link: def };
    }

    this.def = def;
  }

  get label() {
    return _.result(this.def, 'label') || Tyr.labelize(this.name);
  }

  async labelify(value) {
    return this.link ? await this.link.idToLabel(value) : value;
  }

  get namePath() {
    let np = this._np;
    if (!np) {
      np = this._np = new NamePath(this.collection, this.path);
    }
    return np;
  }

  get spath() {
    return this.namePath.spath;
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

  async validate(doc) {
    const validateFn = this.def.validate;

    if (validateFn) {
      const reason = await validateFn.apply(doc, this);

      if (reason) {
        throw new ValidationError(this, reason);
      }
    }
  }
}

Tyr.Field = Field;
