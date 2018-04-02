
import Tyr from '../tyr';

export default class SecureError {

  constructor(msg) {
    this.msg = msg;
  }

  get message() {
    return this.msg ? this.msg : 'Security violation';
  }

  toString() {
    return this.message();
  }
}

Tyr.SecureError = SecureError;
