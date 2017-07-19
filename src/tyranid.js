import * as _    from 'lodash';
import * as fs   from 'fs';
import * as glob from 'glob';

import Tyr from './tyr';

import './type/array';
import './type/boolean';
import './type/date';
import './type/double';
import './type/email';
import './type/image';
import './type/integer';
import './type/link';
import './type/mongoId';
import './type/object';
import './type/password';
import './type/string';
import './type/uid';
import './type/url';

import Type from './core/type';

import './core/component';
import './core/collection';
import './core/event';
import './core/field';
import './core/validationError';
import './core/namePath';
import './core/query';

import './log/log';

import './diff/diff';
import './secure/secure';

import './unit/unitSystem';
import './unit/unitFactor';
import './unit/unitType';
import './unit/unit';
import './unit/units';

import { generateClientLibrary } from './express';

import /*Schema from */ './schema';

const options = Tyr.options;


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

_.assign(Tyr, {

  version: require('../../package.json').version,

  generateClientLibrary,

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
      Tyr.collections.forEach(collection => {
        if (!collection.db) {
          const server = collection.server;
          collection.db = server ?
            this.servers[server] :
            db.collection(collection.def.dbName);
        }
      });
    } else {
      console.warn('******** no `db` property passed to config, boostraping Tyranid without database! ********');
    }

    if (opts.validate) {
      this.validate(opts.validate);
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

  validate(opts) {
    if (opts && opts !== true) {
      function process(dirOpts) {
        const globPattern = dirOpts.glob;
        if (globPattern) {
          for (const file of glob.sync(globPattern, {})) {
            require(file);
          }
        } else {
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
      } else {
        process(opts);
      }
    }

    const secure = options.secure;
    if (secure) {
      // TODO:  if options.secure is an array of Secures, set Tyr.secure to a
      //        composite Secure that has the array of options.secure as children
      Tyr.secure = secure;
      Tyr.components.push(secure);
    }

    function bootstrap(stage) {
      const bootstrapping = Tyr.components.filter(col => col.boot);
      let reasons;

      for (let pass=1; bootstrapping.length && pass < 100; pass++) {
        reasons = [];
        for (let i=0; i<bootstrapping.length; ) {
          let thisReasons = bootstrapping[i].boot(stage, pass);
          if (thisReasons && !_.isArray(thisReasons)) {
            thisReasons = [ thisReasons ];
          }

          if (thisReasons && thisReasons.length) {
            reasons.push(...thisReasons);
            i++;
          } else {
            bootstrapping.splice(i, 1);
          }
        }
      }

      if (bootstrapping.length) {
        throw new Error(
          `Tyranid could not boot during ${stage} stage after 100 passes.\n\n` +
          'Deadlocked collections: ' +
          bootstrapping.map(c => c.def.name).join(', ') +
          '\n\nReasons:\n' +
          reasons.map(r => '  ' + r).join('\n'));
      }

      function parseLogLevel(name) {
        const ll = options[name];
        if (_.isString(ll)) {
          options[name] = Tyr.byName.tyrLogLevel.byLabel(ll);

          if (!options[name]) {
            throw new Error(`Unknown ${name}: "${ll}".`);
          }
        }
      }

      parseLogLevel('logLevel');
      parseLogLevel('clientLogLevel');
      parseLogLevel('consoleLogLevel');
      parseLogLevel('dbLogLevel');
    }

    bootstrap('compile');

    for (const col of Tyr.collections) {
      col.compile('link');
    }

    bootstrap('link');

    bootstrap('post-link');
  },


  async createIndexes() {
    for (const col of Tyr.collections) {
      const indexes = col.def.indexes;

      if (indexes && col.db) {
        let existingIndexes;

        try {
          existingIndexes = await col.db.indexes();
        } catch (err) {
          if (/no (collection|database)/.test(err.message)) {
            continue;
          } else {
            throw err;
          }
        }

        for (const ei of existingIndexes) {
          if (ei.name === '_id_') {
            // ignore the default _id key
          } else {
            const ni = indexes.find(i => i.name === ei.name);

            if (!ni || !_.eq(ni.key, ei.key)) {
              await col.db.dropIndex(ei.name);
            }
          }
        }
        await col.db.createIndexes(indexes);
      }
    }
  },


  /**
   * Mostly just used by tests, not rigorous.
   * @private
   */
  forget(collectionId) {
    const col = Tyr.byId[collectionId];

    if (col) {
      _.remove(Tyr.collections, col => col.id === collectionId);
      delete Tyr.byId[collectionId];
      delete Type.byName[col.def.name];
    }
  }
});

if (global.__TyranidGlobal) {
  throw new Error(
    `Multiple versions of tyranid are being required, only one global tyranid can exist! ` +
    `Tried to create tyranid version = ${Tyr.version} but ` +
    `global tyranid version = ${global.__TyranidGlobal.version} exists!`
  );
}

global.__TyranidGlobal = exports.Tyr = Tyr;

export default Tyr;
