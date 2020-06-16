import * as chai from 'chai';

import { Tyr } from 'tyranid';

const { expect } = chai;

export function add() {
  describe('string.js', () => {
    it('should support support capitalize', async () => {
      for (const test of [
        ['cat', 'Cat'],
        ['latestProjection', 'LatestProjection'],
      ]) {
        expect(Tyr.capitalize(test[0])).to.eql(test[1]);
      }
    });

    it('should support support labelize', async () => {
      for (const test of [
        ['cat', 'Cat'],
        ['latestProjection', 'Latest Projection'],
      ]) {
        expect(Tyr.labelize(test[0])).to.eql(test[1]);
      }
    });

    it('should support support singularize', async () => {
      for (const test of [
        ['cats', 'cat'],
        ['quizzes', 'quiz'],
        ['industries', 'industry'],
      ]) {
        expect(Tyr.singularize(test[0])).to.eql(test[1]);
      }
    });

    it('should support support pluralize', async () => {
      for (const test of [
        ['cat', 'cats'],
        ['quiz', 'quizzes'],
      ]) {
        expect(Tyr.pluralize(test[0])).to.eql(test[1]);
      }
    });

    it('should support support unhtmlize', async () => {
      for (const test of [
        ['cat', 'cat'],
        ['<a>quiz</a>', 'quiz'],
      ]) {
        expect(Tyr.unhtmlize(test[0])).to.eql(test[1]);
      }
    });
  });
}
