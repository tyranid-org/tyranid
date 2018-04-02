import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const templateTag = {
  name: 'Template tag syntax with computed properties should work',
  fn: async (t: TestContext) => {
    const orgId = 'organizationId';
    const gql = Tyr.graphql;

    const result = await gql`
      query userNameQuery {
        users {
          name
          ${orgId} {
            name
          }
        }
      }
    `;

    const expected = {
      data: {
        users: [
          {
            name: 'ben',
            organizationId: {
              name: 'Chipotle'
            }
          },
          {
            name: 'ted',
            organizationId: {
              name: 'Cava'
            }
          },
          {
            name: 'noTeams',
            organizationId: {
              name: 'Chipotle'
            }
          }
        ]
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
