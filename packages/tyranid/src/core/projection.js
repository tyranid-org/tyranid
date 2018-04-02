import * as _ from 'lodash';

//import Tyr      from '../tyr';

function resolve(projections, fields) {
  if (_.isArray(fields)) {
    const net = {};

    for (const proj of fields) {
      _.merge(net, resolve(projections, proj));
    }

    return net;
  } else if (_.isObject(fields)) {
    return fields;
  } else if (_.isString(fields)) {
    const rslt = projections[fields];

    if (!rslt) {
      throw new Error(`No project named "${fields}"`);
    }

    return rslt;
  } else {
    throw new Error('invalid projection');
  }
}

export default {
  resolve
};
