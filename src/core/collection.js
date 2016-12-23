
import _            from 'lodash';
import hooker       from 'hooker';
import faker        from 'faker';
import { ObjectId } from 'mongodb';

import Tyr          from '../tyr';
import Component    from './component';
import Type         from './type';
import ObjectType   from '../type/object';
import Population   from './population';
import Populator    from './populator';
import NamePath     from './namePath';
import Field        from './field';
import SecureError  from '../secure/secureError';

import historical   from '../historical/historical';


// variables shared between classes
import {
  escapeRegex      ,
  parseInsertObj   ,
  parseProjection  ,
  toClient
} from '../common';

const {
  collections,
  labelize
} = Tyr;

const OPTIONS = Tyr.options;


// Options parsing
// ===============

function isOptions(opts) {
  // TODO:  this is a hack, need to figure out a better way (though most likely a non-issue in practice)
  return opts &&
    ( (opts.auth !== undefined ||
       opts.author !== undefined ||
       opts.comment !== undefined ||
       opts.fields !== undefined ||
       opts.historical !== undefined ||
       opts.limit !== undefined ||
       opts.multi !== undefined ||
       opts.perm !== undefined ||
       opts.populate !== undefined ||
       opts.query !== undefined ||
       opts.skip !== undefined ||
       opts.tyranid !== undefined ||
       opts.upsert !== undefined ||
       opts.writeConcern !== undefined)
     || !_.keys(opts).length);
}

function extractOptions(args) {
  if (args.length && isOptions(args[args.length - 1])) {
    return args.pop();
  } else {
    return {};
  }
}

function combineOptions(...sources) {
  const o = {};
  for (const source of sources) {
    _.assign(o, source);
  }
  return o;
}

/**
 * Extracts the authorization out of a mongodb options-style object.
 */
function extractAuthorization(opts) {
  if (!opts) {
    return undefined;
  }

  const auth = opts.auth;
  if (auth) {
    delete opts.auth;
    return auth === true ? Tyr.local.user : auth;
  }

  const tyrOpts = opts.tyranid;
  if (tyrOpts) {
    delete opts.tyranid;
    if (tyrOpts.secure) {
      return tyrOpts.subject || tyrOpts.user || Tyr.local.user;
    }
  }

  //return undefined;
}

function extractProjection(opts) {
  return opts.fields || opts.project || opts.projectiot ;
}

async function populate(collection, opts, documents) {
  let populate;
  if (opts && (populate = opts.populate)) {
    await collection.populate(populate, documents);
  }
}

function hasMongoUpdateOperator(update) {
  for (const key in update) {
    if (key.startsWith('$') && update.hasOwnProperty(key)) {
      return true;
    }
  }

  //return undefined;
}

function timestampsUpdate(opts, collection, update, doc) {
  if (collection.def.timestamps && opts.timestamps !== false) {
    const updatedAt = new Date();

    if (hasMongoUpdateOperator(update)) {
      update.$set = update.$set || {};
      update.$set.updatedAt = updatedAt;
    } else {
      update.updatedAt = updatedAt;
    }

    if (doc) {
      doc.updatedAt = updatedAt;
    }
  }
}

function extractUpdateFields(doc, opts) {
  const updateFields = {};
  if (opts.fields) {
    _.each(opts.fields, (field, key) => {
      if (field) {
        updateFields[key] = 1;
      }
    });

  } else {
    _.each(doc, (field, key) => {
      if (key !== '_id') {
        updateFields[key] = 1;
      }
    });
  }

  return updateFields;
}


// Document
// ========

const documentPrototype = Tyr.documentPrototype = {

  $asOf(date, props) {
    historical.asOf(this.$model, this, date, props);
  },

  $clone() {
    // Amazingly, a seemingly do-nothing cloneDeep `customizer`
    // seems to address https://github.com/lodash/lodash/issues/602
    return new this.$model(_.cloneDeep(this, val => val));
  },

  $copy(obj, keys) {
    if (keys) {
      if (keys === Tyr.$all) {
        _.each(this.$model.fields, field => {
          const key = field.name,
                v   = obj[key];

          if (v !== undefined) {
            this[key] = v;
          } else {
            delete this[key];
          }
        });
      } else {
        for (const key of keys) {
          this[key] = obj[key];
        }
      }
    } else {
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && key !== '_history') {
          const v = obj[key];

          if (v !== undefined) {
            this[key] = v;
          } else {
            delete this[key];
          }
        }
      }
    }
  },

  $snapshot(updateHistory, ...args) {
    const collection = this.$model;

    if (!collection.def.historical) {
      throw new Error('Document is not historical');
    }

    const opts = extractOptions(args),
          updateFields = extractUpdateFields(this, opts);

    return historical.snapshot(
      collection,
      this,
      historical.patchPropsFromOpts(opts),
      updateFields,
      updateHistory
    );
  },

  $save(...args) {
    return this.$model.save(this, ...args);
  },

  $insert(...args) {
    return this.$model.insert(this, ...args);
  },

  $update(...args) {
    return this.$model.updateDoc(this, ...args);
  },

  $remove() {
    return this.$model.remove({ [this.$model.def.primaryKey.field]: this.$id }, true, ...arguments);
  },

  $replace(obj) {
    this.$copy(obj, Tyr.$all);
  },

  $toClient() {
    return this.$model.toClient(this);
  },

  $populate(fields, denormal) {
    return this.$model.populate(fields, this, denormal);
  },

  $validate() {
    return ObjectType.validate(this.$model, this);
  }

};

function defineDocumentProperties(dp) {
  Object.defineProperties(dp, {
    $id: {
      get() {
        return this[this.$model.def.primaryKey.field];
      },
      enumerable:   false,
      configurable: false
    },

    $label: {
      get() {
        return this.$model.labelFor(this);
      },
      enumerable:   false,
      configurable: false
    },

    $uid: {
      get() {
        const model = this.$model;
        return model.idToUid(this[model.def.primaryKey.field]);
      },
      enumerable:   false,
      configurable: false
    }
  });
}


function denormalPopulate(collection, obj, opts) {
  const denormal = (!opts || !opts.denormalAlreadyDone) && collection.denormal;
  return denormal ? collection.populate(denormal, obj, true) : Promise.resolve();
}



/**
 * Recurse into schema and populate fake document
 */
function fakeField(field) {
  const def = _.get(field, 'is.def') || field.def;

  if (!def) throw new Error('No field.def property to fake on! ' + JSON.stringify(field));

  switch (def.name) {
  case 'integer':
  case 'float':
  case 'double':
  case 'number':
    return faker.random.number();

  case 'email':
    return faker.internet.email();

  case 'url':
    return faker.internet.url();

  case 'date':
    const date = faker.date.past();
    date.setMilliseconds(0);
    return date;

  case 'image':
    return faker.image.avatar();

  case 'link':
  case 'mongoid':
    let i = 24,
        s = '';
    while(i--) s += faker.random.number(15).toString(16);
    return ObjectId(s);

  case 'boolean':
    return faker.random.boolean();

  case 'array':
    return _.range(2).map(() => fakeField(field.of));

  case 'object':
    const key = def.name === 'link'
      ? 'link.def.fields'
      : 'fields';

    return _.reduce(_.get(field, key), (out, value, key) => {
      out[key] = fakeField(value);
      return out;
    }, {});

  // default to string
  default: return faker.name.lastName();
  }
}


function fakeDocument(schema) {
  const doc = {};
  _.each(schema, (field, name) => {
    doc[name] = fakeField(field);
  });
  return doc;
}


export default class Collection {

  constructor(def) {

    const colId = def.id;
    if (!colId) {
      throw new Error('The "id" for the collection was not specified.');
    }

    if (colId.length !== 3) {
      throw new Error('The collection "id" should be three characters long.');
    }

    if (Tyr.byId[colId]) {
      throw new Error(`The collection id "${colId}" is already in use by ${Tyr.byId[colId].def.name}.`);
    }

    //
    // instances of Collection are functions so that you can go "const User = ...; const user = new User();"
    //
    // i.e.  instances of Collection are collections
    //       instances of instances of Collection are documents (collection instances)
    //

    const dp = {};
    _.assign(dp, documentPrototype);

    // hack so that our custom functions have the proper name
    let CollectionInstance;
    const lodash = _; // eval only takes in local variables into its scope

    eval(`CollectionInstance = function ${lodash.capitalize(def.name)}(data) {
      this.__proto__ = dp;

      // add properties to dp if not available
      for (var key in documentPrototype) {
        if (key.substring(0,1) === '$' && !(key in dp)) {
          Object.defineProperty(dp, key, {
            enumerable:   false,
            writable:     false,
            configurable: false,
            value: documentPrototype[key]
          });
        }
      }

      CollectionInstance._wrap(this, data);
    }`);

    dp.constructor = dp.$model = CollectionInstance;
    dp.__proto__ = CollectionInstance.prototype;

    CollectionInstance.constructor = Collection;
    CollectionInstance.__proto__ = Collection.prototype;
    CollectionInstance.def = def;
    CollectionInstance.id = colId;

    // add apply back to proto, for class inheritance...
    CollectionInstance.__proto__.apply = Function.prototype.apply;

    Type.validateType(CollectionInstance);

    if (!def.dbName) {
      def.dbName = def.name;
    }

    if (!def.primaryKey) {
      def.primaryKey = {
        field: '_id'
      };
    } else if(_.isString(def.primaryKey)) {
      def.primaryKey = {
        field: def.primaryKey
      };
    } else if(!_.isObject(def.primaryKey)) {
      throw new Error('Invalid "primaryKey" parameter');
    }

    const db = def.db || Tyr.options.db;

    if (db) {
      CollectionInstance.db = db.collection(CollectionInstance.def.dbName);
    }


    collections.push(CollectionInstance);
    Tyr.components.push(CollectionInstance);
    Tyr.byId[def.id] = CollectionInstance;
    Tyr.byName[def.name] = CollectionInstance;

    for (const key in dp) {
      if (key.substring(0,1) === '$' && key !== '$label') {
        Object.defineProperty(dp, key, {
          enumerable:   false,
          writable:     false,
          configurable: false
        });
      }
    }

    defineDocumentProperties(dp);

    _.each(def.fields, function(fieldDef, name) {
      const get  = fieldDef.getServer || fieldDef.get,
            set  = fieldDef.setServer || fieldDef.set,
            fn   = fieldDef.fn || fieldDef.fnClient || fieldDef.fnServer,
            isDb = fieldDef.db;

      if (fn) {
        throw new Error('Field ' + def.name + '.' + name + ' has fn/fnClient/fnServer set, fn is a method option, not a field option.');
      }

      if (!fn && fieldDef.getClient && isDb) {
        throw new Error('Field ' + def.name + '.' + name + ' needs a server-side get if db is set and client-side get is set.');
      }

      if (get || set) {

        const prop = {
          enumerable:   isDb !== undefined ? isDb : false,
          configurable: false
        };

        if (get) {
          prop.get = get;
        }

        if (set) {
          prop.set = set;
        }

        Object.defineProperty(dp, name, prop);

        if (isDb === undefined) {
          fieldDef.db = false;
        }
      }
    });

    _.each(def.methods, function(method, name) {
      if (!method.fn && !method.fnClient && !method.fnServer) {
        throw new Error('Method ' + def.name + '.' + name + ' has no fn, fnClient, or fnServer function set.');
      }

      if (method.fn && (method.fnClient || method.fnServer)) {
        throw new Error('Method ' + def.name + '.' + name + ' has both fn and fnClient/fnServer set, they are mutually exclusive.');
      }

      const fn = method.fn || method.fnServer;

      method.name = name;
      Object.defineProperty(dp, name, {
        enumerable:   false,
        writable:     false,
        configurable: false,
        value:        fn
      });
    });

    CollectionInstance.paths = {};
    CollectionInstance.fields = {};

    CollectionInstance.compile('compile');
    CollectionInstance.validateValues();

    return CollectionInstance;
  }

  _wrap(doc, pojo) {

    if (pojo) {
      _.assign(doc, pojo);

      if (pojo._id && this.def.historical) {
        historical.preserveInitialValues(this, doc);
      }
    }
  }

  get label() {
    return _.result(this.def, 'label') || labelize(this.def.name);
  }

  async fake({ n, schemaOpts, seed } = {}) {
    // get doc schema
    const collection = this,
          schema = await collection.fieldsFor(schemaOpts);

    // seed if provided, else reset
    faker.seed(seed);

    if (n === undefined) {
      return new collection(fakeDocument(schema));
    } else {
      const out = [];
      while (n--) out.push(new collection(fakeDocument(schema)));
      return out;
    }
  }

  /** @isomorphic */
  idToUid(id) {
    return this.id + id;
  }

  idToLabel(id) {
    if (this.isStatic()) {
      if (!id) {
        return '';
      }

      const doc = this.byIdIndex[id];
      return doc ? doc.$label : 'Unknown';
    }

    if (!id) {
      return Promise.resolve('');
    }

    const lf = this.labelField;
    if (lf.def.get || lf.def.getServer) {
      // if the label field is computed, we need to query the whole thing since we don't know what the computation requires
      // (TODO:  analyze functions to determine their dependencies)

      return this.byId(id)
        .then(doc => { return doc ? doc.$label : 'Unknown'; });
    } else {
      return this.findOne({ [this.def.primaryKey.field]: id }, { [lf.spath]: 1 })
        .then(doc => doc ? doc.$label : 'Unknown');
    }
  }

  /** @isomorphic */
  isStatic() {
    return this.def.values;
  }

  byId(id, options) {
    if (this.isStatic()) {
      return this.byIdIndex[id];

    } else {
      if (typeof id === 'string') {
        id = this.fields[this.def.primaryKey.field].type.fromString(id);
      }

      return this.findOne({ [this.def.primaryKey.field]: id }, options);
    }
  }

  byIds(ids, options) {
    const collection = this;

    if (collection.isStatic()) {
      return Promise.resolve(ids.map(id => collection.byIdIndex[id]));
    } else {
      const opts = combineOptions(options, { query: { [this.def.primaryKey.field]: { $in: ids } } });
      return collection.findAll(opts);
    }
  }

  byLabel(n, forcePromise) {
    const collection = this,
          findName = collection.labelField.path,
          matchLower = n.toLowerCase();

    if (collection.isStatic()) {
      const value = _.find(collection.def.values, function(v) {
        const name = v[findName];
        return name && name.toLowerCase() === matchLower;
      });

      return forcePromise ? Promise.resolve(value) : value;
    } else {
      const query = {};
      query[findName] = {$regex: escapeRegex(matchLower), $options : 'i'};
      return collection.findOne(query);
    }
  }

  /** @isomorphic */
  labelFor(doc) {
    const collection = this,
          labelField = collection.labelField;

    if (!labelField) {
      throw new Error('No labelField defined for collection ' + collection.name);
    }

    // TODO:  have this use parsePath() to walk the object in case the label is stored in an embedded object
    // TODO:  support computed properties
    return doc[labelField.path];
  }

  find(...args) {
    const collection = this,
          opts       = extractOptions(args),
          db         = collection.db;

    let query,
        fields;
    switch (args.length) {
    case 2:
      fields = args[1];
      if (fields) {
        opts.fields = args[1];
      }
      // fall through

    case 1:
      query = args[0];
      if (query) {
        opts.query = query;
      }
      break;
    case 0:
    }

    query = opts.query;
    fields = opts.fields;

    if (fields) {
      opts.fields = fields = parseProjection(collection, fields);
    }

    const auth = extractAuthorization(opts);

    function cursor() {
      const cursor = db.find(query, fields, opts);

      let v;
      if ( (v=opts.limit) ) {
        cursor.limit(v);
      }

      if ( (v=opts.skip) ) {
        cursor.skip(v);
      }

      if ( (v=opts.sort) ) {
        cursor.sort(v);
      }

      hooker.hook(cursor, 'next', {
        post(promise) {
          const modified = promise.then(doc => doc ? new collection(doc) : null);
          return hooker.override(modified);
        }
      });

      hooker.hook(cursor, 'toArray', {
        post(promise) {
          const modified = promise.then(docs => docs.map(doc => doc ? new collection(doc) : null));
          return hooker.override(modified);
        }
      });

      return cursor;
    }

    if (auth) {
      return Tyr.mapAwait(
        collection.secureFindQuery(query, opts.perm || OPTIONS.permissions.find, auth),
        securedQuery => {
          opts.query = query = securedQuery;
          return cursor();
        }
      );
    }

    return cursor();
  }

  /**
   * A short-cut to do find() + toArray()
   */
  async findAll(...args) {
    let opts;

    if (args.length === 1) {
      opts = args[0];

      const v = opts.query;
      if (isOptions(opts)) {
        const cursor = await this.find(v || {}, opts.projection, opts);

        const documents = await cursor.toArray();
        await populate(this, opts, documents);
        return documents;
      }
    }

    const cursor = await this.find(...args);

    const documents = await cursor.toArray();
    await populate(this, opts, documents);
    return documents;
  }

  /**
   * Behaves like native mongodb's findOne() method except that the results are mapped to collection instances
   * and that it takes a projection as an optional second parameter and supports an options object
   */
  async findOne(...args) {
    const collection = this,
          db         = collection.db;

    let opts = extractOptions(args);

    switch (args.length) {
    case 2:
      const f = args[1];
      if (f) {
        opts.fields = f;
      }
      // fall through
    case 1:
      // Support direct ObjectId arg, which will always query against _id
      if (args[0] instanceof ObjectId) {
        opts.query = { _id: args[0] }
      } else {
        opts.query = args[0];
      }
    }

    if (opts === undefined) {
      opts = {};
    }

    let projection = extractProjection(opts);
    if (projection) {
      projection = parseProjection(collection, projection);
    }

    const auth = extractAuthorization(opts);
    let query = opts.query || {};
    if (auth) {
      query = await this.secureQuery(query, opts.perm || OPTIONS.permissions.find, auth);

      if (!query) {
        return null;
      }
    }

    let doc = await db.findOne(query, projection, _.omit(opts, ['query', 'fields']));
    if (doc) {
      doc = new collection(doc);
      await populate(this, opts, doc);
      return doc;
    }

    return null;
  }

  /**
   * Behaves like native mongodb's findAndModify() method except that the results are mapped to collection instances.
   */
  async findAndModify(opts) {
    const collection = this,
          db         = collection.db,
          auth       = extractAuthorization(opts);

    if (auth) {
      opts.query = await this.secureFindQuery(opts.query, opts.perm || OPTIONS.permissions.update, auth);
    }

    let update = opts.update;

    if (collection.def.historical && opts.historical !== false) {
      Tyr.warn('findAndModify() used on historical collection', new Error());
    }

    if (update) {
      // Check for whether update param is all field:value expressions.
      // If so, we should replace the entire doc (per Mongo api docs)
      const replaceEntireDoc = Object.keys(update).every(key => !key.startsWith('$'));

      if (collection.def.timestamps && opts.timestamps !== false) {
        if (replaceEntireDoc) {
          update.updatedAt = new Date();
        } else {
          update.$set = update.$set || {};
          update.$set.updatedAt = new Date();
        }
      }

      if (opts.upsert) {
        const setOnInsertSrc = replaceEntireDoc ? update : update.$setOnInsert,
              $setOnInsert = await parseInsertObj(collection, _.merge(_.cloneDeep(opts.query), setOnInsertSrc));

        if (replaceEntireDoc) {
          opts.update = update = $setOnInsert;
        } else {
          update.$setOnInsert = _.omit($setOnInsert, (v,k) => {
            return update.$set && update.$set[k] || v === undefined;
          });
        }
      }
    }

    opts.fields = extractProjection(opts);
    if (opts.fields) {
      opts.fields = parseProjection(collection, opts.fields);
    }

    const result = await db.findAndModify(opts.query, opts.sort, opts.update, opts);

    if (result && result.value) {
      result.value = new collection(result.value);
    }

    return result;
  }


  async save(obj, opts) {
    const collection = this;

    await denormalPopulate(collection, obj, opts);

    if (Array.isArray(obj)) {
      const arrOpts = combineOptions(opts, { denormalAlreadyDone: true });
      return await Promise.all(obj.map(doc => collection.save(doc, arrOpts)));
    } else {
      if (collection.def.historical) {
        if (obj.$historical) {
          throw new Error('Document is read-only due to $historical');
        } else {
          historical.snapshot(collection, obj, historical.patchPropsFromOpts(opts));
        }
      }

      const keyFieldName = collection.def.primaryKey.field,
            keyValue = obj[keyFieldName];

      if (keyValue) {
        // using REPLACE semantics with findAndModify() here
        const result = await collection.findAndModify(combineOptions(opts, {
          query: { [keyFieldName]: keyValue },
          // Mongo error if _id is present in findAndModify and doc exists. Note this slightly
          // changes save() semantics. See https://github.com/tyranid-org/tyranid/issues/29
          update: _.omit(obj, '_id'),
          upsert: true,
          new: true
        }));

        return result.value;
      } else {
        const modOpts = combineOptions(opts, { denormalAlreadyDone: true });
        return collection.insert(obj, modOpts);
      }
    }
  }

  async insert(obj, opts) {
    const collection = this;

    await denormalPopulate(collection, obj, opts);

    const auth = extractAuthorization(opts);

    if (Array.isArray(obj)) {
      const parsedArr = await Promise.all(_.map(obj, el => parseInsertObj(collection, el)));

      if (auth) {
        const canInsertArr = await Promise.all(parsedArr.map(parsedObj =>
          collection.canInsert(parsedObj, opts.perm || OPTIONS.permissions.insert, auth)));

        if (canInsertArr.some(val => !val)) {
          // TODO:  throw a security exception here ?
          return false;
        }
      }

      const rslt = await collection.db.insert(parsedArr);

      return rslt.ops;
    } else {
      const parsedObj = await parseInsertObj(collection, obj);

      if (auth) {
        const canInsert = await collection.canInsert(parsedObj, opts.perm || OPTIONS.permissions.insert, auth);

        if (!canInsert) {
          // TODO:  throw a security exception here ?
          return false;
        }
      }

      const rslt = await collection.db.insert(parsedObj);

      const doc = rslt.ops[0];
      obj._id = doc._id;
      return doc;
    }
  }

  /**
   * Updates a single document.  Used to implement document.$update() for example. @see update() for regular mongodb update()
   */
  async updateDoc(obj, ...args) {
    const collection   = this,
          keyFieldName = collection.def.primaryKey.field;

    if (!obj[keyFieldName]) {
      // TODO:  maybe look at upsert on opts?  we're effectively assuming we always want to upsert, i.e.:
      //if (opts.upsert !== false) {
      return collection.insert(obj, ...args);
      //}
    }

    const opts = combineOptions(extractOptions(args), {
      query: { [keyFieldName]: obj[keyFieldName] },
      upsert: true,
      new: true
    });


    const updateFields = extractUpdateFields(obj, opts),
          update = {};

    _.each(updateFields, (field, key) => {
      update[key] = obj[key];
    });


    opts.update = { $set: update };

    if (collection.def.historical) {
      if (obj.$historical) {
        throw new Error('Document is read-only due to $historical');
      }

      // They might have read in the object without the _history var to reduce read-times.
      //
      // If so, we will do a direct $push onto the _history array.
      const historyPresent = !!obj._history;

      const snapshot = historical.snapshot(
        collection,
        obj,
        historical.patchPropsFromOpts(opts),
        updateFields,
        historyPresent
      );

      if (snapshot) {
        if (historyPresent) {
          update._history = obj._history;
        } else {
          opts.update.$push = { _history: snapshot };
        }
      }
    }

    const auth  = extractAuthorization(opts);
    let query = opts.query;

    if (auth) {
      query = await collection.secureQuery(query, opts.perm || OPTIONS.permissions.update, auth);

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the update() and potentially throw one there as well
        return false;
      }
    }

    timestampsUpdate(opts, collection, update, obj);

    return await collection.db.update(query, opts.update, opts);
  }

  /**
   * Behaves like native mongodb's update().
   */
  async update(...args) {
    const collection = this;

    const opts = extractOptions(args);

    switch (args.length) {
    case 2:
      opts.update = args[1];
      // fall through
    case 1:
      opts.query = args[0];
    }

    if (collection.def.historical && opts.historical !== false) {
      Tyr.warn('update() (not $update()) used on historical collection', new Error());
    }

    const update = opts.update,
          auth   = extractAuthorization(opts);
    let query = opts.query;

    if (auth) {
      query = await collection.secureQuery(query, opts.perm || OPTIONS.permissions.update, auth);

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the update() and potentially throw one there as well
        return false;
      }
    }

    timestampsUpdate(opts, collection, update);

    return await collection.db.update(query, update, opts);
  }

  async pull(id, path, predicate, ...args) {
    const collection = this,
          opts       = extractOptions(args),

          np         = collection.parsePath(path);


    const qOpts = Tyr.cloneDeep(opts);
    qOpts.fields = { [ np.path[0] ]: 1 };

    const doc = await collection.byId(id, qOpts);

    const arr = np.get(doc);

    if (arr) {
      _.remove(arr, predicate);
      await doc.$update(opts);
    }
  }

  async push(id, path, value, ...args) {
    const collection = this,
          opts       = extractOptions(args),
          auth       = extractAuthorization(opts),

          query      = { _id: id };

    if (auth) {
      query = await collection.secureQuery(query, opts.perm || OPTIONS.permissions.update, auth);

      if (!query) {
        throw new SecureError();
      }
    }

    const pv = {
      [path]: value
    };

    if (collection.def.historical && collection.parsePath(path).isHistorical()) {
      pv._history = historical.snapshotPush(path, historical.patchPropsFromOpts(opts));
    }

    const update = { $push: pv };

    timestampsUpdate(opts, collection, update);

    await collection.db.update(query, update);
  }

  /**
   * Behaves like native mongodb's remove().
   */
  async remove(...args) {
    const opts = extractOptions(args);

    let query = opts.query, justOne = opts.justOne;

    switch (args.length) {
    case 2:
      justOne = args[1];
      // fall through
    case 1:
      query = args[0];
    }

    const auth = extractAuthorization(opts);

    if (auth) {
      query = await this.secureQuery(query, opts.perm || OPTIONS.permissions.remove, auth);

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the remove() and potentially throw one there as well
        return 0;
      }
    }

    return await this.db.remove(query, justOne);
  }

  /**
   * Register a plugin for this Collection. Similar API to Mongoose plugins:
   * http://mongoosejs.com/docs/plugins.html
   *
   * Note that the hooks API *does* differ from Mongoose's
   *
   * @see hook
   * @param  {Function} fn plugin callback
   * @param  {Object} [opts]
   * @return {Collection} self for chaining
   */
  plugin(fn, opts) {
    fn(this, opts);
    return this;
  }

  /**
   * Add a pre hook
   *
   * @param {string|Array} methods method name or array of method names to add pre hook
   * @param {Function(next, ...args)} cb hook callback
   * @param {Function} cb.next if modifying arguments, return next(modifiedArgs)
   * @param {Array} cb.args original method args
   * @return {Collection} self for chaining
   */
  pre(methods, cb) {
    hooker.hook(this, methods, {
      pre(...args) {
        const next = (...cbArgs) => {
          // hooker.filter() takes an args array (it uses Function.apply()
          // behind the scenes)
          return hooker.filter(this, cbArgs);
        };
        return this::cb(next, ...args);
      }
    });
    return this;
  }

  /**
   * Add a post hook
   *
   * @param {string|Array} methods method name or array of method names to add post hook
   * @param {Function(next, result)} cb hook callback
   * @param {Function} cb.next if modifying result, return next(modifiedResult)
   * @param {Array} cb.result original method result
   * @return {Collection} self for chaining
   */
  post(methods, cb) {
    hooker.hook(this, methods, {
      post(result) {
        const next = (result) => {
          return hooker.override(result);
        };
        return this::cb(next, result);
      }
    });
    return this;
  }

  /**
   * Remove hooks for a particular method. Needs to
   * be called once per pre/post() call.
   *
   * @param  {tring|Array} [methods] Method or methods. Unhooks all methods if unspecified.
   * @return {Collection} self for chaining
   */
  unhook(methods) {
    hooker.unhook(this, methods);
    return this;
  }

  /**
   * @opts: options ... options are:
   *   string | array<string>;   a property name or an array of property names
   *
   *   TODO: @only: array<string>;        list of fields in linked-to collections to query
   *
   * @documents: array<document>;       an array of documents
   *
   * If documents is not provided, this function will return a curried version of this function that takes a single array
   * of documents.  This allows populate to be fed into a promise chain.
   */
  populate(fields, documents, denormal) {
    const collection = this,
          populator  = new Populator(denormal),
          population = Population.parse(populator, collection, fields);

    async function populatorFunc(documents) {
      const isArray = documents && Array.isArray(documents);
      documents = isArray ? documents : [documents];

      await population.populate(populator, documents);

      return isArray ? documents : documents[0];
    }

    return documents ? populatorFunc(documents) : populatorFunc;
  }

  fieldsBy(filter) {
    return _.filter(this.paths, filter);
  }

  async valuesFor(fields) {
    const collection = this;

    const fieldsObj = { _id: 0 };

    _.each(fields, field => {
      fieldsObj[field.spath] = 1;
    });

    const values = [];

    const extractValues = val => {

      if (!val) {
        return;
      }

      if (_.isObject(val)) {
        _.each(val, extractValues);
      } else {
        values.push(val);
      }

    };

    (await (await collection.db.find({}, fieldsObj)).toArray()).forEach(extractValues);

    return _.uniq(values);
  }

  /**
   * This creates a new record instance out of a POJO.  Values are copied by reference (not deep-cloned!).
   */
  fromClient(pojo, path) {
    let collection = this,
        fields = collection.fields;

    const namePath = path ? this.parsePath(path) : null;

    if (Array.isArray(pojo)) {
      return pojo.map(doc => collection.fromClient(doc, path));
    }

    if (namePath) {
      const detail = namePath.detail;
      collection = detail.def.id ? Tyr.byId[detail.def.id] : null;
      fields = detail.fields;
    }

    const obj = {}; // TODO:  create a new instance of this record-class?

    _.each(pojo, (v, k) => {
      const field = fields[k];

      if (field) {
        const type = field.type;

        if (!type) {
          throw new Error('collection missing type ("is"), missing from schema?');
        }

        obj[k] = type.fromClient(field, v);
      }
    });

    return collection ? new collection(obj) : obj;
  }

  fromClientQuery(query) {
    const col = this;

    function convertValue(field, value) {
      if (_.isArray(value)) {
        return value.map(v => field.type.fromClient(field, v));
      } else {
        return field.type.fromClient(field, value);
      }
    }

    function convert(path, client) {

      let field;
      if (path) {
        field = col.paths[path];

        if (!field) {
          throw new Error('unknown path: ' + path);
        }
      }

      if (_.isArray(client) || !_.isObject(client)) {
        return convertValue(field, client);
      }

      const server = {};
      _.each(client, (v, n) => {
        switch (n) {
        case '$and':
        case '$or':
          if (_.isArray(v)) {
            server[n] = v.map(cv => convert(path, cv));
          } else {
            server[n] = convert(path, v);
          }
          break;
        case '$in':
        case '$eq':
        case '$ne':
        case '$gt':
        case '$lt':
          server[n] = convertValue(field, v);
          break;
        case '$exists':
          server[n] = v;
          break;
        default:
          if (_.isArray(v)) {
            server[n] = convertValue(field, v);
          } else {
            server[n] = convert(path ? path + '.' + n : n, v);
          }
        }
      });

      return server;
    }

    return convert('', query);
  }

  /**
   * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
   */
  toClient(data) {
    return toClient(this, data);
  }

  parsePath(path) {
    return new NamePath(this, path);
  }

  createCompiler(collection, def, stage) {
    const compiler = {
      stage: stage,

      err(path, msg) {
        return new Error('Tyranid Schema Error| ' + def.name + (path ? '.' + path : '') + ' | ' + msg);
      },

      type(field, name, required) {
        let type = field[name];

        if (!type) {
          type = field.def[name];

          if (!type) {
            if (required) {
              throw this.err(field.path, 'Missing "${name}" property');
            }

            return;
          }

          if (_.isPlainObject(type)) {
            type = field[name] = new Field(type);
          } else if (_.isString(type)) {
            type = Type.byName[type];
            if (!type) {
              if (this.stage === 'link') {
                throw this.err(field.path, `Unknown type for "${name}".`);
              }
            } else {
              type = field[name] = new Field({ is: type.def.name });
            }
          } else {
            throw this.err(field.path, `Invalid "${name}":  ${type}`);
          }
        }

        if (type instanceof Field) {
          this.field(field.path + '._', type);
        }
      },

      field(path, field) {
        const fieldDef = field.def;
        if (!_.isObject(fieldDef)) {
          throw compiler.err(path, `Invalid field definition, expected an object, got: "${fieldDef}"`);
        }

        if (fieldDef.labelField) {
          collection.labelField = field;
        }

        // Store the field path and name on the field itself to support methods on Field
        field.collection = collection;
        field.path = path;
        collection.paths[path] = field;
        const lastDot = path.lastIndexOf('.');
        const fieldName = lastDot > -1 ? path.substring(lastDot+1) : path;
        field.name = fieldName;

        let type;
        if (fieldDef.link) {

          if (_.isString(fieldDef.link)) {
            type = Type.byName[fieldDef.link];
          } else {
            type = fieldDef.link;
          }

          if (type || stage === 'link') {
            if (!type) {
              throw compiler.err(path, 'Unknown type ' + fieldDef.link);
            }

            if (!(type instanceof Collection)) {
              throw compiler.err(path, 'Links must link to a collection, instead linked to ' + fieldDef.link);
            }

            field.link = type;
            field.type = Type.byName.link;

            field.type.compile(compiler, field);
          }
        } else if (fieldDef.is) {
          type = field.type;

          if (!type) {
            type = fieldDef.is;
            if (_.isString(type)) {
              type = Type.byName[fieldDef.is];

              if (type instanceof Collection) {
                throw compiler.err(path, 'Trying to "is" a collection -- ' + fieldDef.is + ', either make it a "link" or a metadata snippet');
              }

              if (type) {
                field.type = type;
              }
            }
          }

          if (type) {
            type.compile(compiler, field);

          } else if (!_.isObject(fieldDef.is) || !fieldDef.is.def) {
            throw compiler.err(path, 'Expected field.is to be a string or a type, got: ' + fieldDef.is);
          }

        } else {
          throw compiler.err(path, 'Unknown field definition');
        }

        if (fieldDef.denormal) {
          if (!fieldDef.link) {
            throw compiler.err(path, '"denormal" is only a valid option on links');
          }

          const denormal = collection.denormal = collection.denormal || {};
          denormal[path] = fieldDef.denormal;
        }

      },

      fields(path, parent, defFields) {
        if (!defFields) {
          throw compiler.err(path, 'Missing "fields"');
        }

        if (!_.isObject(defFields)) {
          throw compiler.err(path, '"fields" should be an object, got: ' + defFields);
        }

        _.each(_.keys(defFields), function(name) {
          let field = defFields[name];

          if (_.isString(field)) {
            field = { is: field };
          }

          if (!(field instanceof Field)) {
            field = defFields[name] = new Field(field);
          }

          const parentFields = parent.fields = parent.fields || {};
          parentFields[name] = field;
          field.parent = parent;

          return compiler.field(path ? path + '.' + name : name, field);
        });
      }
    };

    return compiler;
  }

  compile(stage) {
    const collection = this;

    const compiler = collection.createCompiler(collection, collection.def, stage);
    compiler.fields('', collection, collection.def.fields);

    if (!collection.def.fields[collection.def.primaryKey.field]) {
      throw new Error('Collection ' + collection.def.name + ' is missing a "' + collection.def.primaryKey.field + '" primary key field.');
    }

    if (collection.def.enum && !collection.labelField) {
      throw new Error(`Some string field must have the label property set if the collection "${collection.def.name}" is an enumeration.`);
    }

    if (stage === 'link') {
      if (collection.def.historical) {
        historical.link(collection);
      }
    }
  }

  validateValues() {
    const collection  = this,
          def  = collection.def,
          rows = def.values;

    if (!rows) {
      return;
    }

    if (!Array.isArray(rows)) {
      throw new Error('Expected values for collection ' + def.name + ' to be an array');
    }

    const rlen = rows.length
    let ri;

    if (!rlen) {
      return;
    }

    if (Array.isArray(rows[0])) {
      // array format

      for (ri=0; ri<rlen; ri++) {
        if (!Array.isArray(rows[ri])) {
          throw new Error('Expected value on row ' + ri + ' to be an array for collection ' + def.name);
        }
      }

      const header = rows[0],
            hlen = header.length,
            newValues = [];
      let hi,
          name;

      function parseValue(field, value) {
        const link = field.link;
        if (link && _.isString(value)) {
          const doc = link.byLabel(value);

          if (!doc) {
            throw new Error('Label not found in ' + link.def.name + ': ' + value);
          }

          return doc._id;
        }

        return value;
      }

      const headerFields = new Array(hlen);
      for (hi=0; hi<hlen; hi++) {
        name = header[hi];

        if (!_.isString(name)) {
          throw new Error('Expected value ' + hi + ' in the values header for collection ' + def.name + ' to be a string');
        }

        const field = def.fields[name];
        if (!field) {
          throw new Error('Field ' + name + ' does not exist on collection ' + def.name);
        }

        headerFields[hi] = field;
      }

      for (ri=1; ri<rlen; ri++) {
        const orow = rows[ri],
              nrow = {};
        let v;

        if (orow.length !== hlen && orow.length !== hlen+1) {
          throw new Error('Incorrect number of values on row ' + ri + ' in collection ' + def.name);
        }

        for (hi=0; hi<hlen; hi++) {
          v = orow[hi];
          nrow[header[hi]] = parseValue(headerFields[hi], v);
        }

        if (orow.length > hlen) {
          const extraVals = orow[hi];

          _.each(extraVals, function(v, n) {
            const field = def.fields[n];
            if (!field) {
              throw new Error('Field ' + n + ' does not exist on collection ' + def.name + ' on row ' + ri);
            }

            nrow[n] = parseValue(field, v);
          });
        }

        v = new collection(nrow);
        if (collection.def.enum) {
          name = v[collection.labelField.path];

          if (!name) {
            throw new Error('Static document in collection ' + collection.def.name + ' missing label field: ' + collection.labelField.path);
          }

          collection[_.snakeCase(name).toUpperCase()] = v;
        }

        newValues.push(v);
      }

      def.values = newValues;
    } else {
      // object format

      for (ri=0; ri<rlen; ri++) {
        if (!_.isObject(rows[ri])) {
          throw new Error('Expected value on row ' + ri + ' to be an object for collection ' + def.name);
        }
      }

    }

    const byIdIndex = collection.byIdIndex = {};
    def.values.forEach(function(doc) {
      byIdIndex[doc[collection.def.primaryKey.field]] = doc;
    });
  }

  addValue(doc) {
    this.def.values.push(doc);
    this.byIdIndex[doc.$id] = doc;
  }
}

Tyr.mixin(Collection, Component);

Tyr.Collection = Collection;
