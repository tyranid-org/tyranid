
import * as os from 'os';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';


const Subscription = new Collection({
  id: '_t3',
  name: 'tyrSubscription',
  client: false,
  fields: {
    _id: { is: 'mongoid' },
    u:   { link: 'user', label: 'User' },
    c:   { is: 'string', label: 'Collection' },
    q:   { is: 'string', label: 'Query', note: 'Stringified MongoDB query.' },
    on:  { is: 'date' },

    // TODO:  this is temporary, long-term would like to hook up tyranid to session table and use that to
    //        determine user -> instance bindings
    i:   { is: 'string', label: 'Instance' },
  }
});

Collection.prototype.subscribe = async function(query, user) {

  const queryStr = JSON.stringify(query);

  const subscription = await Subscription.find({
    query: {
      u: user._id,
      c: this.id,
      q: queryStr
    }
  });

  if (!subscription) {
    const s = new Subscription({
      u: user._id,
      c: this.id,
      q: queryStr,
      on: new Date(),
      i: Tyr.instanceId
    });

    await s.$save();

    await Tyr.Event.fire(
      new Tyr.Event({
        collection: this.$model,
        type: 'subscriptionsUpdated',
        when: 'pre',
        broadcast: true,
        subscription
      })
    );
  }
}

Subscription.on({
  type: 'subscriptionsUpdated',
  handler(event) {
    const { subscription } = event;

    // TODO:  update local subscription list
  }
});

export default Subscription;
