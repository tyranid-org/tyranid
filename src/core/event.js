
import Tyr from '../tyr';
import Collection from './collection';

Collection.prototype.on = function(opts) {

  const { type } = opts;

  let events = this.events;
  if (!events) {
    events = this.events = {};
  }

  let handlers = events[type];
  if (!handlers) {
    handlers = events[type] = [];
  }

  handlers.push(opts);

  return function() {
    const idx = handlers.indexOf(opts);

    if (idx >= 0) {
      handlers.splice(idx, 1);
    }
  };
};

class EventCancelError {

  constructor() {
  }

  get message() {
    return 'Cancel from event handler';
  }

  toString() {
    return this.message();
  }
}

Tyr.EventCancelError = EventCancelError;

export default class Event {

  constructor(data) {
    Object.assign(this, data);
    this.on = new Date();
  }

  preventDefault() {
    this.canceled = true;
  }

  get documents() {
    if (this.document) {
      return Promise.resolve(this.document);
    } else if (this.query) {
      return this.collection.findAll({ query: this.query });
    }
  }

  /** @private */
  static async fire(event) {

    Event.handle(event);

    if (event.broadcast) {
      Instance.broadcastEvent(event);
    }
  }

  /** @private */
  static async handle(event) {
    const events = event.collection.events;

    if (events) {
      const handlers = events[event.type];

      if (handlers && handlers.length) {
        for (const onOpts of handlers) {
          const when = onOpts.when || 'pre';

          if (when === event.when || when === 'both') {
            try {
              const rslt = await onOpts.handler(event);

              if (rslt === false) {
                event.preventDefault();
              }
            } catch (err) {
              event.preventDefault();
              throw err;
            }

            if (event.canceled) {
              throw new EventCancelError();
            }
          }
        }
      }
    }
  }
}

Tyr.Event = Event;

export default Event;
