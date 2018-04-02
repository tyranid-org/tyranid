import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const computedPropertyProjection = {
  name: 'Query of doc with computed property should ignore projection',
  fn: async (t: TestContext) => {
    const query = `
      query userNameQuery {
        users(name: "ben") {
          computed
        }
      }
    `;

    const result = await Tyr.graphql({ query });

    const expected = {
      data: {
        users: [
          {
            computed: 'Hello ben from a computed property!'
          }
        ]
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
