
import _            from 'lodash';
import { ObjectId } from 'mongodb';


function equalCustomizer(a, b) {
  if (a.constructor.name === 'ObjectID' && b.constructor.name === 'ObjectID') {
    return a.equals(b);
  }

  //return undefined;
}

function cloneCustomizer(obj) {
  // cannot use instanceof because multiple versions of MongoDB driver are probably being used
  if (obj.constructor.name === 'ObjectID') {
    return obj;
  }

  //return undefined;
}


const Tyr = {
  options: {},

  collections: [],
  byId: {},
  byName: {},

  components: [],

  $all: '$all',

  labelize(name) {
    // TODO:  more cases to be added here later on
    return _.startCase(name);
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
    for (let i=0, len=array.length; i<len; i++) {
      if (await predicate(array[i])) {
        return i;
      }
    }

    return -1;
  },

  async mapAsync(array, mapFn) {
    return Promise.all(array.map(el => mapFn(el)));
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

  isEqual(a, b) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.isEqualWith ? _.isEqualWith(a, b, equalCustomizer) : _.isEqual(a, b, equalCustomizer);
  },

  cloneDeep(obj) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.cloneDeepWith ? _.cloneDeepWith(obj, cloneCustomizer) : _.cloneDeep(obj, cloneCustomizer);
  }
};

class Timer {
  constructor(name) {
    this.name = name;
    this.last = this.start = Date.now();
    console.log(this.name + ': START');
  }

  lap(msg) {
    const now = Date.now();
    console.log(this.name + ': ' + msg + ' (' + (now - this.last) + 'ms)');
    this.last = now;
  }

  end() {
    const now = Date.now();
    console.log(this.name + ': END (' + (now - this.start) + 'ms)');
  }
}

Tyr.Timer = Timer;

export default Tyr;
