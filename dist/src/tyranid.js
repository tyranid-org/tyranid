"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const glob = require("glob");
const tyr_1 = require("./tyr");
require("./type/array");
require("./type/boolean");
require("./type/date");
require("./type/datetime");
require("./type/double");
require("./type/email");
require("./type/image");
require("./type/integer");
require("./type/link");
require("./type/mongoId");
require("./type/object");
require("./type/password");
require("./type/string");
require("./type/time");
require("./type/uid");
require("./type/url");
const type_1 = require("./core/type");
require("./core/component");
require("./core/collection");
require("./core/event");
require("./core/field");
require("./core/index");
require("./core/instance");
require("./core/subscription");
require("./core/validationError");
require("./core/namePath");
require("./core/query");
require("./fake");
require("./migrator");
require("./timer");
require("./log/log");
require("./diff/diff");
require("./secure/secure");
require("./unit/unitSystem");
require("./unit/unitFactor");
require("./unit/unitType");
require("./unit/unit");
require("./unit/units");
const express_1 = require("./express");
require("./schema");
const options = tyr_1.default.options;
/*

   TODO:

   * server inherits client objects

   * validation (server vs. client)

   * authorized methods + filtering attributes to the client

   * offline support

   * store cache on client

   * link ownership

   * how do we share code between server and client from the same source .js file ?

   * database integrity analysis (find orphans, bad links, etc.)

   * pre-calc aggregation

  Collection Schema BNF:

  <field def>: {
    is:    <string, a field type>,
    as:    <string, a label>,
    help:  <string, end-user notes>,
    notes: <string, developer notes>,
    link:  <string, a collection name ... is is implied for this>
    ...
  }

  <field>:
      <field def>
    | [ <field> ]
    | <field object>

  <field object>:
    { ( <field name>: <field> )* }

  <schema>: {
    name:  <string>,
    id:    <3-character alphanum beginning with a non-hex alphanum character>,
    db:    <mongodb database>, // optional, if not present will default to options.db
    fields: <field object>
  }

*/
const bootstrappedComponents = [];
_.assign(tyr_1.default, {
    version: require('../../package.json').version,
    generateClientLibrary: express_1.generateClientLibrary,
    async config(opts) {
        if (!opts) {
            return options;
        }
        // clear object but keep reference
        for (const prop in options) {
            delete options[prop];
        }
        _.extend(options, opts);
        if (opts.db) {
            const db = this.db = opts.db;
            tyr_1.default.collections.forEach(collection => {
                if (!collection.db) {
                    const server = collection.server;
                    collection.db = server ?
                        this.servers[server] :
                        db.collection(collection.def.dbName);
                }
            });
        }
        else {
            console.warn('******** no "db" property passed to config, boostraping Tyranid without database! ********');
        }
        if (opts.validate) {
            await this.validate(opts.validate);
        }
        // ensure permission defaults
        const p = options.permissions = options.permissions || {};
        for (const perm of ['find', 'insert', 'update', 'remove']) {
            if (!p[perm]) {
                p[perm] = perm;
            }
        }
        if (opts.indexes && opts.db) {
            await this.createIndexes();
        }
    },
    async validate(opts) {
        if (opts && opts !== true) {
            function process(dirOpts) {
                const globPattern = dirOpts.glob;
                if (globPattern) {
                    for (const file of glob.sync(globPattern, {})) {
                        require(file);
                    }
                }
                else {
                    if (!dirOpts.dir) {
                        throw new Error('dir not specified in validate option.');
                    }
                    const fileRe = dirOpts.fileMatch ? new RegExp(dirOpts.fileMatch) : undefined;
                    fs
                        .readdirSync(dirOpts.dir)
                        .filter(file => !fileRe || fileRe.test(file))
                        .forEach(file => {
                        const fileName = dirOpts.dir + '/' + file;
                        if (!fs.lstatSync(fileName).isDirectory()) {
                            require(fileName);
                        }
                    });
                }
            }
            if (_.isArray(opts)) {
                opts.forEach(process);
            }
            else {
                process(opts);
            }
        }
        const secure = options.secure;
        if (secure) {
            // TODO:  if options.secure is an array of Secures, set Tyr.secure to a
            //        composite Secure that has the array of options.secure as children
            tyr_1.default.secure = secure;
            tyr_1.default.components.push(secure);
        }
        async function bootstrap(stage) {
            const bootstrapping = tyr_1.default.components.filter(col => col.boot && !_.includes(bootstrappedComponents, col));
            let reasons;
            for (let pass = 1; bootstrapping.length && pass < 100; pass++) {
                reasons = [];
                for (let i = 0; i < bootstrapping.length;) {
                    let thisReasons = await bootstrapping[i].boot(stage, pass);
                    if (thisReasons && !_.isArray(thisReasons)) {
                        thisReasons = [thisReasons];
                    }
                    if (thisReasons && thisReasons.length) {
                        reasons.push(...thisReasons);
                        i++;
                    }
                    else {
                        if (stage === 'post-link') {
                            bootstrappedComponents.push(bootstrapping[i]);
                        }
                        bootstrapping.splice(i, 1);
                    }
                }
            }
            if (bootstrapping.length) {
                throw new Error(`Tyranid could not boot during ${stage} stage after 100 passes.\n\n` +
                    'Deadlocked collections: ' +
                    bootstrapping.map(c => c.def.name).join(', ') +
                    '\n\nReasons:\n' +
                    reasons.map(r => '  ' + r).join('\n'));
            }
        }
        await bootstrap('compile');
        function parseLogLevel(name) {
            const ll = options[name];
            if (_.isString(ll)) {
                options[name] = tyr_1.default.byName.tyrLogLevel.byLabel(ll);
                if (!options[name]) {
                    throw new Error(`Unknown ${name}: "${ll}".`);
                }
            }
        }
        parseLogLevel('logLevel');
        parseLogLevel('clientLogLevel');
        parseLogLevel('consoleLogLevel');
        parseLogLevel('dbLogLevel');
        for (const col of tyr_1.default.collections) {
            col.compile('link');
        }
        await bootstrap('link');
        await bootstrap('post-link');
        const migration = options.migration;
        if (migration && migration.migrate) {
            await tyr_1.default.migrate();
        }
    },
    /**
     * Mostly just used by tests, not rigorous.
     * @private
     */
    forget(collectionId) {
        const col = tyr_1.default.byId[collectionId];
        if (col) {
            _.remove(tyr_1.default.collections, col => col.id === collectionId);
            _.remove(bootstrappedComponents, comp => comp.id === collectionId);
            delete tyr_1.default.byId[collectionId];
            delete type_1.default.byName[col.def.name];
        }
    }
});
if (global.__TyranidGlobal) {
    throw new Error(`Multiple versions of tyranid are being required, only one global tyranid can exist! ` +
        `Tried to create tyranid version = ${tyr_1.default.version} but ` +
        `global tyranid version = ${global.__TyranidGlobal.version} exists!`);
}
global.__TyranidGlobal = exports.Tyr = tyr_1.default;
exports.default = tyr_1.default;
//# sourceMappingURL=tyranid.js.map