
import Tyr from '../tyr';

export default class ValidationError extends Error {

  constructor(field, reason) {
    super(reason);
    this.field = field;
    this.reason = reason;
  }

  get message() {
    return 'The value at ' + this.field.path + ' ' + this.reason;
  }
}

Tyr.ValidationError = ValidationError;

export default ValidationError;
