import * as _ from 'lodash';

import Tyr from '../tyr';

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
