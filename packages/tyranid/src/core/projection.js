import * as _ from 'lodash';

//import Tyr      from '../tyr';

function resolve(projections, projection) {
  if (_.isArray(projection)) {
    const net = {};

    for (const proj of projection) {
      _.merge(net, resolve(projections, proj));
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

export default {
  resolve
};
