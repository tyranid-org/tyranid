
import Tyr from '../tyr';
import Collection from './collection';

/** @isomorphic */
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
    // collection is a computed property
    if (data.collection) {
      if (!data.collectionId) {
        data.collectionId = data.collection.id;
      }

      delete data.collection;
    }

    Object.assign(this, data);
    this.on = new Date();
  }

  preventDefault() {
    this.canceled = true;
  }

  get collection() {
    return Tyr.byId[this.collectionId];
  }

  get dataCollection() {
    return this.dataCollectionId ? Tyr.byId[this.dataCollectionId] : this.collection;
  }

  get documents() {
    if (this.document) {
      return Promise.resolve([ this.document ]);
    } else if (this.query) {
      return this.dataCollection.findAll({ query: this.query });
    }
  }

  static async fire(event) {
    event.date = new Date();

    const instanceId = event.instanceId !== Tyr.instanceId ? event.instanceId : undefined;

    if (!instanceId) {
      await Event.handle(event);

      if (!event.broadcast) return;
    }

    const instances = await Instance.findAll({
      _id: instanceId || { $ne: Tyr.instanceId },
      lastAliveOn: { $gte: moment().subtract(30, 'minutes').toDate() }
    });

    for (const instance of instances) {
      delete event._id;
      Tyr.db.collection(instance._id + '-event').save(event);
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
              //if (rslt.then) {
                //await rslt;
              //}

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
