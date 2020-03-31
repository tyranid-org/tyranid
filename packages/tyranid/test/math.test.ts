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
          [0, 'I'],
          [2, 'III'],
          [3, 'IV'],
          [4, 'V'],
          [9, 'X'],
          [20, 'XXI'],
          [93, 'XCIV'],
          [883, 'DCCCLXXXIV'],
          [9883, 'MↂDCCCLXXXIV']
        ];

        for (const test of tests) {
          expect(Tyr.numberize('roman', test[0])).to.eql(test[1]);
        }
      });
    });
  });
}
