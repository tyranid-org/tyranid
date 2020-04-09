import test from 'ava';
import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';

import { graphqlize } from '../src';
import { createTestData } from './data';

import * as cases from './cases/';

test.before(async () => {
  const mongoClient = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/_tyranid_graphql_test',
    { useNewUrlParser: true }
  );

  Tyr.config({
    mongoClient,
    db: mongoClient.db(),
    validate: [
      {
        dir: __dirname,
        fileMatch: 'models.js',
      },
    ],
  });

  await createTestData();
  graphqlize(Tyr);
});

interface AvaTest {
  name: string;
  fn: (...args: any[]) => Promise<any>;
}

for (const caseName in cases) {
  const params = ((cases as any) as {
    [key: string]: AvaTest;
  })[caseName];
  test(params.name, params.fn);
}
