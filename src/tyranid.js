import _  from 'lodash';
import fs from 'fs';

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
import './core/field';
import './core/validationError';
import './core/namePath';
import './core/query';

import './log/log';

import './secure/secure';

import './unit/unitSystem';
import './unit/unitFactor';
import './unit/unitType';
import './unit/unit';
import './unit/units';

import './express';

import /*Schema from */ './schema';

// variables shared between classes
import { config } from './common';


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
    db:    <mongodb database>, // optional, if not present will default to config.db
    fields: <field object>
  }

*/


_.assign(Tyr, {
  config(opts) {

    if (!opts) {
      return config;
    }

    // clear object but keep reference
    for (const prop in config) delete config[prop];

    _.extend(config, opts);

    if (!opts.db) {
      throw new Error('Missing "db" in config.');
    }

    const db = this.db = opts.db;
    Tyr.collections.forEach(collection => {
      if (!collection.db) {
        collection.db = db.collection(collection.def.dbName);
      }
    });

    if (opts.validate) {
      this.validate(opts.validate);
    }
  },

  validate(opts) {
    if (opts && opts !== true) {
      function process(dirOpts) {
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

      if (_.isArray(opts)) {
        opts.forEach(process);
      } else {
        process(opts);
      }
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
        const ll = config[name];
        if (_.isString(ll)) {
          config[name] = Tyr.byName.tyrLogLevel.byLabel(ll);

          if (!config[name]) {
            throw new Error(`Unknown ${name}: "${ll}".`);
          }
        }
      }

      parseLogLevel('logLevel');
      parseLogLevel('clientLogLevel');
      parseLogLevel('consoleLogLevel');
      parseLogLevel('dbLogLevel');

      const secure = config.secure;
      if (secure) {
        // TODO:  if config.secure is an array of Secures, set Tyr.secure to a
        //        composite Secure that has the array of config.secure as children
        Tyr.secure = secure;
        Tyr.components.push(secure);
      }
    }

    bootstrap('compile');

    for (const col of Tyr.collections) {
      col.compile('link');
    }

    bootstrap('link');

    bootstrap('post-link');
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

export default Tyr;
