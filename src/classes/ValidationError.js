
export default class ValidationError {

  constructor(path, reason) {
    this.path = path;
    this.reason = reason;
  }

  get message() {
    return 'The value at ' + this.path + ' ' + this.reason;
  }

  toString() {
    return this.message;
  }

}
