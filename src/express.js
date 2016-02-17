
import _   from 'lodash';

import { collections } from './common';
import Collection from './classes/Collection';
import Field from './classes/Field';
import NamePath from './classes/NamePath';
import Type from './classes/Type';


const skipFnProps = ['arguments', 'caller', 'length', 'name', 'prototype'];
const skipNonFnProps = ['constructor'];

function translateClass(cls) {
  const cname = cls.name;
  let s = '';
  s += cls.toString() + '\n';

  function translateObj(path, o) {
    const isfn = _.isFunction(o);
    for (const n of Object.getOwnPropertyNames(o)) {
      if ((isfn ? skipFnProps : skipNonFnProps).indexOf(n) !== -1) {
        continue;
      }

      const desc = Object.getOwnPropertyDescriptor(o, n);

      const value = desc.value;
      if (value) {
        s += `${cname}${path}.${n} = ${value.toString()};\n`;
      } else if (desc.get) {
        s += `Object.defineProperty(${cname}${path}, '${n}', {get:${desc.get.toString()},enumerable:${desc.enumerable}});\n`;
      }
    }
  }

  translateObj('',           cls);
  translateObj('.prototype', cls.prototype);

  s += `Tyr.${cname} = ${cname};\n`;
  return s;
}

export default function(app, auth) {


  /*
   *     /api/tyranid
   */

  // TODO:  exposing this as a dynamic API call right now, but this could also be exposed as a
  //        gulp/build task which creates this file at build time.  This would allow this API
  //        call to be eliminated and for the file to be bundled using the client applications
  //        bundling process.  This would also allow splitting up the constant source code into
  //        its own file and also permit using ES6/ES7/etc.
  //
  //        NOTE that if it is exposed as a build task, then dynamic schema metadata will still
  //        need to be handled!

  // WARNING:  embedded javascript must currently be written in ES5, not ES6+
  let file = `
(function() {
  var Tyr = window.Tyr = {
        $all: '$all',
        collections: [],
        collectionsById: {}
      },
      byName = {};

  // TODO:  jQuery 3.0 supports Promises/A+; alternatively eliminate use of jQuery and work with XMLHttpRequest directly
  function ajax(opts) {
    var deferred = $.ajax(opts);

    return new Promise(function(resolve, reject) {
      deferred.then(function(data, textStatus, jqXHR) {
        resolve(data);
      }, function(jqXHR, textStatus, errorThrown) {
        reject(errorThrown);
      });
    });
  }

  // needed so grid can get at it ... document this or @private?
  Tyr.ajax = ajax;

  function lock(obj) {
    for (var key in obj) {
      Object.defineProperty(obj, key, {
        enumerable:   false,
        writable:     false,
        configurable: false,
        value:        obj[key]
      });
    }
  }

  Tyr.parseUid = function(uid) {
    const colId = uid.substring(0, 3);

    const col = Tyr.collectionsById[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    const strId = uid.substring(3);

    const idType = col.def.fields[col.def.primaryKey.field].type;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  }


  const documentPrototype = Tyr.documentPrototype = {
    $save: function() {
      return this.$model.save(this);
    }
  };

  Object.defineProperties(documentPrototype, {
    $id: {
      get: function() {
        return this[this.$model.def.primaryKey.field];
      },
      enumerable:   false,
      configurable: false
    },

    $label: {
      get: function() {
        return this.$model.labelFor(this);
      },
      enumerable:   false,
      configurable: false
    },

    $uid: {
      get: function() {
        var model = this.$model;
        return model.idToUid(this[model.def.primaryKey.field]);
      },
      enumerable:   false,
      configurable: false
    }
  });

  lock(documentPrototype);



  function Type(def) {
    var name = def.name;
    this.def = def;
    this.name = name;
    Type.byName[name] = this;
  }
  Type.prototype.format = ${Type.prototype.format.toString()};
  Type.byName = {};
  Tyr.Type = Type;
`;

  _.each(Type.byName, type => {
    file += `  new Type({
      name: '${type.name}',`;

    if (type.def.format) {
      file += `
      format: ${type.def.format.toString()},`;
    }

    file += `});\n`;
  });

  file += `



  function Field(def) {
    this.def = def;
    this.type = Type.byName[def.is];
  }
  Tyr.Field = Field;

  Field.prototype._calcPathLabel = ${Field.prototype._calcPathLabel};

  Object.defineProperties(Field.prototype, {
    db: {
      get: function() { return this.def.db !== false; }
    },

    label: {
      get: function() { return this.def.label; }
    },

    namePath: {
      get: function() {
        var np = this._np;
        if (!np) {
          np = this._np = new NamePath(this.collection, this.path);
        }
        return np;
      }
    },

    pathLabel: {
      get: function() { return this._calcPathLabel(); },
      enumerable:   false,
      configurable: false
    }
  });

  Field.prototype.labels = function(search) {
    const to = this.link;
    if (to.isStatic() ) {
      var values = to.def.values;

      if (search) {
        var re = new RegExp(search, 'i');
        values = values.filter(function(val) {
          return re.test(val.$label);
        });
      }

      const where = this.def.where;
      if (where) {
        values = values.filter(function(val) {
          return _.isMatch(val, where);
        });
      }

      return values;
    }

    return ajax({
      url: '/api/' + this.collection.def.name + '/' + this.path + '/label/' + (text || '')
    //}).then(function(docs) {
      //return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };



  ${translateClass(NamePath)}



  function Collection(def) {

    var CollectionInstance = function(data) {
      if (data) {
        _.assign(this, data);
      }
    };
    CollectionInstance.__proto__ = Collection.prototype;
    Object.defineProperty(CollectionInstance, 'name', {
      writable:  false,
      enumerable: false,
      configurable: true,
      value: def.name
    });

    var dp = Object.create(documentPrototype);
    dp.constructor = dp.$model = CollectionInstance;
    CollectionInstance.prototype = dp;

    CollectionInstance.def = def;
    CollectionInstance.id = def.id;

    lock(dp);

    var vals = def.values;

    if (vals) {
      vals = def.values = def.values.map(function(v) {
        return new CollectionInstance(v);
      });

      var byIdIndex = CollectionInstance.byIdIndex = {};
      vals.forEach(function(v) {
        CollectionInstance[_.snakeCase(v.name).toUpperCase()] = v;
        byIdIndex[v._id] = v;
      });
    }

    var fbp = CollectionInstance.fields = {};

    function vField(path, field) {
      var def = field.def;
      if (def.is === 'array') {
        field.of = def.of;
        vField(path + '._', field.of);
      } else if (def.fields) {
        vFields(path, def.fields);
      }
    }

    function vFields(path, fields) {
      _.each(fields, function(field, name) {
        var p = path ? path + '.' + name : name;
        field.name = name;
        field.path = p;
        field.collection = CollectionInstance;
        fbp[p] = field;
        vField(p, field);
      });
    }

    vFields('', def.fields);

    _.each(def.fields, function(field, name) {
      const fdef  = field.def,
            get  = fdef.get,
            set  = fdef.set,
            isDb = fdef.db;

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
      }
    });

    _.each(def.methods, function(method, name) {
      const fn = method.fn;
      method.name = name;
      Object.defineProperty(dp, name, {
        enumerable:   false,
        writable:     false,
        configurable: false,
        value:        fn
      });
    });

    Tyr.collections.push(CollectionInstance);
    Tyr.collectionsById[CollectionInstance.id] = CollectionInstance;
    byName[def.name] = CollectionInstance;

    var lf = def.labelField;
    if (lf) {
      CollectionInstance.labelField = CollectionInstance.fields[lf];
      delete def.labelField;
    }

    CollectionInstance._updateFields(null, def.fields);

    return CollectionInstance;
  }

  Collection.prototype._updateFields = function(parent, obj) {
    if (obj instanceof Field) {
      obj.parent = parent;
      this._updateFields(obj, obj.def);
    } else if (_.isArray(obj) || _.isObject(obj)) {
      _.each(obj, v => this._updateFields(parent, v));
    }
  };

  Collection.prototype.compile = function() {

    var def = this.def;
    if (def.labelField) {
      this.labelField = new NamePath(this, def.labelField).tail;
    }

    if (def.values) {
      this.values = def.values;
    }

    _.each(this.fields, function(field) {
      var def = field.def;

      if (def.link) {
        field.link = Tyr.byName[def.link];
      }
    });
  };

  Collection.prototype.idToUid = ${Collection.prototype.idToUid};

  Collection.prototype.idToLabel = function(id) {
    if (this.isStatic()) {
      if (!id) return '';
      const doc = this.byIdIndex[id];
      return doc ? doc.$label : 'Unknown';
    }

    if (!id) return Promise.resolve('');
    // TODO:  make the server-side version of this isomorphic portions of this once the other functionality is client-side
    return this.byId(id).then(doc => doc ? doc.$label : 'Unknown');
  }

  Collection.prototype.isStatic = ${Collection.prototype.isStatic};

  Collection.prototype.labelFor = ${Collection.prototype.labelFor};

  Collection.prototype.byId = function(id) {
    var col  = this;

    if (col.isStatic()) {
      return col.byIdIndex[id];
    } else {
      return ajax({
        url: '/api/' + col.def.name + '/' + id
      }).then(function(doc) {
        return new col(doc);
      }).catch(function(err) {
        console.log(err);
      });
    }
  };

  Collection.prototype.byLabel = function(label) {
    var vals = this.def.values;

    if (vals) {
      for (var vi=0; vi<vals.length; vi++) {
        var v = vals[vi];
        if (v.name === label)
          return v;
      }
    }
  };

  Collection.prototype.find = function(query) {
    var col  = this;

    return ajax({
      url: '/api/' + col.def.name,
      data: query
    }).then(function(docs) {
      return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };

  Collection.prototype.labels = function(search) {
    var col  = this;

    if (col.isStatic() ) {
      var values = col.def.values;

      if (search) {
        var re = new RegExp(search, 'i');
        values = values.filter(function(val) {
          return re.test(val.$label);
        });
      }

      return values;
    }

    return ajax({
      url: '/api/' + col.def.name + '/label/' + (search || '')
    //}).then(function(docs) {
      //return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };

  Collection.prototype.save = function(doc) {

    return ajax({
      url: '/api/' + this.def.name,
      method: 'put',
      data: doc
    })
  };

  // TODO:  support query instead of just an id?
  Collection.prototype.remove = function(id) {
    var col  = this;

    return ajax({
      url: '/api/' + col.def.name + '/' + id,
      method: 'delete'
    }).catch(function(err) {
      console.log(err);
    });
  };

  Tyr.Collection = Collection;
  var def;
`;

  class Serializer {
    constructor(path, depth) {
      this.file = '';
      this.path = path;
      this.depth = depth || 0;
    }

    newline() {
      let depth = this.depth;
      this.file += '\n';
      while (depth--) {
        this.file += '  ';
      }
    }

    field(field) {
      this.file += ': new Field({';
      this.depth++;

      const def = field.def;

      this.newline();
      this.file += 'is: "';
      this.file += field.type.name;
      this.file += '",';

      this.newline();
      this.file += 'label: "';
      this.file += field.label;
      this.file += '",';

      if (field.link) {
        this.newline();
        this.file += 'link: "';
        this.file += field.link.def.name;
        this.file += '",';
      }

      const denormal = def.denormal;
      if (denormal) {
        this.newline();
        this.file += 'denormal: ' + JSON.stringify(denormal) + ',';
      }

      const of = field.of;
      if (of) {
        this.newline();
        this.file += 'of';
        this.field(of);
      }

      var get = def.getClient || def.get;
      if (get) {
        this.newline();
        this.file += 'get: ' + get.toString() + ',';
      }

      if (def.db) {
        this.newline();
        this.file += 'db: ' + def.db + ',';
      }

      var set = def.setClient || def.set;
      if (set) {
        this.newline();
        this.file += 'set: ' + set.toString() + ',';
      }
      if (def.fields) {
        this.fields(def.fields);
      }

      this.depth--;
      this.newline();
      this.file += '}),';
    }

    fields(fields) {
      this.newline();
      this.file += 'fields: {';

      this.depth++;
      _.each(fields, field => {
        if (field.def.client !== false) {
          this.newline();
          this.file += field.name;
          this.field(field);
        }
      });
      this.depth--;
      this.newline();
      this.file += '},';
    }

    methods(methods) {
      this.newline();
      this.file += 'methods: {';

      this.depth++;
      _.each(methods, method => {
        if (method.fnClient || method.fn) {
          this.newline();
          this.file += method.name + ': {';
          this.depth++;
          this.newline();
          this.file += 'fn: ' + (method.fnClient || method.fn).toString();
          this.depth--;
          this.file += '},';
        }
      });
      this.depth--;
      this.newline();
      this.file += '}';
    }
  }

  collections.forEach(col => {
    const def = col.def;

    if (def.client !== false) {
      const name = def.name;

      file += `
  def = {
    id: ${JSON.stringify(def.id)},
    primaryKey: ${JSON.stringify(def.primaryKey)},
    name: '${name}',`

      const ser = new Serializer('.', 2);
      ser.fields(def.fields);
      if (def.methods) {
        ser.methods(def.methods);
      }
      file += ser.file;

      file += `
  };`;

      if (def.enum) {
        file += `
  def.values = ${JSON.stringify(def.values.map(v => v.$toClient()))};`;
      }
      if (col.labelField) {
        file += `
  def.labelField = ${JSON.stringify(col.labelField.path)};`;
      }
      if (def.grids) {
        file += `
  def.grids = ${JSON.stringify(def.grids)};`;
      }

      file += `
  new Collection(def);
`;
    }
  });

  file += `
  Tyr.byName = byName;
  Tyr.collections.forEach(function(c) { c.compile(); });
})();
`;

  app.route('/api/tyranid')
    .all(auth)
    .get(async (req, res) => res.send(file));

  collections.forEach(col => col.express(app, auth));
};

/**
 * @private ... clients should use Tyr.express()
 */
Collection.prototype.express = function(app, auth) {
  const col     = this,
        express = col.def.express;

  if (express) {
    const name = col.def.name;


    if (express.rest || (express.get || express.put)) {

      /*
       *     /api/NAME
       */

      console.log('adding route: ' + name);
      let r = app.route('/api/' + name);
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const query = req.query;

          try {
            const docs = await col.find(col.fromClientQuery(query));
            return res.json(col.toClient(docs));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      if (express.rest || express.post) {
        r.post(async function(req, res) {
          try {
            const doc = col.fromClient(req.body);

            if (doc._id) {
              res.status(403).send('Use put for updates');

            } else {
              await doc.$save();

            }

            res.json(col.toClient(doc));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      if (express.rest || express.put) {
        r.put(async function(req, res) {
          try {
            const doc = col.fromClient(req.body);

            if (doc._id) {
              const existingDoc = await col.findOne({ _id: doc._id });
              _.assign(existingDoc, doc);
              await existingDoc.$save();

            } else {
              await doc.$save();

            }

            res.json(col.toClient(doc));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }


      /*
       *     /api/NAME/:id
       */

      r = app.route('/api/' + name + '/:id');
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const doc = await col.byId(req.params.id);
          res.json(doc.$toClient());
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.db.remove({ _id : ObjectId(req.params.id) });
            res.sendStatus(200);
          } catch(err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      //.put(users.update);


      /*
       *     /api/NAME/label/:search
       */

      if (col.labelField && (express.rest || express.get)) {
        r = app.route('/api/' + name + '/label/:search');
        r.all(auth);
        r.get(async (req, res) => {
          try {
            const query = {
              [col.labelField.path]: new RegExp(req.params.search, 'i')
            };

            const results = await col.find(query, { [col.labelField.path]: 1 });
            res.json(results.map(r => r.$toClient()));
          } catch(err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }


      /*
       *     /api/NAME/FIELD_PATH/label/:search
       */

      if (express.rest || express.get) {
        _.each(col.fields, field => {
          const to = field.link;
          if (to && to.labelField) {
            r = app.route('/api/' + name + '/' + field.path + '/label/:search?');
            r.all(auth);
            r.get(async (req, res) => {
              try {
                const query = {};

                const search = req.params.search;
                if (search) {
                  query[to.labelField.path] = new RegExp(search, 'i');
                }

                const where = field.def.where;
                if (where) {
                  _.assign(query, where);
                }

                const results = await to.find(query, { [to.labelField.path]: 1 });
                res.json(results.map(r => r.$toClient()));
              } catch(err) {
                console.log(err.stack);
                res.sendStatus(500);
              }
            });
          }
        });
      }
    }

    if (col.route) {
      col.route(app, auth);
    }
  }
};
