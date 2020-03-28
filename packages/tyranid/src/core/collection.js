import * as _ from 'lodash';
import { ObjectId } from 'mongodb';

import Tyr from '../tyr';
import Component from './component';
import Type from './type';
import Population from './population';
import Populator from './populator';
import NamePath from './namePath';
import Field from './field';
import SecureError from '../secure/secureError';

import * as historical from '../historical/historical';

import { documentPrototype, defineDocumentProperties } from './document';

import {
  combineOptions,
  escapeRegex,
  extractAuthorization,
  extractOptions,
  isOptions,
  parseSaveObj,
  parseProjection,
  toClient,
  hasMongoUpdateOperator,
  extractUpdateFields,
  isArrow
} from '../common';

import { extractProjection } from './projection';

const { collections, labelize } = Tyr;

const OPTIONS = Tyr.options;

async function _count(collection, query) {
  if (Tyr.logging.trace) {
    const logPromise = Tyr.trace({
      e: 'db',
      c: collection.id,
      m: 'count',
      q: query
    });
    const result = await collection.db.countDocuments(query);
    Tyr.Log.updateDuration(logPromise);
    return result;
  } else {
    return collection.db.countDocuments(query);
  }
}

async function _exists(collection, query) {
  if (Tyr.logging.trace) {
    const logPromise = Tyr.trace({
      e: 'db',
      c: collection.id,
      m: 'findOne/exists',
      q: query
    });
    const result = !!(await collection.db.findOne(query, {
      projection: { _id: 1 }
    }));
    Tyr.Log.updateDuration(logPromise);
    return result;
  } else {
    return !!(await collection.db.findOne(query, { projection: { _id: 1 } }));
  }
}

// _find cannot be async as find() returns a cursor, NOT a promise of a cursor
function _find(collection, query, opts) {
  if (Tyr.logging.trace) {
    Tyr.trace({ e: 'db', c: collection.id, m: 'find', q: query });
    const cursor = collection.db.find(query, opts);
    //Tyr.Log.updateDuration(logPromise);
    return cursor;
  } else {
    return collection.db.find(query, opts);
  }
}

async function _findOne(collection, query, projection, opts) {
  const adjOpts = _.omit(opts, ['query', 'fields']);
  if (projection) {
    adjOpts.projection = projection;
  }

  if (Tyr.logging.trace) {
    const logPromise = Tyr.trace({
      e: 'db',
      c: collection.id,
      m: 'findOne',
      q: query
    });
    const result = await collection.db.findOne(query, adjOpts);
    Tyr.Log.updateDuration(logPromise);
    return result;
  } else {
    return collection.db.findOne(query, adjOpts);
  }
}

async function _findAndModify(collection, opts) {
  const { query, sort, update } = opts;

  if (Tyr.logging.trace) {
    const logPromise = Tyr.trace({
      e: 'db',
      c: collection.id,
      m: 'findAndModify',
      q: query,
      upd: update
    });
    const result = await collection.db.findAndModify(query, sort, update, opts);
    Tyr.Log.updateDuration(logPromise);
    return result;
  } else {
    return collection.db.findAndModify(query, sort, update, opts);
  }
}

async function postFind(collection, opts, documents, auth) {
  const array = Array.isArray(documents);

  // we have to wrap here even if plain is set so that computed properties get called and so logic that depends on documents works
  if (array) {
    documents = documents.map(doc => new collection(doc));
  } else {
    documents = new collection(documents);
  }

  if (opts) {
    const asOf = opts.asOf;
    if (asOf) {
      if (array) {
        await Promise.all(
          documents.map(
            async document =>
              await historical.asOf(
                collection,
                document,
                asOf,
                extractProjection(opts)
              )
          )
        );
      } else {
        await historical.asOf(
          collection,
          documents,
          asOf,
          extractProjection(opts)
        );
      }
    }

    const populate = opts.populate;
    if (populate) {
      await collection.populate(
        populate,
        documents,
        false /* denormal */,
        opts
      );
    }

    if (array) {
      for (const document of documents) {
        Object.defineProperty(document, '$options', {
          configurable: false,
          enumerable: false,
          value: opts,
          writable: false
        });
      }
    } else {
      Object.defineProperty(documents, '$options', {
        configurable: false,
        enumerable: false,
        value: opts,
        writable: false
      });
    }
  }

  if (array) {
    await Tyr.Event.fire({
      collection,
      type: 'find',
      when: 'post',
      _documents: documents,
      opts
    });
  } else {
    await Tyr.Event.fire({
      collection,
      type: 'find',
      when: 'post',
      document: documents,
      opts
    });
  }

  // if keepNonAccessible is not supplied, the query will have been checked
  // already via secureFindQuery and this would be redundant
  if (auth && opts && opts.keepNonAccessible) {
    const secure = Tyr.secure;
    if (secure && secure.checkAccess) {
      const perm = opts.perm || OPTIONS.permissions.find;

      if (array) {
        await Promise.all(
          documents.map(doc => secure.checkAccess(doc, perm, auth, opts))
        );
      } else {
        await secure.checkAccess(documents, perm, auth, opts);
      }
    }
  }

  if (opts.plain) {
    if (array) {
      documents = documents.map(doc => doc.$toPlain());
    } else {
      documents = documents.$toPlain();
    }
  }

  return documents;
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

// TODO:  should what's being done in parseSaveObj() be moved here?
async function preSave(collection, obj, opts) {
  if (!opts || !opts.preSaveAlreadyDone) {
    const vFields = collection.validatedFields,
      denormal = collection.denormal;
    let promises,
      pi = 0;

    if (vFields && vFields.length) {
      if (Array.isArray(obj)) {
        promises = new Array(obj.length * vFields.length + (denormal ? 1 : 0));

        for (const doc of obj) {
          for (const vField of vFields) {
            promises[pi++] = vField.validate(doc);
          }
        }
      } else {
        promises = new Array(vFields.length + (denormal ? 1 : 0));

        for (const vField of vFields) {
          promises[pi++] = vField.validate(obj);
        }
      }
    } else {
      if (!denormal) {
        return;
      }

      promises = new Array(1);
    }

    if (denormal) {
      promises[pi++] = collection.populate(denormal, obj, true);
    }

    await Promise.all(promises);
  }
}

export default class Collection {
  constructor(def) {
    const colId = def.id;
    if (!colId) {
      throw new Error(
        `Collection ${def.name} The "id" for the collection was not specified.`
      );
    }

    if (colId.length !== 3) {
      throw new Error(
        `Collection ${def.name}: The collection "id" should be three characters long.`
      );
    }

    if (Tyr.byId[colId]) {
      throw new Error(
        `Collection ${def.name}: The collection id "${colId}" is already in use by ${Tyr.byId[colId].def.name}.`
      );
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

    // eval only takes in local variables into its scope
    const lodash = _;
    const _documentPrototype = documentPrototype;

    const capitalizedName = lodash.capitalize(def.name);

    /* tslint:disable no-eval */
    eval(`CollectionInstance = function ${capitalizedName}(data) {
      this.__proto__ = dp;

      // add properties to dp if not available
      for (var key in _documentPrototype) {
        if (key.substring(0,1) === '$' && !(key in dp)) {
          Object.defineProperty(dp, key, {
            enumerable:   false,
            writable:     false,
            configurable: false,
            value:        _documentPrototype[key]
          });
        }
      }

      CollectionInstance._wrap(this, data);
    }`);
    /* tslint:enable no-eval */

    dp.constructor = dp.$model = CollectionInstance;
    dp.__proto__ = CollectionInstance.prototype;

    CollectionInstance.constructor = Collection;
    CollectionInstance.__proto__ = Collection.prototype;
    CollectionInstance.def = def;
    CollectionInstance.id = colId;

    // add apply back to proto, for class inheritance...
    CollectionInstance.__proto__.apply = Function.prototype.apply;

    Type.validateType(CollectionInstance);

    if (!def.dbName) def.dbName = def.name;

    if (Tyr.db && !def.enum && !def.static && !def.aux)
      CollectionInstance.db = Tyr.db.collection(def.dbName);

    if (!def.primaryKey) {
      def.primaryKey = {
        field: '_id'
      };
    } else if (_.isString(def.primaryKey)) {
      def.primaryKey = {
        field: def.primaryKey
      };
    } else if (!_.isObject(def.primaryKey)) {
      throw new Error('Invalid "primaryKey" parameter');
    }

    const db = def.db || Tyr.options.db;

    if (db)
      CollectionInstance.db = db.collection(CollectionInstance.def.dbName);

    collections.push(CollectionInstance);
    collections[capitalizedName] = CollectionInstance;
    Tyr.components.push(CollectionInstance);
    Tyr.byId[def.id] = CollectionInstance;
    Tyr.byName[def.name] = CollectionInstance;

    for (const key in dp) {
      if (key.substring(0, 1) === '$' && key !== '$label') {
        Object.defineProperty(dp, key, {
          enumerable: false,
          writable: false,
          configurable: false
        });
      }
    }

    defineDocumentProperties(dp);

    _.each(def.fields, function(fieldDef, name) {
      const get = fieldDef.getServer || fieldDef.get,
        set = fieldDef.setServer || fieldDef.set,
        fn = fieldDef.fn || fieldDef.fnClient || fieldDef.fnServer,
        isDb = fieldDef.db;

      if (fn) {
        throw new Error(
          'Field ' +
            def.name +
            '.' +
            name +
            ' has fn/fnClient/fnServer set, fn is a method option, not a field option.'
        );
      }

      if (!fn && fieldDef.getClient && isDb) {
        throw new Error(
          'Field ' +
            def.name +
            '.' +
            name +
            ' needs a server-side get if db is set and client-side get is set.'
        );
      }

      if (get || set) {
        const prop = {
          enumerable: isDb !== undefined ? isDb : false,
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
        throw new Error(
          'Method ' +
            def.name +
            '.' +
            name +
            ' has no fn, fnClient, or fnServer function set.'
        );
      }

      if (method.fn && (method.fnClient || method.fnServer)) {
        throw new Error(
          'Method ' +
            def.name +
            '.' +
            name +
            ' has both fn and fnClient/fnServer set, they are mutually exclusive.'
        );
      }

      const fn = method.fn || method.fnServer;

      method.name = name;
      Object.defineProperty(dp, name, {
        enumerable: false,
        writable: false,
        configurable: false,
        value: fn
      });
    });

    CollectionInstance.paths = {};
    CollectionInstance.fields = {};

    CollectionInstance.compile('compile');
    CollectionInstance.validateValues();

    return CollectionInstance;
  }

  metaType = 'collection';

  toString() {
    return this.def.name;
  }

  _wrap(doc, pojo) {
    if (pojo) {
      _.assign(doc, pojo);

      if (pojo._id) {
        const preserveInitialValues = this.def.preserveInitialValues;
        if (
          preserveInitialValues &&
          (preserveInitialValues === true || preserveInitialValues(doc))
        ) {
          historical.preserveInitialValues(this, doc, true);
        } else if (this.def.historical) {
          historical.preserveInitialValues(this, doc);
        }
      }
    }
  }

  get label() {
    return _.result(this.def, 'label') || labelize(this.def.name);
  }

  /** @isomorphic */
  idToUid(id) {
    return this.id + id;
  }

  idToLabel(id) {
    if (!this.isDb()) {
      if (!id) return '';

      const doc = this.byIdIndex[id];
      return doc ? doc.$label : 'Unknown';
    }

    if (!id) return Promise.resolve('');

    // TODO: this code is here to correct for strings being in the database instead of ObjectIDs
    //       that we encountered ...
    //       figure out a better way to clean data and get rid of this
    if (typeof id === 'string') {
      const nId = this.fields._id?.type.fromString(id);
      if (nId) id = nId;
    }

    const lf = this.labelField;
    if (lf.def.get || lf.def.getServer) {
      // if the label field is computed, we need to query the whole thing since we don't know what the computation requires
      // (TODO:  analyze functions to determine their dependencies)

      return this.byId(id).then(doc => {
        return doc ? doc.$label : 'Unknown';
      });
    } else {
      return this.findOne(
        { [this.def.primaryKey.field]: id },
        { [lf.spath]: 1 }
      ).then(doc => (doc ? doc.$label : 'Unknown'));
    }
  }

  /** @isomorphic */
  isAux() {
    return !isDb();
  }

  /** @isomorphic */
  isDb() {
    return !this.isStatic() && !this.def.aux;
  }

  /** @isomorphic */
  isSingleton() {
    return !this.def.singleton;
  }

  /** @isomorphic */
  isStatic() {
    //return !!this.def.values;
    return !!this.def.enum || !!this.def.static;
  }

  byId(id, options) {
    if (!this.isDb()) {
      return this.byIdIndex[id];
    } else {
      if (typeof id === 'string')
        id = this.fields[this.def.primaryKey.field].type.fromString(id);

      return this.findOne({ [this.def.primaryKey.field]: id }, options);
    }
  }

  async byIds(ids, options) {
    const collection = this;

    if (!collection.isDb()) {
      return ids.map(id => collection.byIdIndex[id]);
    } else {
      const idFieldName = this.def.primaryKey.field;
      const opts = combineOptions(options, {
        query: { [idFieldName]: { $in: ids } }
      });

      const docs = await collection.findAll(opts);

      if (opts.parallel) {
        // ensure that byIds creates a parallel array to ids

        // using string ids due to possibility of two ObjectIds being !== but yet still .equal()
        const docsByStringId = {};
        for (const doc of docs) {
          docsByStringId['' + doc[idFieldName]] = doc;
        }

        return ids.map(id => docsByStringId['' + id] || null);
      } else {
        return docs;
      }
    }
  }

  byLabel(n, forcePromise) {
    const collection = this,
      findName = collection.labelField.path,
      matchLower = n.toLowerCase();

    if (!collection.isDb()) {
      const value = _.find(collection.def.values, function(v) {
        const name = v[findName];
        return name && name.toLowerCase() === matchLower;
      });

      return forcePromise ? Promise.resolve(value) : value;
    } else {
      const query = {};
      query[findName] = { $regex: escapeRegex(matchLower), $options: 'i' };
      return collection.findOne(query);
    }
  }

  /** @isomorphic */
  labelFor(doc) {
    const collection = this,
      labelField = collection.labelField;

    if (!labelField) {
      throw new Error(
        'No labelField defined for collection ' + collection.def.name
      );
    }

    // TODO:  have this use parsePath() to walk the object in case the label is stored in an embedded object
    // TODO:  support computed properties
    return doc[labelField.path];
  }

  /**  @isomorphic */
  labelProjection() {
    const lf = this.labelField;

    const fields = {
      [lf.path]: 1
    };

    const getFn = lf.def.get;
    if (getFn) {
      const paths = Tyr.functions.paths(getFn);

      for (const path of paths) {
        fields[path] = 1;
      }
    }

    const lfDef = lf.def.labelField;

    if (typeof lfDef === 'object' && !!lfDef.uses) {
      for (const path of lfDef.uses) {
        fields[path] = 1;
      }
    }

    return fields;
  }

  async labels(text, opts) {
    const lf = this.labelField;
    if (!lf) {
      throw new Error(
        `Collection "${this.name}" does not have a label field defined`
      );
    }

    const query = _.isObject(text)
      ? text
      : {
          [lf.path]: new RegExp(text, 'i')
        };

    const fields = this.labelProjection();
    let sort;
    if (this.fields.order) {
      sort = { order: 1 };
    } else if (!lf.def.get || lf.db) {
      sort = { [lf.spath]: 1 };
    }

    const labels = await this.findAll({
      query,
      projection: fields,
      sort,
      ...opts
    });

    return labels.filter(l => !!l.$label);
  }

  find(...args) {
    const collection = this,
      opts = extractOptions(collection, args);

    if (
      args.length &&
      (args.length !== 1 || (!isOptions(args[0]) && _.keys(args[0]).length))
    ) {
      console.warn(
        `*** ${this.name}.find(<query>, <fields>?, <opts>?) is deprecated ... use ${this.name}.find/findAll(<opts>)`
      );
    }

    let query, projection;
    switch (args.length) {
      case 2:
        projection = args[1];
        if (projection) opts.projection = args[1];
      // fall through

      case 1:
        query = args[0];
        if (query) opts.query = query;
        break;
      case 0:
    }

    query = opts.query;
    projection = extractProjection(opts);

    if (projection) {
      opts.projection = projection = parseProjection(collection, projection);
      delete opts.fields;
    }

    const auth = extractAuthorization(opts);

    function cursor() {
      const cursor = _find(collection, query, opts);

      let v;
      if ((v = opts.limit)) cursor.limit(v);
      if ((v = opts.skip)) cursor.skip(v);
      if ((v = opts.sort)) {
        cursor.collation({ locale: 'en' });
        cursor.sort(v);
      }

      return Object.create(cursor, {
        next: {
          async value() {
            let doc = await cursor.next();

            if (doc) {
              doc = await postFind(collection, opts, doc, auth);
            }

            return doc;
          }
        },
        toArray: {
          async value() {
            let docs = await cursor.toArray();

            if (docs.length) {
              docs = await postFind(collection, opts, docs, auth);
            }

            return docs;
          }
        }
      });
    }

    if (auth) {
      return Tyr.mapAwait(
        collection.secureFindQuery(
          query,
          opts.perm || OPTIONS.permissions.find,
          auth
        ),
        securedQuery => {
          opts.query = query = securedQuery;
          return cursor();
        }
      );
    }

    return cursor();
  }

  /**
   * Like find() + toArray() except things like the tyranid cursor are not created so it has less overhead
   */
  async findAll(...args) {
    const collection = this;
    let opts = extractOptions(collection, args);

    if (
      args.length &&
      (args.length !== 1 || (!isOptions(args[0]) && _.keys(args[0]).length))
    ) {
      console.warn(
        `*** ${this.name}.findAll(<query>, <fields>?, <opts>?) is deprecated ... use ${this.name}.find/findAll(<opts>)`
      );
    }

    let query, projection;
    switch (args.length) {
      case 2:
        projection = args[1];
        if (projection) opts.projection = args[1];
      // fall through

      case 1:
        query = args[0];
        if (query) opts.query = query;
        break;
      case 0:
    }

    query = opts.query;
    projection = extractProjection(opts);

    if (projection) {
      opts.projection = projection = parseProjection(collection, projection);
      delete opts.fields;
    }

    const auth = extractAuthorization(opts);
    if (auth && !opts.keepNonAccessible) {
      query = await collection.secureFindQuery(
        query,
        opts.perm || OPTIONS.permissions.find,
        auth
      );

      opts = _.clone(opts);
      delete opts.query; // remove the query from options otherwise it will supercede query in new mongo driver
    }

    const logPromise =
      Tyr.logging.trace &&
      Tyr.trace({
        e: 'db',
        c: collection.id,
        m: 'findAll' + (opts.count ? '+count' : ''),
        q: query
      });
    const cursor = collection.db.find(query, opts);

    let v;
    if ((v = opts.limit)) cursor.limit(v);
    if ((v = opts.skip)) cursor.skip(v);
    if ((v = opts.sort)) {
      cursor.collation({ locale: 'en' });
      cursor.sort(v);
    }

    const documentsPromise = cursor.toArray().then(async documents => {
      if (documents.length) {
        documents = await postFind(collection, opts, documents, auth);
      }
      return documents;
    });

    let result;
    if (opts.count) {
      const [documents, count] = await Promise.all([
        documentsPromise,
        cursor.count()
      ]);

      documents.count = count;
      result = documents;
    } else {
      result = await documentsPromise;
    }

    if (logPromise) Tyr.Log.updateDuration(logPromise);

    return result;
  }

  /**
   * Behaves like native mongodb's findOne() method except that the results are mapped to collection instances
   * and that it takes a projection as an optional second parameter and supports an options object
   */
  async findOne(...args) {
    const collection = this;

    let opts = extractOptions(collection, args);

    switch (args.length) {
      case 2:
        const f = args[1];
        if (f) {
          opts.projection = f;
        }
      // fall through
      case 1:
        // Support direct ObjectId arg, which will always query against _id
        if (args[0] instanceof ObjectId) {
          opts.query = { _id: args[0] };
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
    if (auth && !opts.keepNonAccessible) {
      query = await this.secureQuery(
        query,
        opts.perm || OPTIONS.permissions.find,
        auth
      );

      if (!query) {
        return null;
      }
    }

    let doc = await _findOne(
      collection,
      query,
      projection,
      _.omit(opts, ['query', 'fields', 'projection'])
    );
    if (doc) {
      doc = await postFind(this, opts, doc, auth);
      return doc;
    }

    return null;
  }

  /**
   * Behaves like native mongodb's findAndModify() method except that the results are mapped to collection instances.
   */
  async findAndModify(opts) {
    const collection = this,
      auth = extractAuthorization(opts);

    if (auth) {
      opts.query = await this.secureFindQuery(
        opts.query,
        opts.perm || OPTIONS.permissions.update,
        auth
      );
    }

    let update = opts.update;

    if (collection.def.historical && opts.historical !== false) {
      Tyr.warn('findAndModify() used on historical collection', new Error());
    }

    if (update) {
      // Check for whether update param is all field:value expressions.
      // If so, we should replace the entire doc (per Mongo api docs)
      const replaceEntireDoc = Object.keys(update).every(
        key => !key.startsWith('$')
      );

      if (opts.upsert) {
        const setOnInsertSrc = replaceEntireDoc ? update : update.$setOnInsert,
          $setOnInsert = await parseSaveObj(
            collection,
            _.merge(Tyr.cloneDeep(opts.query), setOnInsertSrc),
            opts
          );

        if (replaceEntireDoc) {
          opts.update = update = $setOnInsert;
        } else {
          update.$setOnInsert = _.omit($setOnInsert, (v, k) => {
            return (update.$set && update.$set[k]) || v === undefined;
          });
        }
      } else {
        if (collection.def.timestamps && opts.timestamps !== false) {
          if (replaceEntireDoc) {
            update.updatedAt = new Date();
          } else {
            update.$set = update.$set || {};
            update.$set.updatedAt = new Date();
          }
        }
      }
    }

    opts.projection = extractProjection(opts);
    if (opts.projection) {
      opts.projection = parseProjection(collection, opts.projection);
    }

    if (!opts.eventAlreadyDone) {
      await Tyr.Event.fire({ collection, type: 'update', when: 'pre', opts });
    }
    const result = await _findAndModify(collection, opts);

    if (result && result.value) {
      result.value = new collection(result.value);
      if (!opts.eventAlreadyDone) {
        await Tyr.Event.fire({
          collection,
          type: 'update',
          when: 'post',
          opts
        });
      }
    } else {
      if (!opts.eventAlreadyDone) {
        await Tyr.Event.fire({
          collection,
          type: 'update',
          when: 'post',
          opts
        });
      }
    }

    return result;
  }

  count(opts) {
    const collection = this,
      query = opts.query,
      auth = extractAuthorization(opts);

    if (auth) {
      return Tyr.mapAwait(
        collection.secureFindQuery(
          query,
          opts.perm || OPTIONS.permissions.find,
          auth
        ),
        securedQuery => {
          return _count(collection, securedQuery);
        }
      );
    }

    return _count(collection, query);
  }

  async exists(opts) {
    const collection = this,
      query = opts.query,
      auth = extractAuthorization(opts);

    if (auth) {
      return Tyr.mapAwait(
        collection.secureFindQuery(
          query,
          opts.perm || OPTIONS.permissions.find,
          auth
        ),
        async securedQuery => await _exists(collection, securedQuery)
      );
    }

    return await _exists(collection, query);
  }

  async save(obj, opts) {
    const collection = this;

    opts = combineOptions(obj.$options, opts);

    if (opts && extractProjection(opts)) {
      throw new Error(
        'save() does not support a projection option; maybe try updateDoc()/$update()'
      );
    }

    await preSave(collection, obj, opts);

    if (Array.isArray(obj)) {
      const arrOpts = combineOptions(opts, { preSaveAlreadyDone: true });
      // TODO:  use bulkops
      return await Promise.all(obj.map(doc => collection.save(doc, arrOpts)));
    }

    if (!(obj instanceof collection)) {
      // save off an actual collection instance, not just a pojo,
      // so that any computed db properties will get generated
      obj = new collection(obj);
    }

    const keyFieldName = collection.def.primaryKey.field,
      keyValue = obj[keyFieldName];

    let rslt;
    let historicalType =
      (!opts || opts.historical !== false) && collection.def.historical;

    let historicalPromise;
    if (keyValue) {
      // update

      if (historicalType) {
        if (obj.$historical) {
          throw new Error('Document is read-only due to $historical');
        } else {
          historical.snapshotPartial(
            opts,
            collection,
            obj,
            historical.patchPropsFromOpts(opts),
            (opts && extractProjection(opts)) || collection._historicalFields
          );
        }
      }

      await Tyr.Event.fire({
        collection,
        type: 'update',
        when: 'pre',
        document: obj,
        opts
      });

      if (historicalType === 'document')
        historicalPromise = historical.saveSnapshots(collection, obj);

      const updOpts = combineOptions(opts, {
        query: { [keyFieldName]: keyValue },
        upsert: true
      });

      const auth = extractAuthorization(opts);
      if (auth)
        updOpts.query = await this.secureFindQuery(
          updOpts.query,
          updOpts.perm || OPTIONS.permissions.update,
          auth
        );

      Object.assign(obj, Tyr.cloneDeep(updOpts.query));

      const update = await parseSaveObj(collection, obj, updOpts);

      // Mongo error if _id is present in findAndModify and doc exists. Note this slightly
      // changes save() semantics. See https://github.com/tyranid-org/tyranid/issues/29
      updOpts.update = _.omit(update, '_id');

      /*const result = */ await _findAndModify(collection, updOpts);

      await Tyr.Event.fire({
        collection,
        type: 'update',
        when: 'post',
        document: obj,
        opts
      });

      rslt = update;
    } else {
      // insert
      const modOpts = combineOptions(opts, { preSaveAlreadyDone: true });

      rslt = await collection.insert(obj, modOpts);
    }

    if (historicalType) {
      historical.preserveInitialValues(collection, obj);
      await historicalPromise; // allow historical saves to be concurrent with regular save
    }

    return rslt;
  }

  async insert(obj, opts) {
    const collection = this;

    await preSave(collection, obj, opts);

    const auth = extractAuthorization(opts);

    if (Array.isArray(obj)) {
      const parsedArr = await Promise.all(
        _.map(obj, el => parseSaveObj(collection, el))
      );

      if (auth) {
        const canInsertArr = await Promise.all(
          parsedArr.map(parsedObj =>
            collection.canInsert(
              parsedObj,
              opts.perm || OPTIONS.permissions.insert,
              auth
            )
          )
        );

        if (canInsertArr.some(val => !val)) {
          throw new Error('access denied');
        }
      }

      await Tyr.Event.fire({
        collection,
        type: 'insert',
        when: 'pre',
        _documents: parsedArr,
        opts
      });

      const docs = parsedArr.length
        ? (await collection.db.insertMany(parsedArr)).ops
        : [];

      for (let i = 0; i < obj.length; i++) {
        obj[i]._id = docs[i]._id;
      }

      if (collection.def.historical === 'document') {
        historical.saveSnapshots(collection, obj);
      }

      await Tyr.Event.fire({
        collection,
        type: 'insert',
        when: 'post',
        _documents: docs,
        opts
      });
      return docs;
    } else {
      const parsedObj = await parseSaveObj(collection, obj);

      if (auth) {
        const canInsert = await collection.canInsert(
          parsedObj,
          opts.perm || OPTIONS.permissions.insert,
          auth
        );

        if (!canInsert) {
          // TODO: Add $verifyAccess like ability to secure interface

          /*
          let { allowed, reason } = await collection.$verifyAccess(
            'create',
            auth
          );

          console.warn('Trying to insert, but not allowed by security', {
            allowed,
            reason
          });
          */

          throw new Error('access denied');
        }
      }

      if (collection.def.historical && (!opts || opts.historical !== false)) {
        if (obj.$historical) {
          throw new Error('Document is read-only due to $historical');
        } else if (collection.def.historical === 'document') {
          historical.snapshotPartial(
            opts,
            collection,
            obj,
            historical.patchPropsFromOpts(opts)
          );
        }
      }

      await Tyr.Event.fire({
        collection,
        type: 'insert',
        when: 'pre',
        document: parsedObj,
        opts
      });

      const rslt = await collection.db.insertOne(parsedObj);

      const doc = rslt.ops[0];
      obj._id = doc._id;

      if (collection.def.historical === 'document') {
        await historical.saveSnapshots(collection, obj);
      }

      await Tyr.Event.fire({
        collection,
        type: 'insert',
        when: 'post',
        document: doc,
        opts
      });

      return doc;
    }
  }

  /**
   * Updates a single document.  Used to implement document.$update() for example. @see update() for regular mongodb update()
   */
  async updateDoc(obj, ...args) {
    const collection = this,
      keyFieldName = collection.def.primaryKey.field;

    const opts = combineOptions(
      _.omit(obj.$options, ['fields', 'projection']),
      extractOptions(collection, args),
      {
        query: { [keyFieldName]: obj[keyFieldName] }
      }
    );

    if (!obj[keyFieldName]) {
      if (!opts.upsert) {
        throw new Error(
          `missing key field "${keyFieldName}" in updateDoc() call -- updateDoc() does not upsert unless upsert is set to true`
        );
      }

      return collection.insert(obj, ...args);
    }

    const updateFields = extractUpdateFields(obj, opts),
      update = {};

    _.each(updateFields, (field, key) => {
      update[key] = obj[key];
    });

    opts.update = { $set: update };

    let snapshot, diffProps;

    if (collection.def.historical && opts.historical !== false) {
      if (obj.$historical) {
        throw new Error('Document is read-only due to $historical');
      }

      // They might have read in the object without the _history var to reduce read-times.
      //
      // If so, we will do a direct $push onto the _history array.
      const historyPresent = !!obj._history;

      ({ snapshot, diffProps } = historical.snapshotPartial(
        opts,
        collection,
        obj,
        historical.patchPropsFromOpts(opts),
        updateFields,
        historyPresent
      ));

      if (snapshot && collection.def.historical === 'patch') {
        if (historyPresent) {
          update._history = obj._history;
        } else {
          opts.update.$push = { _history: snapshot };
        }
      }
    }

    const auth = extractAuthorization(opts);
    let query = opts.query;

    if (auth && !opts.keepNonAccessible) {
      query = await collection.secureQuery(
        query,
        opts.perm || OPTIONS.permissions.update,
        auth
      );

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the update() and potentially throw one there as well
        return false;
      }
    }

    timestampsUpdate(opts, collection, update, obj);

    await Tyr.Event.fire({
      collection,
      type: 'update',
      when: 'pre',
      document: obj,
      opts
    });

    /*const rslt = */ await collection.db.updateOne(query, opts.update, opts);
    let historicalPromise;
    if (snapshot && collection.def.historical === 'document') {
      historicalPromise = historical.saveSnapshots(collection, obj);
    }

    await Tyr.Event.fire({
      collection,
      type: 'update',
      when: 'post',
      document: obj,
      opts
    });

    if (diffProps) {
      historical.preserveInitialValues(collection, obj, diffProps);
      await historicalPromise;
    }

    return obj;
  }

  /**
   * Behaves like native mongodb's update().
   */
  async update(...args) {
    const collection = this;

    const opts = extractOptions(collection, args);

    switch (args.length) {
      case 2:
        opts.update = args[1];
      // fall through
      case 1:
        opts.query = args[0];
    }

    if (collection.def.historical && opts.historical !== false) {
      Tyr.warn(
        'update() (not $update()) used on historical collection',
        new Error()
      );
    }

    const update = opts.update,
      auth = extractAuthorization(opts);
    let query = opts.query;

    if (auth) {
      query = await collection.secureQuery(
        query,
        opts.perm || OPTIONS.permissions.update,
        auth
      );

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the update() and potentially throw one there as well
        return false;
      }
    }

    timestampsUpdate(opts, collection, update);

    await Tyr.Event.fire({
      collection,
      type: 'update',
      when: 'pre',
      query,
      opts
    });
    const rslt = opts.multi
      ? await collection.db.updateMany(query, update, opts)
      : await collection.db.updateOne(query, update, opts);
    await Tyr.Event.fire({
      collection,
      type: 'update',
      when: 'post',
      query,
      opts
    });
    return rslt;
  }

  async pull(id, path, predicate, ...args) {
    const collection = this,
      opts = extractOptions(collection, args),
      np = collection.parsePath(path);

    const qOpts = Tyr.cloneDeep(opts);
    qOpts.projection = { [np.path[0]]: 1 };

    const doc = await collection.byId(id, qOpts);

    const arr = np.get(doc);

    if (arr) {
      _.remove(arr, predicate);
      await doc.$update(opts);
    }
  }

  async push(id, path, value, ...args) {
    const collection = this,
      opts = extractOptions(collection, args);

    let history = opts.historical !== false && collection.def.historical;
    if (history && !collection.parsePath(path).isHistorical()) {
      history = false;
    }

    if (history === 'document') {
      const qOpts = Tyr.cloneDeep(opts),
        np = collection.parsePath(path);
      qOpts.projection = { [np.path[0]]: 1 };

      const doc = await collection.byId(id, qOpts);

      const arr = np.get(doc);
      if (!arr) {
        np.set(doc, [value]);
      } else {
        arr.push(value);
      }

      await doc.$update(opts);
      return;
    }

    const auth = extractAuthorization(opts),
      query = { _id: id };

    if (auth) {
      query = await collection.secureQuery(
        query,
        opts.perm || OPTIONS.permissions.update,
        auth
      );

      if (!query) throw new SecureError();
    }

    const pv = {
      [path]: value
    };

    if (history === 'patch') {
      pv._history = historical.snapshotPush(
        path,
        historical.patchPropsFromOpts(opts)
      );
    }

    const update = { $push: pv };

    timestampsUpdate(opts, collection, update);

    await collection.db.updateOne(query, update);
  }

  /**
   * Behaves like native mongodb's remove().
   */
  async remove(...args) {
    const collection = this,
      opts = extractOptions(collection, args);

    let query = opts.query,
      justOne = opts.justOne;

    switch (args.length) {
      case 2:
        justOne = args[1];
      // fall through
      case 1:
        query = args[0];
    }

    const auth = extractAuthorization(opts);

    if (auth) {
      query = await collection.secureQuery(
        query,
        opts.perm || OPTIONS.permissions.remove,
        auth
      );

      if (!query) {
        // throw a security exception here ?  if we do this, also need to examine results from the remove() and potentially throw one there as well
        return 0;
      }
    }

    if (justOne !== '$remove') {
      await Tyr.Event.fire({
        collection,
        type: 'remove',
        when: 'pre',
        query,
        opts
      });
    }
    const rslt = justOne
      ? await collection.db.deleteOne(query)
      : await collection.db.deleteMany(query);
    if (justOne !== '$remove') {
      await Tyr.Event.fire({
        collection,
        type: 'remove',
        when: 'post',
        query,
        opts
      });
    }
    return rslt;
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
  populate(projection, documents, denormal, opts) {
    const collection = this,
      populator = new Populator(denormal, opts),
      population = Population.parse(populator, collection, projection);

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

    const projection = { _id: 0 };

    let found = false;
    _.each(fields, field => {
      projection[field.spath] = 1;
      found = true;
    });

    if (!found) return [];

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

    (await (await collection.db.find({}, { projection })).toArray()).forEach(
      extractValues
    );

    return _.uniq(values);
  }

  /**
   * This creates a new record instance out of a POJO.  Values are copied by reference (not deep-cloned!).
   */
  async fromClient(pojo, path, opts) {
    let collection = this,
      fields = collection.fields;

    const namePath = path ? this.parsePath(path) : null;

    if (Array.isArray(pojo)) {
      return await Promise.all(
        pojo.map(async doc => await collection.fromClient(doc, path))
      );
    }

    if (namePath) {
      const detail = namePath.detail;
      collection = detail.def.id ? Tyr.byId[detail.def.id] : null;
      fields = detail.fields;
    }

    const obj = {};

    _.each(pojo, (v, k) => {
      const field = fields[k];

      if (field && (k === '_id' || !field.readonly)) {
        const type = field.type;

        if (!type) {
          throw new Error(
            `${collection.name}.${path} field missing a type, possible causes:

  (1) missing or unresolved "is", "link", ... in schema
  (2) tyranid calls made before tyranid is fully bootstrapped`
          );
        }

        obj[k] = type.fromClient(field, v);
      }
    });

    if (collection) {
      const doc = new collection(obj);

      const fromClientFn = collection.def && collection.def.fromClient;
      if (fromClientFn) {
        await fromClientFn.call(doc, opts || {});
      }

      return doc;
    } else {
      return obj;
    }
  }

  /**
   * This creates a new POJO out of a record instance.  Values are copied by reference (not deep-cloned!).
   */
  toClient(data, opts) {
    return toClient(this, data, opts);
  }

  parsePath(path) {
    // TODO NAMEPATH-1 ... return immutable shared value here
    return new NamePath(this, path);
  }

  createCompiler(def, stage, dynamicSchema) {
    const collection = this;

    const compiler = {
      stage: stage,

      err(path, msg) {
        return new Error(
          'Tyranid Schema Error| ' +
            def.name +
            (path ? '.' + path : '') +
            ' | ' +
            msg
        );
      },

      type(field, name, required) {
        let type = field[name];

        if (!type) {
          type = field.def[name];

          if (!type) {
            if (required)
              throw this.err(field.path, 'Missing "${name}" property');

            return;
          }

          if (_.isPlainObject(type)) {
            type = field[name] = new Field(type);
            if (field.method) type.method = field.method;
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
          type.parent = field;
          this.field(field.path + '._', type);
        }
      },

      field(path, field) {
        const fieldDef = field.def;
        if (!_.isObject(fieldDef)) {
          throw compiler.err(
            path,
            `Invalid field definition, expected an object, got: "${fieldDef}"`
          );
        }

        let { db, aux } = fieldDef;
        if (db !== undefined) {
          if (aux !== undefined) {
            if (aux && db)
              throw compiler.err(
                path,
                `Invalid field definition, db and aux cannot both be set`
              );
          }
          // db false does not imply aux true (i.e. computed values)
        } else if (aux) {
          // aux true implies db false
          fieldDef.db = db = false;
        }

        if (fieldDef.labelField) {
          collection.labelField = field;
        }

        // Store the field path and name on the field itself to support methods on Field
        field.collection = collection;
        field.path = path;
        if (fieldDef.group) {
          field.group = fieldDef.group;
        }

        if (!dynamicSchema && !field.method) {
          collection.paths[path] = field;
        }
        const lastDot = path.lastIndexOf('.');
        const fieldName = lastDot > -1 ? path.substring(lastDot + 1) : path;
        field.name = fieldName;

        // let them do:  "is: Job" or "link: Job" as an equivalence to "link: 'job'"
        if (fieldDef.is instanceof Collection) {
          fieldDef.link = fieldDef.is;
          delete fieldDef.is;
        }

        let type;
        let linkDef = fieldDef.link;
        if (linkDef) {
          if (linkDef instanceof Collection) {
            type = linkDef;
          } else if (_.isString(linkDef)) {
            if (linkDef.endsWith('?')) {
              linkDef = linkDef.substring(0, linkDef.length - 1);
            }

            type = Type.byName[linkDef];
          } else {
            type = linkDef;
          }

          if (type || stage === 'link') {
            if (!type) {
              throw compiler.err(path, 'Unknown type ' + linkDef);
            }

            if (!(type instanceof Collection)) {
              throw compiler.err(
                path,
                'Links must link to a collection, instead linked to ' + linkDef
              );
            }

            field.link = type;

            if (!fieldDef.is || fieldDef.is === 'link') {
              field.type = Type.byName.link;
            } else {
              // it's a link-type field like a bitmask
              type = Type.byName[fieldDef.is];

              if (type instanceof Collection) {
                throw compiler.err(
                  path,
                  'Trying to "is" a collection -- ' +
                    fieldDef.is +
                    ', either make it a "link" or a metadata snippet'
                );
              }

              if (type) {
                field.type = type;
              }
            }

            field.type.compile(compiler, field);
          }
        } else if (fieldDef.is) {
          type = field.type;

          if (!type) {
            type = fieldDef.is;
            if (_.isString(type)) {
              type = Type.byName[fieldDef.is];

              if (type instanceof Collection && !field.isMethod()) {
                throw compiler.err(
                  path,
                  'Trying to "is" a collection -- ' +
                    fieldDef.is +
                    ', either make it a "link" or a metadata snippet'
                );
              }

              if (type) {
                field.type = type;
              }
            }
          }

          if (type) {
            if (!(type instanceof Collection)) type.compile(compiler, field);
          } else if (!_.isObject(fieldDef.is) || !fieldDef.is.def) {
            throw compiler.err(
              path,
              'Expected field.is to be a string or a type, got: ' + fieldDef.is
            );
          }
        } else {
          throw compiler.err(
            path,
            'Unknown field definition: ' + JSON.stringify(fieldDef)
          );
        }

        if (fieldDef.denormal) {
          if (!fieldDef.link) {
            throw compiler.err(
              path,
              '"denormal" is only a valid option on links'
            );
          }

          const denormal = (collection.denormal = collection.denormal || {});
          // denormalization uses mongo-style syntax which omits '._'
          denormal[path.replace(/_\./g, '')] = fieldDef.denormal;
        }

        for (const fnName of [
          'get',
          'set',
          'getClient',
          'setClient',
          'getServer',
          'setServer',
          'validate',
          'where'
        ]) {
          if (fieldDef[fnName] && isArrow(fieldDef[fnName])) {
            throw compiler.err(
              path,
              `"${fnName}" is an arrow function; use a regular function so the document can be passed as "this"`
            );
          }
        }

        if (dynamicSchema) {
          field.dynamicMatch = dynamicSchema.match;
          field.schema = dynamicSchema;
        }
      },

      fields(path, parent, defFields) {
        if (!defFields) {
          throw compiler.err(path, 'Missing "fields"');
        }

        if (!_.isObject(defFields)) {
          throw compiler.err(
            path,
            '"fields" should be an object, got: ' + defFields
          );
        }

        if (_.keys(defFields).some(name => name.startsWith('$'))) {
          const newDefFields = {};

          for (const name in defFields) {
            if (name.startsWith('$')) {
              const group = defFields[name];

              const base = group.$base;
              if (!base) {
                throw compiler.err(
                  path,
                  `group "${name}" is missing a $base property`
                );
              }

              for (const fieldName in group) {
                if (fieldName !== '$base') {
                  if (newDefFields[fieldName]) {
                    throw compiler.err(
                      path,
                      `group "${name}" is redefining field "${fieldName}"`
                    );
                  }

                  newDefFields[fieldName] = {
                    ...base,
                    ...group[fieldName],
                    group: name
                  };
                }
              }
            } else {
              if (newDefFields[name]) {
                throw compiler.err(
                  path,
                  `field "${name}" is being redefined (was originally defined in group "${newDefFields[name].group}"`
                );
              }

              newDefFields[name] = defFields[name];
            }
          }

          // ensure that the ordering is retained
          for (const field in defFields) {
            delete defFields[field];
          }

          for (const field in newDefFields) {
            defFields[field] = newDefFields[field];
          }
        }

        for (const name of _.keys(defFields)) {
          let field = defFields[name];

          if (_.isString(field)) {
            field = { is: field };
          }

          if (!(field instanceof Field)) {
            field = defFields[name] = new Field(field);
          }

          // if it is an optional link to a collection that does not exist, prune it from the definition
          let link;
          if (
            stage === 'link' &&
            (link = field.def.link) &&
            _.isString(link) &&
            link.endsWith('?') &&
            !Type.byName[link.substring(0, link.length - 1)]
          ) {
            delete defFields[name];

            const paths = collection.paths;
            for (const name in paths) {
              if (paths[name] === field) {
                delete paths[name];
              }
            }

            const fields = collection.fields;
            for (const name in fields) {
              if (fields[name] === field) {
                delete fields[name];
              }
            }

            continue;
          }

          const parentFields = (parent.fields = parent.fields || {});
          //if (!dynamicSchema) {
          parentFields[name] = field;
          //}
          field.parent = parent;
          if (parent.method) field.method = parent.method;

          compiler.field(path ? path + '.' + name : name, field);
        }
      },

      method(methodName, defMethod) {
        if (!defMethod) return;

        if (!_.isObject(defMethod))
          throw compiler.err(
            path,
            '"service.${methodName}" should be an object, got: ' + defMethod
          );

        const { params, return: returns } = defMethod;

        if (params) {
          for (const paramName in params) {
            if (paramName === 'return')
              throw compiler.err(path, '"return" is a reserved parameter name');

            let field = params[paramName];

            if (_.isString(field)) field = { is: field };

            if (!(field instanceof Field))
              field = params[paramName] = new Field(field, {
                method: methodName
              });

            compiler.field(paramName, field);
          }
        } else {
          defMethod.params = {};
        }

        let field = returns;

        if (field) {
          if (_.isString(field)) field = { is: field };

          if (!(field instanceof Field))
            field = defMethod.return = new Field(field, { method: methodName });

          compiler.field('return', field);
        }
      },

      methods(methodsDef) {
        if (!methodsDef) return;

        if (!_.isObject(methodsDef))
          throw compiler.err(
            path,
            '"methods" should be an object, got: ' + methodsDef
          );

        for (const name in methodsDef) compiler.method(name, methodsDef[name]);
      },

      service(serviceDef) {
        if (!serviceDef) return;

        if (!_.isObject(serviceDef))
          throw compiler.err(
            path,
            '"service" should be an object, got: ' + serviceDef
          );

        for (const name in serviceDef) compiler.method(name, serviceDef[name]);
      }
    };

    return compiler;
  }

  compile(stage) {
    const collection = this;

    const compiler = collection.createCompiler(collection.def, stage);
    compiler.fields('', collection, collection.def.fields);

    if (!collection.def.fields[collection.def.primaryKey.field]) {
      throw new Error(
        'Collection ' +
          collection.def.name +
          ' is missing a "' +
          collection.def.primaryKey.field +
          '" primary key field.'
      );
    }

    if (
      (collection.def.enum || collection.def.static) &&
      !collection.labelField
    ) {
      throw new Error(
        `Some string field must have the label property set if the collection "${collection.def.name}" is an enumeration or static.`
      );
    }

    for (const fnName of ['fromClient', 'toClient']) {
      if (collection.def[fnName] && isArrow(collection.def[fnName])) {
        throw new Error(
          `Collection "${collection.def.name}" has a "${fnName}" arrow function; use a regular function so the document can be passed as "this"`
        );
      }
    }

    compiler.methods(collection.def.methods);
    compiler.service(collection.def.service);

    if (stage === 'link') {
      if (collection.def.historical) {
        historical.link(collection);
      }

      const validatedFields = (collection.validatedFields = []),
        paths = collection.paths;
      for (const fieldName in paths) {
        const field = paths[fieldName];

        if (field.def.validate) {
          validatedFields.push(field);
        }
      }
    }
  }

  validateValues() {
    const collection = this,
      def = collection.def,
      rows = def.values;

    if (!rows) {
      return;
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        'Expected values for collection ' + def.name + ' to be an array'
      );
    }

    const rlen = rows.length;
    let ri;

    if (!rlen) {
      return;
    }

    if (Array.isArray(rows[0])) {
      // array format

      for (ri = 0; ri < rlen; ri++) {
        if (!Array.isArray(rows[ri])) {
          throw new Error(
            'Expected value on row ' +
              ri +
              ' to be an array for collection ' +
              def.name
          );
        }
      }

      const header = rows[0],
        hlen = header.length,
        newValues = [];
      let hi, name;

      function parseValue(field, value) {
        const link = field.link;
        if (link && _.isString(value)) {
          const doc = link.byLabel(value);

          if (!doc) {
            throw new Error(
              'Label not found in ' + link.def.name + ': ' + value
            );
          }

          return doc._id;
        }

        return value;
      }

      const headerFields = new Array(hlen);
      for (hi = 0; hi < hlen; hi++) {
        name = header[hi];

        if (!_.isString(name)) {
          throw new Error(
            'Expected value ' +
              hi +
              ' in the values header for collection ' +
              def.name +
              ' to be a string'
          );
        }

        const field = def.fields[name];
        if (!field) {
          throw new Error(
            'Field ' + name + ' does not exist on collection ' + def.name
          );
        }

        headerFields[hi] = field;
      }

      for (ri = 1; ri < rlen; ri++) {
        const orow = rows[ri],
          nrow = {};
        let v;

        if (orow.length !== hlen && orow.length !== hlen + 1) {
          throw new Error(
            'Incorrect number of values on row ' +
              ri +
              ' in collection ' +
              def.name
          );
        }

        for (hi = 0; hi < hlen; hi++) {
          v = orow[hi];
          nrow[header[hi]] = parseValue(headerFields[hi], v);
        }

        if (orow.length > hlen) {
          const extraVals = orow[hi];

          _.each(extraVals, function(v, n) {
            const field = def.fields[n];
            if (!field) {
              throw new Error(
                'Field ' +
                  n +
                  ' does not exist on collection ' +
                  def.name +
                  ' on row ' +
                  ri
              );
            }

            nrow[n] = parseValue(field, v);
          });
        }

        v = new collection(nrow);
        if (collection.def.enum || collection.def.static) {
          name = v[collection.labelField.path];

          if (!name) {
            throw new Error(
              'Static document in collection ' +
                collection.def.name +
                ' missing label field: ' +
                collection.labelField.path
            );
          }

          collection[_.snakeCase(name).toUpperCase()] = v;
        }

        newValues.push(v);
      }

      def.values = newValues;
    } else {
      // object format

      for (ri = 0; ri < rlen; ri++) {
        if (!_.isObject(rows[ri])) {
          throw new Error(
            'Expected value on row ' +
              ri +
              ' to be an object for collection ' +
              def.name
          );
        }
      }
    }

    const byIdIndex = (collection.byIdIndex = {});
    def.values.forEach(function(doc) {
      byIdIndex[doc[collection.def.primaryKey.field]] = doc;
    });
  }

  addValue(doc) {
    this.def.values.push(doc);
    this.byIdIndex[doc.$id] = doc;
  }

  migratePatchToDocument(progress) {
    return historical.migratePatchToDocument(this, progress);
  }
}

Tyr.mixin(Collection, Component);

Tyr.Collection = Collection;
