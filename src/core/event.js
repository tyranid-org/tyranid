

import Tyr from '../tyr';
import Collection from './collection';


Collection.prototype.on = function(eventName, handler) {

  let events = this.events;
  if (!events) {
    events = this.events = {};
  }

  let handlers = events[eventName];
  if (!handlers) {
    handlers = events[eventName] = [];
  }

  handlers.push(handler);

  return function() {
    const idx = handlers.indexOf(handler);

    if (idx >= 0) {
      handlers.splice(idx, 1);
    }
  }
};

const Event = Tyr.Event = function Event(type) {
  this.type = type;
};

Event.prototype.preventDefault = function() {
  this.canceled = true;
}


/** @private */
Event.fire = async function(obj, type, eventGen) {
  const events = obj.events;

  if (events) {
    const handlers = events[type];

    if (handlers && handlers.length) {
      const event = new Event(eventGen());
      event.type = type;

      for (const handler of handlers) {
        try {
          const rslt = await handler(event);

          if (rslt === false) {
            event.preventDefault();
          }
        } catch (err) {
          event.preventDefault();
          throw err;
        }

        if (event.canceled) {
          throw new Error('event canceled');
        }
      }
    }
  }
}

export default Event;
