import * as _ from 'lodash';

import Tyr from '../tyr';
import Type from '../core/type';

import { compileRelate } from './link';

const MAX_BITS = Math.log2(Number.MAX_SAFE_INTEGER); // usually 53

const BitmaskType = new Type({
  name: 'bitmask',

  typescript: 'number',

  compile(compiler, field) {
    compileRelate(compiler, field);

    const { link, inverse } = field;
    if (!link)
      throw compiler.err(field.path, `bitmask value missing link field`);

    if (link.fields._id.type.name !== 'integer')
      throw compiler.err(
        field.path,
        `bitmask fields must link to collections that have an integer key type field`
      );

    if (!link.isStatic())
      throw compiler.err(
        field.path,
        `bitmask fields must link to static collections`
      );

    const { values } = link;
    if (values) {
      if (values.length > MAX_BITS)
        throw compiler.err(
          field.path,
          `bitmask fields must link to static collections with ${MAX_BITS} or less entries`
        );

      for (const value of values) {
        const id = value.$id;

        if (id < 1 || id > MAX_BITS)
          throw compiler.err(
            field.path,
            `bitmask fields must link to static collections with IDs that are between 1 and ${MAX_BITS}`
          );
      }

      for (let i = 0; i < values.length; i++) {
        const id = values[i].$id;

        if (id !== i + 1)
          throw compiler.err(
            field.path,
            `bitmask fields must link to static collections with IDs that are increasing from 1 up to a maximum of ${MAX_BITS};\n` +
              `the ${Tyr.ordinalize(i + 1)} value did not equal ${i + 1}.`
          );
      }
    }

    if (inverse !== undefined && inverse !== true && inverse !== false) {
      throw compiler.err(
        field.path,
        `bitmask inverse value must be undefined, true, or false -- found: ${inverse}`
      );
    }
  },

  fromClient(field, value) {
    if (typeof value === 'string') {
      if (!value.length) {
        return undefined;
      }

      const v = parseInt(value, 10);

      if (v.toString() !== value) {
        throw new Error(
          `Invalid integer bitmask on field ${field.name}: ${value}`
        );
      }

      return v;
    } else {
      return value;
    }
  },

  format(field, value) {
    const { link, inverse } = field;
    const { values } = link.def;

    if (inverse) value = ~value;

    let str = '';
    for (let i = 0; i < values.length; i++) {
      if (value & (1 << i)) {
        if (str) str += ', ';
        str += field.link.idToLabel(i + 1);
      }
    }

    return str;
  }
});

export default BitmaskType;
