import test from 'ava';
import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';
import { sanitize } from '../src';
import { createTestData } from './data';
import { User } from './models';

const dbName = '_tyranid_sanitize_test';
const sanitizedDB = `${dbName}___sanitized`;

test.before(async () => {
  const db = await mongodb.MongoClient.connect(
    `mongodb://127.0.0.1:27017/${dbName}`
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

test.serial('should successfully sanitize', () =>
  sanitize(Tyr, { outDbName: sanitizedDB })
);

test.serial('should error if sanitizing into same db', async t => {
  try {
    await sanitize(Tyr);
  } catch (err) {
    return t.pass();
  }
  t.fail();
});

test.serial('documents should be sanitized', async t => {
  const sanitizedUsers = await Tyr.db
    .db(sanitizedDB)
    .collection('users')
    .find()
    .toArray();
  await Promise.all(
    sanitizedUsers.map(async user => {
      const { _id, name, organizationId } = user;
      const tyrUser = await User.byId(_id);
      if (!tyrUser) return t.fail();
      t.is(_id.toString(), tyrUser.$id.toString());
      t.is(
        organizationId.toString(),
        (tyrUser as any).organizationId.toString()
      );
      t.not(name, (tyrUser as any).name);
    })
  );
});
