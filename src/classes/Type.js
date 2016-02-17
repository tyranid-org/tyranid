
// can't be import due to client-side
const _ = require('lodash');

import { setFalse } from '../common';
import ValidationError from './ValidationError';

export default class Type {

  constructor(def) {
    this.def = def;
    this.name = def.name;
    Type.validateType(this);
  }

  compile(compiler, path, field) {
    const v = this.def.compile;
    if (v) {
      v(compiler, path, field);
    }
  }

  validate(field, value) {
    if (field.def.required && value === undefined) {
      return new ValidationError(field, 'is required');
    }

    const fn = this.def.validate;
    return fn ? fn(field, value) : undefined;
  }

  generatePrimaryKeyVal() {
    const f = this.def.generatePrimaryKeyVal;
    if (f) {
      return f();
    } else {
      throw new Error(`Type "${this.name}" does not support generatePrimaryKeyVal()`);
    }
  }

  fromString(s) {
    const f = this.def.fromString;
    return f ? f(s) : s;
  }

  fromClient(field, value) {
    const f = this.def.fromClient;
    return f ? f(field, value) : value;
  }

  format(field, value) {
    const f = this.def.format;
    return f ? f.call(this, field, value) : value;
  }

  query(namePath, where, query) {
    const f = this.def.query;
    if (f) {
      f(namePath, where, query);
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

  toClient(field, value, data) {

    const def = this.def,
          dClient = def.client,
          fClient = field.def.client;

    if (_.isFunction(dClient) && !dClient.call(data, value)) {
      return undefined;
    }

    if (_.isFunction(fClient) && !fClient.call(data, value)) {
      return undefined;
    }

    if (setFalse(dClient) || setFalse(fClient)) {
      return undefined;
    }

    const f = def.toClient;
    return f ? f(field, value) : value;

  }

  static validateType(type) {
    const def = type.def;

    if (!def) {
      throw new Error('Missing schema definition.');
    }

    if (!def.name) {
      throw new Error('Missing "name" field in schema definition.');
    }

    if (!_.isString(def.name)) {
      throw new Error('"name" should be a string in schema definition.');
    }

    if (Type.byName[def.name]) {
      throw new Error('Type ' + def.name + ' redefined.');
    }

    Type.byName[def.name] = type;
  }
}

Type.byName = {};
