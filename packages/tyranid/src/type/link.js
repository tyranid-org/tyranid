import * as _ from 'lodash';
import { ObjectId } from 'mongodb';

import Tyr from '../tyr';
import Type from '../core/type';
import Collection from '../core/collection';

export const compileRelate = (compiler, field) => {
  const relate = field.def.relate;

  switch (relate) {
    case undefined:
    case 'associate':
    case 'owns':
    case 'ownedBy':
      field.relate = relate || 'associate';
      break;
    default:
      throw compiler.err(
        field.pathName,
        '"relate" must be one of "associate", "owns", or "ownedBy" if present'
      );
  }
};

const LinkType = new Type({
  name: 'link',

  compile(compiler, field) {
    compileRelate(compiler, field);
  },

  fromClient(field, value) {
    const link = field.link,
      linkField = link.fields[field.link.def.primaryKey.field];

    try {
      const fn = linkField.type.def.fromClient;
      return fn ? fn(linkField, value) : value;
    } catch (err) {
      if (_.isString(value) && !link.db && link.labelField) {
        // integer and ObjectId parse errors
        if (err.toString().match(/Invalid integer|24 hex/)) {
          const v = link.byLabel(value);

          if (v) {
            return v[link.def.primaryKey.field];
          }
        }
      }

      throw err;
    }
  },

  toClient(field, value) {
    return value
      ? ObjectId.isValid(value.toString())
        ? value.toString()
        : value
      : value;
  },

  format(field, value) {
    return field.link.idToLabel(value);
  }
});

LinkType.applyWhere = async function(field, doc, query, opts) {
  const where = field.def.where;
  if (where) {
    if (typeof where === 'function') {
      const rslt = await where.call(doc, opts);

      if (_.isObject(rslt)) {
        Object.assign(query, rslt);
      }
    } else {
      Object.assign(query, where);
    }
  }

  // If this is a dynamic schema field and it is linking to a collection, check to see
  // if that collection has a link to TyrSchema, and if so use the schema._id we have as
  // a foreign key into it.  This allows different custom fields to share the same lookup
  // tables.
  const { schema } = field;
  if (schema) {
    const { link } = field;
    const { fields: linkFields } = link;

    const { TyrSchema } = Tyr.collections;

    for (const fieldName in linkFields) {
      const lf = linkFields[fieldName];

      if (lf.link === TyrSchema) {
        query[lf.spath] = schema._id;
      } else if (lf.def.dynamicFieldName) {
        // determine the field name for this field, skip past arrays
        let f = field;
        while (f && f.name === '_') f = f.parent;
        query[lf.spath] = f.name;
      }
    }
  }
};

Collection.prototype.links = function(search) {
  search = search || {};

  const relate = search.relate;
  switch (relate) {
    case 'associate':
    case 'owns':
    case 'ownedBy':
    case undefined:
    case null:
      break;
    default:
      throw new Error(`Unknown links() relate option "${relate}"`);
  }

  function matchesRelate(field) {
    return !relate || field.relate === relate;
  }

  const direction = search.direction;
  switch (direction) {
    case 'incoming':
    case 'outgoing':
    case undefined:
    case null:
      break;
    default:
      throw new Error(`Unknown links() direction option "${direction}"`);
  }

  const links = [];

  if (!direction || direction === 'outgoing') {
    _.each(this.paths, field => {
      if (field.link && matchesRelate(field)) {
        links.push(field);
      }
    });
  }

  if (!direction || direction === 'incoming') {
    for (const col of Tyr.collections) {
      if (col !== this) {
        _.each(col.paths, field => {
          if (field.link === this && matchesRelate(field)) {
            links.push(field);
          }
        });
      }
    }
  }

  return links;
};

Collection.prototype.findReferences = async function(opts) {
  const thisCol = this,
    refs = [];

  let ids = opts.ids || opts.id;
  if (!Array.isArray(ids)) {
    ids = ids ? [ids] : [];
  }

  if (!ids.length) {
    return refs;
  }

  const fields = opts.idsOnly ? { _id: 1 } : undefined;

  let exclude = opts.exclude || [];
  if (!Array.isArray(exclude)) {
    exclude = [exclude];
  }

  const makeMatch = values => (values.length > 1 ? { $in: values } : values[0]);

  const idMatch = makeMatch(ids);
  let uidMatch;

  for (const col of Tyr.collections) {
    if (exclude.indexOf(col) >= 0) {
      continue;
    }

    const queries = [];

    _.each(col.paths, field => {
      if (field.link === this) {
        queries.push({ [field.spath]: idMatch });
      } else if (field.type.name === 'uid') {
        if (!uidMatch) {
          uidMatch = makeMatch(ids.map(id => thisCol.idToUid(id)));
        }

        queries.push({ [field.spath]: uidMatch });
      }
    });

    if (queries.length) {
      const query = queries.length > 1 ? { $or: queries } : queries[0];
      //console.log(col.name, '=', query);
      refs.push(...(await col.findAll({ query, projection: fields })));
    }
  }

  return refs;
};

Collection.prototype.removeReferences = async function(opts) {
  const thisCol = this;

  let ids = opts.ids || opts.id;
  if (!Array.isArray(ids)) {
    ids = ids ? [ids] : [];
  }

  if (!ids.length) return;

  let exclude = opts.exclude || [];
  if (!Array.isArray(exclude)) {
    exclude = [exclude];
  }

  const makeMatch = values => (values.length > 1 ? { $in: values } : values[0]);

  const idMatch = makeMatch(ids);
  let uids, uidMatch;

  for (const col of Tyr.collections) {
    if (exclude.indexOf(col) >= 0) {
      continue;
    }

    const removals = [];

    _.each(col.paths, field => {
      if (!field.parent) console.log('field has no parent', field.pathName);
      if (field.type.name === 'array' && field.of.link === this) {
        const { spath, path } = field;
        const arrayPath = path.replace(/_/g, '$');
        removals.push(
          col.db.updateMany(
            { [spath]: idMatch },
            ids.length > 1
              ? { $pullAll: { [arrayPath]: ids } }
              : { $pull: { [arrayPath]: ids[0] } }
          )
        );
      } else if (
        field.link === this &&
        (!field.parent.type || field.parent.type.name !== 'array')
      ) {
        const { spath } = field;
        removals.push(
          col.db.updateMany({ [spath]: idMatch }, { $unset: { [spath]: 1 } })
        );
      } else if (
        (field.type.name === 'array' && field.of.type.name === 'uid') ||
        field.type.name === 'uid'
      ) {
        if (!uids) {
          uids = ids.map(id => thisCol.idToUid(id));
          uidMatch = makeMatch(uids);
        }

        if (field.type.name === 'array') {
          const { spath, path } = field;
          const arrayPath = path.replace(/_/g, '$');
          removals.push(
            col.db.updateMany(
              { [spath]: uidMatch },
              ids.length > 1
                ? { $pullAll: { [arrayPath]: uids } }
                : { $pull: { [arrayPath]: uids[0] } }
            )
          );
        } else if (!field.parent.type || field.parent.type.name !== 'array') {
          const { spath } = field;
          removals.push(
            col.db.updateMany({ [spath]: uidMatch }, { $unset: { [spath]: 1 } })
          );
        }
      }
    });

    await Tyr.awaitAll(removals);
  }
};

export default LinkType;
