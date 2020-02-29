// cannot use import because @isomorphic
const _ = require('lodash');

const Tyr = require('../tyr').default;

/**
 * NOTE: This cannot be a ES6 class because it is isomorphic
 *
 * @isomorphic
 */

/**
 * Analyzes function to see which properties/paths are referred to on the local object.
 *
 * Pretty primitive so far, could be improved...
 */
export function paths(fn) {
  const fns = fn.toString();
  const terms = fns.match(/this(\.[a-zA-Z_][a-zA-Z0-9_]*)+\(?/g) || [];

  return _.uniq(
    terms.map(term => {
      let t = term.substring(5);

      if (t.endsWith('(')) t = t.substring(0, t.lastIndexOf('.'));
      else if (t.endsWith('.length')) t = t.substring(0, t.length - 7);

      return t;
    })
  );
}

Tyr.functions = {
  paths
};
