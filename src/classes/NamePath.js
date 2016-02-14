
import _ from 'lodash';


function _skipArray(field) {
  while (field && field.type.def.name === 'array') {
    field = field.def.of;
  }

  return field;
}

export default class NamePath {

  constructor(collection, pathName, skipArray) {
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
        if (!at.def.of) {
          throw new Error(`"${name} in ${pathName} on the collection "${curCollection.def.name}" is not an array.`);
        }

        at = at.def.of;
        pathFields[pi++] = at;
        continue nextPath;

      } else {
        if (!def.fields) {
          const aAt = _skipArray(at);

          if (aAt && aAt.def.fields) {
            at = aAt;
            def = at.def;

          } else {
            throw new Error(
              `"${name}" in "${pathName}" is not contained within the collection "${curCollection.def.name}"` +
              (at.link ? '" (maybe need advanced population syntax)' : '')
            );
          }
        }

        at = def.fields[name];
        if (!at && name.length > 1 && name.endsWith('_')) {
          // does this name match a denormalized entry?
          const _name = name.substring(0, name.length-1);

          while (_name) {
            const _at = def.fields[_name];

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
        at = _skipArray(at);
      }

      if (!at) {
        throw new Error('Cannot find field "' + this.pathName(pi) + '" in ' + collection.def.name);
      }

      pathFields[pi++] = at;
    }
  }


  /**
   * TODO:  make this a configurable Tyranid option as to how populated entries should be named
   *
   *    1. organizationId -> organization
   *    2. organization   -> organization$
   *    3. organization   -> organization
   *
   * @private
   */
  static populateNameFor(name, denormal) {
    const l = name.length;

    if (denormal) {
      return name + '_';
    } else if (name.substring(l-2) === 'Id') {
      return name.substring(0, l-2);
    } else {
      return name + '$';
    }

  }

  pathName(pi) {
    return pi <= 1 ?
      this.name :
      this.path.slice(0, pi).join('.') + ' in ' + this.name;
  }

  toString() {
    return this.col.def.name + ':' + this.name;
  }

  get tail() {
    return this.fields[this.fields.length-1];
  }

  get detail() {
    return _skipArray(this.fields[this.fields.length-1]);
  }

  get(obj) {
    const np   = this,
          path = np.path,
          plen = path.length;
    let arrayInPath = false;

    const values = [];

    function getInner(pi, obj) {
      if (Array.isArray(obj)) {
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
        getInner(pi+1, obj[path[pi]]);
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
  }

  uniq(obj) {
    const val = this.get(obj);
    return _.isArray(val) ? _.uniq(val) : [ val ];
  }

  get pathLabel() {
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
    if (!label) {
      console.log('***', this.fields.length);
      console.log('***', this.fields);
    }
    return label;
  }
}
