
import * as os from 'os';
import moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';


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


Instance.boot = async function(stage/*, pass*/) {

  if (!compiled && stage === 'compile') {
    const old = moment().subtract(30, 'minutes');

    await Instance.db.remove({ lastAliveOn: { $lt: old.toDate() } });

    const instanceId = Tyr.instanceId = os.hostname().replace(/[-\.:]/g, '_');

    function heartbeat() {
      Instance.db.save({
        _id: instanceId,
        lastAliveOn: new Date()
      });
    }

    heartbeat();

    setInterval(heartbeat, 15 * 60 * 1000 /* 15 minutes */);
    
    compiled = true;
  }
}

export default Instance;
