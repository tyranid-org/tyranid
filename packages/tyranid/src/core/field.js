import * as _ from 'lodash';

import Tyr from '../tyr';
import Path from './path';
import { UserError } from './userError';
import LinkType from '../type/link';

export default class Field {
  constructor(def, opts) {
    // "job: Job" is equivalent to "job: { link: Job }"
    if (def instanceof Tyr.Collection) {
      def = { link: def };
    }

    this.def = def;
    if (opts) Object.assign(this, opts);
  }

  $metaType = 'field';

  get aux() {
    return this.def.aux === true;
  }

  // TODO:  this should return true if it has a get ... computed && readonly means get and no setter
  get computed() {
    const def = this.def;
    return !!(def.get || def.getServer) && !(def.set || def.setServer);
  }

  get db() {
    return this.computed ? this.def.db === true : this.def.db !== false;
  }

  get generated() {
    const def = this.def;
    return (
      this.name === '_id' /* this is only usually true ... */ ||
      def.generated ||
      (!!(def.get || def.getServer) && !(def.set || def.setServer))
    );
  }

  get readonly() {
    return this.def.readonly || this.generated;
  }

  async fromClient(value, opts) {
    const { type } = this;

    if (type instanceof Tyr.Collection) {
      return await type.fromClient(value, undefined /* path */, opts);
    }

    return this.type.fromClient(this, value, opts);
  }

  toClient(value, doc, opts, proj) {
    return this.type.toClient(this, value, doc, opts, proj);
  }

  /** @isomorphic */
  format(v) {
    return this.type.format(this, v);
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
        query[to.labelField.pathName] = new RegExp(text, 'i');
      }

      await LinkType.applyWhere(field, doc, query, opts);

      const oq = opts.query;
      if (oq) Object.assign(query, oq);

      return await to.labels(query, opts);
    } else if (field.type.name === 'uid') {
      const cols = field.of;

      if (cols) {
        return _.flatten(
          await Promise.all(
            cols.map(async col => {
              const labels = await col.labels(text, opts);

              for (const label of labels) {
                label._colId = col.id;
              }

              return labels;
            })
          )
        );
      }
    }

    //return undefined;
  }

  get path() {
    let np = this._np;
    if (!np) {
      if (this.dynamicMatch) {
        let root;
        for (
          root = this.parent;
          root && root instanceof Field;
          root = root.parent
        );

        np = this._np = new Path(root, this.pathName);
      } else {
        np = this._np = new Path(this.collection, this.pathName);
      }
    }
    return np;
  }

  get numbering() {
    const { numbering } = this.def;
    return (
      numbering || (this.type.name === 'integer' ? 'integer' : 'uppercase')
    );
  }

  get spath() {
    return this.path.spath;
  }

  /** @isomorphic */
  isId() {
    return this.name === '_id';
  }

  isMethod() {
    // parent could be a collection
    return !!this.method || this.parent?.isMethod?.();
  }

  methodName() {
    // parent could be a collection
    return this.method || this.parent?.methodName?.();
  }

  /** @private @isomorphic */
  _calcPathLabel() {
    const p = this.parent,
      l = this.def.pathLabel ?? this.label;

    if (p) {
      const pl = p.pathLabel;

      if (pl) {
        return pl + (l ? ' ' + l : '');
      }
    }

    return l;
  }

  get pathLabel() {
    return this._calcPathLabel();
  }

  async validate(doc, opts) {
    const validateFn = this.def.validate;

    if (validateFn) {
      const reason = await validateFn.call(doc, { field: this, ...opts });
      if (reason) throw new UserError({ field: this, suffix: reason });
    }
  }

  get width() {
    return this.def.width || this.type.width;
  }
}

Tyr.Field = Field;
