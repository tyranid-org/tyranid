import * as _    from 'lodash';
import * as fs   from 'fs';
import * as glob from 'glob';
import * as stableStringify from 'json-stable-stringify';
import Tyr from './tyr';

import './type/array';
import './type/boolean';
import './type/date';
import './type/datetime';
import './type/double';
import './type/email';
import './type/image';
import './type/integer';
import './type/link';
import './type/mongoId';
import './type/object';
import './type/password';
import './type/string';
import './type/time';
import './type/uid';
import './type/url';

import Type from './core/type';

import './core/component';
import './core/collection';
import './core/event';
import './core/field';
import './core/instance';
import './core/subscription';
import './core/validationError';
import './core/namePath';
import './core/query';

import './fake';

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

const bootstrappedComponents = [];

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

    async function bootstrap(stage) {
      const bootstrapping = Tyr.components.filter(col => col.boot && !_.includes(bootstrappedComponents, col));
      let reasons;

      for (let pass = 1; bootstrapping.length && pass < 100; pass++) {
        reasons = [];
        for (let i = 0; i < bootstrapping.length; ) {
          let thisReasons = await bootstrapping[i].boot(stage, pass);
          if (thisReasons && !_.isArray(thisReasons)) {
            thisReasons = [ thisReasons ];
          }

          if (thisReasons && thisReasons.length) {
            reasons.push(...thisReasons);
            i++;
          } else {
            if (stage === 'post-link') {
              bootstrappedComponents.push(bootstrapping[i]);
            }

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
    }

    await bootstrap('compile');

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

    for (const col of Tyr.collections) {
      col.compile('link');
    }

    await bootstrap('link');

    await bootstrap('post-link');
  },

  async createIndexes() {
    for (const col of Tyr.collections) {
      await syncIndexes(col);
    }
  },

  /**
   * Mostly just used by tests, not rigorous.
   * @private
   */
  forget(collectionId) {
    const col = Tyr.byId[collectionId];

    if (col) {
      _.remove(Tyr.collections,        col  => col.id  === collectionId);
      _.remove(bootstrappedComponents, comp => comp.id === collectionId);
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

async function syncIndexes(col) {
  const indexes = col.def.indexes;
  if (indexes && col.db) {
    let existingIndexes;

    try {
      existingIndexes = await col.db.indexes();
    } catch (err) {
      if (/no (collection|database)/.test(err.message)) {
        return;
      } else {
        throw err;
      }
    }

    const alwaysInclude = new Set(['_id_']);

    const existingIndexesByName = _.indexBy(existingIndexes, i => toName(i));
    const existingIndexesByKey = _.indexBy(existingIndexes, i => stableStringify(i.key));

    const create = [];
    const keep = [];

    // loop through indexes that we want to create
    for (const index of indexes) {
      const keyHash = stableStringify(index.key);
      const nameHash = toName(index);
      // there is a match for the key and the name (might not be the same matching index!)
      if (keyHash in existingIndexesByKey && nameHash in existingIndexesByName) {
        // the index in the tyranid array has an identical existing index,
        if (existingIndexesByKey[keyHash] === existingIndexesByName[nameHash]) {
          // we want to keep this one
          keep.push(existingIndexesByName[nameHash]);
          continue;
        } else {
          // here, an index in the tyranid array has two different matching
          // existing indexes. One matches by name and a different one matches by key
          indexCreationConflict(
            index,
            existingIndexesByKey[keyHash],
            existingIndexesByName[nameHash]
          );
        }
      } else {
        // there is no matching index (key or name)
        // OR
        // the index matches by key, but not by name,
        // OR
        // the index matches by name, but not key
        //
        // so we create the new one (and implicity drop any existing...)
        create.push(index);
      }
    }

    /**
     * make sure we don't try to create two indexes with the same name
     */
    const createIndexesByName = _.indexBy(create, i => toName(i));
    for (const index of create) {
      const name = toName(index);
      if (createIndexesByName[name] !== index) {
        throw new Error(`Tried to create two indexes named ${name} for collection ${col.def.name}`);
      }
    }

    /**
     * make sure we don't create two indexes with the same key
     */
    const createIndexesByKey = _.indexBy(create, i => stableStringify(i.key));
    for (const index of create) {
      const key = stableStringify(index.key);
      if (createIndexesByKey[key] !== index) {
        throw new Error(
          `Tried to create two indexes with key = ${
            JSON.stringify(index.key, null, 2)
          } for collection ${col.def.name}`
        );
      }
    }

    const remove = existingIndexes.filter(i =>
      !alwaysInclude.has(toName(i)) &&
      !keep.some(k => k === i)
    );

    await Promise.all(remove.map(i => col.db.dropIndex(i)));
    await col.db.createIndexes(create);
  }

}

function toName(index) {
  if ( index.name ) {
    return index.name;
  }
  let ret = "";
  const key = index.key;
  // TODO: this is potentially a bug,
  // as `for in` is based on property creation order
  for (const k in key) {
    if (ret.length) {
      ret += '_';
    }
    ret += k + '_' + key[k];
  }
  return ret;
}

function indexCreationConflict(want, have1, have2) {
  throw new Error(`
  Tyranid wants to create a new index:

  ${JSON.stringify(index, null, 2)}

  but two different indexes share its name and key respectively:

  - ${JSON.stringify(have1, null, 2)}

  - ${JSON.stringify(have2, null, 2)}
  `);
}

global.__TyranidGlobal = exports.Tyr = Tyr;

export default Tyr;
