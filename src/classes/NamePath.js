import _ from 'lodash';


export default class NamePath {


  constructor(collection, pathName) {
    this.col = collection;
    this.name = pathName;

    let path = this.path = pathName.length ? pathName.split('.') : [],
        plen = path.length,
        defs = this.defs = new Array(plen),
        def = collection.def;

    for (let pi=0; pi<plen; pi++) {
      let name = path[pi];

      if (!def.fields && def.link) {
        throw new Error(
          '"' + name + '" in "' + pathName +
          '" is not a contained within the collection "' + collection.def.name +
          '" (maybe need advanced population syntax)'
        );
      }

      def = def.fields[name];
      while (def.is.def.name === 'array') {
        def = def.of;
      }

      if (!def) {
        throw new Error(
          'Cannot find field "' + this.pathName(pi) +
          '" in ' + collection.def.name
        );
      }

      defs[pi] = def;
    }
  }


  /**
   * TODO:  make this a configurable Tyranid option as to how populated entries should be named
   *
   *    1. organizationId -> organization
   *    2. organization   -> organization$
   *    3. organization   -> organization
   */
  static populateNameFor(name) {
    let l = name.length;

    if (name.substring(l-2) === 'Id') {
      return name.substring(0, l-2);
    } else {
      return name + '$';
    }
  }

  pathName(pi) {
    return this.path.length === 1 ?
      this.name :
      this.path.slice(0, pi).join('.') + ' in ' + this.name;
  }

  toString() {
    return this.col.def.name + ':' + this.name;
  }

  tailDef() {
    let def = this.defs[this.defs.length-1];
    while (def.is.def.name === 'array') {
      def = def.of;
    }
    return def;
  }

  getUniq(obj) {
    let np = this,
        path = np.path,
        plen = path.length;

    let values = [];

    function getInner(pi, obj) {
      if (Array.isArray(obj)) {
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
    return _.uniq(values);
  }


}
