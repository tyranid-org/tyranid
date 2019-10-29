import Tyr from '../tyr';

/** @isomorphic */
export class UserError extends Error {
  constructor(value) {
    if (typeof value === 'string') {
      super(value);
    } else if (value && typeof value === 'object') {
      const { suffix, field } = value;

      let message = suffix
        ? `The value at ${field.path} ${value.suffix}`
        : value.message;
      super(message);

      for (const propName in value) {
        switch (propName) {
          case 'suffix':
          case 'message':
            break;
          default:
            this[propName] = value[propName];
            break;
        }
      }
    } else {
      super();
    }
  }

  toPlain() {
    const { field, lineNumber, rowNumber, columnNumber, technical } = this;

    const o = { message: this.message };
    if (field) o.field = field.path.name;
    if (lineNumber !== undefined) o.lineNumber = lineNumber;
    if (columnNumber !== undefined) o.columnNumber = columnNumber;
    if (rowNumber !== undefined) o.rowNumber = rowNumber;
    if (technical !== undefined) o.technical = technical;
    return o;
  }

  toString() {
    let s = '';
    if (this.technical) s += this.technical + '\n';
    s += this.message;
    const st = this.stack;
    if (st) s += '\n' + st;
    return s;
  }
}

Tyr.UserError = UserError;
