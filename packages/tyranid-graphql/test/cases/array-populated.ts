import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const arrayPopulated = {
  name: 'Array of linked properties should populate',
  fn: async (t: TestContext) => {
    const query = `
      query userNameQuery {
        users {
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
        users: [
          {
            name: 'ben',
            teamIds: [
              {
                name: 'burritoMakers',
                organizationId: {
                  name: 'Chipotle'
                }
              },
              {
                name: 'chipotleMarketing',
                organizationId: {
                  name: 'Chipotle'
                }
              }
            ]
          },
          {
            name: 'ted',
            teamIds: [
              {
                name: 'cavaEngineers',
                organizationId: {
                  name: 'Cava'
                }
              }
            ]
          },
          {
            name: 'noTeams',
            teamIds: []
          }
        ]
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
