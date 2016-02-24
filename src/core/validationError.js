
import Tyr from '../tyr';

export default class ValidationError {

  constructor(field, reason) {
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

Tyr.ValidationError = ValidationError;
