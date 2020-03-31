import * as _ from 'lodash';

import Tyr from '../tyr';
import ObjectType from '../type/object';
import * as historical from '../historical/historical';
import SecureError from '../secure/secureError';
import { AppError } from './appError';
import { responsePathAsArray } from 'graphql';

const { NamePath } = Tyr;

export function toPlain(doc) {
  const plain = {};

  const fields = doc.$model.fields;
  for (const fieldName in fields) {
    const v = doc[fieldName];

    if (v !== undefined) {
      plain[fieldName] = doc[fieldName];
    }
  }

  return plain;
}

export const documentPrototype = (Tyr.documentPrototype = {
  $asOf(date, props) {
    return historical.asOf(this.$model, this, date, props);
  },

  async $checkAccess(opts) {
    const secure = Tyr.secure;

    if (secure && secure.checkAccess) {
      const accessResult = await secure.checkAccess(
        this,
        opts.perm,
        extractAuthorization(opts),
        opts
      );

      Object.defineProperty(this, '$access', {
        value: accessResult,
        enumerable: false
      });
    }
  },

  $clone() {
    // Amazingly, a seemingly do-nothing cloneDeep `customizer`
    // seems to address https://github.com/lodash/lodash/issues/602
    return new this.$model(_.cloneDeep(this, val => val));
  },

  $cloneDeep() {
    return new this.$model(Tyr.cloneDeep(this));
  },

  $copy(obj, keys) {
    const { fields } = this.$model;

    if (keys) {
      if (keys === Tyr.$all) {
        _.each(fields, field => {
          if (!field.readonly) {
            const key = field.name,
              v = obj[key];

            if (v !== undefined) {
              this[key] = v;
            } else {
              delete this[key];
            }
          }
        });
      } else {
        for (const key of keys) {
          const field = fields[key];

          if (!field || !field.readonly) {
            const v = obj[key];
            if (v !== undefined) {
              this[key] = v;
            } else {
              delete this[key];
            }
          }
        }
      }
    } else {
      for (const key in obj) {
        const field = fields[key];

        if (
          (!field || !field.readonly) &&
          obj.hasOwnProperty(key) &&
          key !== '_history'
        ) {
          const v = obj[key];
          if (v !== undefined) {
            this[key] = v;
          } else {
            delete this[key];
          }
        }
      }
    }
  },

  async $parsePath(path) {
    const col = this.$model;

    try {
      return col.parsePath(path);
    } catch {
      const find = field => {
        if (!field) return undefined;

        let fpath = field.pathName;

        if (path.startsWith(fpath)) {
          if (path === fpath) return field.namePath;
          return findInFields(field.fields) || find(field.of);
        }

        //return undefined;
      };

      const findInFields = fields => {
        if (fields) {
          for (const fieldName in fields) {
            const p = find(fields[fieldName]);
            if (p) return p;
          }
        }

        //return undefined;
      };

      const p = findInFields(await col.fieldsFor({ match: this }));

      if (!p) throw new AppError(`path "${path}" not found`);

      return p;
    }
  },

  $get(path) {
    return this.$model.parsePath(path).get(this);
  },

  $set(path, value) {
    return this.$model.parsePath(path).set(this, value, { create: true });
  },

  $redact() {
    const access = this.$access;
    if (access) {
      const fields = access.fields;

      if (fields) {
        switch (fields.effect) {
          case 'allow':
            const allowedNames = {};
            for (const name of fields.names) {
              allowedNames[name] = true;
            }

            const modelFields = this.$model.fields;
            for (const name in modelFields) {
              if (modelFields.hasOwnProperty(name) && !allowedNames[name]) {
                delete this[name];
              }
            }

            break;

          case 'deny':
            for (const name of fields.names) {
              delete this[name];
            }
            break;

          default:
            throw new SecureError(
              `Invalid effect: "${fields.effect}" encountered`
            );
        }
      }
    }
  },

  $snapshot(updateHistory, ...args) {
    const collection = this.$model;

    if (!collection.def.historical) {
      throw new Error('Document is not historical');
    }

    const opts = extractOptions(collection, args),
      updateFields = extractUpdateFields(this, opts);

    return historical.snapshot(
      opts,
      collection,
      this,
      historical.patchPropsFromOpts(opts),
      updateFields,
      updateHistory
    );
  },

  $save(...args) {
    return this.$model.save(this, ...args);
  },

  $insert(...args) {
    return this.$model.insert(this, ...args);
  },

  $update(...args) {
    return this.$model.updateDoc(this, ...args);
  },

  async $remove() {
    await Tyr.Event.fire({
      collection: this.$model,
      type: 'remove',
      when: 'pre',
      document: this
    });
    const rslt = await this.$model.remove(
      { [this.$model.def.primaryKey.field]: this.$id },
      '$remove',
      ...arguments
    );
    await Tyr.Event.fire({
      collection: this.$model,
      type: 'remove',
      when: 'post',
      document: this
    });
    return rslt;
  },

  $replace(obj) {
    this.$copy(obj, Tyr.$all);
  },

  $slice(path, options) {
    return Tyr._slice(this, path, options);
  },

  $toClient(opts) {
    return this.$model.toClient(this, opts);
  },

  $toPlain() {
    return toPlain(this);
  },

  $populate(fields, denormal) {
    return this.$model.populate(fields, this, denormal);
  },

  $validate() {
    return ObjectType.validate(this.$model, this);
  }
});

export function defineDocumentProperties(dp) {
  Object.defineProperties(dp, {
    $id: {
      get() {
        return this[this.$model.def.primaryKey.field];
      },
      enumerable: false,
      configurable: false
    },

    $isNew: {
      get() {
        return !this.$id;
      },
      enumerable: false,
      configurable: false
    },

    $: {
      get() {
        return NamePath.taggedTemplateLiteral.bind(this);
      },
      enumerable: false,
      configurable: false
    },

    $label: {
      get() {
        return this.$model.labelFor(this);
      },
      enumerable: false,
      configurable: false
    },

    $tyr: {
      get() {
        return Tyr;
      },
      enumerable: false,
      configurable: false
    },

    $uid: {
      get() {
        const model = this.$model;
        return model.idToUid(this[model.def.primaryKey.field]);
      },
      enumerable: false,
      configurable: false
    }
  });
}
