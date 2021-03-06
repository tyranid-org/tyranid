import test from 'ava';
import * as mongodb from 'mongodb';
import { Tyr } from 'tyranid';
import { createTestData } from './data';
import { User } from './models';

const dbName = '_tyranid_sanitize_test';
const sanitizedDB = `${dbName}___sanitized`;

test.before(async () => {
  const mongoClient = await mongodb.MongoClient.connect(
    `mongodb://127.0.0.1:27017/${dbName}`,
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
});

// drop test db
test.after(async () => {
  await Tyr.mongoClient.db(sanitizedDB).dropDatabase();
});

test.serial('should successfully sanitize', () =>
  Tyr.sanitize({ outDbName: sanitizedDB })
);

test.serial('should error if sanitizing into same db', async t => {
  try {
    await Tyr.sanitize({ outDbName: sanitizedDB });
  } catch (err) {
    return t.pass();
  }
  t.fail();
});

test.serial('documents should be sanitized', async t => {
  const sanitizedUsers = await Tyr.mongoClient
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
