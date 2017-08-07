
import * as os from 'os';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';



let thisInstanceId;

const Instance = new Collection({
  id: '_t2',
  name: 'tyrInstance',
  client: false,
  fields: {
    _id:         { is: 'string' },
    lastAliveOn: { is: 'date' }
  }
});

Instance.prototype.fireEvent = function(event) {
  const edb = Tyr.db.collection(this._id + '-event');

  delete event._id;
  edb.save(event);
};

Instance.broadcastEvent = async function(event) {
  const cutoff = moment().subtract(30, 'minutes').toDate();

  const instances = await Instance.findAll({
    query: {
      _id: { $ne: thisInstanceId },
      lastAliveOn: { $gte: cutoff }
    }
  });

  for (const instance of instances) {
    instance.fireEvent(event);
  }
};

let compiled = false;

let eventdb;

Instance.boot = async function(stage/*, pass*/) {

  if (!Instance.db) {
    console.log(`bootstrapping without database, skipping instance boot...`);
    return;
  }

  if (!compiled && stage === 'compile') {
    const old = moment().subtract(30, 'minutes');

    await Instance.db.remove({ lastAliveOn: { $lt: old.toDate() } });

    const instanceId = thisInstanceId = Tyr.instanceId = os.hostname().replace(/[-\.:]/g, '_');


    // Heartbeat

    function heartbeat() {
      Instance.db.save({
        _id: instanceId,
        lastAliveOn: new Date()
      });
    }

    heartbeat();

    setInterval(heartbeat, 15 * 60 * 1000 /* 15 minutes */);


    // Instance Event Queue

    eventdb = await Tyr.db.createCollection(
      instanceId + '-event',
      {
        capped: true,
        size: 1000000,
        max: 10000
      }
    );

    // current need is for non-durable events, might expand this later on
    await eventdb.remove({});

    const eventStream = eventdb.find(
      {}, //filter
      {
        tailable: true,
        awaitdata: true,
        numberOfRetries: -1
      }
    ).sort({ $natural: -1 }).stream();

    eventStream.on('data', event => Event.handle(new Event(event)));

    compiled = true;
  }
};

export default Instance;
