import _ from 'lodash';
import { ObjectId } from 'mongodb';

import NamePath from './core/namePath';


export const metaRegex         = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;


export function setFalse(v) {
  return v !== undefined && !v;
}

export function escapeRegex(str) {
  return str.replace(metaRegex, '\\$&');
}

export function pathAdd(path, add) {
  return path ? path + '.' + add : add;
}

export async function parseInsertObj(col, obj) {
  const def       = col.def,
        fields    = await col.fieldsFor(obj),
        insertObj = new col();

  _.each(col.denormal, function(field, name) {
    // TODO:  need to parse & process name if it is a path (if it contains "."s)
    name = NamePath.populateNameFor(name, true);
    insertObj[name] = obj[name];
  });

  _.each(fields, function(field, name) {
    const fieldDef = field.def;

    if (fieldDef.db !== false && !(fieldDef.get || fieldDef.getServer)) {
      const v = obj[name];

      if (v === undefined) {
        const df = _.result(fieldDef, 'defaultValue');
        if (df !== undefined) {
          insertObj[name] = df;
        }
      } else {
        insertObj[name] = v;
      }
    }
  });

  const pkFieldName = def.primaryKey.field;
  if (insertObj[pkFieldName] === undefined) {
    const type = fields[pkFieldName].type;
    insertObj[pkFieldName] = type.generatePrimaryKeyVal();
  }

  if (def.primaryKey.defaultMatchIdOnInsert && insertObj._id === undefined) {
    insertObj._id = insertObj[def.primaryKey.field];
  }

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

  const fields = col ? col.fields : null;
  _.each(data, function(v, k) {
    let field;

    if (fields && (field=fields[k])) {
      v = field.type.toClient(field, v, data);

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
