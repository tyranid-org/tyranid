
import * as os from 'os';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from './collection';

import Query from './query';

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
        },
        users: {
          [userId: string]: boolean
        }
      }
    }
  }
}
*/

let localListeners /*: LocalListener*/ = {};

async function parseSubscriptions(subscription) {
  const subs = subscription ? [ subscription ] : await Subscription.findAll({});
  //con sole.log(Tyr.instanceId + ' *** parseSubscriptions, ' + subs.length + ' subs');

  if (!subscription) {
    // if we're reparsing all subs, clear out existing data
    localListeners = {};
  }

  for (const sub of subs) {
    const colId = sub.c,
          col   = Tyr.byId[colId];

    let listener = localListeners[colId];

    if (!localListeners[colId]) {
      const changeHandler = col.on({
        type: 'change',
        handler: async event => {
          //con sole.log(Tyr.instanceId + ' *** ' + col.def.name + ' change:', event);
          const { document, query } = event;

          for (const queryStr in listener.queries) {
            const queryDef = listener.queries[queryStr];
            let refinedQuery = query;

            if (document) {
              if (!Query.matches(queryDef.queryObj, document)) continue;
              refinedQuery = undefined;

            } else /*if (query)*/ {
              refinedQuery = Query.intersection(queryDef.queryObj, query);
              if (!refinedQuery) continue;

            }

            //con sole.log(Tyr.instanceId + ' *** matched');
            //con sole.log(Tyr.instanceId + ' *** queryDef.instances', queryDef.instances);
            for (const instanceId in queryDef.instances) {
              const event = new Tyr.Event({
                collection: Subscription,
                dataCollectionId: colId,
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
      });

      listener = localListeners[colId] = {
        changeHandler,
        queries: {}
      };
    }

    const queryStr = sub.q;

    let queryDef = listener.queries[queryStr];
    if (!queryDef) {
      queryDef = listener.queries[queryStr] = {
        queryObj: col.fromClientQuery(JSON.parse(queryStr)),
        instances: {},
        users: {}
      };
    }

    queryDef.instances[sub.i] = true;
    queryDef.users[sub.u] = true;
  }
}

Subscription.on({
  type: 'subscribe',
  async handler(event) {
    await parseSubscriptions(event.subscription);
  }
});

Subscription.on({
  type: 'unsubscribe',
  async handler(event) {
    // TODO:  pass in user and only unsubscribe the user rather than reparsing?
    await parseSubscriptions();
  }
});

//let bootNeeded = 'Subscription needs to be booted';
Subscription.boot = async function(stage, pass) {

  if (stage === 'link' && Tyr.db) {
  //if (bootNeeded) {
    await parseSubscriptions();

    //bootNeeded = undefined;
  //}

    return undefined; //bootNeeded;
  }
};

Collection.prototype.subscribe = async function(query, user) {
  //con sole.log(Tyr.instanceId + ' *** subscribe:', query, user);
  const queryStr = JSON.stringify(query);

  const subscription = await Subscription.findOne({
    query: {
      u: user._id,
      c: this.id,
      q: queryStr
    }
  });

  if (!subscription || subscription.i !== Tyr.instanceId) {
    if (subscription) {
      await subscription.$remove();
    }

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
        collection: Subscription,
        type: 'subscribe',
        when: 'pre',
        broadcast: true,
        subscription: s
      })
    );
  }
};

Subscription.unsubscribe = async function(user) {
  const rslts = await Subscription.remove({
    query: {
      u: user._id
    }
  });

  if (rslts.result.n) {
    await Tyr.Event.fire(
      new Tyr.Event({
        collection: Subscription,
        type: 'unsubscribe',
        when: 'pre',
        broadcast: true
      })
    );
  }
};

async function handleSubscriptionEvent(event) {
  //con sole.log(Tyr.instanceId + ' *** handleSubscriptionEvent:', event);
  const col = event.dataCollection,
        listener = localListeners[col.id],
        mQuery = event.query,
        mDoc = event.document;

  if (listener) {
    const userIds = {};

    for (const queryStr in listener.queries) {
      const queryDef = listener.queries[queryStr];

      if (mQuery) {
        if (Query.intersection(queryDef.query, mQuery)) {
          for (const userId in queryDef.users) {
            userIds[userId] = true;
          }
        }
      } else { // if mDoc
        if (Query.matches(queryDef.query, mDoc)) {
          for (const userId in queryDef.users) {
            userIds[userId] = true;
          }
        }
      }
    }

    const documents = await event.documents;
    const sockets = Tyr.io.sockets.sockets;
    for (const socketId in sockets) {
      const socket = sockets[socketId];
      if (userIds[socket.userId]) {
        socket.emit('subscriptionEvent', {
          colId: event.dataCollectionId,
          docs: documents.map(doc => doc.$toClient())
        });
      }
    }
  }
}

Subscription.on({
  type: 'subscriptionEvent',
  handler: handleSubscriptionEvent
});

export default Subscription;
