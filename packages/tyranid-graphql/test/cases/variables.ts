import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const variables = {
  name: 'Using a query function with variables should succeed',
  fn: async (t: TestContext) => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    if (!ted) {
      throw new Error(`No ted`);
    }

    const query = `
      query getUserById($id: [ID]) {
        user(_id: $id) {
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

    const result = await Tyr.graphql({
      query,
      variables: {
        id: [ted.$id]
      }
    });

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
