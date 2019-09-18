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
  const terms = fns.match(/this(\.[a-zA-Z_][a-zA-Z0-9_]*)+/g);

  return terms ? terms.map(term => term.substring(5)) : [];
}

Tyr.functions = {
  paths
};
