import * as chai from 'chai';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

const { expect, assert } = chai;

export function add() {
  describe('function.js', () => {
    it('should support paths()', () => {
      const tests = [
        {
          fn(this: { foo: string }) {
            return this.foo;
          },
          paths: ['foo'],
        },
        {
          fn(this: { foo: string; bar: number }) {
            return this.foo + '--' + this.bar;
          },
          paths: ['foo', 'bar'],
        },
        {
          fn(this: { foo: { cat: number }; bar: number }) {
            return this.foo.cat + '--' + this.bar;
          },
          paths: ['foo.cat', 'bar'],
        },
        {
          fn(this: { foo: { cat: number }; bar: number }) {
            return this.foo.cat + '--' + this.bar;
          },
          paths: ['foo.cat', 'bar'],
        },
        {
          fn(this: { postalCode: string }) {
            return this.postalCode && this.postalCode.length
              ? this.postalCode.replace(/\s/g, '')
              : '';
          },
          paths: ['postalCode'],
        },
      ];

      for (const test of tests) {
        expect(Tyr.functions.paths(test.fn)).to.eql(test.paths);
      }
    });
  });
}
