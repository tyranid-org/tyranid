
import * as _          from 'lodash';
import { ObjectId }    from 'mongodb';
import * as uglify     from 'uglify-js';
import * as ts         from 'typescript';
import * as socketIo   from 'socket.io';

import Tyr             from './tyr';
import Collection      from './core/collection';
import Field           from './core/field';
import NamePath        from './core/namePath';
import Population      from './core/population';
import ValidationError from './core/validationError';
import Type            from './core/type';
import local           from './local/local';
import BooleanType     from './type/boolean';
import LinkType        from './type/link';

const skipFnProps = ['arguments', 'caller', 'length', 'name', 'prototype'];
const skipNonFnProps = ['constructor'];

function stringify(v) {

  if (v instanceof RegExp) {
    // mongo's format
    return JSON.stringify({ $regex: v.source, $options: v.flags });
  }

  return JSON.stringify(v);
}

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

    for (const field of [
      'multiline',
      'validate'
    ]) {
      if (def[field]) {
        this.newline();
        this.file += this.k(field) + ': true,';
      }
    }

    for (const field of [
      'cardinality',
      'custom',
      'defaultValue',
      'denormal',
      'granularity',
      'min',
      'minlength',
      'max',
      'maxlength',
      'order',
      'pattern',
      'placeholder',
      'required',
      'step'
    ]) {
      const v = def[field];
      if (v !== undefined) {
        this.newline();
        this.file += this.k(field) + ': ' + stringify(v) + ',';
      }
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
  Tyr.pluralize = ${es5Fn(Tyr.pluralize)};

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

    $share() {
      this.$model.indexById[this._id] = this;
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

  function refineJson(v) {
    return _.isObject(v) && v.$regex ? RegExp(v.$regex, v.$options) : v;
  }

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

    if (def.pattern) {
      def.pattern = refineJson(def.pattern);
    }
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

  Field.prototype.labels = function(doc, search) {
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
      url: '/api/' + this.collection.def.name + '/' + this.path + '/label/' + (search || '')
      method: 'put',
      data: doc
    });
  };

  ${ValidationError.toString()}
  Tyr.ValidationError = ValidationError;

  Field.prototype.validate = function(doc) {
    if (this.def.validate) {
      return ajax({
        url: '/api/' + this.collection.def.name + '/' + this.path + '/validate/'
        method: 'put',
        data: doc
      }).then(function(result) {
        if (result) {
          throw new ValidationError(this, result);
        }
      });
    }
  }

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

    eval(\`var CollectionInstance = function \${_.capitalize(def.name)}(data) {
      if (data) {
        _.assign(this, data);
      }

      const paths = this.$model.paths;
      for (const fk in paths) {
        const field = paths[fk],
              dv = field.def.defaultValue;

        if (dv !== undefined) {
          const np = field.namePath;

          const v = np.get(this);

          if (v === undefined) {
            np.set(this, dv);
          }
        }
      }
    };\`);
    //var CollectionInstance = function(data) {
      //if (data) {
        //_.assign(this, data);
      //}
    //};

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
    CollectionInstance.label = def.label;
    CollectionInstance.byIdIndex = {};
    delete def.label;

    lock(dp);

    var vals = def.values;

    if (vals) {
      vals = def.values = def.values.map(function(v) {
        return new CollectionInstance(v);
      });

      var byIdIndex = CollectionInstance.byIdIndex;
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

  Collection.prototype.findOne = function(opts) {
    var col = this;

    opts = _.assign({}, opts);
    opts.limit = 1;

    return ajax({
      url: '/api/' + col.def.name,
      data: opts
    }).then(docs => docs && docs.length ? new col(docs[0]) : null);
  };

  Collection.prototype.findAll = function(opts) {
    const col = this;

    return ajax({
      url: '/api/' + col.def.name,
      data: opts
    }).then(rslt => {
      if (Array.isArray(rslt)) {
        return rslt.map(doc => new col(doc));
      } else if (_.isObject(rslt)) {
        const docs = rslt.docs;
        docs.count = rslt.count;
        return docs;
      }
    });
  };

  Collection.prototype.count = function(opts) {
    return ajax({
      url: '/api/' + this.def.name + '/count',
      data: opts
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

  Collection.prototype.remove = function(idOrQuery) {
    return ajax(
      (typeof idOrQuery === 'string') ?
      {
        url: '/api/' + this.def.name + '/' + idOrQuery,
        method: 'delete'
      } :
      {
        url: '/api/' + this.def.name,
        data: idOrQuery,
        method: 'delete'
      }
    ).catch(function(err) {
      console.log(err);
    });
  };

  Collection.prototype.customFields = function(objMatch) {
    var col = this,
        cf = col._customFields;
    if (cf) {
      // we cannot use this cache because we're using the document as a match instead of the user now ...
      // we could do the objMatcher logic on the client instead of the server, then we could cache all
      // fields for a custom collection and filter them on the client, saving this extra server call
      //return Promise.resolve(cf);
    }

    return ajax({
      type: 'POST',
      url: '/api/' + col.def.name + '/custom',
      data: JSON.parse(JSON.stringify(objMatch)), // convert document to pojo
      dataType: 'json'
    }).then(function(def) {
      //def = JSON.parse(def);
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

  function fireDocUpdate(doc, type) {
    const collection = doc.$model,
          events = collection.events;

    if (events) {
      const handlers = events[type];

      if (handlers) {
        const event = {
          collection: collection,
          document: doc,
          type: type
        };

        for (const handlerOpts of handlers) {
          handlerOpts.handler(event);
        }
      }
    }
  }

  Collection.prototype.cache = function(doc) {
    const existing = this.byIdIndex[doc._id];

    if (existing) {
      Object.assign(existing, doc);
      fireDocUpdate(existing, 'change');
      return existing;
    } else {
      if (!(doc instanceof this)) {
        doc = new this(doc);
      }

      this.byIdIndex[doc._id] = doc;
      let values = this.values;
      if (this.values) {
        this.values.push(doc);
      } else {
        this.values = [ doc ];
      }

      fireDocUpdate(doc, 'change');
      return doc;
    }
  };

  Collection.prototype.on = ${es5Fn(Collection.prototype.on)};

  if (window.io) {
    Collection.prototype.subscribe = function(query) {
      return ajax({
        url: '/api/' + this.def.name + '/subscribe',
        data: query
      }).catch(function(err) {
        console.log(err);
      });
    };

    Tyr.socket = window.io();

    Tyr.socket.on('subscriptionEvent', function(data) {
      var col = Tyr.byId[data.colId];

      _.each(data.docs, function(doc) {
        col.cache(doc);
      });
    });
  }

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
    name: '${name}',
    label: '${col.label}',`;

      if (col.def.enum) {
        file += `
    enum: true;`;
      }

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
    file = compile(file);

    /**
     * wrap in additional iife to allow for minification
     * of babel helpers
     */
    file = `;(function(){${file}})();`;

    // unbastardize imports for the client
    file = file.replace(/tyr_1.default/g, 'Tyr');
    file = file.replace(/lodash_1.default/g, '_');

    return Tyr.options.minify
      ? uglify.minify(file, { fromString: true }).code
      : file;
  } catch (err) {
    console.log(err.stack);
    throw err;
  }
}

function compile(code) {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES5
    }
  });

  result.diagnostics.forEach(diagnostic => {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  });

  return result.outputText;
}

//const sockets = {};

export default function connect(app, auth, opts) {
  // supports deprecated express() options
  if (!auth && !opts) {
    opts = app;
    app = opts.app;
    auth = opts.auth;
  } else if (!opts) {
    opts = { app, auth };
  }

  if (opts.store) {
    Tyr.sessions = opts.store;
  }

  /**
   * If we have already generated the client bundle,
   * as part of a build task, we don't need to expose
   * a separate endpoint or generate the bundle.
   */
  if (app && !Tyr.options.pregenerateClient && !opts.noClient) {
    const file = generateClientLibrary();

    //app.use(local.express);
    app.route('/api/tyranid')
      // we don't send insecure information in /api/tyranid, it is just source code
      //.all(auth)
      .get(async (req, res) => res.send(file));
  }

  Tyr.collections.forEach(col => col.connect(opts));

  if (app) {
    Tyr.app = app;

    Tyr.components.forEach(comp => {
      if (comp.routes) {
        comp.routes(app, auth);
      } else if (comp.def && comp.def.routes) {
        comp.def.routes.call(comp, app, auth);
      }
    });
  }

  const http = opts.http;
  if (http) {
    const io = Tyr.io = Tyr.socketIo = socketIo(http);

    io.on('connection', socket => {
      //console.log('*** connected', socket);

      //console.log('*** client', socket.client);
      //console.log('*** headers', socket.client.request.headers);

      const rawSessionId = /connect.sid\=([^;]+)/g.exec(socket.client.request.headers.cookie);
      if (rawSessionId && rawSessionId.length) {
        const sessionId = unescape(rawSessionId[1]).split('.')[0].slice(2);

        Tyr.sessions.get(sessionId, async (error, session) => {
          const userIdStr = session.passport.user;
          if (userIdStr) {
            socket.userId = ObjectId(userIdStr);
          }
        });
      }

      socket.on('disconnect', () => {
        Tyr.byName.tyrSubscription.unsubscribe(socket.userId);
        socket.userId = null;
      });
    });
  }
}

Tyr.connect = Tyr.express /* deprecated */ = connect;

connect.middleware = local.express.bind(local);

/**
 * @private ... clients should use Tyr.express()
 *
 * auth is deprecated, use opts.auth instead
 */
Collection.prototype.connect = function({ app, auth, http }) {
  const col     = this,
        express = col.def.express;

  if (express && app) {
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
          try {
            const rOpts = req.query;

            const opts = {
              query: rOpts.query ? col.fromClientQuery(rOpts.query) : {},
              auth: req.user
            };

            if (rOpts.populate) {
              opts.populate = Population.fromClient(rOpts.populate);
            }

            if (rOpts.limit) {
              opts.limit = parseInt(rOpts.limit, 10);
            }

            if (rOpts.skip) {
              opts.skip = parseInt(rOpts.skip, 10);
            }

            if (rOpts.count) {
              opts.count = BooleanType.fromString(rOpts.count);
            }

            const docs = await col.findAll(opts),
                  cDocs = col.toClient(docs);

            if (opts.count) {
              res.json({
                count: docs.count,
                docs: cDocs
              });
            } else {
              return res.json(cDocs);
            }
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      if (express.rest || express.post) {
        r.post(async function(req, res) {
          try {
            const doc = col.fromClient(req.body, undefined, { req });

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
            const doc = col.fromClient(req.body, undefined, { req });

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

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.remove({ query: col.fromClientQuery(req.query), auth: req.user });
            res.sendStatus(200);
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      /*
       *     /api/NAME/count
       */

      r = app.route('/api/' + name + '/count');
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          try {
            return res.json(
              await col.count({ query: col.fromClientQuery(req.query), auth: req.user })
            );
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
        r.post(async (req, res) => {
          try {
            let obj = req.body;
            if (obj) {
              obj = col.fromClient(obj, undefined, { req });
            } else {
              obj = req.user;
            }

            const fields = _.filter(await col.fieldsFor(obj), f => f.def.custom);
            const ser = new Serializer('.', 2, true);
            ser.fields(fields);
            res.send('{' + ser.file.substring(0, ser.file.length - 1) + '}');
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      /*
       *     /api/NAME/subscribe
       */

      r = app.route('/api/' + name + '/subscribe');
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const query = req.query;

          try {
            await col.subscribe(col.fromClientQuery(query), req.user);
            res.sendStatus(200);
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
          const doc = await col.byId(req.params.id, { auth: req.user });
          res.json(doc.$toClient());
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.remove({ query: { _id: ObjectId(req.params.id) }, auth: req.user });
            res.sendStatus(200);
          } catch (err) {
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
              } catch (err) {
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
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      /*
       *     /api/NAME/FIELD_PATH/label/:search
       *     /api/NAME/FIELD_PATH/validate
       */

      if (express.rest || express.get) {
        _.each(col.paths, field => {
          const to = field.link;
          if (to && to.labelField) {
            r = app.route('/api/' + name + '/' + field.path + '/label/:search?');
            r.all(auth);
            r.put(async (req, res) => {
              try {
                const doc = col.fromClient(req.body, undefined, { req }),
                      query = {},
                      search = req.params.search;

                if (search) {
                  query[to.labelField.path] = new RegExp(search, 'i');
                }

                LinkType.applyWhere(field, doc, query);

                const results = await to.findAll({ query, fields: { [to.labelField.path]: 1 }, auth: req.user });
                res.json(results.map(r => r.$toClient()));
              } catch (err) {
                console.log(err.stack);
                res.sendStatus(500);
              }
            });
          }

          const validateFn = field.def.validate;
          if (validateFn) {
            r = app.route('/api/' + name + '/' + field.path + '/validate');
            r.all(auth);
            r.put(async (req, res) => {
              try {
                await field.validate(col.fromClient(req.body, undefined, { req }));
                res.json('');
              } catch (err) {
                if (err instanceof ValidationError) {
                  res.json(err.reason);
                } else {
                  console.log(err.stack);
                  res.sendStatus(500);
                }
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
