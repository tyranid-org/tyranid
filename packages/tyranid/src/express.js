import * as _ from 'lodash';
import * as moment from 'moment';

import { ObjectId } from 'mongodb';
import * as uglify from 'uglify-js';
import * as ts from 'typescript';
import * as socketIo from 'socket.io';

import Tyr from './tyr';
import Collection from './core/collection';
import Field from './core/field';
import { Roman } from './math/roman';
import Path from './core/path';
import { Population, visitPopulations } from './core/population';
import { AppError } from './core/appError';
import { UserError } from './core/userError';
import Type from './core/type';
import local from './local/local';
import SecureError from './secure/secureError';
import BooleanType from './type/boolean';
import { flattenProjection } from './core/projection';
import { instrumentExpressServices, serviceClientCode } from './service';

const skipFnProps = ['arguments', 'caller', 'length', 'name', 'prototype'];
const skipNonFnProps = ['constructor'];

function stringify(v) {
  return typeof v === 'function' ? es5Fn(v) : Tyr.stringify(v);
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

    if (field.link) {
      this.newline();
      this.file += this.k('link') + ': "';
      this.file += field.link.def.name;
      this.file += '",';
    }

    for (const field of ['multiline', 'validate']) {
      if (def[field]) {
        this.newline();
        this.file += this.k(field) + ': true,';
      }
    }

    for (const fieldName of [
      'aux',
      'cardinality',
      'custom',
      'db',
      'defaultValue',
      'denormal',
      'generated',
      'granularity',
      'group',
      'help',
      'if',
      'inverse',
      'keys',
      'label',
      'labelField',
      'labelImageField',
      'min',
      'minlength',
      'max',
      'maxlength',
      'numbering',
      'order',
      'pathLabel',
      'pattern',
      'placeholder',
      'readonly',
      'relate',
      'required',
      'step',
      'validateSearch',
      'width',
    ]) {
      const v = def[fieldName];
      if (v !== undefined) {
        this.newline();
        this.file += this.k(fieldName) + ': ' + stringify(v) + ',';
      }
    }

    for (const fieldName of ['dynamicMatch']) {
      const v = field[fieldName];
      if (v !== undefined) {
        this.newline();
        this.file += this.k(fieldName) + ': ' + stringify(v) + ',';
      }
    }

    const of = field.of;
    if (of) {
      this.newline();
      this.file += this.k('of');
      if (of instanceof Tyr.Field) {
        this.field(of);
      } else {
        this.file += ':' + stringify(field.def.of);
      }
      this.file += ',';
    }

    var get = def.getClient || def.get;
    if (get) {
      this.newline();
      this.file += this.k('get') + ': ' + es5Fn(get) + ',';
    }

    var set = def.setClient || def.set;
    if (set) {
      this.newline();
      this.file += this.k('set') + ': ' + es5Fn(set) + ',';
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
    this.file += this.k('methods') + ': {';

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

  serviceMethod(methodName, method) {
    this.newline();
    this.file += this.k(methodName) + ': {';
    this.depth++;

    const { params, return: returns, route } = method;
    this.file += this.k('route') + ': "' + route + '"';

    if (params) {
      this.file += ',';
      this.newline();
      this.file += this.k('params') + ': {';
      this.depth++;

      let i = 0;
      for (const paramName in params) {
        const param = params[paramName];

        if (i++) this.file += ',';
        this.newline();
        this.file += this.k(paramName);
        this.field(param);
      }

      this.depth--;
      this.file += '}';
    }

    if (returns) {
      this.file += ',';
      this.newline();
      this.file += this.k('return');
      this.field(returns);
    }

    this.depth--;
    this.file += '}';
  }

  service(service) {
    this.newline();
    this.file += this.k('service') + ': {';
    this.depth++;

    for (const methodName in service) {
      this.serviceMethod(methodName, service[methodName]);
    }

    this.depth--;
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
  if (!s.startsWith('function') && !s.startsWith('() =>')) {
    s = 'function ' + s;
  }

  return s;
}

function translateValue(v) {
  switch (typeof v) {
    case 'function':
      return es5Fn(v);
    case 'object':
      if (v instanceof RegExp) return v.toString();
    // fallthrough
    default:
      return JSON.stringify(v);
  }
}

function translateClass(cls) {
  const cname = cls.name;
  let s = '';

  function translateObj(path, o, skipFns) {
    const isfn = _.isFunction(o);
    for (const n of Object.getOwnPropertyNames(o)) {
      if ((isfn ? skipFnProps : skipNonFnProps).indexOf(n) !== -1) {
        continue;
      }

      const desc = Object.getOwnPropertyDescriptor(o, n);

      const value = desc.value;
      if (value) {
        if (!skipFns || typeof value !== 'function')
          s += `${cname}${path}.${n} = ${translateValue(value)};\n`;
      } else if (desc.get) {
        s += `Object.defineProperty(${cname}${path}, '${n}', {get:${translateValue(
          desc.get
        )},enumerable:${desc.enumerable}});\n`;
      }
    }
  }

  const v = cls.toString();
  if (v.startsWith('class')) {
    s += cls + '\n';
    translateObj('', cls, true);
  } else {
    s += es5Fn(cls) + '\n';

    translateObj('', cls);
    translateObj('.prototype', cls.prototype);
  }

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
  let file = `
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('lodash'), require('moment'));
  } else {
    // Browser globals (root is window)
    root.Tyr = factory(root._, root.moment);
  }
})((typeof window !== 'undefined' ? window : this), function(_, moment) {
  var Tyr = { init: init };
  Tyr.Tyr = Tyr;
  return Tyr;

  function init() { //... begin Tyr.init();

  if (!_) throw new Error("Lodash not available to Tyranid client ");
  if (!moment) throw new Error("moment not available to Tyranid client ");

  Object.assign(Tyr, {
    $all: '$all',
    collections: [],
    byId: {},
    options: {}
  });

  ${
    Tyr.options.aws && Tyr.options.aws.cloudfrontPrefix
      ? `Tyr.options.aws = { cloudfrontPrefix: '${Tyr.options.aws.cloudfrontPrefix}' };\n`
      : ''
  }
  ${
    Tyr.options.csrf
      ? `Tyr.options.csrf = ${JSON.stringify(Tyr.options.csrf)};`
      : ''
  }
  ${
    Tyr.options.exceptions
      ? `Tyr.options.exceptions = ${JSON.stringify(Tyr.options.exceptions)};`
      : ''
  }
  ${
    Tyr.options.formats
      ? `Tyr.options.formats = ${JSON.stringify(Tyr.options.formats)};`
      : ''
  }`;

  const whiteLabelFn = Tyr.options.whiteLabelClient || Tyr.options.whiteLabel;
  if (whiteLabelFn)
    file += `
  Tyr.options.whiteLabel = ${es5Fn(whiteLabelFn)};`;

  file += `

  ${AppError.toString()}
  Tyr.AppError = AppError;

  ${SecureError.toString()}
  Tyr.SecureError = SecureError;

  ${UserError.toString()}
  Tyr.UserError = UserError;

  var byName = Tyr.byName = {};

  function cookie(key) {
    let result;
    return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
  }

  Tyr.fetch = async function(url, opts) {
    opts = opts || {};
    const csrf = Tyr.options.csrf;
    if (csrf) {
      var headers = opts.headers = opts.headers || {};
      headers[csrf.header] = cookie(csrf.cookie);
    }

    try {
      const response = await fetch(url, opts);
      const json = /application\\/json/.test(response.headers.get('Content-Type')) ? await response.json() : undefined;

      const { status } = response;

      if (status !== 200) {
        const authCode = _.get(Tyr.options, 'exceptions.secure.httpCode') || 403;
        if (status === authCode) {
          throw new SecureError(json);
        } else if (status < 500) {
          throw new Tyr.UserError(json);
        } else {
          throw new Tyr.AppError(json);
        }
      }

      return json;
    } catch (err) {
      throw new Tyr.AppError(err);
    }
  };

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

  Tyr.isObject = ${es5Fn(Tyr.isObject)};
  Tyr.clear = ${es5Fn(Tyr.clear)};
  Tyr.clone = obj => _.clone(obj);
  Tyr.cloneDeep = obj => _.cloneDeep(obj);
  Tyr.assignDeep = ${es5Fn(Tyr.assignDeep)};
  Tyr.compactMap = ${es5Fn(Tyr.compactMap)};
  Tyr.parseUid = ${es5Fn(Tyr.parseUid)};
  Tyr.byUid = ${es5Fn(Tyr.byUid)};
  Tyr.capitalize = ${es5Fn(Tyr.capitalize)};
  Tyr.kebabize = ${es5Fn(Tyr.kebabize)};
  Tyr.labelize = ${es5Fn(Tyr.labelize)};
  Tyr.numberize = ${es5Fn(Tyr.numberize)};
  Tyr.mapAwait = ${es5Fn(Tyr.mapAwait)};
  Tyr.ordinalize = ${es5Fn(Tyr.ordinalize)};
  Tyr.pluralize = ${es5Fn(Tyr.pluralize)};
  Tyr.projectify = ${es5Fn(Tyr.projectify)};
  Tyr.singularize = ${es5Fn(Tyr.singularize)};
  Tyr.snakize = ${es5Fn(Tyr.snakize)};
  Tyr.stringify = ${es5Fn(Tyr.stringify)};
  Tyr.unitize = ${es5Fn(Tyr.unitize)};
  Tyr.isEqual = _.isEqual;
  Tyr.isSameId = ${es5Fn(Tyr.isSameId)};

  Tyr.isCompliant = (spec, object) => {
    // TODO:  implement array matching like server version
    return _.isMatch(object, spec);
  };

  const local = Tyr.local = {};

  const documentPrototype = Tyr.documentPrototype = {
    $cache() {
      this.$model.cache(this);
      return this;
    },

    $clone() {
      return new this.$model(_.clone(this));
    },

    $cloneDeep() {
      return new this.$model(_.cloneDeep(this));
    },

    $get(path) {
      return this.$model.parsePath(path).get(this);
    },

    $set(path, value) {
      return this.$model.parsePath(path).set(this, value, { create: true });
    },

    $remove() {
      if (this._id) {
        return this.$model.remove({ _id: this._id });
      }
    },

    $revert() {
      const { $orig } = this;
      if ($orig) {
        Object.assign(this, _.cloneDeep($orig));
      }
    },

    $save() {
      return this.$model.save(this);
    },

    $slice(path, opts) {
      var doc = this,
          col = doc.$model;

      return Tyr.fetch(
        '/api/' + col.def.name + '/' + id + '/' + path + '/slice'
      ).then(arr => {
        var np = col.paths[path].path,
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
        console.error(err);
      });
    }

    $snapshot() {
      Object.defineProperty(this, '$orig', {
        enumerable: false,
        configurable: true,
        value: this.$cloneDeep()
      });
    }

    $toPlain() {
      const doc = this,
            plain = {};

      const fields = doc.$model.fields;
      for (const fieldName in fields) {
        const v = doc[fieldName];

        if (v !== undefined) {
          plain[fieldName] = doc[fieldName];
        }
      }

      return plain;
    }

    
    $update(...args) {
      return this.$model.updateDoc(this, ...args);
    },
  };

  Object.defineProperties(documentPrototype, {
    $: {
      get() {
        return Path.taggedTemplateLiteral.bind(this);
      },
      enumerable: false,
      configurable: false
    },

    $changed: {
      get() {
        const { $model, $orig } = this;
        if (!$orig) return true;

        const { fields } = $model;
        for (const fieldName in fields) {
          if (!Tyr.isEqual(this[fieldName], $orig[fieldName]))
            return true;
        }

        return false;
      },
      enumerable:   false,
      configurable: false
    },

    $id: {
      get() {
        return this[this.$model.def.primaryKey.field];
      },
      enumerable:   false,
      configurable: false
    },

    $isNew: {
      get() {
        return !this.$id;
      },
      enumerable:   false,
      configurable: false
    },

    $label: {
      get() {
        return (Tyr.options.whiteLabel && Tyr.options.whiteLabel(this)) || this.$model.labelFor(this);
      },
      enumerable:   false,
      configurable: false
    },

    $metaType: {
      enumerable:   false,
      configurable: false,
      value: 'document'
    },

    $tyr: {
      get() {
        return Tyr;
      },
      enumerable:   false,
      configurable: false
    },

    $uid: {
      get() {
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
  Object.defineProperties(Type.prototype, {
    width: {
      get() { return this.def.width; },
      enumerable: false,
      configurable: false
    },
  });
  Type.prototype.compare = ${es5Fn(Type.prototype.compare)};
  Type.prototype.format = ${es5Fn(Type.prototype.format)};
  Type.prototype.fromString = ${es5Fn(Type.prototype.fromString)};
  Type.prototype.create = ${es5Fn(Type.prototype.create)};
  Type.byName = {};
  Tyr.Type = Type;
`;

  _.each(Type.byName, type => {
    if (type instanceof Tyr.Type) {
      const def = type.def;

      file += `  new Type({
        name: '${type.name}',`;

      if (def.create)
        file += `
        create: ${es5Fn(def.create)},`;

      const fromString = def.fromStringClient || def.fromString;
      if (fromString)
        file += `
        fromString: ${es5Fn(fromString)},`;

      if (def.compare)
        file += `
        compare: ${es5Fn(def.compare)},`;

      if (def.format)
        file += `
        format: ${es5Fn(def.format)},`;

      if (def.width)
        file += `
        width: ${def.width},`;

      file += `});\n`;
    }
  });

  file += `

  function Field(def) {
    this.def = def;
    this.type = Type.byName[def.link && !def.is ? 'link' : def.is];
    if (def.pattern) def.pattern = refineJson(def.pattern);
  }
  Tyr.Field = Field;

  Field.prototype.$metaType = 'field';

  Field.prototype._calcPathLabel = ${es5Fn(Field.prototype._calcPathLabel)};

  Field.prototype.format = ${es5Fn(Field.prototype.format)};
  Field.prototype.isId = ${es5Fn(Field.prototype.isId)};

  Object.defineProperties(Field.prototype, {
    aux: {
      get() {
        return this.def.aux === true;
      }
    },

    computed: {
      get() {
        const { def } = this;
        return !!def.get && !def.set;
      },
    },

    generated: {
      get() {
        const { def } = this;
        return this.name === '_id' || def.generated || (!!def.get && !def.set);
      },
    },

    db: {
      get() { 
        const { def } = this;
        return this.computed ? def.db === true : def.db !== false;
      }
    },

    label: {
      get() { return (Tyr.options.whiteLabel && Tyr.options.whiteLabel(this)) || this.def.label; }
    },

    path: {
      get() {
        var np = this._np;
        if (!np) {
          np = this._np = new Path(this.collection, this.pathName);
        }
        return np;
      }
    },

    numbering: {
      get() {
        const { numbering } = this.def;
        return (
          numbering || (this.type.name === 'integer' ? 'integer' : 'uppercase')
        );
      }
    },

    pathLabel: {
      get: function() { return this._calcPathLabel(); },
    },

    readonly: {
      get() {
        return this.def.readonly || this.generated;
      },
    },

    relate: {
      get() {
        return this.def.relate;
      },
    },

    width: {
      get() {
        return this.def.width || this.type.width;
      },
    }
  });

  Field.prototype.labelify = function(value) {
    return this.link ? this.link.idToLabel(value) : value;
  };

  Field.prototype.labels = function(doc, search, opts) {
    const to = this.link;
    if (to && !to.isDb()) {
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

      return values.map(doc => new to(doc));
    }

    const data = { path: this.pathName, doc, opts };

    return Tyr.fetch('/api/' + this.collection.def.name + '/label/' + (search || ''), {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(docs => docs.map(doc => {
      if (to ) {
        doc = new to(doc);
      } else {
        const col = Tyr.byId[doc._colId];
        doc = new col(doc);
        delete doc._colId;
      }

      doc.$cache();
      return doc;
    }));
  };

  Field.prototype.validate = function(doc, opts) {
    const { def } = this;

    if (def.validate && (opts.trait != 'search' || def.validateSearch !== false)) {
      return Tyr.fetch('/api/' + this.collection.def.name + '/' + this.pathName + '/validate/', {
        method: 'PUT',
        body: JSON.stringify({
          document: doc,
          opts
        }), 
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  ${translateClass(Path)}
  ${translateClass(Roman)}

  Tyr.functions = { 
    paths: ${es5Fn(Tyr.functions.paths)}
  };

  Tyr.query = {
    restrict: ${es5Fn(Tyr.query.restrict)}
  };

  Object.defineProperties(Collection.prototype, {
    collection: {
      get() { return this; }
      enumerable:   false,
      configurable: false,
    }
  });

  Collection.prototype.parsePath = function(path) {
    return new Path(this, path);
  };
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

  function compileField(path, parent, field, dynamic, aux, method) {
    const collection = parent.collection;
    field.pathName = path;
    field.parent = parent;
    if (!method) collection.paths[path] = field;
    field.collection = collection;

    var def = field.def;
    if (aux) def.aux = true;

    if (def.is === 'array' || def.is === 'object') {
      if (!field.of && def.of) {
        var of = new Field(def.of);
        of.name = '_';
        field.of = of;
        compileField(path + '._', field, of, dynamic, aux, method);
      }
    }

    if (def.is === 'object') {
      if (def.fields) {
        compileFields(path, field, def.fields, dynamic, aux, method);
      }

      if (def.keys) {
        let keys = new Field(def.keys);
        field.keys = keys;
        compileField(path + '._key', field, keys, dynamic, aux, method);
      }
    }

    const { dynamicMatch } = def;
    if (dynamicMatch) field.dynamicMatch = dynamicMatch;

    if (def.label === undefined && field.name) def.label = Tyr.labelize(field.name);

    if (def.link) {
      field.link = Tyr.byName[def.link];
      field.populateName = Path.populateNameFor(field.name || parent.name);
    }

    if (def.labelField) collection.labelField = field;
    if (def.labelImageField) collection.labelImageField = field;
  }

  function compileFields(path, parent, fieldDefs, dynamic, aux, method) {
    _.each(fieldDefs, function(fieldDef, name) {
      let field;
      if (fieldDef instanceof Field) {
        field = fieldDef;
      } else {
        field = fieldDefs[name] = new Field(fieldDef);
        if (dynamic) field.dynamic = true;
        field.name = name;
      }

      let p = path ? path + '.' + name : name;

      let parentFields = parent.fields = parent.fields || {};
      parentFields[name] = field;

      field.parent = parent;

      if (aux) parent.def.fields[name] = fieldDef;

      compileField(p, parent, field, dynamic, aux, method);
    });
  }

  function compileMethod(collection, method) {
    const { params, return: returns } = method;
    _.each(params, function(paramDef, name) {
      let field;
      if (paramDef instanceof Field) {
        field = paramDef;
      } else {
        field = params[name] = new Field(paramDef);
        field.name = name;
      }

      compileField(name, method, field, false, false, true);
    });

    if (returns) {
      let field;
      if (returns instanceof Field) {
        field = returns;
      } else {
        field = method.return = new Field(returns);
        field.name = 'return';
      }

      compileField('return', method, field, false, false, true);
    }
  }

  function Collection(def) {
    var CollectionInstance;

    const capitalizedName = Tyr.capitalize(def.name);

    eval(\`CollectionInstance = function \${capitalizedName}(data) {
      const { fields, paths } = this.$model;

      if (data) {
        if (!fields) {
          Object.assign(this, data);
        } else {
          let f;

          for (const key in data)
            if (data.hasOwnProperty(key) && (!(f=fields[key]) || !f.computed))
              this[key] = data[key];
        }
      }

      var setOpts = { ignore: true };
      for (const fk in paths) {
        var field = paths[fk],
            dv = field.def.defaultValue;

        if (dv !== undefined) {
          var np = field.path;

          var v = np.get(this);

          if (v === undefined) {
            np.set(this, dv, setOpts);
          }
        }
      }
    };\`);
    //var CollectionInstance = function(data) {
      //if (data) {
        //Object.assign(this, data);
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
    Object.defineProperty(CollectionInstance, 'label', {
      enumerable: false,
      configurable: false,
      get() {
        return (Tyr.options.whiteLabel && Tyr.options.whiteLabel(this)) || this.def.label;
      }
    });
    CollectionInstance.byIdIndex = {};

    lock(dp);

    let vals = def.values;

    if (vals) {
      const byIdIndex = CollectionInstance.byIdIndex;
      vals = def.values = vals.map(v => {
        v = new CollectionInstance(v);
        CollectionInstance[Tyr.snakize(v.name).toUpperCase()] = v;
        byIdIndex[v._id] = v;
        return v;
      });
    }

    CollectionInstance.paths = {};

    compileFields('', CollectionInstance, def.fields);

    _.each(CollectionInstance.fields, function(field, name) {
      const fdef = field.def,
            get  = fdef.get,
            set  = fdef.set,
            isDb = fdef.db;

      if (get || set) {
        const prop = {
          enumerable:   isDb !== undefined ? isDb : false,
          configurable: false
        };

        if (get) prop.get = get;
        if (set) prop.set = set;
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

    _.each(def.service, function(method, name) {
      compileMethod(CollectionInstance, method);
    });

    Tyr.collections.push(CollectionInstance);
    Tyr.collections[capitalizedName] = CollectionInstance;
    Tyr.byId[CollectionInstance.id] = CollectionInstance;
    byName[def.name] = CollectionInstance;

    return CollectionInstance;
  }

  Collection.prototype.$metaType = 'collection';

  Collection.prototype.compile = function() {

    var def = this.def;

    this.values = def.values || [];

    _.each(this.paths, function(field) {
      var def = field.def;

      if (def.link) {
        field.link = Tyr.byName[def.link];
      }
    });
  };

  Collection.prototype.aux = function(def) {
    const { fields } = this.def;

    // TODO-AUX-IDEMPOTENT:  might need a flag to force a resync if the aux() call is passed dynamic data
    for (const name in def) {
      if (!fields[name]) {
        Object.assign(fields, def);
        compileFields('', this, def, undefined, true);
        return;
      }
    }
  };

  let _nextCid = 1;
  const nextCid = () => '~' + (_nextCid++).toString(36).padStart(2, '0');

  const cidMap = new WeakMap();
  Tyr.aux = function(def, component) {
    if (component && !def.id) {
      if (!cidMap.has(component))
        cidMap.set(component, nextCid());
      def.id = cidMap.get(component);
    } else if (!def.id) def.id = nextCid();
    if (Tyr.byId[def.id]) {
      // TODO-AUX-IDEMPOTENT:  might need to add a flag to force a resync if the Tyr.aux() call is passed dynamic data
      return;
    }
    if (!def.name) def.name = 'C' + def.id.replace(/~/g, '');
    if (!def.label) def.label = 'Aux ' + def.name;
    def.aux = true;
    def.db = false;
    if (!def.fields) def.fields = {};
    const col = new Collection(def);
    col.compile();
    if (!col.fields) col.fields = {};
    return col;
  };

  Collection.prototype.idToUid = ${es5Fn(Collection.prototype.idToUid)};
  Collection.prototype.isUid = ${es5Fn(Collection.prototype.isUid)};

  Collection.prototype.idToLabel = function(id) {
    if (!this.isDb()) {
      if (!id) return '';
      const doc = this.byIdIndex[id];
      return doc ? doc.$label : 'Unknown';
    }

    if (!id) return Promise.resolve('');
    // TODO:  narrow this projection to just what is needed for label (including computed labels)
    return this.byId(id).then(doc => doc ? doc.$label : 'Unknown');
  }

  Collection.prototype.isAux = ${es5Fn(Collection.prototype.isAux)};
  Collection.prototype.isStatic = ${es5Fn(Collection.prototype.isStatic)};
  Collection.prototype.isDb = ${es5Fn(Collection.prototype.isDb)};
  Collection.prototype.isSingleton = ${es5Fn(Collection.prototype.isSingleton)};

  Collection.prototype.labelFor = ${es5Fn(Collection.prototype.labelFor)};
  Collection.prototype.labelProjection = ${es5Fn(
    Collection.prototype.labelProjection
  )};

  Collection.prototype.byId = function(id, opts) {
    var col = this;

    if (!col.isDb()) {
      return col.byIdIndex[id];
    } else {
      if (opts && opts.cached) {
        const result = col.byIdIndex[id];
        if (result) return result;
      }

      return this.findOne(
        Object.assign({}, opts, { query: { _id: id } })
      );
    }
  };

  Collection.prototype.byIds = function(ids, opts) {
    var col = this;

    if (!col.isDb()) {
      return ids.map(id => col.byIdIndex[id]);
    } else {
      if (opts && opts.cached) {
        const results = ids.map(id => col.byIdIndex[id]);
        // TODO:  this is currently all-or-nothing, use partial?
        if (results.every(v => v)) return results;
      }

      opts = Object.assign({}, opts, { query: { _id: { $in: ids } } });
      return this.findAll(opts)
        .then(docs => {
          if (opts.parallel) {
            const docsById = {};
            for (const doc of docs) {
              docsById[doc._id] = doc;
            }

            docs = ids.map(id => docsById[id] || null);
          }

          return docs;
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

    opts = Object.assign({}, opts);
    opts.limit = 1;

    return Tyr.fetch('/api/' + col.def.name, {
      method: 'POST',
      body: Tyr.stringify(opts),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(docs => {
      if (docs && docs.length) {
        const d = new col(docs[0]);
        this.cache(d, undefined, true);
        return d;
      }

      return null;
    });
  };

  Collection.prototype.findAll = function(opts) {
    const col = this;

    return Tyr.fetch('/api/' + col.def.name, {
      method: 'POST',
      body: Tyr.stringify(opts),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(rslt => {
      let docs;

      if (!Array.isArray(rslt) && _.isObject(rslt)) {
        docs = rslt.docs.map(doc => new col(doc));
        docs.count = rslt.count;
      } else {
        docs = rslt.map(doc => new col(doc));
      }

      for (const doc of docs) {
        this.cache(doc, undefined, true);
      }

      return docs;
    });
  };

  Collection.prototype.count = function(opts) {
    return Tyr.fetch('/api/' + this.def.name + '/count?opts=' + JSON.stringify(opts || {}));
  };


  // *** Labels

  Collection.prototype._batchLabelQueries = function() {
    const { _labelQueries, byIdIndex } = this;

    // let labels get queued up in the next event tick
    this._labelQueries = undefined;

    // TODO:  use Map once < IE 11 is a bad memory (or maybe polyfill), this current algorithm
    //        only works with string keys until this change is made (it would be easy to check
    //        the key metadata and do a parseInt() if we need to support string keys sooner
    //        (but most/all integer keyed collections are static, which bypass this already)
    const idsSeen = {};
    for (const lq of _labelQueries) {
      for (const id of lq.ids) {
        idsSeen[id] = true;
      }
    }
    const allIds = Object.keys(idsSeen);

    const resolve = () => {
      for (const lq of _labelQueries) {
        lq.resolve(lq.ids.map(id => byIdIndex[id]));
      }
    }

    const missingIds = allIds.filter(id => !byIdIndex[id]);
    if (!missingIds.length) {
      return resolve();
    }

    return Tyr.fetch(
      '/api/' + this.def.name + '/labelsById?opts=' + JSON.stringify(missingIds)
    ).then(docs => {
      docs = docs.map(doc => new this(doc));
      for (const d of docs) {
        this.cache(d, undefined, true);
      }

      resolve();
    }).catch(err => {
      for (const lq of _labelQueries) {
        lq.reject(err);
      }
    });
  };

  Collection.prototype.labels = function(search) {

    if (Array.isArray(search)) {
      const byIdIndex = this.byIdIndex;
      if (!this.isDb()) {
        return search.map(id => byIdIndex[id]);
      }

      if (search.every(id => byIdIndex[id])) {
        return Promise.resolve(search.map(id => byIdIndex[id]));
      }

      let lqs = this._labelQueries;
      if (!lqs) {
        lqs = this._labelQueries = [];
        window.setTimeout(this._batchLabelQueries.bind(this), 0);
      }

      return new Promise((resolve, reject) => {
        lqs.push({
          ids: search,
          resolve,
          reject
        });
      });

    } else {
      if (!this.isDb() ) {
        var values = this.def.values;

        if (search) {
          var re = new RegExp(search, 'i');
          values = values.filter(val => re.test(val.$label));
        }

        return values;
      }

      return Tyr.fetch(
        '/api/' + this.def.name + '/label/' + (search || '')
      //).then(function(docs) {
        //return docs.map(doc => new this(doc));
      ).catch(err => console.error(err));
    }
  };

  Collection.prototype.save = function(doc) {

    return Tyr.fetch('/api/' + this.def.name, {
      method: 'PUT',
      body: JSON.stringify(doc),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(docs => Array.isArray(docs) ? docs.map(doc => new this(doc)) : new this(docs));
  };

  Collection.prototype.remove = function(idOrQuery) {
    if (typeof idOrQuery === 'string') {
      return Tyr.fetch('/api/' + this.def.name + '/' + idOrQuery, {
        method: 'DELETE'
      });
    } else {
      return Tyr.fetch('/api/' + this.def.name, {
        body: JSON.stringify(idOrQuery),
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  };

  Collection.prototype.update = function(query, update, opts) {
    const col = this;

    if (opts) {
      opts.query = query;
      opts.update = update;
    } else if (update) {
      opts = { query, update };
    } else {
      opts = query;
    }

    return Tyr.fetch('/api/' + col.def.name + '/update', {
      method: 'PUT',
      body: JSON.stringify(opts),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  Collection.prototype.updateDoc = function(doc, opts) {

    return Tyr.fetch('/api/' + this.def.name + '/updateDoc', {
      method: 'PUT',
      body: JSON.stringify({ doc, opts }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(docs => Array.isArray(docs) ? docs.map(doc => new this(doc)) : new this(docs));
  };

  Collection.prototype.fieldsFor = async function(opts) {
    var col = this;
        //cf = col._customFields;
    //if (cf) {
      // we cannot use this cache because we're using the document as a match instead of the user now ...
      // we could do the objMatcher logic on the client instead of the server, then we could cache all
      // fields for a custom collection and filter them on the client, saving this extra server call
      //return Promise.resolve(cf);
    //}

    try {
      let def = await Tyr.fetch('/api/' + col.def.name + '/fieldsFor', {
        method: 'PUT',
        body: JSON.stringify(opts),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const fields = def.fields;

      compileFields('', this, fields, true);

      //col._customFields = fields;
      return fields;
    } catch (err) {
      console.error(err);
    }
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
          documents: [ doc ], // TODO:  change this to be an Event instance on the client so this isn't needed
          type: type
        };

        for (const handlerOpts of handlers) {
          handlerOpts.handler(event);
        }
      }
    }
  }

  const visitPopulations = ${es5Fn(visitPopulations)};

  Collection.prototype.cache = function(doc, type, silent) {
    const existing = this.byIdIndex[doc._id];

    if (type === 'remove') {
      delete this.byIdIndex[doc._id];
      const idx = this.values.indexOf(existing);
      if (idx >= 0) {
        this.values.splice(idx, 1);
      }

      // TODO:  send existing or doc?
      if (!silent) {
        fireDocUpdate(existing || (new this(doc)), 'remove');
      }

      return existing;
    }
    
    visitPopulations(this, doc, (field, value) => field.link.cache(value, undefined, silent));

    if (existing) {
      let updating = false;
      const fields = this.fields;
      for (const fName in fields) {
        if (fields.hasOwnProperty(fName)) {
          const f = fields[fName];
          const fd = f.def;

          if (!f.readonly && !f.computed) {
            const n = f.name,
                  v = doc[n];
            if (v !== undefined && !Tyr.isEqual(existing[n], v)) {
              existing[n] = v;
              updating = true;
            }
          }
        }
      }

      if (!silent && updating) fireDocUpdate(existing, 'update');
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

      if (!silent) fireDocUpdate(doc, 'insert');
      return doc;
    }
  };

  Collection.prototype.on = ${es5Fn(Collection.prototype.on)};

  /**
   * web socket stuff
   */
  var socketLibrary;
  var socketLibraryRegistered = false;

  Tyr.setSocketLibrary = function(io) {
    if (socketLibraryRegistered) {
      console.warn('already registed a socket library, taking no action.');
      return;
    }

    socketLibrary = io;
    socketLibraryRegistered = true;

    Tyr.reconnectSocket();
  };

  Tyr.reconnectSocket = function() {
    Tyr.socket = socketLibrary();

    Tyr.socket.on('subscriptionEvent', function(data) {
      var col = Tyr.byId[data.colId];

      if (col) {
        _.each(data.docs, doc => col.cache(doc, data.type));
      }
    });
  };

  Collection.prototype.subscribe = function(query, cancel) {
    if (!socketLibrary) {
      const name = this.prototype.constructor.name;
      console.warn(
        'Calling subscribe() for collection '
        + name +
        ' without a socket implementation, make sure to call ' +
        'Tyr.setSocketLibrary()'
      );
      return Promise.resolve();
    }
    return Tyr.fetch('/api/' + this.def.name + '/subscribe?opts=' + JSON.stringify({ query, cancel }));
  };

  Tyr.Collection = Collection;
`;

  Tyr.collections.forEach(col => {
    const def = col.def;

    if (def.client !== false) {
      const name = def.name;

      file += `
  new Collection({
    id: ${JSON.stringify(def.id)},
    primaryKey: ${JSON.stringify(def.primaryKey)},
    name: '${name}',
    label: '${col.label}',`;

      if (col.labelField)
        file += `
    labelField: ${JSON.stringify(col.labelField.pathName)},`;

      if (col.labelImageField)
        file += `
    labelImageField: ${JSON.stringify(col.labelImageField.pathName)},`;

      for (const key of [
        'enum',
        'tag',
        'static',
        'aux',
        'singleton',
        'internal',
        'generated',
        'labelImageField',
      ]) {
        if (col.def[key])
          file += `
    ${key}: true,`;
      }

      const values = !col.isDb() && def.values;
      if (values) {
        file += `
    values: ${JSON.stringify(values.map(v => v.$toClient()))},`;
      }

      const ser = new Serializer('.', 2);
      ser.fields(col.fields);
      if (def.methods) ser.methods(def.methods);
      if (def.service) ser.service(def.service);
      file += ser.file;

      const colMeta = Tyr.options.meta && Tyr.options.meta.collection;
      if (colMeta) {
        for (const fieldName in colMeta) {
          const fieldDef = colMeta[fieldName];

          if (fieldDef.client)
            file += `
    ${fieldName}: ${JSON.stringify(def[fieldName])},`;
        }
      }

      file += `
  });`;
    }
  });

  file += `
  Tyr.collections.forEach(function(c) { c.compile(); });`;

  Tyr.components.forEach(comp => {
    if (comp.clientCode) {
      file = comp.clientCode(file);
    }
  });

  file += serviceClientCode();

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
    file = file.replace(/moment_1.default/g, 'moment');

    return Tyr.options.minify
      ? uglify.minify(file, { fromString: true }).code
      : file;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function compile(code) {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2017,
    },
  });

  result.diagnostics.forEach(diagnostic => {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    );
    console.error(
      `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
    );
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
    app
      .route('/api/tyranid')
      // we don't send insecure information in /api/tyranid, it is just source code
      //.all(auth)
      .get(async (req, res) => {
        res.type('text/javascript');
        res.send(file);
      });
  }

  Tyr.collections.forEach(col => col.connect(opts));

  if (app) {
    /*

    This didn't work.  This was an attempt to detect when the session ID and force the
    client to make a new Tyr.reconnectSocket() call.

    app.use((req, res, next) => {
      const sessionId =
        (req.signedCookies && req.signedCookies['connect.sid']) ||
        req.cookies['connect.sid'];

      //const userStr = req.cookies.user;
      //const userId = userStr && JSON.parse(userStr)._id;

      const sockets = Tyr.io.sockets.sockets;
      let found = false;
      for (const socketId in sockets) {
        const socket = sockets[socketId];

        console.log({ tyrSessionId: socket.tyrSessionId, sessionId });
        if (socket.tyrSessionId === sessionId) {
          found = true;
          break;
        }
      }

      console.log('___ found:', found);
      if (!found) {
        res.setHeader('Tyr-Request-Reconnect', true);
      }

      return next();
    });
    */

    const typesByName = Tyr.Type.byName;
    for (const typeName in typesByName) {
      const type = typesByName[typeName];

      if (type instanceof Tyr.Type) {
        const routes = type.def.routes;
        if (routes) {
          routes({ app, auth });
        }
      }
    }

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
    const io = (Tyr.io = Tyr.socketIo = socketIo(http));

    io.on('connection', socket => {
      //con sole.log('*** connected', socket);
      //con sole.log('*** client', socket.client);
      //con sole.log('*** headers', socket.client.request.headers);

      const rawSessionId = /connect.sid\=([^;]+)/g.exec(
        socket.client.request.headers.cookie
      );
      if (rawSessionId && rawSessionId.length) {
        const sessionId = unescape(rawSessionId[1]).split('.')[0].slice(2);

        Tyr.sessions.get(sessionId, async (error, session) => {
          if (session) {
            const userIdStr = session.passport && session.passport.user;
            if (userIdStr) {
              socket.tyrSessionId = sessionId;
              socket.tyrUserId = String(userIdStr);
            }
          }

          if (error) {
            console.error(error);
          }
        });
      }

      socket.on('disconnect', () => {
        // It doesn't work to unsubscribe on disconnect since socket.io sessions
        // will occassionally connect/disconnect frequently
        //Tyr.byName.tyrSubscription.unsubscribe(socket.tyrUserId);
        socket.tyrUserId = null;
      });
    });
  }
}

Tyr.connect = Tyr.express /* deprecated */ = connect;

connect.middleware = local.express.bind(local);

export function handleException(res, err) {
  // TODO:  add ConflictError() -- using code 419 for when multiple concurrent updates happen
  if (err instanceof UserError) {
    res
      .status(_.get(Tyr.options, 'exceptions.user.httpCode') || 400)
      .json(err.toPlain());
  } else if (err instanceof AppError) {
    console.error(err);
    res
      .status(_.get(Tyr.options, 'exceptions.app.httpCode') || 500)
      .json(err.toPlain());
  } else if (err instanceof SecureError) {
    res
      .status(_.get(Tyr.options, 'exceptions.secure.httpCode') || 403)
      .json(err.toPlain());
  } else {
    console.error(err);
    res.status(500).json(err);
  }
}

/**
 * @private ... clients should use Tyr.connect()
 *
 * auth is deprecated, use opts.auth instead
 */
Collection.prototype.connect = function ({ app, auth, http }) {
  const col = this,
    express = col.def.express;

  if (express && app) {
    const name = col.def.name;

    if (
      express.rest ||
      express.get ||
      express.put ||
      express.array ||
      express.fields
    ) {
      /*
       *     /api/NAME
       */
      Tyr.info('adding route: ' + name);
      let r = app.route('/api/' + name);
      r.all(auth);

      if (express.rest || express.post) {
        r.post(async (req, res) => {
          try {
            let rOpts = req.body;

            const opts = {
              query: rOpts.query ? await col.fromClientQuery(rOpts.query) : {},
              auth: req.user,
              user: req.user,
              req,
            };

            const projection = rOpts.projection || rOpts.fields;

            if (projection) opts.projection = projection;

            if (rOpts.populate)
              opts.populate = await Population.fromClient(rOpts.populate);

            if (rOpts.limit) opts.limit = parseInt(rOpts.limit, 10);

            if (rOpts.skip) opts.skip = parseInt(rOpts.skip, 10);

            if (rOpts.count) {
              opts.count =
                typeof rOpts.count === 'string'
                  ? BooleanType.fromString(rOpts.count)
                  : rOpts.count;
            }

            if (rOpts.sort) opts.sort = rOpts.sort;

            const docs = await col.findAll(opts);
            flattenProjection(opts);
            const cDocs = col.toClient(docs, opts);

            if (opts.count) {
              res.json({
                count: docs.count,
                docs: cDocs,
              });
            } else {
              return res.json(cDocs);
            }
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      if (express.rest || express.put) {
        r.put(async function (req, res) {
          try {
            let doc = await col.fromClient(req.body, undefined, { req });

            if (doc._id) {
              const existingDoc = await col.findOne({
                query: { _id: doc._id },
                auth: req.user,
                user: req.user,
                req,
              });
              Object.assign(existingDoc, doc);
              await existingDoc.$save({ auth: req.user, user: req.user, req });
              doc = existingDoc;
            } else {
              doc = await doc.$save({ auth: req.user, user: req.user, req });
            }

            res.json(col.toClient(doc));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.remove({
              query: await col.fromClientQuery(req.body),
              auth: req.user,
              user: req.user,
              req,
            });
            res.sendStatus(200);
          } catch (err) {
            handleException(res, err);
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
            const opts = JSON.parse(req.query.opts);
            if (opts.query) {
              opts.query = await col.fromClientQuery(opts.query);
            }

            opts.auth = req.user;

            return res.json(await col.count(opts));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/fieldsFor
       */

      r = app.route('/api/' + name + '/fieldsFor');
      r.all(auth);

      if (express.rest || express.fields) {
        r.put(async (req, res) => {
          try {
            let opts = req.body;

            const m = opts.match;
            if (m) opts.match = await col.fromClient(m, undefined, { req });

            const q = opts.query;
            if (q)
              opts.query = await col.fromClientQuery(q, undefined, { req });

            const fields = await col.fieldsFor(opts);
            const ser = new Serializer('.', 2, true);
            ser.fields(fields);
            res.type('application/json');
            res.send('{' + ser.file.substring(0, ser.file.length - 1) + '}');
          } catch (err) {
            handleException(res, err);
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
          const rQuery = req.query;
          const opts = JSON.parse(rQuery.opts);

          try {
            await col.subscribe(
              opts.query && (await col.fromClientQuery(opts.query)),
              req.user,
              opts.cancel
            );
            res.sendStatus(200);
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/labelsById
       */

      if (col.labelField && (express.rest || express.get || express.labels)) {
        r = app.route('/api/' + name + '/labelsById');
        r.all(auth);
        r.get(async (req, res) => {
          try {
            const idField = col.fields._id,
              ids = await Promise.all(
                JSON.parse(req.query.opts).map(
                  async id => await idField.type.fromClient(idField, id)
                )
              ),
              opts = {
                query: { _id: { $in: ids } },
                fields: col.labelProjection(),
                auth: req.user,
                user: req.user,
                req,
              },
              results = await col.findAll(opts);

            flattenProjection(opts);
            res.json(results.map(r => r.$toClient(opts)));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/update
       */

      r = app.route('/api/' + name + '/update');
      r.all(auth);

      if (express.rest || express.put) {
        r.put(async function (req, res) {
          try {
            const opts = req.body;

            opts.query = await col.fromClientQuery(opts.query);
            opts.update = await col.fromClientUpdate(opts.update);
            opts.auth = req.user;

            res.json(await col.update(opts));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/updateDoc
       */

      r = app.route('/api/' + name + '/updateDoc');
      r.all(auth);

      if (express.rest || express.put) {
        r.put(async function (req, res) {
          try {
            let { doc, opts } = req.body;

            doc = await col.fromClient(doc, undefined, { req });

            opts.auth = req.user;

            res.json(await col.updateDoc(doc, opts));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/export
       */

      if (express.rest || express.post) {
        app
          .route('/api/' + name + '/export')
          .all(auth)
          .get(async (req, res) => {
            try {
              const opts = JSON.parse(req.query.opts);

              const documents = await this.findAll({
                query: opts.query && this.fromClientQuery(opts.query),
                fields: opts.fields.reduce(
                  (fields, fieldName) => (fields[fieldName] = 1) && fields,
                  {}
                ),
                limit: opts.query ? undefined : 1000,
                auth: req.user,
              });

              res.setHeader('content-type', 'text/csv');
              await Tyr.csv.toCsv({
                collection: this,
                documents,
                columns: opts.fields.map(fieldName => ({
                  field: fieldName,
                })),
                stream: res,
              });
            } catch (err) {
              handleException(res, err);
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
          try {
            const opts = {
              auth: req.user,
              user: req.user,
              req,
            };
            const doc = await col.byId(req.params.id, opts);
            flattenProjection(opts);
            if (doc) res.json(doc.$toClient(opts));
            else res.sendStatus(404);
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.remove({
              query: { _id: ObjectId(req.params.id) },
              auth: req.user,
              user: req.user,
              req,
            });
            res.sendStatus(200);
          } catch (err) {
            handleException(res, err);
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
            app
              .route('/api/' + name + '/:id/' + field.pathName + '/slice')
              .all(auth)
              .get(async (req, res) => {
                try {
                  const opts = {
                    auth: req.user,
                    fields: {
                      [field.spath]: 1,
                    },
                    user: req.user,
                    req,
                  };
                  const doc = await col.byId(req.params.id, opts);
                  if (!doc) return res.sendStatus(404);

                  doc.$slice(field.pathName, req.body);
                  flattenProjection(opts);
                  res.json(field.get(doc.$toClient(opts)));
                } catch (err) {
                  handleException(res, err);
                }
              });
          }
        });
      }

      /*
       *     /api/NAME/label/:search
       */

      r = app.route('/api/' + name + '/label/:search?');
      r.all(auth);

      if (col.labelField && (express.rest || express.get || express.labels)) {
        r.get(async (req, res) => {
          try {
            const opts = {
              auth: req.user,
              user: req.user,
              req,
            };
            const results = await col.labels(req.params.search || '', opts);
            flattenProjection(opts);
            res.json(results.map(r => r.$toClient(opts)));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      if (express.rest || express.put || express.labels) {
        r.put(async (req, res) => {
          try {
            const data = req.body;
            let { doc, opts: rawOpts, path: pathName } = data;

            doc = await col.fromClient(doc, undefined, { req });

            const path = await doc.$parsePath(pathName);
            const field = path.detail;
            const to = field.link;
            if (!to?.labelField && field.type.name !== 'uid')
              throw new AppError('labels not applicable to ' + pathName);

            const opts = {
              auth: req.user,
              user: req.user,
              req,
              limit: rawOpts?.limit ?? 30,
              sort: { [field.spath]: 1 },
            };
            const q = rawOpts?.query;
            if (q) opts.query = col.fromClientQuery(q);

            const results = await field.labels(
              doc,
              req.params.search || '',
              opts
            );

            flattenProjection(opts);
            res.json(results.map(r => r.$toClient(opts)));
          } catch (err) {
            handleException(res, err);
          }
        });
      }

      /*
       *     /api/NAME/FIELD_PATH/validate
       */

      if (express.rest || express.put) {
        _.each(col.paths, field => {
          const validateFn = field.def.validate;
          if (validateFn) {
            app
              .route('/api/' + name + '/' + field.spath + '/validate')
              .all(auth)
              .put(async (req, res) => {
                const { document, opts } = req.body;
                try {
                  await field.validate(
                    await col.fromClient(document, undefined, { req }),
                    opts
                  );
                  res.json('');
                } catch (err) {
                  handleException(res, err);
                }
              });
          }
        });
      }
    }

    if (col.route) {
      col.route(app, auth);
    }

    if (col.service) {
      instrumentExpressServices(col, app, auth);
    }
  }
};
