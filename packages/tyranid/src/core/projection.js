import * as _ from 'lodash';

import Tyr from '../tyr';

export function extractProjection(opts) {
  return opts.projection || opts.fields || opts.project;
}

export function resolveProjection(projections, projection) {
  function inner(projection) {
    if (_.isArray(projection)) {
      const net = {};

      for (const proj of projection) {
        _.merge(net, inner(proj));
      }

      return net;
    } else if (_.isObject(projection)) {
      return projection;
    } else if (_.isString(projection)) {
      const rslt = projections[projection];

      if (!rslt) {
        throw new Error(`No project named "${projection}"`);
      }

      return rslt;
    } else {
      throw new Error('invalid projection');
    }
  }

  const rslt = inner(projection),
    minimal = projections && projections.$minimal;

  if (minimal) {
    const net = {};

    const m = rslt.$minimal;
    if (m !== undefined) {
      if (m) _.merge(net, minimal);
      _.merge(net, rslt);
      delete net.$minimal;
    } else {
      _.merge(net, minimal);
      _.merge(net, rslt);
    }

    return net;
  } else if (rslt.$minimal !== undefined) {
    return _.omit(rslt, ['$minimal']);
  } else {
    return rslt;
  }
}

/**
 * Mongo projections can take paths like 'foo.bar'.  This returns projections that have
 * been flattened to the top-level, for example:
 *
 * flattenProjection({
 *   'name.first': 1,
 *   'name.last': 1,
 *   'email': 1
 * })
 *
 * returns
 *
 * {
 *   name: 1,
 *   email: 1
 * }
 */
export function flattenProjection(opts) {
  const proj = extractProjection(opts);

  const newProj = {};

  for (const pathName in proj) {
    const idx = pathName.indexOf('.');
    newProj[idx >= 0 ? pathName.substring(0, idx) : pathName] = 1;
  }

  delete opts.fields;
  delete opts.project;
  opts.projection = newProj;
}

/** @isomorphic */
Tyr.projectify = function(value) {
  const projection = {};

  if (Array.isArray(value)) {
    for (const path of value) {
      path.projectify(projection);
    }
  } else {
    for (const name in value) projection[name] = 1;
  }

  return projection;
};
