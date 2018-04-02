import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const subDocumentParameters = {
  name: 'Filtering by sub document parameter should work',
  fn: async (t: TestContext) => {
    const burritoMakers = await Tyr.byName.team.findOne({
      query: { name: 'burritoMakers' }
    });
    if (!burritoMakers) {
      throw new Error(`No burrito`);
    }

    const query = `
      query userNameQuery {
        users {
          name
          teamIds(_id: "${burritoMakers.$id}") {
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
              }
            ]
          },
          {
            name: 'ted',
            teamIds: []
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
