import * as _ from 'lodash';

import { evaluateClient } from '../common';
import Tyr from '../tyr';
import { AppError } from './appError';
import { UserError } from './userError';

export default class Type {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    Type.validateType(this);
  }

  /** @isomorphic */
  compare(field, a, b) {
    if (a !== undefined && a !== null) {
      if (b !== undefined && b !== null) {
        const compare = this.def.compare;
        if (compare) {
          return compare(field, a, b);
        } else {
          if (a < b) {
            return -1;
          } else if (a > b) {
            return 1;
          } else {
            return 0;
          }
        }
      } else {
        return 1;
      }
    } else {
      if (b !== undefined && b !== null) {
        return -1;
      } else {
        return 0;
      }
    }
  }

  compile(compiler, path, field) {
    const v = this.def.compile;
    if (v) {
      v.call(this, compiler, path, field);
    }
  }

  /** @isomorphic */
  create(field) {
    if (field.defaultValue) return field.defaultValue;

    const v = this.def.create;
    if (v) return v.call(this, field);
    //return undefined;
  }

  validate(field, value) {
    if (field.def.required && value === undefined) {
      return new UserError({ field, suffix: 'is required' });
    }

    const fn = this.def.validate;
    return fn ? fn(field, value) : undefined;
  }

  generatePrimaryKeyVal() {
    const f = this.def.generatePrimaryKeyVal;
    if (f) {
      return f();
    } else {
      throw new AppError(
        `Type "${this.name}" does not support generatePrimaryKeyVal()`
      );
    }
  }

  fromString(s) {
    const f = this.def.fromString;
    return f ? f(s) : s;
  }

  fromClient(field, value) {
    // TODO:  should we be looking at field.def.client here ? ... see common.js:evaluateClient()

    const f = this.def.fromClient;
    return f ? f(field, value) : value;
  }

  /** @isomorphic */
  format(field, value) {
    const f = this.def.format;
    return f ? f.call(this, field, value) : value;
  }

  async query(namePath, where, query) {
    const f = this.def.query;
    if (f) {
      await f(namePath, where, query);
    }
  }

  matches(namePath, where, doc) {
    const f = this.def.matches;
    return f ? f(namePath, where, doc) : namePath.get(doc) === where;
  }

  sortValue(field, value) {
    const f = this.def.sortValue;
    return f ? f(field, value) : value;
  }

  toClient(field, value, doc, opts, proj) {
    const def = this.def;

    if (
      !evaluateClient(def.client, field.name, doc, value, opts, proj) ||
      !evaluateClient(field.def.client, field.name, doc, value, opts, proj)
    ) {
      return undefined;
    }

    const f = def.toClient;
    return f ? f(field, value) : value;
  }

  static validateType(type) {
    const def = type.def;

    if (!def) {
      throw new AppError('Missing schema definition.');
    }

    if (!def.name) {
      throw new AppError('Missing "name" field in schema definition.');
    }

    if (!_.isString(def.name)) {
      throw new AppError('"name" should be a string in schema definition.');
    }

    if (Type.byName[def.name]) {
      throw new AppError('Type ' + def.name + ' redefined.');
    }

    Type.byName[def.name] = type;
  }
}

Type.byName = {};

Tyr.Type = Type;
