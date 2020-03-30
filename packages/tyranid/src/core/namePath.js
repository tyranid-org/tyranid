import { paths } from './function';

// cannot use import because @isomorphic
const _ = require('lodash');

const Tyr = require('../tyr').default;

/**
 * NOTE: This cannot be a ES6 class because it is isomorphic
 *
 * @isomorphic
 */
function NamePath(base, pathName, opts) {
  this.base = base;
  this.name = pathName;

  const skipArray = opts && opts.skipArray;

  if (base instanceof NamePath) base = base.tail;

  const path = (this.path = []);

  if (!pathName) pathName = '';
  let starti = 0,
    si = 0;
  let collectionName = undefined;
  for (; si < pathName.length; si++) {
    const ch = pathName[si];

    switch (ch) {
      case ':':
        if (path.length)
          throw new Error(
            `Collection name cannot have a "." in "${pathName}".`
          );

        if (collectionName)
          throw new Error(
            `Two collections being specified in "${pathName}", only one is allowed.`
          );

        collectionName = pathName.substring(starti, si);
        starti = si + 1;
        break;

      case '|':
        if (!this._groups) this._groups = [];
        this._groups.push(path.length + 1);
      // fall through

      case '.':
        path.push(pathName.substring(starti, si));
        starti = si + 1;
        break;
    }
  }

  if (starti < si) path.push(pathName.substring(starti));

  if (collectionName) {
    this.base = base = Tyr.byName[collectionName];
    this.collectionSpecified = true;

    if (!base)
      throw new Error(
        `Unknown collection "${collectionName}" in "${pathName}".`
      );

    if (base.isDb())
      throw new Error(
        `Collection "${collectionName}" in "${pathName}" is not an auxiliary or static collection.`
      );

    if (!base.def.singleton)
      throw new Error(
        `Collection "${collectionName}" in "${pathName}" is not a singleton.`
      );
  }

  const plen = path.length,
    pathFields = (this.fields = new Array(plen));

  let at = base;

  if (opts && opts.method) {
    at = base.def.service;
  }

  let pi = 0;
  //denormal;

  nextPath: while (pi < plen) {
    const name = path[pi];
    // DYNAMIC-FIELD-ROOT: if at is a custom field root, then def won't be defined
    let def = at.def ?? at;

    if (name === '_') {
      if (!at.of)
        throw new Error(`"${name}" in "${pathName}" is not an array or map.`);

      at = at.of;
      pathFields[pi++] = at;
      continue nextPath;
    }

    if (
      name.match(NamePath._numberRegex) &&
      pi &&
      pathFields[pi - 1].type.name === 'array'
    ) {
      at = at.of;
      pathFields[pi++] = at;
      continue nextPath;
    }

    if (!at.fields) {
      const aAt = NamePath._skipArray(at);

      if (aAt && aAt.fields && aAt.fields[name]) {
        at = aAt;
        def = at.def;
      } else if (at.link) {
        at = at.link;
        def = at.def;
      } else {
        if (!def.keys) {
          throw new Error(
            `"${name}" in "${pathName}" is not valid` +
              (at.link ? '" (maybe need advanced population syntax)' : '')
          );
        }
      }
    }

    const f = at.fields;
    if ((!f || !f[name]) && def.keys) {
      at = at.of;
      pathFields[pi++] = at;
      continue nextPath;
    }

    const parentAt = at;
    at = f[name];
    if (!at && /.+[$_]$/.test(name)) {
      const _name = name.substring(0, name.length - 1);

      while (/* if */ _name) {
        const _at = parentAt.fields[_name];
        if (!_at) {
          throw new Error(`"${_name}" in "${pathName}" is not a valid field.`);
        }

        /*
        const denormalization = name.endsWith('_');

        // TODO:  this denormalization code does not deal with denormal entries like "a.b"
        //        so commenting it out for now, does more harm than good
        if (denormalization) {
          if (!denormal) {
            denormal = _at.def.denormal;
            if (!denormal) {
              break;
            }
          } else {
            //if (!denormal[_name]) {
            //break;
            //}
            //denormal = denormal[_name];
          }
        } else {
          denormal = null;
        }
        */

        at = _at;
        pathFields[pi++] = at;
        at = at.link;
        continue nextPath;
      }
    }

    if (skipArray && (pi + 1 >= plen || path[pi + 1] !== '_')) {
      at = NamePath._skipArray(at);
    }

    if (!at) {
      throw new Error(
        `Cannot find field "${this.pathName(pi)}" in path "${base.toString()}:${
          this.name
        }"`
      );
    }

    pathFields[pi++] = at;
  }
}

NamePath._numberRegex = /^[0-9]+$/;

NamePath._skipArray = function(field) {
  if (field && !field.type) {
    throw new Error('field missing type');
  }

  while (field && field.type.def.name === 'array') {
    field = field.of;
  }

  return field;
};

NamePath.prototype.metaType = 'path';

NamePath.prototype.parsePath = function(path, skipArray) {
  return new NamePath(this, path, { skipArray });
};

NamePath.decode = function(path) {
  return path.replace(/\|/g, '.');
};

NamePath.encode = function(path) {
  return path.replace(/\./g, '|');
};

/**
 * TODO:  make this a configurable Tyranid option as to how populated entries should be named
 *
 *    1. organizationId -> organization
 *    2. organization   -> organization$
 *    3. organization   -> organization
 *
 */
NamePath.populateNameFor = function(name, denormal) {
  const l = name.length;

  if (name.substring(l - 2) === 'Id') {
    name = name.substring(0, l - 2);
    return denormal ? name + '_' : name;
  }

  return denormal ? name + '_' : name + '$';
};

NamePath.prototype.walk = function(path /*: string | number*/) {
  /*
      TODO NAMEPATH-1:

        change NamePath to be immutable (it already is for the most part) and to
        support a parent NamePath then avoid having to pse the entire path here and
        just use the existing NamePath object embedded in a new NamePath object that
        just processes the child path
   */
  return this.base.parsePath(this.name + '.' + path);
};

NamePath.resolve = function(
  collection, // Tyr.CollectionInstance,
  parentPath, //?: Tyr.NamePathInstance,
  path //?: Tyr.NamePathInstance | string
) {
  if (parentPath) {
    if (typeof path === 'string') {
      return parentPath.walk(path);
    } else if (path) {
      return path;
    } else {
      return parentPath;
    }
  }

  if (typeof path === 'string') {
    return collection.parsePath(path);
  }

  return path;
};

NamePath.prototype.pathName = function(pi) {
  return pi <= 1
    ? this.name
    : this.path.slice(0, pi + 1).join('.') + ' in ' + this.name;
};

NamePath.prototype.toString = function() {
  return (
    (this.base instanceof Tyr.Collection
      ? this.base.def.name + ':'
      : this.base.toString() + '/') + this.name
  );
};

NamePath.prototype.isHistorical = function() {
  const fields = this.fields;

  // only the top-most field can be marked "historical"
  return fields.length && fields[0].def.historical;
};

NamePath.prototype.resolveObj = function(obj) {
  if (this.collectionSpecified) {
    // singleton behavior
    let values = this.base.values;
    if (!values) values = this.base.values = [];
    if (!values.length) values.push(new this.base({}));
    return values[0];
  }

  return obj;
};

NamePath.prototype.get = function(obj) {
  obj = this.resolveObj(obj);

  const np = this,
    path = np.path,
    fields = np.fields,
    plen = path.length;
  let arrayOrMapInPath = false;

  const values = [];

  function getInner(pi, obj) {
    if (Array.isArray(obj)) {
      const name = path[pi];
      if (name === '_') {
        pi++;
      } else if (name && name.match(NamePath._numberRegex)) {
        getInner(pi + 1, obj[name]);
        return;
      }

      if (pi === plen) {
        values.push(obj);
      } else {
        arrayOrMapInPath = true; // array
        for (let ai = 0, alen = obj.length; ai < alen; ai++) {
          getInner(pi, obj[ai]);
        }
      }
    } else if (pi === plen) {
      values.push(obj);
    } else if (obj === undefined || obj === null) {
      return;
    } else if (!_.isObject(obj)) {
      throw new Error(
        'Expected an object or array at ' + np.pathName(pi) + ', but got ' + obj
      );
    } else {
      if (pi && fields[pi - 1].type.name === 'object' && path[pi] === '_') {
        arrayOrMapInPath = true; // map
        pi++;
        _.each(obj, v => getInner(pi, v));
      } else {
        let v,
          name = path[pi];

        if (
          pi < plen - 1 &&
          // link
          (fields[pi].link ||
            // array of link
            (pi < plen - 2 &&
              fields[pi].type.name === 'array' &&
              fields[pi + 1].link))
        ) {
          // if they are dereferencing a link, first check to see if an object exists by the current name
          // (the current name could be a denormalized or populated reference already)
          v = obj[name];
          if (!_.isObject(v) || Array.isArray(v)) {
            // ... look for a populated or denormalized value
            let popName = NamePath.populateNameFor(name, false);
            v = obj[popName];
            if (v === undefined) {
              popName = NamePath.populateNameFor(name, true);
              v = obj[popName];

              if (v === undefined) {
                // they are dereferencing a link but there is no populated or denormalized value, return undefined
                // rather than throw an error
                return undefined;
              }
            }
          }
        } else {
          v = obj[name];
        }

        getInner(pi + 1, v);
      }
    }
  }

  getInner(0, obj);

  if (!arrayOrMapInPath) {
    switch (values.length) {
      case 0:
        return undefined;
      case 1:
        return values[0];
      // fall through
    }
  }

  return values;
};

NamePath.prototype.set = function(obj, value, opts) {
  obj = this.resolveObj(obj);

  const np = this,
    path = np.path,
    fields = np.fields,
    plen = path.length;

  function walk(pi, obj) {
    if (!obj && opts && opts.ignore) return;

    const leaf = pi === plen - 1;

    if (Array.isArray(obj)) {
      const name = path[pi];
      if (leaf) {
        if (name && name.match(NamePath._numberRegex)) {
          obj[name] = value;
        } else {
          for (let i = 0; i < obj.length; i++) {
            obj[i] = value;
          }
        }
      } else {
        if (name === '_') {
          pi++;
        } else if (name && name.match(NamePath._numberRegex)) {
          let v = obj[name];
          if (!v && opts && opts.create) {
            obj[name] = fields[pi].type.name === 'array' ? [] : {};
            // Re-read value because mobx proxies
            v = obj[name];
          }

          walk(pi + 1, v);
          return;
        }

        for (const v of obj) {
          walk(pi, v);
        }
      }
    } else if (_.isObject(obj)) {
      if (leaf) {
        obj[path[pi]] = value;
      } else {
        if (pi && fields[pi - 1].type.name === 'object' && path[pi] === '_') {
          pi++;
          for (const v of obj) {
            walk(pi, v);
          }
        } else {
          const key = path[pi];
          let v = obj[key];
          if (!v && opts && opts.create) {
            obj[key] = fields[pi].type.name === 'array' ? [] : {};
            // Re-read value because mobx proxies
            v = obj[key];
          }
          walk(pi + 1, v);
        }
      }
    } else {
      throw new Error(
        'Expected an object or array at ' + np.pathName(pi) + ', but got ' + obj
      );
    }
  }

  walk(0, obj);
};

NamePath.prototype.uniq = function(obj) {
  const val = this.get(obj);
  return _.isArray(val) ? _.uniq(val) : [val];
};

NamePath.prototype.groupRange = function(groupNum) {
  const { _groups } = this;

  return groupNum
    ? [_groups[groupNum - 1], _groups[groupNum]]
    : [0, _groups[0]];
};

NamePath.prototype.groupLabel = function(groupNum) {
  return this._pathLabel(...this.groupRange(groupNum));
};

NamePath.prototype._pathLabel = function(startIdx, endIdx) {
  const pf = this.fields;
  let i = startIdx,
    label = '';

  let len = endIdx - startIdx;
  // change "Organization Name" to just "Organization"
  // TODO:  might not want to always do this ... i.e. maybe only if it is a labelField?
  if (len > 1 && pf[endIdx - 1].label === 'Name') {
    endIdx--;
    len--;
  }

  let suffix = '';

  for (; i < endIdx - 1; i++) {
    const f = pf[i];

    let l = '';

    const typeName = f.type.name;
    if (typeName === 'object' || typeName === 'array') {
      const path = this.path[i];

      if (path && path.match(NamePath._numberRegex)) {
        // TODO:  add a property on Field which lets people specify ordering (i.e. roman numerals, integers from 1, integers from 0, letters, etc.)
        const code = String.fromCharCode(65 + Number.parseInt(path, 10));

        // TODO:  this logic needs to be more sophisticated
        if (len > 1) suffix = ' ' + code;
        else l = code;
      } else {
        // handle the case where we have a map and the keys are strings, not numbers
        l = path === f.name ? f.pathLabel ?? f.label : path;
      }
    } else {
      l = f.pathLabel ?? f.label;
    }

    if (l) {
      if (label) label += ' ';
      label += l;
    }
  }

  if (label) label += ' ';
  label += pf[i].label;
  return label + suffix;
};

Object.defineProperties(NamePath.prototype, {
  tail: {
    get() {
      return this.fields[this.fields.length - 1];
    }
  },

  detail: {
    get() {
      return NamePath._skipArray(this.fields[this.fields.length - 1]);
    }
  },

  groupCount: {
    get() {
      return this._groups?.length || 0;
    }
  },

  pathLabel: {
    get() {
      const flen = this.fields.length;
      if (!flen) return this.base.label;
      const wlFn = Tyr.options.whiteLabel;
      if (wlFn) {
        const l = wlFn(this);
        if (l) return l;
      }

      const { _groups } = this;
      return this._pathLabel(_groups?.[_groups.length - 1] ?? 0, flen);
    }
  },

  spath: {
    get() {
      let sp = this._spath;
      if (!sp) {
        sp = '';

        const { fields, path } = this;
        let parentField;

        for (let fi = 0, flen = fields.length; fi < flen; fi++) {
          const field = fields[fi];
          let { name } = field;

          if (name === '_') {
            continue;
            //name = path[fi];

            //if (name === '_') continue;

            // otherwise name is a specific array index like 0,1,2,3,4 which we want to output ...
            // ... wait, do we?  mongo projections do not support .<number>. ...
          }

          if (fi) {
            // this is a denormalized path (but could be a populated path, so might need to add a '$' instead?)
            if (parentField.link) sp += '_';
            sp += '.';
          }
          sp += name;
          parentField = field;
        }

        //sp = this._spath = this.name.replace(/\._/g, '');
      }
      return sp;
    }
  },

  identifier: {
    get() {
      let id = this._identifier;
      if (!id) {
        id = this._identifier = this.name.replace(/\./g, '_');
      }
      return id;
    }
  }
});

NamePath.prototype.projectify = function(projection) {
  const { detail, spath } = this;

  if (detail.db) projection[spath] = 1;

  // note:  we query a computed values dependents even if the computation is stored in the database
  //        in case we might want to dynamically recalculate the value.  there might be some cases
  //        where we don't want to do this
  //if (!this.db) {
  const getFn = detail.def.get;
  if (getFn) {
    let proj = detail._projection;
    if (!proj) {
      proj = detail._projection = {};

      const paths = Tyr.functions.paths(getFn);
      for (const path of paths) {
        proj[path] = 1;
      }
    }

    Object.assign(projection, proj);
  }
  //}
};

NamePath.taggedTemplateLiteral = function(strings, ...keys) {
  if (keys.length) {
    let s = '',
      i = 0;

    for (const klen = keys.length; i < klen; i++) {
      s += strings[i];
      s += keys[i];
    }

    if (i < strings.length) {
      s += strings[i];
    }

    return this.$get(s);
  } else {
    return this.$get(strings[0]);
  }
};

Tyr.NamePath = NamePath;
export default NamePath;
