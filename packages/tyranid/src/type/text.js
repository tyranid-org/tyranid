import * as _ from 'lodash';

import Tyr from '../tyr';
import Type from '../core/type';

const TextType = new Type({
  name: 'text',
  typescript: 'string',

  compile(compiler, field) {
    if (compiler.stage === 'link') {
      const mediaType = field.def.in;
      if (mediaType) {
        if (!Tyr.byName.mediaType.byId(mediaType))
          throw compiler.err(
            field.pathName,
            `"in" must be a valid media type but got "${mediaType}"`
          );

        field.mediaType = mediaType;
      }
    }
  },

  compare(field, a, b) {
    switch (field.mediaType) {
      case 'text/html':
        return Tyr.unhtmlize(a).localeCompare(Tyr.unhtmlize(b), undefined, {
          sensitivity: 'base',
        });
      default:
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
    }
  },

  query(path, where, query) {
    if (where) {
      query[path.name] = _.isArray(where) ? { $in: where } : where;
    }
  },

  matches(path, where, doc) {
    if (where) {
      let value = path.get(doc);
      if (value) {
        if (!_.isString(value)) {
          value = '' + value;
        }

        if (_.isArray(where)) {
          return where.indexOf(value) >= 0;
        } else if (where instanceof RegExp) {
          return value.match(where);
        } else {
          return value === where;
        }
      }
    }

    return true;
  },

  width: 200,
});

export default TextType;
