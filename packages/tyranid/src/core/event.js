import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';
import Instance from './instance';

/** @isomorphic */
Collection.prototype.on = function(opts) {
  const { type } = opts;

  let types;
  switch (type) {
    case 'change':
      types = ['insert', 'update'];
      break;
    default:
      types = [type];
  }

  let events = this.events;
  if (!events) {
    events = this.events = {};
  }

  const optsArr = [];

  for (const type of types) {
    if (optsArr.length) {
      opts = Object.assign({}, opts);
    }

    opts.type = type;
    optsArr.push(opts);

    let handlers = events[type];
    if (!handlers) {
      handlers = events[type] = [];
    }

    if (!opts.when) {
      switch (type) {
        case 'find':
          opts.when = 'post';
          break;
        default:
          // TODO-ELK:  not sure this makes sense, this should probably be 'post' as well?
          opts.when = 'pre';
      }
    } else {
      switch (type) {
        case 'find':
          if (opts.when === 'pre') {
            throw new Error(`"find" event does not support "when: pre"`);
          }
      }
    }

    handlers.push(opts);
    handlers.sort((a, b) => {
      const aOrder = a.order !== undefined ? a.order : Number.POSITIVE_INFINITY,
        bOrder = b.order !== undefined ? b.order : Number.POSITIVE_INFINITY;

      if (aOrder < bOrder) return -1;
      return aOrder > bOrder ? 1 : 0;
    });
  }

  return function() {
    for (const opts of optsArr) {
      const handlers = events[opts.type],
        idx = handlers.indexOf(opts);

      if (idx >= 0) {
        handlers.splice(idx, 1);
      }
    }
  };
};

Collection.prototype.fire = function(event) {
  event.collection = this;
  return Tyr.Event.fire(event);
};

class EventCancelError {
  constructor() {}

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
    for (const p in data) {
      const v = data[p];

      if (p === 'collection') {
        // collection is a computed property
        if (!data.collectionId && v) {
          this.collectionId = v.id;
        }
      } else {
        this[p] = v;
      }
    }

    let opts = data.opts;
    if (!opts) {
      opts = this.opts = {};
    }

    if (opts.query && !this.query) {
      this.query = opts.query;
    }

    if (opts.update && !this.update) {
      this.update = opts.update;
    }

    this.on = new Date();
  }

  preventDefault() {
    this.canceled = true;
  }

  get collection() {
    return Tyr.byId[this.collectionId];
  }

  get dataCollection() {
    return this.dataCollectionId
      ? Tyr.byId[this.dataCollectionId]
      : this.collection;
  }

  get documents() {
    if (this.document) {
      return Promise.resolve([this.document]);
    } else if (this._documents) {
      return Promise.resolve(this._documents);
    } else if (this.query) {
      return this.dataCollection.findAll({ query: this.query });
    }
  }

  static async fire(event) {
    if (!event.when) {
      event.when = 'pre'; // TODO-ELK:  change this to 'post'
    }

    const instanceId =
      event.instanceId && event.instanceId !== Tyr.instanceId
        ? event.instanceId
        : undefined;

    if (!instanceId) {
      await Event.handle(event);

      if (!event.broadcast) return;
    }

    if (!event.date) {
      event.date = new Date();
    }

    if (event._id) {
      delete event._id;
    }

    const collection = event.collection;
    if (collection) {
      event.collectionId = collection.id;
      delete event.collection;
    }

    const instances = await Instance.findAll({
      query: {
        _id: instanceId || { $ne: Tyr.instanceId },
        lastAliveOn: {
          $gte: moment()
            .subtract(30, 'minutes')
            .toDate()
        }
      }
    });

    const adaptedEvent = Tyr.adaptIllegalKeyCharAndEliminateRecursion(event);
    //con sole.log(Tyr.instanceId + ' *** broadcasting to ', instances.map(i => i._id));
    await Promise.all(
      instances.map(instance =>
        Tyr.db.collection(instance._id + '_event').insertOne(adaptedEvent)
      )
    );
  }

  /** @private */
  static async handle(event) {
    //con sole.log(Tyr.instanceId + ' *** handle:', event);
    const collection = event.collection || Tyr.byId[event.collectionId];

    if (!collection) {
      console.warn('*** no collection for event', event);
      return;
    }

    const events = collection.events;

    if (events) {
      const handlers = events[event.type];

      if (handlers && handlers.length) {
        for (const onOpts of handlers) {
          // TODO-ELK:  should this be 'post' instead?
          const when = onOpts.when || 'pre';

          if (when === event.when || when === 'both') {
            try {
              // NOTE:  we wrap the event at the latest possible moment to avoid creating unnecessary Event objects
              if (!(event instanceof Event)) {
                event = new Event(event);
              }

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
