import { Tyr } from 'tyranid';

import 'tyranid/builtin/server';

import Collection from './core/collection';

export const Job = new ((Collection as unknown) as Tyr.CollectionStatic)({
  id: '_j0',
  name: 'tyrJob',
  internal: true,
  fields: {
    _id: { is: 'mongoid' },

    collection: { is: 'string' }, // this is the collection id, i.e. t01
    service: { is: 'string' },
    parameters: {
      is: 'string',
      note: 'This has a stringified version of the parameters',
    },

    user: { link: 'user?' },

    queuedAt: { is: 'datetime' },
    startAt: { is: 'datetime' },
    endAt: { is: 'datetime' },

    exception: { is: 'string' },
  },
  indexes: [
    {
      key: {
        startAt: 1,
        queuedAt: 1,
      },
    },
  ],
}) as Tyr.TyrJobCollection;

export const submitJob = async <D extends Tyr.Document>(
  collection: Tyr.CollectionInstance<D>,
  methodName: string,
  user: Tyr.Document
) => {
  const method = collection.def.service![methodName];

  await Job.db.insertOne({
    collection: collection.id,
    service: methodName,
    parameters: 'TODO',
    user: user?.$id,
    queuedAt: new Date(),
  });
};

export const processJob = async () => {
  const jobdb = Job.db;

  const rslt = await jobdb.findOneAndUpdate(
    { startAt: null },
    { $set: { startAt: new Date() } },
    { sort: { queuedAt: 1 } }
  );

  const { value } = rslt;
  if (value) {
    try {
      const { collection: collectionId, methodName, parameters, user } = value;

      const collection = Tyr.byId[collectionId];

      const args = JSON.parse(parameters);

      jobdb.updateOne({ _id: value._id }, { $set: { startAt: new Date() } });
      await (collection as any).service[methodName].apply(
        {
          source: 'job',
          user: undefined, // TODO:  figure out some way to pass in the user ?
          req: undefined,
          collection,
        },
        args
      );
      jobdb.updateOne({ _id: value._id }, { $set: { endAt: new Date() } });
    } catch (err) {
      jobdb.updateOne(
        { _id: value._id },
        { $set: { endAt: new Date(), exception: JSON.stringify(err) } }
      );
    }

    return true;
  }

  return false;
};

export const processJobs = async () => {
  let waitMs = 1000;

  for (;;) {
    if (!(await processJob())) {
      await Tyr.sleep(waitMs);
      waitMs *= 2;
      if (waitMs > 30000) waitMs = 30000;
    } else {
      waitMs = 1000;
    }
  }
};
