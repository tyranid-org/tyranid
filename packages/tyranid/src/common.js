import * as _ from 'lodash';
import { ObjectId } from 'mongodb';

import { extractProjection, resolveProjection } from './core/projection';
import Tyr from './tyr';
import Path from './core/path';

export const metaRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

export function setFalse(v) {
  return v !== undefined && !v;
}

export function escapeRegex(str) {
  return str.replace(metaRegex, '\\$&');
}

export function pathAdd(path, add) {
  return path ? path + '.' + add : add;
}

export function isArrow(fn) {
  return /^[a-zA-Z0-9,_\s]*=>/.test(fn.toString());
}

export function hasMongoUpdateOperator(update) {
  for (const key in update) {
    if (key.startsWith('$') && update.hasOwnProperty(key)) {
      return true;
    }
  }

  //return undefined;
}

export function extractUpdateFields(doc, opts) {
  const updateFields = {};

  const projection = extractProjection(opts);
  if (projection) {
    _.each(projection, (field, key) => {
      if (field) {
        updateFields[key] = 1;
      }
    });
  } else {
    _.each(doc, (field, key) => {
      if (key !== '_id') {
        updateFields[key] = 1;
      }
    });
  }

  return updateFields;
}

// Options parsing
// ===============

export function isOptions(opts) {
  // TODO:  this is a hack, need to figure out a better way (though most likely a non-issue in practice)
  return (
    opts &&
    (opts.asOf !== undefined ||
      opts.auth !== undefined ||
      opts.author !== undefined ||
      opts.comment !== undefined ||
      opts.fields !== undefined ||
      opts.historical !== undefined ||
      opts.limit !== undefined ||
      opts.multi !== undefined ||
      opts.parallel !== undefined ||
      opts.perm !== undefined ||
      opts.populate !== undefined ||
      opts.projection !== undefined ||
      opts.query !== undefined ||
      opts.skip !== undefined ||
      opts.timestamps !== undefined ||
      opts.tyranid !== undefined ||
      opts.upsert !== undefined ||
      opts.writeConcern !== undefined ||
      !_.keys(opts).length)
  );
}

export function processOptions(collection, opts) {
  if (opts) {
    const fields = extractProjection(opts);

    if (fields) {
      const f = resolveProjection(collection.def.projections, fields);

      if (f !== fields) {
        const newOpts = {
          ...opts,
          projection: f,
        };
        delete newOpts.fields;
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

/**
 * This functions tries to avoid creating a new option object unless it has to.
 */
export function combineOptions(...sources) {
  let first;
  let composite;
  for (const source of sources) {
    if (source) {
      if (composite) {
        _.assign(composite, source);
      } else if (first) {
        composite = {};
        _.assign(composite, first);
        _.assign(composite, source);
      } else {
        first = source;
      }
    }
  }
  return composite || first;
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
    //delete opts.auth;
    return auth === true ? Tyr.local.user : auth;
  }

  // @deprecated
  const tyrOpts = opts.tyranid;
  if (tyrOpts) {
    delete opts.tyranid;
    if (tyrOpts.secure) {
      return tyrOpts.subject || tyrOpts.user || Tyr.local.user;
    }
  }

  //return undefined;
}

/**
 * TODO: parseSaveObj() creates a new object and updates it with values to ensure that excess
 *       stuff on the object does not get written to the database which is good.
 *
 *       However, this means that any computed values/timestamp updates made here do not get made
 *       to the calling object which is the object that is passed around in event handlers.
 *
 *       Maybe we should apply all computed values/timestamps to the original object first,
 *       and then create the new object from that and just copy in the values that are supposed
 *       to be there?
 */
export async function parseSaveObj(col, obj, opts) {
  const def = col.def;

  const timestamps = def.timestamps && (!opts || opts.timestamps !== false);

  if (timestamps) {
    const now = new Date();
    // Don't overwrite createdAt in case we are coming from an upsert update.
    obj.createdAt = obj.createdAt || now;
    obj.updatedAt = now;
  }

  const fields = await col.fieldsFor({ match: obj, static: true }),
    insertObj = new col();

  // this handles the case where they set "timestamps: true" but did not define the updatedAt/createdAt fields manually
  if (timestamps) {
    insertObj.createdAt = obj.createdAt;
    insertObj.updatedAt = obj.updatedAt;
  }

  _.each(col.denormal, function (field, name) {
    // we only need to copy it if it is a top-level level, nested values will be copied below
    if (name.indexOf('.') < 1) {
      name = Path.populateNameFor(name, true);
      insertObj[name] = obj[name];
    }
  });

  _.each(fields, function (field, name) {
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

  if (def.historical && obj._history) {
    insertObj._history = obj._history;
  }

  return insertObj;
}

export function parseProjection(col, obj) {
  const def = col.def,
    projection = Object.assign({}, obj);

  if (
    projection[def.primaryKey.field] === undefined &&
    // if an exclusion is present, don't add an inclusion
    _.find(projection, v => !v) === undefined
  ) {
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
      throw new Error(
        `Invalid client value: ${value}\n\nMust be one of 'never', 'conditional', 'default', true (or 1), false (or 0), or undefined`
      );
  }
}

export function toClient(col, doc, opts) {
  if (!doc) return doc;

  if (Array.isArray(doc)) return doc.map(doc2 => toClient(col, doc2, opts));

  if (doc.$access) doc.$redact();

  if (col) opts = processOptions(col, opts);
  const proj = extractProjection(opts);

  // fields is only for top-level objects, we do not want to recursively pass it down into embedded documents
  const dOpts = proj ? _.omit(opts, 'fields', 'projection', 'project') : opts;

  const obj = {},
    { populate } = opts;

  // note we are only looking at the top-level properties so call flattenProjection() before calling toClient()
  function projected(key) {
    if (key.endsWith('$')) {
      if (!populate) return false;
      const baseKey = key.substring(0, key.length - 1);
      return populate[baseKey] || populate.includes?.(baseKey);
    } else {
      if (!proj) return key !== '_history' && key !== '$options';
      if (key === '_id') return proj[key] || proj[key] === undefined;

      const v = proj[key];
      if (v !== undefined) return true;

      if (populate) {
        const unpopulateName = key + 'Id';
        return populate[unpopulateName] || populate.includes?.(unpopulateName);
      }
    }
  }

  const fields = col?.fields;
  for (const k in doc) {
    if (!doc.hasOwnProperty(k)) continue;

    let v = doc[k];
    let field;

    if (!projected(k)) continue;

    if (fields && (field = fields[k])) {
      v = field.type.toClient(field, v, doc, opts, proj);

      if (v !== undefined) {
        obj[k] = v;
      }
    } else if (!v) {
      obj[k] = v;
    } else if (v.$toClient) {
      obj[k] = v.$toClient(dOpts);
    } else if (Array.isArray(v)) {
      // TODO:  we can figure out the type of k using metadata to make this work for the case when
      //        we have an array of pojos instead of instances
      obj[k] = toClient(null, v, dOpts);
    } else if (ObjectId.isValid(v.toString())) {
      obj[k] = v.toString();
    } else {
      // TODO:  right now we're sending down everything we don't have metadata for ...
      //        for example, populated values ... we probably need a more comprehensive solution here, not sure
      //        what it would be yet
      obj[k] = v;
    }
  }

  if (doc.$access) obj.$access = doc.$access;

  // send down computed fields ... maybe move everything into this so we only send down what we know about ... can also calculate populated names to send
  for (const name in fields) {
    if (!fields.hasOwnProperty(name)) continue;

    const field = fields[name];
    const fieldDef = field.def,
      getFn = fieldDef.getServer || fieldDef.get;
    if (!getFn) continue;

    if (
      !evaluateClient(
        fieldDef.client,
        name,
        doc,
        // we don't pass in the value in this case because in order to do that we'd need to calculate it which might be costly
        undefined,
        opts,
        proj
      ) ||
      !projected(name)
    ) {
      continue;
    }

    let value;
    if (name in doc) {
      // Property will have been set on CollectionInstances
      value = doc[name];
    } else if (_.isFunction(getFn)) {
      // Have to set manually for POJO
      value = getFn.call(doc);
    } else {
      throw new Error('Incorrect computed value definition: ' + name);
    }

    obj[name] = value;
  }

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
