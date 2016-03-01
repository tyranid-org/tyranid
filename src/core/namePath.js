
// cannot use import because @isomorphic
const _ = require('lodash');

const Tyr = require('../tyr');

/**
 * NOTE: This cannot be a ES6 class because it is isomorphic
 *
 * @isomorphic
 */
function NamePath(collection, pathName, skipArray) {

  this.col = collection;
  this.name = pathName;

  const path       = this.path = pathName.length ? pathName.split('.') : [],
        plen       = path.length,
        pathFields = this.fields = new Array(plen);

  let curCollection = collection;
  let at = collection;

  let pi = 0,
      denormal;

  nextPath:
  while (pi<plen) {
    const name = path[pi];
    let def  = at.def;

    if (name === '_') {
      if (!at.of) {
        throw new Error(`"${name} in ${pathName} on the collection "${curCollection.def.name}" is not an array or map.`);
      }

      at = at.of;
      pathFields[pi++] = at;
      continue nextPath;

    } else {
      if (name.match(NamePath._numberRegex) && pi && pathFields[pi-1].type.name === 'array') {
        at = at.of;
        pathFields[pi++] = at;
        continue nextPath;
      }

      if (!at.fields) {
        const aAt = NamePath._skipArray(at);

        if (aAt && aAt.fields && aAt.fields[name]) {
          at = aAt;
          def = at.def;

        } else {
          if (!def.keys) {
            throw new Error(
              `"${name}" in "${pathName}" is not contained within the collection "${curCollection.def.name}"` +
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
      if (!at && name.length > 1 && name.endsWith('_')) {
        // does this name match a denormalized entry?
        const _name = name.substring(0, name.length-1);

        while /* if */ (_name) {
          const _at = parentAt.fields[_name];

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

          at = _at;
          pathFields[pi++] = at;
          at = at.link;
          curCollection = at;
          continue nextPath;
        }
      }
    }

    if (skipArray && (pi+1 >= plen || path[pi+1] !== '_')) {
      at = NamePath._skipArray(at);
    }

    if (!at) {
      throw new Error('Cannot find field "' + this.pathName(pi) + '" in ' + collection.def.name);
    }

    pathFields[pi++] = at;
  }
}

NamePath._numberRegex = /^[0-9]$/;

NamePath._skipArray = function(field) {
  if (field && !field.type) {
    debugger;
  }

  while (field && field.type.def.name === 'array') {
    field = field.of;
  }

  return field;
};


/**
 * TODO:  make this a configurable Tyranid option as to how populated entries should be named
 *
 *    1. organizationId -> organization
 *    2. organization   -> organization$
 *    3. organization   -> organization
 *
 * @private
 */
NamePath.populateNameFor = function(name, denormal) {
  const l = name.length;

  if (denormal) {
    return name + '_';
  } else if (name.substring(l-2) === 'Id') {
    return name.substring(0, l-2);
  } else {
    return name + '$';
  }
};

NamePath.prototype.pathName = function(pi) {
  return pi <= 1 ?
    this.name :
    this.path.slice(0, pi).join('.') + ' in ' + this.name;
};

NamePath.prototype.toString = function() {
  return this.col.def.name + ':' + this.name;
};

Object.defineProperty(NamePath.prototype, 'tail', {
  get: function() {
    return this.fields[this.fields.length-1];
  }
});

Object.defineProperty(NamePath.prototype, 'detail', {
  get: function() {
    return NamePath._skipArray(this.fields[this.fields.length-1]);
  }
});

NamePath.prototype.get = function(obj) {
  const np     = this,
        path   = np.path,
        fields = np.fields,
        plen   = path.length;
  let arrayInPath = false;

  const values = [];

  function getInner(pi, obj) {
    if (Array.isArray(obj)) {
      const name = path[pi];
      if (name === '_') {
        pi++;
      } else if (name && name.match(NamePath._numberRegex)) {
        getInner(pi+1, obj[name]);
        return;
      }

      arrayInPath = true;
      for (let ai=0, alen=obj.length; ai<alen; ai++ ) {
        getInner(pi, obj[ai]);
      }
    } else if (pi === plen) {
      values.push(obj);
    } else if (obj === undefined || obj === null) {
      return;
    } else if (!_.isObject(obj)) {
      throw new Error('Expected an object or array at ' + np.pathName(pi) + ', but got ' + obj);
    } else {
      if (pi && fields[pi-1].type.name === 'object' && path[pi] === '_') {
        arrayInPath = true;
        pi++;
        _.each(obj, v => getInner(pi, v));
      } else {
        getInner(pi+1, obj[path[pi]]);
      }
    }
  }

  getInner(0, obj);

  if (!arrayInPath) {
    switch (values.length) {
    case 0: return undefined;
    case 1: return values[0];
    // fall through
    }
  }

  return values;
};

NamePath.prototype.uniq = function(obj) {
  const val = this.get(obj);
  return _.isArray(val) ? _.uniq(val) : [ val ];
};

Object.defineProperty(NamePath.prototype, 'pathLabel', {
  get: function() {
    const pf = this.fields;
    let i = 0,
        label = '';
    while (i<pf.length-1) {
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

Tyr.NamePath = NamePath;
export default NamePath;
