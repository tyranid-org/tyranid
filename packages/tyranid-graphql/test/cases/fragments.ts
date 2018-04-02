import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const fragments = {
  name: 'Fragments should work',
  fn: async (t: TestContext) => {
    const query = `
      query userQuery {
        user(name: "ben") {
          ...userProps
        }
      }

      fragment userProps on user {
        name
        teamIds {
          name
        }
      }
    `;

    const result = await Tyr.graphql({ query });

    const expected = {
      data: {
        user: {
          name: 'ben',
          teamIds: [
            {
              name: 'burritoMakers'
            },
            {
              name: 'chipotleMarketing'
            }
          ]
        }
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
