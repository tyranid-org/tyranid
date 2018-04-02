import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';
import test from 'ava';

import { graphqlize } from '../src';
import { createTestData } from './data';

import * as cases from './cases/';

test.before(async () => {
  const db = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/_tyranid_graphql_test'
  );

  Tyr.config({
    db: db,
    validate: [
      {
        dir: __dirname,
        fileMatch: 'models.js'
      }
    ]
  });

  await createTestData();
  graphqlize(Tyr);
});

type AvaTest = { name: string; fn: (...args: any[]) => Promise<any> };

for (const caseName in cases) {
  const params = ((cases as any) as {
    [key: string]: AvaTest;
  })[caseName];
  test(params.name, params.fn);
}
