import * as _ from 'lodash';
import { ObjectId } from 'mongodb';

function equalCustomizer(a, b) {
  // cannot use instanceof because multiple versions of MongoDB driver are probably being used
  if (
    a &&
    b &&
    a.constructor.name === 'ObjectID' &&
    b.constructor.name === 'ObjectID'
  ) {
    return a.equals(b);
  }

  //return undefined;
}

function equalBsonCustomizer(a, b) {
  // cannot use instanceof because multiple versions of MongoDB driver are probably being used
  if (
    a &&
    b &&
    a.constructor.name === 'ObjectID' &&
    b.constructor.name === 'ObjectID'
  ) {
    return a.equals(b);
  }

  // BSON has deprecated "undefined" and when you save an object with an undefined value, it gets converted to null
  if (a === undefined) {
    return b === undefined || b === null;
  }

  if (b === undefined) {
    return a === undefined || a === null;
  }

  //return undefined;
}

function cloneCustomizer(obj) {
  // cannot use instanceof because multiple versions of MongoDB driver are probably being used
  if (obj && obj.constructor.name === 'ObjectID') {
    return obj;
  }

  //return undefined;
}

function convertStrToHex(str) {
  let hex, i;

  let result = '';
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += ('0' + hex).slice(-2);
  }

  return result;
}

// Encode objects for MongoDB (update keys that start with $, deal with recursion)

const illegalKeyCharPattern = /(^\$)|\./;

function adaptIllegalKeyCharAndEliminateRecursion(q) {
  // object =>
  //   undefined (haven't seen)
  // | true (currently processing, saw invalid chars or recursion)
  // | false (currently processing, haven't seen invalid chars or recursion)
  // | object (its been output already so output _recurse)
  const seen = new Map();

  const hasIllegalKeyCharOrRecursion = q => {
    if (Tyr.isObject(q)) {
      const r = seen.get(q);
      if (r !== undefined) return r;

      // we don't want to log recursive references
      seen.set(q, false);

      for (const p in q) {
        if (
          illegalKeyCharPattern.test(p) ||
          hasIllegalKeyCharOrRecursion(q[p]) !== undefined
        ) {
          seen.set(q, true);
          return true;
        }
      }
    }

    //return undefined;
  };

  const inner = q => {
    if (Tyr.isObject(q)) {
      const s = seen.get(q);
      if (Tyr.isObject(s)) return '_recurse';

      const rslt = hasIllegalKeyCharOrRecursion(q);

      if (rslt === undefined) {
        seen.set(q, q);
      } else {
        const qc = Array.isArray(q) ? [] : {};
        seen.set(q, qc);

        for (const p in q) {
          if (q.hasOwnProperty(p)) {
            let safeP = p;

            if (illegalKeyCharPattern.test(p)) {
              safeP = (p.startsWith('$') ? '_' + p : p).replace(/\./g, ':');
            }

            qc[safeP] = inner(q[p]);
          }
        }

        return qc;
      }
    }

    return q;
  };

  return inner(q);
}

const Tyr = {
  options: {},

  collections: [],
  byId: {},
  byName: {},

  components: [],

  $all: '$all',

  adaptIllegalKeyCharAndEliminateRecursion(q) {
    return adaptIllegalKeyCharAndEliminateRecursion(q);
  },

  async valuesBy(filter) {
    const getValues = c => c.valuesFor(c.fieldsBy(filter));
    const arrs = await Promise.all(Tyr.collections.map(getValues));
    return _.union.apply(null, arrs);
  },

  mixin(target, mixin) {
    for (const name in mixin) {
      if (name === 'prototype') {
        _.extend(target.prototype, mixin.prototype);
      } else {
        target[name] = mixin[name];
      }
    }
  },

  isValidObjectIdStr(str) {
    return /^[a-fA-F0-9]{24}$/.test(str);
  },

  //
  // string methods
  //

  labelize(name) {
    // TODO:  more cases to be added here later on
    if (name.endsWith('Id')) {
      name = name.substring(0, name.length - 2);
    } else if (name.endsWith('Ids')) {
      name = Tyr.pluralize(name.substring(0, name.length - 3));
    }

    return (
      _.startCase(name)
        // i.e. "Date Of Birth" -> "Date of Birth"
        .replace(/ Of /g, ' of ')
        .replace(/ Url /g, ' URL ')
    );
  },

  pluralize(name) {
    // TODO:  use lodash inflection or something similar
    if (name.match(/(ch|s|sh|x)$/)) {
      return name + 'es';
    } else if (name.match(/z$/)) {
      return name + 'zes';
    } else if (name.match(/[b-df-hj-np-tv-z]y$/)) {
      return name.substring(0, name.length - 1) + 'ies';
      //} else if (name.match(/[b-df-hj-np-tv-z]o$/)) {
      // works for potato, volcano, etc. but not photo ... prob need lodash-inflection to fix this up
      //return name + 's';
    } else if (name.match(/is$/)) {
      return name.substring(0, name.length - 2) + 'es';
    } else {
      // TODO:  lots of other problems
      return name + 's';
    }
  },

  singularize(name) {
    if (name.match(/es$/)) {
      return name.substring(0, name.length - 2);
    } else if (name.match(/s$/)) {
      return name.substring(0, name.length - 1);
    } else {
      return name;
    }
  },

  ordinalize(number) {
    const string = String(number);

    if (/1$/.test(string) && !/11$/.test(string)) return number + 'st';
    if (/2$/.test(string) && !/12$/.test(string)) return number + 'nd';
    if (/3$/.test(string) && !/13$/.test(string)) return number + 'rd';
    return number + 'th';
  },

  //
  // async/await/promise utilities
  //

  async eachAsync(array, fn) {
    for (const el of array) {
      await fn(el);
    }
  },

  async everyAsync(array, predicate) {
    const booleans = await Promise.all(array.map(el => predicate(el)));
    return array.every((el, idx) => booleans[idx]);
  },

  async filterAsync(array, filter) {
    const booleans = await Promise.all(array.map(el => filter(el)));
    return array.filter((el, idx) => booleans[idx]);
  },

  async findAsync(array, predicate) {
    for (const el of array) {
      if (await predicate(el)) {
        return el;
      }
    }

    //return undefined;
  },

  async findIndexAsync(array, predicate) {
    for (let i = 0, len = array.length; i < len; i++) {
      if (await predicate(array[i])) {
        return i;
      }
    }

    return -1;
  },

  async mapAsync(array, mapFn) {
    return Promise.all(array.map(el => mapFn(el)));
  },

  async awaitAll(array, chunking = 5) {
    // TODO:  implement support for chunking parameter
    await Promise.all(array);
  },

  mapAwait(value, fn) {
    if (value.then) {
      return value.then(value => {
        return fn(value);
      });
    } else {
      return fn(value);
    }
  },

  async someAsync(array, predicate) {
    const booleans = await Promise.all(array.map(el => predicate(el)));
    return array.some((el, idx) => booleans[idx]);
  },

  async sleep(ms /*: number*/) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async sleepUntil(
    fn /*: () => boolean | Promise<boolean>*/,
    maxMs = 5000,
    everyMs = 5
  ) {
    for (let totalMs = 0; !await fn(); totalMs += everyMs) {
      if (totalMs >= maxMs) {
        throw new Error(`Condition failed to occur within ${maxMs}ms`);
      }

      await Tyr.sleep(everyMs);
      totalMs += everyMs;
    }
  },

  //
  // lodash-like methods
  //

  isEqual(a, b) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.isEqualWithp
      ? _.isEqualWith(a, b, equalCustomizer)
      : _.isEqual(a, b, equalCustomizer);
  },

  isEqualInBson(a, b) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.isEqualWithp
      ? _.isEqualWith(a, b, equalBsonCustomizer)
      : _.isEqual(a, b, equalBsonCustomizer);
  },

  isSameId(a, b) {
    if (a) {
      if (b) {
        if (typeof a === 'string') {
          if (typeof b === 'string') {
            return a === b;
          } else {
            return a === b.toString();
          }
        } else if (typeof b === 'string') {
          return a.toString() === b;
        } else {
          return a.equals(b);
        }
      } else {
        return false;
      }
    } else if (b) {
      return false;
    }

    return true;
  },

  isObject(value) {
    // want to treat ObjectIds as primitive values in most places
    return (
      _.isObject(value) &&
      !(value instanceof RegExp) &&
      (!value.constructor || value.constructor.name !== 'ObjectID')
    );
  },

  isObjectId(value) {
    return _.isObject(value) && value.constructor.name === 'ObjectID';
  },

  cloneDeep(obj) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.cloneDeepWith
      ? _.cloneDeepWith(obj, cloneCustomizer)
      : _.cloneDeep(obj, cloneCustomizer);
  },

  parseBson(value) {
    let bsontype;

    if (_.isObject(value) && (bsontype = value._bsontype)) {
      switch (bsontype) {
        case 'ObjectID':
          // 2.2 driver stores id as Buffer compared to string for 2.1
          // See http://mongodb.github.io/node-mongodb-native/2.2/api/ObjectID.html#generate
          // and http://mongodb.github.io/node-mongodb-native/2.1/api/ObjectID.html#generate
          // and linked sources
          return new ObjectId(
            value.id instanceof Buffer ? value.id : convertStrToHex(value.id)
          );

        // fall through
      }
    }

    return value;
  },

  indexOf(array, value) {
    const an = array.length;

    for (let ai = 0; ai < an; ai++) {
      if (Tyr.isEqual(array[ai], value)) {
        return ai;
      }
    }

    return -1;
  },

  addToSet(array, ...values) {
    for (const v of values) {
      const ai = Tyr.indexOf(array, v);

      if (ai < 0) {
        array.push(v);
      }
    }
  },

  pullAll(array, ...values) {
    const an = array.length;
    let tai = 0;

    for (let sai = 0; sai < an; sai++) {
      const asv = array[sai];

      if (Tyr.indexOf(values, asv) >= 0) {
        sai;
      } else {
        array[tai++] = asv;
      }
    }

    array.length = tai;
  }
};

/*
 * --- Matching
 */

/**
 * This is similar to what _.matches() provides but it will also perform array intersections on top of it
 *
 * @param s the specificiation
 * @param v the value
 */
const isCompliant = (Tyr.isCompliant = function(s, v) {
  if (arguments.length === 1) {
    return v2 => isCompliant(s, v2);
  }

  if (Tyr.isEqual(s, v)) {
    return true;
  } else if (Array.isArray(s)) {
    if (Array.isArray(v)) {
      for (let i = 0; i < s.length; i++) {
        if (!isCompliant(s[i], v[i])) {
          return false;
        }
      }

      return true;
    }

    for (let i = 0; i < s.length; i++) {
      if (isCompliant(s[i], v)) {
        return true;
      }
    }

    return false;
  } else if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (isCompliant(s, v[i])) {
        return true;
      }
    }

    return false;
  } else if (_.isObject(s)) {
    if (!_.isObject(v)) {
      return false;
    }

    for (const prop in s) {
      if (s.hasOwnProperty(prop)) {
        if (!isCompliant(s[prop], v[prop])) {
          return false;
        }
      }
    }

    return true;
  } else if (_.isObject(v)) {
    return false;
  }

  return false;
});

export default Tyr;
