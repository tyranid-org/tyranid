"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const process = require("process");
const moment = require("moment");
const tyr_1 = require("../tyr");
const collection_1 = require("./collection");
let thisInstanceId;
const Instance = new collection_1.default({
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
Instance.boot = async function (stage /*, pass*/) {
    if (!Instance.db) {
        console.log('bootstrapping without database, skipping instance boot...');
        return;
    }
    if (!compiled && stage === 'compile') {
        const old = moment().subtract(30, 'minutes');
        const oldInstances = await Instance.db.find({ lastAliveOn: { $lt: old.toDate() } }).toArray();
        //con sole.log('*** oldInstances', oldInstances);
        for (const instance of oldInstances) {
            const id = instance._id, ic = tyr_1.default.db.collection(id + '_event');
            try {
                await ic.drop();
            }
            catch (err) {
                if (!err.toString().match('ns not found')) {
                    console.log(err);
                }
            }
        }
        await Instance.db.remove({ _id: { $in: oldInstances.map(i => i._id) } });
        try {
            await tyr_1.default.db.collection('tyrSubscription').remove({ i: { $in: oldInstances.map(i => i._id) } });
        }
        catch (err) {
            if (!err.toString().match('ns not found')) {
                console.log(err);
            }
        }
        const instanceId = thisInstanceId = tyr_1.default.instanceId = os.hostname().replace(/[-\.:]/g, '_') + '_' + process.pid;
        //con sole.log('*** instanceId:', instanceId);
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
        eventdb = await tyr_1.default.db.createCollection(instanceId + '_event', {
            capped: true,
            size: 1000000,
            max: 10000
        });
        const now = new Date();
        // tailable cursors won't await an empty collection, save a guard
        await eventdb.save({ date: now, guard: true });
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
        const eventStream = eventdb.find({
            date: { $gte: now }
        }, {
            tailable: true,
            awaitData: true,
            awaitdata: true,
            await_data: true,
            timeout: false,
            numberOfRetries: Number.MAX_VALUE
        }).stream();
        eventStream.on('data', event => {
            //con sole.log(instanceId + ' *** event on capped collection:', event);
            if (!event.guard) {
                const Event = tyr_1.default.Event;
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
exports.default = Instance;
//# sourceMappingURL=instance.js.map