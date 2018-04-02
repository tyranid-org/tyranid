import * as bodyParser from 'body-parser';
import * as express from 'express';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';
import { createGraphQLSchema } from '../../src/';
import { createTestData } from '../data';

(async () => {
  const db = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/tyranid_gracl_test'
  );

  Tyr.config({
    db,
    validate: [
      {
        dir: __dirname,
        fileMatch: 'models.js'
      }
    ]
  });

  await createTestData();

  const GRAPHQL_PORT = 8080;

  const graphQLServer = express();

  graphQLServer.use(
    '/graphql',
    bodyParser.json(),
    graphqlExpress({
      schema: createGraphQLSchema(Tyr)
    })
  );

  graphQLServer.use(
    '/graphiql',
    graphiqlExpress({
      endpointURL: '/graphql'
    })
  );

  /* tslint:disable no-console */
  graphQLServer.listen(GRAPHQL_PORT, () =>
    console.log(
      `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphiql`
    )
  );
})().catch(err => console.log(err.stack)); /* tslint:enable no-console */
