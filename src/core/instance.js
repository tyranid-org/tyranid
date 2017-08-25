
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

    const eventStream = eventdb.find(
      {
        // current need is for non-durable events, might expand this later on
        when: { $gte: new Date() }
      },
      {
        tailable: true,
        awaitdata: true,
        numberOfRetries: -1
      }
    ).stream();

    eventStream.on('data', event => Event.handle(new Event(event)));

    compiled = true;
  }
};

export default Instance;
