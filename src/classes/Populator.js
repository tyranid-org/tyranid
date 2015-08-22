import _ from 'lodash';

import {
  collections     ,
  collectionsById ,
  typesByName     ,
  $all            ,
  metaRegex
} from '../common.js';


export default class Populator {

  constructor(denormal) {
    this.denormal = denormal;
    this.cachesByColId = {};
  }

  /**
   * cache maps ids to:
   *
   *   undefined:  this id has not been requested yet
   *   null:       this id has been requested but we don't have a doc for it yet
   *   document:   this id has been requested and we have a doc for it
   */
  cacheFor(colId) {
    let cache = this.cachesByColId[colId];

    if (!cache) {
      this.cachesByColId[colId] = cache = {};
    }

    return cache;
  }

  addIds(population, documents) {
    let namePath = population.namePath;
    let link = namePath.tailDef().link;

    if (!link) {
      throw new Error('Cannot populate ' + namePath + ' -- it is not a link');
    }

    let linkId = link.id,
        cache = this.cacheFor(linkId);

    documents.forEach(function(doc) {
      _.each(namePath.getUniq(doc), function(id) {
        if (id) {
          let v = cache[id];
          if (v === undefined) {
            cache[id] = null;
          }
        }
      });
    });
  }

  async queryMissingIds() {

    return await* _.map(this.cachesByColId, async(cache, colId) => {
      let collection = collectionsById[colId],
          idType = collection.def.fields._id.is;

      let ids = [];
      _.each(cache, (v, k) => {
        if (v === null) {
          // TODO:  once we can use ES6 Maps we can get rid of
          // this string conversion -- due to keys having to be
          // strings on regular objects
          ids.push(idType.fromString(k));
        }
      });

      if (!ids.length) return;

      let linkDocs = await collection.find({ _id: { $in: ids }});

      linkDocs.forEach(doc => {
        cache[doc._id] = doc;
      });

    });

  }

}
