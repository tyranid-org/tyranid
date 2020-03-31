import * as chai from 'chai';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

const { ObjectId } = mongodb;

const { expect } = chai;

export function add() {
  describe('math/', () => {
    describe('roman numerals', () => {
      it('should generate roman numerals', () => {
        const tests: [number, string][] = [
          [0, ''],
          [2, 'II'],
          [4, 'IV'],
          [5, 'V'],
          [10, 'X'],
          [21, 'XXI'],
          [94, 'XCIV'],
          [884, 'DCCCLXXXIV'],
          [9884, 'MↂDCCCLXXXIV']
        ];

        for (const test of tests) {
          expect(Tyr.numberize('roman', test[0])).to.eql(test[1]);
        }
      });
    });
  });
}
