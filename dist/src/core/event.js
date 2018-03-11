"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const tyr_1 = require("../tyr");
const collection_1 = require("./collection");
const instance_1 = require("./instance");
/** @isomorphic */
collection_1.default.prototype.on = function (opts) {
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
                    opts.when = 'pre';
            }
        }
        else {
            switch (type) {
                case 'find':
                    if (opts.when === 'pre') {
                        throw new Error(`"find" event does not support "when: pre"`);
                    }
            }
        }
        handlers.push(opts);
    }
    return function () {
        for (const opts of optsArr) {
            const handlers = events[opts.type], idx = handlers.indexOf(opts);
            if (idx >= 0) {
                handlers.splice(idx, 1);
            }
        }
    };
};
collection_1.default.prototype.fire = function (event) {
    event.collection = this;
    return tyr_1.default.Event.fire(event);
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
tyr_1.default.EventCancelError = EventCancelError;
class Event {
    constructor(data) {
        for (const p in data) {
            const v = data[p];
            if (p === 'collection') {
                // collection is a computed property
                if (!data.collectionId && v) {
                    this.collectionId = v.id;
                }
            }
            else {
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
        return tyr_1.default.byId[this.collectionId];
    }
    get dataCollection() {
        return this.dataCollectionId ? tyr_1.default.byId[this.dataCollectionId] : this.collection;
    }
    get documents() {
        if (this.document) {
            return Promise.resolve([this.document]);
        }
        else if (this._documents) {
            return Promise.resolve(this._documents);
        }
        else if (this.query) {
            return this.dataCollection.findAll({ query: this.query });
        }
    }
    static async fire(event) {
        const instanceId = event.instanceId !== tyr_1.default.instanceId ? event.instanceId : undefined;
        if (!instanceId) {
            await Event.handle(event);
            if (!event.broadcast)
                return;
        }
        if (!event.date) {
            event.date = new Date();
        }
        const collection = event.collection;
        if (collection) {
            event.collectionId = collection.id;
            delete event.collection;
        }
        const instances = await instance_1.default.findAll({
            query: {
                _id: instanceId || { $ne: tyr_1.default.instanceId },
                lastAliveOn: { $gte: moment().subtract(30, 'minutes').toDate() }
            }
        });
        //con sole.log(Tyr.instanceId + ' *** broadcasting to ', instances.map(i => i._id));
        for (const instance of instances) {
            delete event._id;
            await tyr_1.default.db.collection(instance._id + '_event').save(event);
        }
    }
    /** @private */
    static async handle(event) {
        //con sole.log(Tyr.instanceId + ' *** handle:', event);
        const collection = event.collection || tyr_1.default.byId[event.collectionId];
        if (!collection) {
            console.warn('*** no collection for event', event);
            return;
        }
        const events = collection.events;
        if (events) {
            const handlers = events[event.type];
            if (handlers && handlers.length) {
                for (const onOpts of handlers) {
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
                        }
                        catch (err) {
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
exports.default = Event;
tyr_1.default.Event = Event;
exports.default = Event;
//# sourceMappingURL=event.js.map