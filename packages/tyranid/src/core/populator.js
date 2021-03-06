import * as _ from 'lodash';

import Tyr from '../tyr';
import * as historical from '../historical/historical';

const { $all, $label } = Tyr;

class Cache {
  constructor(colId) {
    this.colId = colId;
    this.col = Tyr.byId[colId];

    this.fields = {};

    /**
     * values maps ids to:
     *
     *   undefined:  this id has not been requested yet
     *   null:       this id has been requested but we don't have a doc for it yet
     *   document:   this id has been requested and we have a doc for it
     */
    this.values = {};
  }

  project(projection) {
    const fields = this.fields;

    for (const p of projection) {
      if (p === $all || p === $label) {
        fields[p] = 1;
      } else {
        const pathName = p.path.spath,
          existing = fields[pathName],
          target = (p.projection && 1) || 0;

        if (target || !existing) {
          if (!target && pathName === '_id') {
            throw new Error('_id is required on populated objects');
          }

          fields[pathName] = target;
        }
      }
    }
  }
}

export default class Populator {
  constructor(denormal, opts) {
    this.denormal = denormal;
    this.opts = opts || {};
    this.cachesByColId = {};
  }

  cacheFor(colId) {
    let cache = this.cachesByColId[colId];

    if (!cache) {
      this.cachesByColId[colId] = cache = new Cache(colId);
    }

    return cache;
  }

  addIds(population, documents) {
    const path = population.path;
    const link = path.detail.link;

    if (!link) {
      throw new Error('Cannot populate ' + path + ' -- it is not a link');
    }

    const linkId = link.id,
      cache = this.cacheFor(linkId);

    for (const doc of documents) {
      for (const id of path.uniq(doc)) {
        if (id) {
          const v = cache.values[id];
          if (v === undefined) {
            cache.values[id] = null;
          }
        }
      }
    }
  }

  async queryMissingIds() {
    const asOf = this.opts.asOf;

    return await Promise.all(
      _.map(this.cachesByColId, async (cache, colId) => {
        const collection = Tyr.byId[colId],
          primaryKeyField = collection.def.primaryKey.field,
          idType = collection.fields[primaryKeyField].type;

        const ids = [];
        const { values } = cache;
        for (const k in values) {
          if (values[k] === null) {
            // TODO:  once we can use ES6 Maps we can get rid of
            // this string conversion -- due to keys having to be
            // strings on regular objects
            ids.push(idType.fromString(k));
          }
        }

        if (!ids.length) return;

        const opts = {};
        let fields = cache.fields;

        if (fields && !fields.$all && !_.isEmpty(fields)) {
          opts.projection = fields;
        } else {
          fields = fields.$label ? collection.labelProjection() : undefined;
        }

        const linkDocs = await collection.byIds(ids, opts),
          isHistorical = collection.def.historical;

        await Promise.all(
          linkDocs.map(async doc => {
            if (asOf && isHistorical) {
              await historical.asOf(collection, doc, asOf, fields);
            }

            cache.values[doc[primaryKeyField]] = doc;
          })
        );
      })
    );
  }
}
