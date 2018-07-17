import test from 'ava';
import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';
import { sanitize } from '../src';
import { createTestData } from './data';

test.before(async () => {
  const db = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/_tyranid_sanitize_test'
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
});

test('should successfully sanitize', async () => {
  await sanitize(Tyr);
});
