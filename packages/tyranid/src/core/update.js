import * as _ from 'lodash';

//import Tyr from '../tyr';
import Collection from './collection';

Collection.prototype.fromClientUpdate = function (update) {
  const col = this;

  function convertValue(field, value) {
    if (!field) return value;

    if (_.isArray(value)) {
      return value.map(v => field.type.fromClient(field, v));
    } else {
      return field.type.fromClient(field, value);
    }
  }

  function convert(col, path, client) {
    let field;
    if (path) {
      field = col.parsePath(path).tail;
    }

    if (Array.isArray(client) || !_.isObject(client)) {
      return convertValue(field, client);
    }

    const server = {};
    _.each(client, (v, n) => {
      switch (n) {
        case '$set':
          if (Array.isArray(v)) {
            server[n] = v.map(cv => convert(col, path, cv));
          } else {
            server[n] = convert(col, path, v);
          }
          break;
        default:
          if (Array.isArray(v)) {
            server[n] = convertValue(field, v);
          } else {
            server[n] = convert(col, path ? path + '.' + n : n, v);
          }
      }
    });

    return server;
  }

  return convert(col, '', update);
};

//const update = {};

//Tyr.update = update;

//export default update;
