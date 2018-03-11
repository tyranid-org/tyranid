"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const namePath_1 = require("./namePath");
const mongodb_1 = require("mongodb");
const projection_1 = require("./projection");
const $all = tyr_1.default.$all;
class Population {
    constructor(namePath, projection) {
        if (!(namePath instanceof namePath_1.default)) {
            throw new Error('parameter namePath is not an instanceof NamePath, got: ' + namePath);
        }
        this.namePath = namePath;
        this.projection = projection;
    }
    static parse(populator, base, fields) {
        const rootCollection = base; // TODO:  need to eliminate this
        let namePath;
        if (base instanceof namePath_1.default) {
            namePath = base;
        }
        else {
            namePath = base.parsePath('');
        }
        // TODO:  deprecate the old string and array population options so we can do:
        //if (true && base instanceof Tyr.Collection) {
        //  fields = projectionFns.resolve(base.def.projections, value);
        //} else {
        // Step 2 would be to eliminate the separate "population" option and just have "fields" perform combined projection/population duties
        if (_.isString(fields)) {
            // process the really simple format -- a simple path name
            fields = [fields];
        }
        if (Array.isArray(fields)) {
            // process simplified array of pathnames format
            return new Population(namePath, fields.map(function (field) {
                if (!_.isString(field)) {
                    throw new Error('The simplified array format must contain an array of strings that contain pathnames.  Use the object format for more advanced queries.');
                }
                return new Population(base.parsePath(field), [$all]);
            }));
        }
        //}
        if (_.isObject(fields)) {
            // process advanced object format which supports nested populations and projections
            const parseProjection = function (base, fields) {
                const projection = [];
                _.each(fields, function (value, key) {
                    if (key === $all) {
                        projection.push($all);
                    }
                    else {
                        const namePath = base.parsePath(key);
                        if (value === 0 || value === false) {
                            projection.push(new Population(namePath, false));
                        }
                        else if (value === 1 || value === true) {
                            projection.push(new Population(namePath, true));
                        }
                        else {
                            const link = namePath.detail.link;
                            if (!link) {
                                throw new Error('Cannot populate ' + base.toString() + '.' + namePath + ' -- it is not a link');
                            }
                            if (value === $all) {
                                projection.push(new Population(namePath, $all));
                            }
                            else {
                                const linkCol = tyr_1.default.byId[link.id];
                                value = projection_1.default.resolve(linkCol.def.projections, value);
                                if (!_.isObject(value)) {
                                    throw new Error('Invalid populate syntax at ' + base.toString() + '.' + namePath + ': ' + value);
                                }
                                projection.push(new Population(namePath, parseProjection(linkCol, value)));
                            }
                        }
                    }
                });
                if (base instanceof tyr_1.default.Collection) {
                    populator.cacheFor(base.id).project(projection);
                }
                return projection;
            };
            return new Population(base.parsePath(''), parseProjection(rootCollection, fields));
        }
        throw new Error('missing opts.fields option to populate()');
    }
    isSimple() {
        return _.isBoolean(this.projection);
    }
    hasNestedPopulations() {
        const proj = this.projection;
        if (Array.isArray(proj)) {
            return this.projection.some(pop => pop instanceof Population);
        }
        else {
            return false;
        }
    }
    /*
     * TODO:  should we mark populated values as enumerable: false ?
     */
    async populate(populator, documents) {
        const population = this;
        population.projection.forEach(population => {
            if (population instanceof Population && !population.isSimple()) {
                populator.addIds(population, documents);
            }
        });
        // wait for population of missing ids
        await populator.queryMissingIds();
        // create function to map projection
        const populateIds = population => {
            if (!(population instanceof Population) || population.isSimple()) {
                return;
            }
            let nestedDocs;
            if (population.hasNestedPopulations()) {
                nestedDocs = [];
            }
            const namePath = population.namePath;
            documents.forEach(function (obj) {
                const cache = populator.cacheFor(namePath.detail.link.id), path = namePath.path, plen = path.length;
                function mapIdsToObjects(obj) {
                    if (Array.isArray(obj)) {
                        const arr = new Array(obj.length);
                        for (let ai = 0, alen = obj.length; ai < alen; ai++) {
                            arr[ai] = mapIdsToObjects(obj[ai]);
                        }
                        return arr;
                    }
                    else if (_.isObject(obj) && !mongodb_1.ObjectId.isValid(obj.toString())) {
                        throw new Error('Got object when expected a link value');
                    }
                    else if (!obj) {
                        return obj;
                    }
                    else {
                        obj = cache.values[obj.toString()];
                        if (nestedDocs) {
                            nestedDocs.push(obj);
                        }
                        return obj;
                    }
                }
                function walkToEndOfPath(pi, obj) {
                    const name = path[pi];
                    if (Array.isArray(obj)) {
                        for (let ai = 0, alen = obj.length; ai < alen; ai++) {
                            walkToEndOfPath(pi, obj[ai]);
                        }
                    }
                    else if (obj === undefined || obj === null) {
                        return;
                    }
                    else if (pi === plen - 1) {
                        const pname = namePath_1.default.populateNameFor(name, populator.denormal);
                        obj[pname] = mapIdsToObjects(obj[name]);
                    }
                    else if (!_.isObject(obj)) {
                        throw new Error('Expected an object or array at ' + namePath.pathName(pi) + ', but got ' + obj);
                    }
                    else {
                        walkToEndOfPath(pi + 1, obj[path[pi]]);
                    }
                }
                walkToEndOfPath(0, obj);
            });
            if (nestedDocs) {
                return population.populate(populator, nestedDocs);
            }
            else {
                return Promise.resolve();
            }
        };
        // wait for resolution of all
        return await Promise.all(population.projection.map(populateIds));
    }
    static fromClient(population) {
        for (const k in population) {
            const v = population[k];
            if (_.isObject(v)) {
                population[k] = Population.fromClient(v);
            }
            else {
                const i = parseInt(v, 10);
                if (!isNaN(i)) {
                    population[k] = i;
                }
            }
        }
        return population;
    }
}
exports.default = Population;
//# sourceMappingURL=population.js.map