import * as os from 'os';
import * as process from 'process';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';

let thisInstanceId;

const Instance = new Collection({
  id: '_t2',
  name: 'tyrInstance',
  client: false,
  internal: true,
  fields: {
    _id: { is: 'string' },
    lastAliveOn: { is: 'date' }
  }
});

let compiled = false;

let eventdb;

Instance.boot = async function(stage /*, pass*/) {
  if (!Instance.db) {
    return;
  }

  if (!compiled && stage === 'compile') {
    const old = moment().subtract(30, 'minutes');

    const oldInstances = await Instance.db
      .find({ lastAliveOn: { $lt: old.toDate() } })
      .toArray();
    //con sole.log('*** oldInstances', oldInstances);
    for (const instance of oldInstances) {
      const id = instance._id,
        ic = Tyr.db.collection(id + '_event');

      try {
        await ic.drop();
      } catch (err) {
        if (!err.toString().match('ns not found')) {
          console.log(err);
        }
      }
    }

    await Instance.db.deleteMany({
      _id: { $in: oldInstances.map(i => i._id) }
    });

    try {
      await Tyr.db
        .collection('tyrSubscription')
        .deleteMany({ i: { $in: oldInstances.map(i => i._id) } });
    } catch (err) {
      if (!err.toString().match('ns not found')) {
        console.log(err);
      }
    }

    const instanceId = (thisInstanceId = Tyr.instanceId =
      os.hostname().replace(/[-\.:]/g, '_') + '_' + process.pid);
    //con sole.log('*** instanceId:', instanceId);

    // Heartbeat

    function heartbeat() {
      Instance.db.insertOne({
        _id: instanceId,
        lastAliveOn: new Date()
      });
    }

    heartbeat();

    setInterval(heartbeat, 15 * 60 * 1000 /* 15 minutes */);

    // Instance Event Queue

    eventdb = await Tyr.db.createCollection(instanceId + '_event', {
      capped: true,
      size: 1000000,
      max: 10000
    });

    const now = new Date();

    // tailable cursors won't await an empty collection, save a guard
    await eventdb.insertOne({ date: now, guard: true });

    /*
    const eventStream = eventdb.find(
      {
        // current need is for non-durable events, might expand this later on
        date: { $gte: now }
      }
    )
      .addCursorFlag('tailable', true)
      .addCursorFlag('awaitData', true)
      .addCursorFlag('noCursorTimeout', true)
      .sort({ $natural: -1 })
      .stream();
    */
    const eventStream = eventdb
      .find(
        {
          date: { $gte: now }
        },
        {
          tailable: true,

          awaitData: true,
          awaitdata: true,
          await_data: true,

          timeout: false,
          numberOfRetries: Number.MAX_VALUE
        }
      )
      .stream();

    eventStream.on('data', event => {
      //con sole.log(instanceId + ' *** event on capped collection:', event);
      if (!event.guard) {
        // ignore guard event
        const Event = Tyr.Event;
        event = new Event(event);

        // if the event contains an inline document, we need to wrap it
        const doc = event.document;
        if (doc) {
          const docCol = event.dataCollection;

          if (docCol && !(doc instanceof docCol)) {
            event.document = new docCol(doc);
          }
        }

        Event.handle(event);
      }
    });

    compiled = true;
  }
};

export default Instance;
