
const _ = require('lodash'); // client-side
import { ObjectId } from 'mongodb';

import Tyr        from '../tyr';
import Type       from '../core/type';
import Collection from '../core/collection';


const LinkType = new Type({
  name: 'link',

  compile(compiler, field) {
    const relate = field.def.relate;

    switch (relate) {
    case undefined:
    case 'associate':
    case 'owns':
    case 'ownedBy':
      field.relate = relate || 'associate';
      break;
    default:
      throw compiler.err(field.path, '"relate" must be one of "associate", "owns", or "ownedBy" if present');
    }
  },

  fromClient(field, value) {
    const link = field.link,
          linkField = link.fields[field.link.def.primaryKey.field];

    try {
      return linkField.type.def.fromClient(linkField, value);
    } catch (err) {
      if (_.isString(value) && link.isStatic() && link.labelField) {
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
    return value ? (ObjectId.isValid(value.toString()) ? value.toString() : value) : value;
  },

  format(field, value) {
    return field.link.idToLabel(value);
  }
});

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

Collection.prototype.references = async function(opts) {
  const thisCol = this,
        refs = [];

  let ids = opts.ids || opts.id;
  if (!Array.isArray(ids)) {
    ids = ids ? [ ids ] : [];
  }

  if (!ids.length) {
    return refs;
  }

  const fields = opts.idsOnly ? { _id: 1 } : undefined;

  let exclude = opts.exclude || [];
  if (!Array.isArray(exclude)) {
    exclude = [ exclude ];
  }

  const makeMatch = values => values.length > 1 ? { $in: values } : values[0];

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
      refs.push(...await col.findAll({ query, fields }));
    }
  }

  return refs;
};

export default LinkType;
