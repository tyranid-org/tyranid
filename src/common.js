
import _            from 'lodash';
import { ObjectId } from 'mongodb';

import projection   from './core/projection';
import Tyr          from './tyr';
import NamePath     from './core/namePath';



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


// Options parsing
// ===============

export function isOptions(opts) {
  // TODO:  this is a hack, need to figure out a better way (though most likely a non-issue in practice)
  return opts &&
    ( (opts.auth !== undefined ||
       opts.author !== undefined ||
       opts.comment !== undefined ||
       opts.fields !== undefined ||
       opts.historical !== undefined ||
       opts.limit !== undefined ||
       opts.multi !== undefined ||
       opts.perm !== undefined ||
       opts.populate !== undefined ||
       opts.query !== undefined ||
       opts.skip !== undefined ||
       opts.timestamps !== undefined ||
       opts.tyranid !== undefined ||
       opts.upsert !== undefined ||
       opts.writeConcern !== undefined)
     || !_.keys(opts).length);
}

export function processOptions(collection, opts) {

  if (opts) {
    const fields = opts.fields;

    if (fields) {
      const f = projection.resolve(collection.def.projections, fields);

      if (f !== fields) {
        const newOpts = {};
        _.assign(newOpts, opts);
        newOpts.fields = f;
        return newOpts;
      }
    }

    return opts;
  } else {
    return {};
  }
}

export function extractOptions(collection, args) {
  if (args.length && isOptions(args[args.length - 1])) {
    return processOptions(collection, args.pop());
  } else {
    return {};
  }
}

export function combineOptions(...sources) {
  const o = {};
  for (const source of sources) {
    _.assign(o, source);
  }
  return o;
}

/**
 * Extracts the authorization out of a mongodb options-style object.
 */
export function extractAuthorization(opts) {
  if (!opts) {
    return undefined;
  }

  const auth = opts.auth;
  if (auth) {
    delete opts.auth;
    return auth === true ? Tyr.local.user : auth;
  }

  const tyrOpts = opts.tyranid;
  if (tyrOpts) {
    delete opts.tyranid;
    if (tyrOpts.secure) {
      return tyrOpts.subject || tyrOpts.user || Tyr.local.user;
    }
  }

  //return undefined;
}

export function extractProjection(opts) {
  return opts.fields || opts.project || opts.projectiot ;
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

  if (def.historical && obj._history) {
    insertObj._history = obj._history;
  }

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

export function evaluateClient(client, key, doc, value, opts, proj) {
  if (_.isFunction(client)) {
    client = client.call(doc, value, opts, proj);

    // non-truthy from a function means no
    if (!client) {
      client = false;
    }
  }

  switch (client) {
  case false:
  case 0:
  case 'never':
    return false;

  case 'conditional':
    if (!proj || !proj[key]) {
      return false;
    }
    // fall through

  case true: 
  case 1:
  case 'default': 
  case undefined:
    return true;

  default:
    throw new Error(`Invalid client value: ${value}\n\nMust be one of 'never', 'conditional', 'default', true (or 1), false (or 0), or undefined`);
  }
}

export function toClient(col, doc, opts) {

  if (Array.isArray(doc)) {
    return doc.map(doc2 => toClient(col, doc2, opts));
  }

  opts = processOptions(col, opts);
  const proj = opts.fields;

  // fields is only for top-level objects, we do not want to recursively pass it down into embedded documents
  const dOpts = proj ? _.omit(opts, 'fields') : opts;

  const obj = {};

  function projected(key) {
    if (!proj) {
      return true;
    }

    const v = proj[key];
    return v === undefined ? key === '_id' : v;
  }

  const fields = col ? col.fields : null;
  _.each(doc, function(v, k) {
    let field;

    if (!projected(k)) {
      return;
    }

    if (fields && (field=fields[k])) {
      v = field.type.toClient(field, v, doc, opts, proj);

      if (v !== undefined) {
        obj[k] = v;
      }
    } else if (v && v.$toClient) {
      obj[k] = v.$toClient(dOpts);
    } else if (Array.isArray(v)) {
      // TODO:  we can figure out the type of k using metadata to make this work for the case when
      //        we have an array of pojos instead of instances
      obj[k] = toClient(null, v, dOpts);
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
    const fieldDef = field.def,
          getFn = fieldDef.get;
    if (!getFn) {
      return;
    }

    if (!evaluateClient(
          fieldDef.client, name, doc,
          // we don't pass in the value in this case because in order to do that we'd need to calculate it which might be costly
          undefined,
          opts, proj
        ) ||
        !projected(name)) {
      return;
    }

    let value;
    if (name in doc) {
      // Property will have been set on CollectionInstances
      value = doc[name];
    } else if( _.isFunction(getFn)) {
      // Have to set manually for POJO
      value = getFn.call(doc);
    } else {
      throw new Error('Incorrect computed value definition: ' + name);
    }

    obj[name] = value;
  });

  const toClientFn = col && col.def && col.def.toClient;
  if (toClientFn) {
    toClientFn.call(obj, opts);
  }

  const postFn = opts.post;
  if (postFn) {
    postFn.call(obj, opts);
  }

  return obj;
}
