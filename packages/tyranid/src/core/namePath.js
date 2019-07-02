// cannot use import because @isomorphic
const _ = require('lodash');

const Tyr = require('../tyr').default;

const PATH_REGEX = /\._/g;

/**
 * NOTE: This cannot be a ES6 class because it is isomorphic
 *
 * @isomorphic
 */
function NamePath(base, pathName, skipArray) {
  this.base = base;
  this.name = pathName;

  if (base instanceof NamePath) {
    base = base.tail;
  }

  const path = (this.path = pathName.length ? pathName.split('.') : []),
    plen = path.length,
    pathFields = (this.fields = new Array(plen));

  let at = base;

  let pi = 0,
    denormal;

  nextPath: while (pi < plen) {
    const name = path[pi];
    let def = at.def;

    if (name === '_') {
      if (!at.of) {
        throw new Error(`"${name}" in "${pathName}" is not an array or map.`);
      }

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

        const denormalization = name.endsWith('_');

        if (denormalization) {
          if (!denormal) {
            denormal = _at.def.denormal;
            if (!denormal) {
              break;
            }
          } else {
            if (!denormal[_name]) {
              break;
            }

            denormal = denormal[_name];
          }
        } else {
          denormal = null;
        }

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
        `Cannot find field "${this.pathName(
          pi
        )}" in path "${base.toString()}::${this.name}"`
      );
    }

    pathFields[pi++] = at;
  }
}

NamePath._numberRegex = /^[0-9]$/;

NamePath._skipArray = function(field) {
  if (field && !field.type) {
    throw new Error('field missing type');
  }

  while (field && field.type.def.name === 'array') {
    field = field.of;
  }

  return field;
};

NamePath.prototype.parsePath = function(path, skipArray) {
  return new NamePath(this, path, skipArray);
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

NamePath.prototype.pathName = function(pi) {
  return pi <= 1
    ? this.name
    : this.path.slice(0, pi).join('.') + ' in ' + this.name;
};

NamePath.prototype.toString = function() {
  return (
    (this.base instanceof Tyr.Collection
      ? this.base.def.name + ':'
      : this.base.toString() + '/') + this.name
  );
};

Object.defineProperty(NamePath.prototype, 'tail', {
  get: function() {
    return this.fields[this.fields.length - 1];
  }
});

Object.defineProperty(NamePath.prototype, 'detail', {
  get: function() {
    return NamePath._skipArray(this.fields[this.fields.length - 1]);
  }
});

NamePath.prototype.isHistorical = function() {
  const fields = this.fields;

  // only the top-most field can be marked "historical"
  return fields.length && fields[0].def.historical;
};

NamePath.prototype.get = function(obj) {
  const np = this,
    path = np.path,
    fields = np.fields,
    plen = path.length;
  let arrayInPath = false;

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
        arrayInPath = true;
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
        arrayInPath = true;
        pi++;
        _.each(obj, v => getInner(pi, v));
      } else {
        let v,
          name = path[pi];

        if (pi < plen - 1 && fields[pi].link) {
          // if they are dereferencing a link, look for a populated or denormalized value
          let popName = NamePath.populateNameFor(name, false);
          v = obj[popName];
          if (v === undefined) {
            popName = NamePath.populateNameFor(name, true);
            v = obj[popName];

            if (v === undefined) {
              v = obj[name];
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

  if (!arrayInPath) {
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
  const np = this,
    path = np.path,
    fields = np.fields,
    plen = path.length;

  function walk(pi, obj) {
    if (!obj && opts && opts.ignore) return;

    const leaf = pi === plen - 1;

    if (Array.isArray(obj)) {
      if (leaf) {
        for (let i = 0; i < obj.length; i++) {
          obj[i] = value;
        }
      } else {
        const name = path[pi];
        if (name === '_') {
          pi++;
        } else if (name && name.match(NamePath._numberRegex)) {
          walk(pi + 1, obj[name]);
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
            v = obj[key] = fields[pi].type.name === 'array' ? [] : {};
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

Object.defineProperty(NamePath.prototype, 'pathLabel', {
  get: function() {
    const pf = this.fields;
    let i = 0,
      label = '';
    while (i < pf.length - 1) {
      const f = pf[i++];

      const l = f.pathLabel || f.label;
      if (l) {
        if (label) {
          label += ' ';
        }

        label += l;
      }
    }

    if (label) {
      label += ' ';
    }
    label += this.fields[i].label;
    return label;
  }
});

Object.defineProperty(NamePath.prototype, 'spath', {
  get: function() {
    let sp = this._spath;
    if (!sp) {
      sp = this._spath = this.name.replace(PATH_REGEX, '');
    }
    return sp;
  }
});

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
