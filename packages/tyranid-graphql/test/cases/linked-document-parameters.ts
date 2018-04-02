import { TestContext } from 'ava';
import { ExecutionResult } from 'graphql';
import { Tyr } from 'tyranid';

export const linkedDocumentParameters = {
  name: 'Filtering by linked doc parameter should work',
  fn: async (t: TestContext) => {
    const burritoMakers = await Tyr.byName.team.findOne({
      query: { name: 'burritoMakers' }
    });
    if (!burritoMakers) {
      throw new Error(`No burrito`);
    }

    const query = `
      query userNameQuery {
        users(teamIds: ["${burritoMakers.$id}"]) {
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
          }
        ]
      }
    };

    t.deepEqual<ExecutionResult>(result, expected);
  }
};
