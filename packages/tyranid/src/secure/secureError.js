import Tyr from '../tyr';

/** @isomorphic */
export default class SecureError extends Error {
  constructor(msg) {
    let message;

    if (typeof value === 'string') {
      message = value || 'Security violation';
      super(message);
    } else if (value && typeof value === 'object') {
      message = value.message || 'Security violation';
      super(message);

      for (const propName in value) {
        switch (propName) {
          case 'message':
            break;
          default:
            this[propName] = value[propName];
            break;
        }
      }
    } else {
      super('Security violation');
    }
  }

  toPlain() {
    const { field, technical } = this;

    const o = { message: this.message };
    if (field) o.field = field.path.name;
    if (technical !== undefined) o.technical = technical;
    return o;
  }
}

Tyr.SecureError = SecureError;
