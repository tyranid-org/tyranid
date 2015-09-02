import _ from 'lodash';
import NamePath from './NamePath';
import { collectionsById, $all } from '../common';


export default class Population {


  constructor(namePath, projection) {
    if (!(namePath instanceof NamePath)) {
      throw new Error('parameter namePath is not an instanceof NamePath, got: ' + namePath);
    }

    this.namePath = namePath;
    this.projection = projection;
  }


  static parse(rootCollection, fields) {
    if (_.isString(fields)) {
      // process the really simple format -- a simple path name
      fields = [ fields ];
    }

    if (Array.isArray(fields)) {
      // process simplified array of pathnames format
      return new Population(
        new NamePath(rootCollection, ''),
        fields.map(function(field) {
          if (!_.isString(field)) {
            throw new Error('The simplified array format must contain an array of strings that contain pathnames.  Use the object format for more advanced queries.');
          }

          return new Population( new NamePath(rootCollection, field), [ $all ] );
        })
      );
    }

    if (_.isObject(fields)) {
      // process advanced object format which supports nested populations and projections

      const parseProjection = function(collection, fields) {
        const projection = [];

        _.each(fields, function(value, key) {
          if (key === $all) {
            projection.push($all);
          } else {
            const namePath = new NamePath(collection, key);

            if (value === 0 || value === false) {
              projection.push(new Population(namePath, false));
            } else if (value === 1 || value === true) {
              projection.push(new Population(namePath, true));
            } else {
              const link = namePath.tailDef().link;

              if (!link) {
                throw new Error('Cannot populate ' + collection.def.name + '.' + namePath + ' -- it is not a link');
              }

              if (value === $all) {
                projection.push(new Population(namePath, $all));
              } else if (!_.isObject(value)) {
                throw new Error('Invalid populate syntax at ' + collection.def.name + '.' + namePath + ': ' + value);
              } else {
                projection.push(new Population(namePath, parseProjection(collectionsById[link.id], value)));
              }
            }
          }
        });

        return projection;
      };

      return new Population(new NamePath(rootCollection, ''), parseProjection(rootCollection, fields));
    }

    throw new Error('missing opts.fields option to populate()');
  }

  isSimple() {
    return _.isBoolean(this.projection);
  }

  hasNestedPopulations() {
    const proj = this.projection;
    if (Array.isArray(proj)) {
      return this.projection.some(pop => pop instanceof Population);
    } else {
      return false;
    }
  }


  /*
   * TODO:  should we mark populated values as enumerable: false ?
   */
  async populate(populator, documents) {
    const population = this;

    population.projection.forEach(function(population) {
      if (population instanceof Population && !population.isSimple()) {
        populator.addIds(population, documents);
      }
    });

    // TODO:  PROJECTION-
    //        need to look at the projection and figure out some way to tell queryMissingIds which fields to query
    //        it should also do some sort of superset analysis across the population tree
    //        (i.e. if one population on org needs name and another needs permissions, we need to query name + permissions

    // wait for population of missing ids
    await populator.queryMissingIds();

    // create function to map projection
    const populateIds = population => {

      if (!(population instanceof Population) || population.isSimple()) {
        return;
      }

      let nestedDocs;
      if (population.hasNestedPopulations()) {
        nestedDocs = [];
      }

      const namePath = population.namePath;
      documents.forEach(function(obj) {
        const cache = populator.cacheFor(namePath.tailDef().link.id),
              path  = namePath.path,
              plen  = path.length;

        function mapIdsToObjects(obj) {
          if (Array.isArray(obj)) {
            const arr = new Array(obj.length);

            for (let ai=0, alen=obj.length; ai<alen; ai++ ) {
              arr[ai] = mapIdsToObjects(obj[ai]);
            }

            return arr;
          } else if (_.isObject(obj) && !(obj instanceof ObjectId)) {
            throw new Error('Got object when expected a link value');
          } else if (!obj) {
            return obj;
          } else {
            obj = cache[obj.toString()];
            if (nestedDocs) {
              nestedDocs.push(obj);
            }
            return obj;
          }
        }

        function walkToEndOfPath(pi, obj) {
          const name = path[pi];

          if (Array.isArray(obj)) {
            for (let ai=0, alen=obj.length; ai<alen; ai++ ){
              walkToEndOfPath(pi, obj[ai]);
            }
          } else if (obj === undefined || obj === null) {
            return;
          } else if (pi === plen - 1) {
            const pname = NamePath.populateNameFor(name, populator.denormal);
            obj[pname] = mapIdsToObjects(obj[name]);
          } else if (!_.isObject(obj)) {
            throw new Error('Expected an object or array at ' + namePath.pathName(pi) + ', but got ' + obj);
          } else {
            walkToEndOfPath(pi+1, obj[path[pi]]);
          }
        }

        walkToEndOfPath(0, obj);
      });

      if (nestedDocs) {
        return population.populate(populator, nestedDocs);
      } else {
        return Promise.resolve();
      }
    }

    // wait for resolution of all
    return await* population.projection.map(populateIds);
  }

}
