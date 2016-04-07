
import _ from 'lodash';

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

  mapAwait(value, fn) {
    if (value.then) {
      return value.then(value => {
        return fn(value);
      });
    } else {
      return fn(value);
    }
  }
};


export default Tyr;
