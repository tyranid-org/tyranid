import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const parameters = {
  name: 'Filtering by id parameter should work',
  fn: async (t: TestContext) => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    if (!ted) {
      throw new Error(`no ted`);
    }

    const query = `
      query userNameQuery {
        user(_id: ["${ted.$id}"]) {
          name
          teamIds {
            name,
            organizationId {
              name
            }
          }
        }
      }
    `;

    const result = await Tyr.graphql({ query });

    const expected = {
      data: {
        user: {
          name: 'ted',
          teamIds: [
            {
              name: 'cavaEngineers',
              organizationId: {
                name: 'Cava'
              }
            }
          ]
        }
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
