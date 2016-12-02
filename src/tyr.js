
import _            from 'lodash';


function equalCustomizer(a, b) {
  // cannot use instanceof because multiple versions of MongoDB driver are probably being used
  if (a.constructor.name === 'ObjectID' && b.constructor.name === 'ObjectID') {
    return a.equals(b);
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

  //
  // lodash-like methods
  //

  isEqual(a, b) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.isEqualWith ? _.isEqualWith(a, b, equalCustomizer) : _.isEqual(a, b, equalCustomizer);
  },

  cloneDeep(obj) {
    // TODO:  testing for lodash 4 here, remove once we stop using lodash 3
    return _.cloneDeepWith ? _.cloneDeepWith(obj, cloneCustomizer) : _.cloneDeep(obj, cloneCustomizer);
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
    const an  = array.length;
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
