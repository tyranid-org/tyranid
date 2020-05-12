import * as _ from 'lodash';

import Tyr from '../tyr';
import Path from './path';
import { ObjectId } from 'mongodb';
import { resolveProjection } from './projection';

const { $all, $label } = Tyr;

export class Population {
  constructor(path, projection) {
    if (!(path instanceof Path)) {
      throw new Error('parameter path is not an instanceof Path, got: ' + path);
    }

    this.path = path;
    this.projection = projection;
  }

  static parse(populator, base, projection) {
    const rootCollection = base; // TODO:  need to eliminate this
    let path;

    if (base instanceof Path) {
      path = base;
    } else {
      path = base.parsePath('');
    }

    // TODO:  deprecate the old string and array population options so we can do:
    //if (true && base instanceof Tyr.Collection) {
    //  projection = resolveProjection(base.def.projections, value);
    //} else {
    // Step 2 would be to eliminate the separate "population" option and just have "projection" perform combined projection/population duties
    if (_.isString(projection)) {
      // process the really simple format -- a simple path name
      projection = [projection];
    }

    if (Array.isArray(projection)) {
      // process simplified array of pathnames format
      return new Population(
        path,
        projection.map(function (field) {
          if (!_.isString(field)) {
            throw new Error(
              'The simplified array format must contain an array of strings that contain pathnames.  Use the object format for more advanced queries.'
            );
          }

          return new Population(base.parsePath(field), [$all]);
        })
      );
    }
    //}

    if (_.isObject(projection)) {
      // process advanced object format which supports nested populations and projections

      const parseProjection = function (base, fields) {
        const projection = [];

        for (const key in fields) {
          let value = fields[key];
          if (key === $all || key === $label) {
            projection.push(key);
          } else {
            const path = base.parsePath(key);

            if (value === 0 || value === false) {
              projection.push(new Population(path, false));
            } else if (value === 1 || value === true) {
              projection.push(new Population(path, true));
            } else {
              const link = path.detail.link;

              if (!link) {
                throw new Error(
                  'Cannot populate ' +
                    base.toString() +
                    '.' +
                    path +
                    ' -- it is not a link'
                );
              }

              if (value === $all || value === $label) {
                projection.push(new Population(path, value));
              } else {
                const linkCol = Tyr.byId[link.id];

                value = resolveProjection(linkCol.def.projections, value);

                if (!_.isObject(value)) {
                  throw new Error(
                    'Invalid populate syntax at ' +
                      base.toString() +
                      '.' +
                      path +
                      ': ' +
                      value
                  );
                }

                projection.push(
                  new Population(path, parseProjection(linkCol, value))
                );
              }
            }
          }
        }

        if (base instanceof Tyr.Collection) {
          populator.cacheFor(base.id).project(projection);
        }

        return projection;
      };

      return new Population(
        base.parsePath(''),
        parseProjection(rootCollection, projection)
      );
    }

    throw new Error('missing opts.projection option to populate()');
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

    for (const p of population.projection) {
      if (p instanceof Population && !p.isSimple()) {
        populator.addIds(p, documents);
      }
    }

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

      const path = population.path;
      for (const obj of documents) {
        const cache = populator.cacheFor(path.detail.link.id),
          pathNames = path.path,
          plen = pathNames.length;

        function mapIdsToObjects(obj) {
          if (Array.isArray(obj)) {
            const arr = new Array(obj.length);

            for (let ai = 0, alen = obj.length; ai < alen; ai++) {
              arr[ai] = mapIdsToObjects(obj[ai]);
            }

            return arr;
          } else if (_.isObject(obj) && !ObjectId.isValid(obj.toString())) {
            throw new Error('Got object when expected a link value');
          } else if (!obj) {
            return obj;
          } else {
            obj = cache.values[obj.toString()];
            if (nestedDocs) {
              nestedDocs.push(obj);
            }
            return obj;
          }
        }

        function walkToEndOfPath(pi, obj) {
          const name = pathNames[pi];

          if (Array.isArray(obj)) {
            for (let ai = 0, alen = obj.length; ai < alen; ai++) {
              walkToEndOfPath(pi, obj[ai]);
            }
          } else if (obj === undefined || obj === null) {
            return;
          } else if (pi === plen - 1) {
            const pname = Path.populateNameFor(name, populator.denormal);
            obj[pname] = mapIdsToObjects(obj[name]);
          } else if (!_.isObject(obj)) {
            throw new Error(
              'Expected an object or array at ' +
                path.pathName(pi) +
                ', but got ' +
                obj
            );
          } else {
            walkToEndOfPath(pi + 1, obj[pathNames[pi]]);
          }
        }

        walkToEndOfPath(0, obj);
      }

      if (nestedDocs) {
        return population.populate(populator, nestedDocs);
      } else {
        return Promise.resolve();
      }
    };

    // wait for resolution of all
    return await Promise.all(population.projection.map(populateIds));
  }

  static fromClient(population) {
    for (const k in population) {
      const v = population[k];

      if (_.isObject(v)) {
        population[k] = Population.fromClient(v);
      } else {
        const i = parseInt(v, 10);
        if (!isNaN(i)) {
          population[k] = i;
        }
      }
    }

    return population;
  }
}

/** @isomorphic */
export function visitPopulations(metadata, obj, visitor) {
  if (!obj) return;

  const { fields } = metadata;
  if (fields) {
    for (const fieldName in fields) {
      const field = fields[fieldName];

      // TODO:  this doesn't handle UIDs
      switch (field.type.name) {
        case 'link':
          const pv = obj[field.populateName];
          if (pv) visitor(field, pv);
          break;
        case 'array':
          const { of } = field;
          switch (of.type.name) {
            case 'link':
              const pv = obj[field.populateName];
              if (pv) {
                for (const apv of pv) {
                  if (apv) visitor(field, apv);
                }
              }
              break;
            case 'object':
              const v = obj[fieldName];
              if (v) {
                for (const av of v) {
                  visitPopulations(of, av, visitor);
                }
              }
              break;
            case 'array':
              // TODO
              break;
          }
          break;
        case 'object':
          const v = obj[fieldName];
          if (v) visitPopulations(field, v, visitor);
          break;
      }
    }
  }
}
