import * as _ from 'lodash';

import Tyr from '../tyr';
import NamePath from './namePath';
import ValidationError from './validationError';
import LinkType from '../type/link';

export default class Field {
  constructor(def) {
    // "job: Job" is equivalent to "job: { link: Job }"
    if (def instanceof Tyr.Collection) {
      def = { link: def };
    }

    this.def = def;
  }

  get computed() {
    const def = this.def;
    return (
      this.name === '_id' /* this is only usually true ... */ ||
      def.computed ||
      (!!(def.get || def.getServer) && !(def.set || def.setServer))
    );
  }

  get readonly() {
    return this.def.readonly || this.computed;
  }

  get label() {
    return _.result(this.def, 'label') || Tyr.labelize(this.name);
  }

  async labelify(value) {
    return this.link ? await this.link.idToLabel(value) : value;
  }

  async labels(doc, text, opts) {
    const field = this,
      query = {};

    const to = field.link;

    if (to) {
      if (text) {
        query[to.labelField.path] = new RegExp(text, 'i');
      }

      await LinkType.applyWhere(field, doc, query, opts);

      return await to.labels(query, opts);
    } else if (field.type.name === 'uid') {
      const cols = field.of;

      if (cols) {
        return _.flatten(await Promise.all(cols.map(col => col.labels(text))));
      }
    }

    //return undefined;
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
