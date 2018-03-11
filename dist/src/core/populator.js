"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const historical_1 = require("../historical/historical");
const $all = tyr_1.default.$all;
class Cache {
    constructor(colId) {
        this.colId = colId;
        this.col = tyr_1.default.byId[colId];
        this.fields = {};
        /**
         * values maps ids to:
         *
         *   undefined:  this id has not been requested yet
         *   null:       this id has been requested but we don't have a doc for it yet
         *   document:   this id has been requested and we have a doc for it
         */
        this.values = {};
    }
    project(projection) {
        const fields = this.fields;
        for (const p of projection) {
            if (p === $all) {
                fields.$all = 1;
            }
            else {
                const pathName = p.namePath.spath, existing = fields[pathName], target = (p.projection && 1) || 0;
                if (target || !existing) {
                    if (!target && pathName === '_id') {
                        throw new Error('_id is required on populated objects');
                    }
                    fields[pathName] = target;
                }
            }
        }
    }
}
class Populator {
    constructor(denormal, opts) {
        this.denormal = denormal;
        this.opts = opts || {};
        this.cachesByColId = {};
    }
    cacheFor(colId) {
        let cache = this.cachesByColId[colId];
        if (!cache) {
            this.cachesByColId[colId] = cache = new Cache(colId);
        }
        return cache;
    }
    addIds(population, documents) {
        const namePath = population.namePath;
        const link = namePath.detail.link;
        if (!link) {
            throw new Error('Cannot populate ' + namePath + ' -- it is not a link');
        }
        const linkId = link.id, cache = this.cacheFor(linkId);
        documents.forEach(function (doc) {
            _.each(namePath.uniq(doc), function (id) {
                if (id) {
                    const v = cache.values[id];
                    if (v === undefined) {
                        cache.values[id] = null;
                    }
                }
            });
        });
    }
    async queryMissingIds() {
        const asOf = this.opts.asOf;
        return await Promise.all(_.map(this.cachesByColId, async (cache, colId) => {
            const collection = tyr_1.default.byId[colId], primaryKeyField = collection.def.primaryKey.field, idType = collection.fields[primaryKeyField].type;
            const ids = [];
            _.each(cache.values, (v, k) => {
                if (v === null) {
                    // TODO:  once we can use ES6 Maps we can get rid of
                    // this string conversion -- due to keys having to be
                    // strings on regular objects
                    ids.push(idType.fromString(k));
                }
            });
            if (!ids.length)
                return;
            const opts = {};
            let fields = cache.fields;
            if (fields && !fields.$all && !_.isEmpty(fields)) {
                opts.fields = fields;
            }
            else {
                fields = undefined;
            }
            const linkDocs = await collection.byIds(ids, opts), isHistorical = collection.def.historical;
            linkDocs.forEach(doc => {
                if (asOf && isHistorical) {
                    historical_1.default.asOf(collection, doc, asOf, fields);
                }
                cache.values[doc[primaryKeyField]] = doc;
            });
        }));
    }
}
exports.default = Populator;
//# sourceMappingURL=populator.js.map