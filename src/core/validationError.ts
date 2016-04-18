
import Tyr from '../tyr';
import Field from './field';

export default class ValidationError {

  constructor(public field: Field, public reason: string) {
    this.field = field;
    this.reason = reason;
  }

  get message() {
    return 'The value at ' + this.field.path + ' ' + this.reason;
  }

  toString() {
    return this.message;
  }
}

(<any> Tyr).ValidationError = ValidationError;
