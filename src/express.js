
import _            from 'lodash';
import { ObjectId } from 'mongodb';
import * as uglify from 'uglify-js';

const babel = require('babel-core');
//import babel        from 'babel-core';


import Tyr          from './tyr';
import Collection   from './core/collection';
import Field        from './core/field';
import NamePath     from './core/namePath';
import Type         from './core/type';
import local        from './local/local';


const skipFnProps = ['arguments', 'caller', 'length', 'name', 'prototype'];
const skipNonFnProps = ['constructor'];

class Serializer {
  constructor(path, depth, json) {
    this.file = '';
    this.path = path;
    this.depth = depth || 0;
    this.json = json;
  }

  newline() {
    let depth = this.depth;
    this.file += '\n';
    while (depth--) {
      this.file += '  ';
    }
  }

  commaToNewline() {
    let depth = this.depth;
    this.file = this.file.replace(/,$/, '\n'); // overwrite trailing comma
    while (depth--) {
      this.file += '  ';
    }
  }

  k(key) {
    return this.json ? '"' + key + '"' : key;
  }

  field(field) {
    this.file += ': {';
    this.depth++;

    const def = field.def;

    this.newline();
    this.file += this.k('is') + ': "';
    this.file += field.type.name;
    this.file += '",';

    this.newline();
    this.file += this.k('label') + ': "';
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

    if (def.multiline) {
      this.newline();
      this.file += this.k('multiline') + ': true,';
    }

    const order = def.order;
    if (order) {
      this.newline();
      this.file += this.k('order') + ': ' + JSON.stringify(order) + ',';
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
      this.file += 'get: ' + es5Fn(get) + ',';
    }

    if (def.db) {
      this.newline();
      this.file += 'db: ' + def.db + ',';
    }

    var set = def.setClient || def.set;
    if (set) {
      this.newline();
      this.file += 'set: ' + es5Fn(set) + ',';
    }
    if (field.fields) {
      this.fields(field.fields);
    }

    this.depth--;
    this.commaToNewline();
    this.file += '}';
  }

  fields(fields) {
    this.newline();
    this.file += this.k('fields') + ': {';

    this.depth++;
    var first = true;
    _.each(fields, field => {
      if (field.def.client !== false) {
        if (first) {
          first = false;
        } else {
          this.file += ',';
        }
        this.newline();
        this.file += this.k(field.name);
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
        this.file += 'fn: ' + es5Fn(method.fnClient || method.fn);
        this.depth--;
        this.file += '},';
      }
    });
    this.depth--;
    this.newline();
    this.file += '}';
  }
}

//let nextFnName = 1;
function es5Fn(fn) {
  let s = fn.toString();

  //const name = fn.name;

  //if (s.startsWith('function (')) {
    //s = 'function ' + (name || '_fn' + nextFnName++) + ' (' + s.substring(10);
  /*} else */
  if (!s.startsWith('function')) {
    s = 'function ' + s;
  }

  return s;
}

function translateValue(v) {
  return _.isFunction(v) ? es5Fn(v) : v.toString();
}

function translateClass(cls) {
  const cname = cls.name;
  let s = '';

  s += es5Fn(cls) + '\n';

  function translateObj(path, o) {
    const isfn = _.isFunction(o);
    for (const n of Object.getOwnPropertyNames(o)) {
      if ((isfn ? skipFnProps : skipNonFnProps).indexOf(n) !== -1) {
        continue;
      }

      const desc = Object.getOwnPropertyDescriptor(o, n);

      const value = desc.value;
      if (value) {
        s += `${cname}${path}.${n} = ${translateValue(value)};\n`;
      } else if (desc.get) {
        s += `Object.defineProperty(${cname}${path}, '${n}', {get:${translateValue(desc.get)},enumerable:${desc.enumerable}});\n`;
      }
    }
  }

  translateObj('',           cls);
  translateObj('.prototype', cls.prototype);

  s += `Tyr.${cname} = ${cname};\n`;
  return s;
}


// TODO:  exposing this as a dynamic API call right now, but this could also be exposed as a
//        gulp/build task which creates this file at build time.  This would allow this API
//        call to be eliminated and for the file to be bundled using the client applications
//        bundling process.  This would also allow splitting up the constant source code into
//        its own file and also permit using ES6/ES7/etc.
//
//        NOTE that if it is exposed as a build task, then dynamic schema metadata will still
//        need to be handled!
export function generateClientLibrary() {
  // WARNING:  embedded javascript must currently be written in ES5, not ES6+
  let file = `
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('jquery'), require('lodash'));
  } else {
    // Browser globals (root is window)
    root.Tyr = factory(root.jQuery, root._);
  }
})((typeof window !== 'undefined' ? window : this), function($, _) {
  var Tyr = { init: init };
  Tyr.Tyr = Tyr;

  return Tyr;

  function init() { //... begin Tyr.init();

  if (!$) throw new Error("jQuery not available to Tyranid client");
  if (!_) throw new Error("Lodash not available to Tyranid client ");

  _.assign(Tyr, {
    $all: '$all',
    collections: [],
    byId: {}
  });

  var byName = {};

  // TODO:  jQuery 3.0 supports Promises/A+; alternatively eliminate use of jQuery and work with XMLHttpRequest or fetch directly
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

  Tyr.parseUid = ${es5Fn(Tyr.parseUid)};
  Tyr.byUid = ${es5Fn(Tyr.byUid)};

  const documentPrototype = Tyr.documentPrototype = {
    $clone: function() {
      return new this.$model(_.cloneDeep(this));
    },

    $save: function() {
      return this.$model.save(this);
    },

    $slice: function(path, opts) {
      var doc = this,
          col = doc.$model;

      return ajax({
        url: '/api/' + col.def.name + '/' + id + '/' + path + '/slice'
      }).then(function(arr) {
        var np = col.paths[path].namePath,
            docArr = np.get(doc),
            begin = opts.skip || 0,
            end = opts.limit ? Math.min(begin + opts.limit, arr.length) : arr.length;

        if (!docArr) {
          docArr = [];
          np.set(doc, docArr);
        }

        for (let i = begin; i < end; i++) {
          docArr[i] = arr[i];
        }
      }).catch(function(err) {
        console.log(err);
      });
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

    $tyr: {
      get: function() {
        return Tyr;
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
  Type.prototype.format = ${es5Fn(Type.prototype.format)};
  Type.byName = {};
  Tyr.Type = Type;
`;

  _.each(Type.byName, type => {
    file += `  new Type({
      name: '${type.name}',`;

    if (type.def.format) {
      file += `
      format: ${es5Fn(type.def.format)},`;
    }

    file += `});\n`;
  });

  file += `

  function Field(def) {
    this.def = def;
    this.type = Type.byName[def.is];
  }
  Tyr.Field = Field;

  Field.prototype._calcPathLabel = ${es5Fn(Field.prototype._calcPathLabel)};

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
`;

  // TODO:  add in a dev flag so that the timer class only gets generated if in dev mode
  file += `
  ${Tyr.Timer.toString()}
  Tyr.Timer = Timer;


  function setPrototypeOf(obj, proto) {
    if ('__proto__' in {}) {
      obj.__proto__ = proto;
    } else {
      for (var prop in proto) {
        if (proto.hasOwnProperty(prop)) {
          obj[prop] = proto[prop];
        }
      }
    }

    return obj;
  }

  function Collection(def) {

    var CollectionInstance = function(data) {
      if (data) {
        _.assign(this, data);
      }
    };
    setPrototypeOf(CollectionInstance, Collection.prototype);
    // cannot redefine this property in safari
    //Object.defineProperty(CollectionInstance, 'name', {
      //writable:  false,
      //enumerable: false,
      //configurable: true,
      //value: def.name
    //});

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

    var fbp = CollectionInstance.paths = {};

    function vField(path, parent, field) {
      field.path = path;
      field.parent = parent;
      fbp[path] = field;
      field.collection = CollectionInstance;

      var def = field.def;
      if (def.is === 'array') {
        var of = new Field(def.of);
        field.of = of;
        vField(path + '._', field, of);
      } else if (def.fields) {
        vFields(path, field, def.fields);
      }
    }

    function vFields(path, parent, fieldDefs) {
      _.each(fieldDefs, function(fieldDef, name) {
        var p = path ? path + '.' + name : name;
        var field = new Field(fieldDef);
        field.name = name;

        var parentFields = parent.fields = parent.fields || {};
        parentFields[name] = field;
        field.parent = parent;

        vField(p, parent, field);
      });
    }

    vFields('', CollectionInstance, def.fields);

    _.each(CollectionInstance.fields, function(field, name) {
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
    Tyr.byId[CollectionInstance.id] = CollectionInstance;
    byName[def.name] = CollectionInstance;

    var lf = def.labelField;
    if (lf) {
      CollectionInstance.labelField = CollectionInstance.paths[lf];
      delete def.labelField;
    }

    return CollectionInstance;
  }

  Collection.prototype.compile = function() {

    var def = this.def;
    if (def.labelField) {
      this.labelField = new NamePath(this, def.labelField).tail;
    }

    if (def.values) {
      this.values = def.values;
    }

    _.each(this.paths, function(field) {
      var def = field.def;

      if (def.link) {
        field.link = Tyr.byName[def.link];
      }
    });
  };

  Collection.prototype.idToUid = ${es5Fn(Collection.prototype.idToUid)};
  Collection.prototype.isUid = ${es5Fn(Collection.prototype.isUid)};

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

  Collection.prototype.isStatic = ${es5Fn(Collection.prototype.isStatic)};

  Collection.prototype.labelFor = ${es5Fn(Collection.prototype.labelFor)};

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

  Collection.prototype.findAll = function(query) {
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

  Collection.prototype.customFields = function() {
    var col = this,
        cf = col._customFields;
    if (cf) {
      return Promise.resolve(cf);
    }

    return ajax({
      url: '/api/' + col.def.name + '/custom',
      method: 'get'
    }).then(function(def) {
      def = JSON.parse(def);
      var fields = def.fields;

      _.each(fields, function(fieldDef, fieldName) {
        var field = new Field(fieldDef);
        field.name = name;
        fields[fieldName] = field;
      });

      col._customFields = fields;
      return fields;

    }).catch(function(err) {
      console.log(err);
    });
  };

  Tyr.Collection = Collection;
  var def;
`;


  Tyr.collections.forEach(col => {
    const def = col.def;

    if (def.client !== false) {
      const name = def.name;

      file += `
  def = {
    id: ${JSON.stringify(def.id)},
    primaryKey: ${JSON.stringify(def.primaryKey)},
    name: '${name}',`

      const ser = new Serializer('.', 2);
      ser.fields(col.fields);
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
  Tyr.collections.forEach(function(c) { c.compile(); });`;

  Tyr.components.forEach(comp => {
    if (comp.clientCode) {
      file = comp.clientCode(file);
    }
  });

  file += `
}//... end Tyr.init();
});
`;

  try {
    file = babel.transform(file, {
      sourceMaps: false,
      compact: Tyr.options.minify !== undefined ? Tyr.options.minify : true,
      presets: [
        'stage-0',
        'es2015'
      ],
      plugins: [
        'transform-class-properties'
      ]
    }).code;


    /**
     * wrap in additional iife to allow for minification
     * of babel helpers
     */
    file = `;(function(){${file}})();`;

    // unbastardize imports for the client
    file = file.replace(/_tyr2.default/g, 'Tyr');
    file = file.replace(/_lodash2.default/g, '_');

    return Tyr.options.minify
      ? uglify.minify(file, { fromString: true }).code
      : file;
  } catch (err) {
    console.log(err.stack);
    throw err;
  }
}



export default function express(app, auth, opts) {

  /**
   * If we have already generated the client bundle,
   * as part of a build task, we don't need to expose
   * a separate endpoint or generate the bundle.
   */
  if (!Tyr.options.pregenerateClient && (!opts || !opts.noClient)) {
    const file = generateClientLibrary();

    //app.use(local.express);
    app.route('/api/tyranid')
      // we don't send insecure information in /api/tyranid, it is just source code
      //.all(auth)
      .get(async (req, res) => res.send(file));
  }

  Tyr.collections.forEach(col => col.express(app, auth));
  Tyr.components.forEach(comp => {
    if (comp.routes) {
      comp.routes(app, auth);
    }
  });
};

Tyr.express = express;

express.middleware = ::local.express;

/**
 * @private ... clients should use Tyr.express()
 */
Collection.prototype.express = function(app, auth) {
  const col     = this,
        express = col.def.express;

  if (express) {
    const name = col.def.name;


    if (express.rest || (express.get || express.put || express.array || express.fields)) {

      /*
       *     /api/NAME
       */
      Tyr.info('adding route: ' + name);
      let r = app.route('/api/' + name);
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const query = req.query;

          try {
            const docs = await col.findAll({ query: col.fromClientQuery(query), auth: req.user });
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
              await doc.$save({ auth: req.user });
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
              const existingDoc = await col.findOne({ query: { _id: doc._id }, auth: req.user });
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
       *     /api/NAME/custom
       */

      r = app.route('/api/' + name + '/custom');
      r.all(auth);

      if (express.rest || express.fields) {
        r.get(async (req, res) => {
          const fields = _.filter(await col.fieldsFor(req.user), f => f.def.custom);
          const ser = new Serializer('.', 2, true);
          ser.fields(fields);
          res.send('{' + ser.file.substring(0, ser.file.length - 1) + '}');
        });
      }


      /*
       *     /api/NAME/:id
       */

      r = app.route('/api/' + name + '/:id');
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const doc = await col.byId(req.params.id, { auth: req.user });
          res.json(doc.$toClient());
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.db.remove({ query: { _id: ObjectId(req.params.id) }, auth: req.user });
            res.sendStatus(200);
          } catch(err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      //.put(users.update);


      /*
       *     /api/NAME/:id/FIELD_PATH/slice
       *
       *     body {
       *       skip: <int>,
       *       limit: <int>,
       *       sort: object
       *     }
       *
       *     Gets a slice of an embedded array
       */

      if (express.rest || express.slice) {
        _.each(col.paths, field => {
          if (field.type.name === 'array') {
            r = app.route('/api/' + name + '/:id/' + field.path + '/slice');
            r.all(auth);
            r.get(async (req, res) => {
              try {
                const doc = await col.byId(
                  req.params.id,
                  {
                    auth: req.user,
                    fields: {
                      [field.spath]: 1
                    }
                  }
                );

                doc.$slice(field.path, req.body);

                res.json(field.get(doc.$toClient()));
              } catch(err) {
                console.log(err.stack);
                res.sendStatus(500);
              }
            });
          }
        });
      }


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

            const results = await col.findAll({ query, fields: { [col.labelField.path]: 1 }, auth: req.user });
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
        _.each(col.paths, field => {
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

                const results = await to.findAll({ query, fields: { [to.labelField.path]: 1 }, auth: req.user });
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
