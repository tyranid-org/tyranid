import _ from 'lodash';

import { typesByName, setFalse } from '../common.js';
import ValidationError from './ValidationError.js';


export default class Type {

  constructor(def) {
    this.def = def;
    Type.validateType(this);
  }

  validateSchema(validator, path, field) {
    let v = this.def.validateSchema;
    if (v) {
      v(validator, path, field);
    }
  }

  validate(path, field, value) {
    if (field.required && value === undefined) {
      return new ValidationError(path, 'is required');
    }

    let f = this.def.validate;
    return f ? f(path, field, value) : undefined;
  }

  fromString(s) {
    let f = this.def.fromString;
    return f ? f(s) : s;
  }

  fromClient(field, value) {
    let f = this.def.fromClient;
    return f ? f(field, value) : value;
  }

  toClient(field, value, data) {

    let def = this.def,
        dClient = def.client,
        fClient = field.client;

    if (_.isFunction(dClient) && !dClient.call(data, value)) {
      return undefined;
    }

    if (_.isFunction(fClient) && !fClient.call(data, value)) {
      return undefined;
    }

    if (setFalse(dClient) || setFalse(fClient)) {
      return undefined;
    }

    let f = def.toClient;
    return f ? f(field, value) : value;

  }

  static validateType(type) {
    let def = type.def;

    if (!def) {
      throw new Error('Missing schema definition.');
    }

    if (!def.name) {
      throw new Error('Missing "name" field in schema definition.');
    }

    if (!_.isString(def.name)) {
      throw new Error('"name" should be a string in schema definition.');
    }

    if (typesByName[def.name]) {
      throw new Error('Type ' + def.name + ' redefined.');
    }

    typesByName[def.name] = type;
  }

}
