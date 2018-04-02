import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const enumCollection = {
  name: 'populating an enum collection should succeed',
  fn: async (t: TestContext) => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    if (!ted) {
      throw new Error(`No ted found`);
    }

    const query = `
      query getUserById($id: [ID]) {
        user(_id: $id) {
          status {
            name
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
          status: {
            name: 'Active'
          }
        }
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
