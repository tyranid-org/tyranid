import _ from 'lodash';

import NamePath from './classes/NamePath';
import Tyranid from './tyranid';
import Collection from './classes/Collection';


export const config          = {};
export const collections     = [];
export const collectionsById = {};
export const typesByName     = {};
export const $all            = '$all';
export const metaRegex       = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;


export function setFalse(v) {
  return v !== undefined && !v;
}

export function escapeRegex(str) {
  return str.replace(metaRegex, '\\$&');
}

export function pathAdd(path, add) {
  return path ? path + '.' + add : add;
}

export function labelize(name) {

  // TODO:  more cases to be added here later on
  return _.startCase(name);
}

export async function parseInsertObj(col, obj) {
  const def       = col.def,
        fields    = await col.fieldsFor(obj),
        insertObj = {};

  _.each(fields, function(field, name) {
    const fieldDef = field.def;

    if (fieldDef.db !== false) {
      const v = obj[name];

      if (v === undefined) {
        if (fieldDef.defaultValue !== undefined) {
          insertObj[name] = fieldDef.defaultValue;
        }
      } else {
        insertObj[name] = v;
      }
    }
  });

  if (insertObj[def.primaryKey.field] === undefined) {
    const type = fields[def.primaryKey.field].def.is;
    insertObj[def.primaryKey.field] = type.generatePrimaryKeyVal();
  }

  if (def.primaryKey.defaultMatchIdOnInsert && insertObj._id === undefined) {
    insertObj._id = insertObj[def.primaryKey.field];
  }

  _.each(col.denormal, function(field, name) {
    // TODO:  need to parse & process name if it is a path (if it contains "."s)
    name = NamePath.populateNameFor(name, true);
    insertObj[name] = obj[name];
  });

  if (def.timestamps) {
    const now = new Date();
    insertObj.createdAt = now;
    insertObj.updatedAt = now;
  }

  return insertObj;
}

export function parseProjection(col, obj) {
  const def        = col.def,
        projection = Object.assign({}, obj);

  if (projection[def.primaryKey.field] === undefined) {
    projection[def.primaryKey.field] = 1;
  }

  // TODO: consider default removing _id if not the primary

  return projection;
}

export function toClient(col, data) {

  if (Array.isArray(data)) {
    return data.map(function(doc) {
      return toClient(col, doc);
    });
  }

  const obj = {};

  const fields = col ? col.def.fields : null;
  _.each(data, function(v, k) {
    let field;

    if (fields && (field=fields[k])) {
      v = field.def.is.toClient(field, v, data);

      if (v !== undefined) {
        obj[k] = v;
      }
    } else if (v && v.$toClient) {
      obj[k] = v.$toClient();
    } else if (Array.isArray(v)) {
      // TODO:  we can figure out the type of k using metadata to make this work for the case when
      //        we have an array of pojos instead of instances
      obj[k] = toClient(null, v);
    } else if (v && ObjectId.isValid(v.toString())) {
      obj[k] = v.toString();
    } else {
      // TODO:  right now we're sending down everything we don't have metadata for ...
      //        for example, populated values ... we probably need a more comprehensive solution here, not sure
      //        what it would be yet
      obj[k] = v;
    }
  });

  // send down computed fields ... maybe move everything into this so we only send down what we know about ... can also calculate populated names to send
  _.each(fields, function(field, name) {
    let  value, client;
    const fieldDef = field.def;
    if (fieldDef.get && (client = fieldDef.client)) {
      if (name in data) {
        // Property will have been set on CollectionInstances
        value = data[name];
      } else if( _.isFunction(fieldDef.get)) {
        // Have to set manually for POJO
        value = data::fieldDef.get();
      } else {
        throw new Error('Incorrect computed value definition: ' + name);
      }
      if ( !_.isFunction(client) || client.call(data, value) ) {
        obj[name] = value;
      }
    }
  });

  return obj;
}


export function validateUidCollection(validator, path, collection) {
  const unknownTypeErrMsg = 'Unknown Collection for uid "of".';
  if (collection instanceof Collection) {
    if (!collectionsById[collection.id]) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else if (typeof collection === 'string') {
    collection = Tyranid.byName(collection);
    if (!collection) {
      throw validator.err(path, unknownTypeErrMsg);
    }
  } else {
    throw validator.err(path, unknownTypeErrMsg);
  }
}
