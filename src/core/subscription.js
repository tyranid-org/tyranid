
import * as os from 'os';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';

import * as query from './query';

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

/*
interface LocalListener {
  [collectionId: string]: {
    changeHandler: Event => void,
    queries: {
      [queryStr: string]: {
        queryObj: MongoDBQuery,
        instances: {
          [instanceId: string]: boolean
        }
      }
    }
  }
}
*/

const localListeners /*: LocalListener*/ = {};

async function parseSubscriptions(subscription) {
  const subs = subscription ? [ subscription ] : await Subscription.findAll({});

  for (const sub of subs) {
    const colId = sub.c,
          col   = Tyr.byId[colId];

    let listener = localListeners[colId];

    if (!localListeners[colId]) {
      const changeHandler = col.on({
        type: 'changed',
        handler: async event => {
          const { document, query } = event;

          for (const queryDef of listener.queries) {
            let refinedQuery = query,
                matched;

            if (document) {
              if (!query.matches(queryDef.queryObj, document)) continue;
              refinedQuery = undefined;

            } else /*if (query)*/ {
              refinedQuery = query.intersection(queryDef.queryObj, query);
              if (!refinedQuery) continue;

            }

            if (matched) {
              for (const instanceId of queryDef.instances) {
                const event = new Tyr.Event({
                  collection: Subscription.id,
                  query: refinedQuery,
                  document,
                  type: 'subscriptionEvent',
                  when: 'pre',
                  instanceId: instanceId
                });

                if (instanceId === Tyr.instanceId) {
                  handleSubscriptionEvent(event);
                } else {
                  await Tyr.Event.fire(event);
                }
              }
            }
          }
        }
      });

      listener = localListeners[colId] = {
        changeHandler,
        queries
      };
    }

    const queryStr = subscription.q;

    let queryDef = listener.queries[queryStr];
    if (!queryDef) {
      queryDef = listener.queries[queryStr] = {
        queryObj: JSON.parse(queryStr),
        instances: {}
      };
    }

    queryDef.instances[subscription.i] = true;
  }
}

Subscription.on({
  type: 'subscribe',
  async handler(event) {
    const { subscription } = event;

    await parseSubscriptions(subscription);
  }
});

//let bootNeeded = 'Subscription needs to be booted';
Subscription.boot = async function(/*stage, pass*/) {

  //if (bootNeeded) {
    await parseSubscriptions();
    //bootNeeded = undefined;
  //}

    return undefined; //bootNeeded;
};

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
        type: 'subscribe',
        when: 'pre',
        broadcast: true,
        subscription
      })
    );
  }
};

async function handleSubscriptionEvent(event) {
  const documents = await event.documents;

  // TODO:  send down updated documents to affected subscribers
}

Subscription.on({
  type: 'subscriptionEvent',
  handler(event) {
    handleSubscriptionEvent(event);
  }
});

export default Subscription;
