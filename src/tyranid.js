import _ from 'lodash';
import fs from 'fs';

import './builtins';
import Type from './classes/Type';
import Collection from './classes/Collection';
import ValidationError from './classes/ValidationError';

import /*Schema from */ './schema';

// variables shared between classes
import {
  config          ,
  collections     ,
  collectionsById ,
  typesByName     ,
  $all
} from './common';


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

const Tyranid = {


  /**
   * Properties
   */
  Type,
  ValidationError,
  $all,
  Collection,
  collections,


  /**
   * Methods
   */
  config(opts) {

    // clear object but keep reference
    for (const prop in config) delete config[prop];

    _.extend(config, opts);

    if (!opts.db) {
      throw new Error('Missing "db" in config.');
    }

    const db = this.db = opts.db;
    collections.forEach(collection => {
      if (!collection.db) {
        collection.db = db.collection(collection.def.dbName);
      }
    });

    if (opts.validate) {
      if (!Array.isArray(opts.validate)) {
        throw new Error('Validate options must be an array of objects of "dir" and "fileMatch".');
      }
      this.validate(opts.validate);
    }
  },

  validate(opts) {
    if (opts) {
      _.forEach(opts, function(opt) {
        if (!opt.dir)
          throw new Error('dir not specified in validate option.');

        const fileRe = opt.fileMatch ? new RegExp(opt.fileMatch) : undefined;

        fs
          .readdirSync(opt.dir)
          .filter(file => !fileRe || fileRe.test(file))
          .forEach(file => { require(opt.dir + '/' + file); });
      });
    }

    collections.forEach(col => {
      col.validateSchema();
    });
  },

  async valuesBy(comparable) {
    const getValues = c => c.valuesFor(c.fieldsBy(comparable));
    const arrs = await* Tyranid.collections.map(getValues);
    return _.union.apply(null, arrs);
  },

  parseUid(uid) {
    const colId = uid.substring(0, 3);

    const col = collectionsById[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    const strId = uid.substring(3);

    const idType = col.def.fields[col.def.primaryKey.field].def.is;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  },

  byUid(uid) {
    const p = Tyranid.parseUid(uid);
    return p.collection.byId(p.id);
  },

  byName(name) {
    const nameLower = name.toLowerCase();
    return _.find(collections, c => c.def.name.toLowerCase() === nameLower);
  },

  /**
   * Mostly just used by tests.
   */
  reset() {
    function builtin(collection) {
      return collection.def.name.startsWith('tyr');
    }

    for (let ci=0; ci<collections.length; ) {
      const c = collections[ci];

      if (!builtin(c)) {
        collections.splice(ci);
      } else {
        ci++;
      }
    }

    for (const id in collectionsById) {
      const c = collectionsById[id];

      if (!builtin(c)) {
        delete collectionsById[id];
      }
    }
    for (const name in typesByName) {
      const type = typesByName[name];
      if (type instanceof Collection && !builtin(type)) {
        delete typesByName[name];
      }
    }
  }

};


export default Tyranid;
