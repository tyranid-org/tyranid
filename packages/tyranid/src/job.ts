import * as cp from 'child_process';

import type { Tyr as TyrType } from 'tyranid';

import 'tyranid/builtin/server';

import _Tyr from './tyr';

import Collection from './core/collection';

import * as _ from 'lodash';

const Tyr: any = _Tyr;

export const Job = new ((Collection as unknown) as TyrType.CollectionStatic)({
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

    canceled: { is: 'boolean' },

    exception: { is: 'text' },
  },
  indexes: [
    {
      key: {
        startAt: 1,
        queuedAt: 1,
      },
    },
  ],
}) as TyrType.TyrJobCollection;

export const submitJob = async <D extends TyrType.Document>(
  collection: TyrType.CollectionInstance<D>,
  methodName: string,
  parameters: any[],
  user: TyrType.Document
) => {
  //const method = collection.def.service![methodName];

  await Job.db.insertOne({
    collection: collection.id,
    service: methodName,
    parameters: JSON.stringify(parameters),
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
      const {
        _id: jobId,
        collection: collectionId,
        service: methodName,
        parameters,
        //user,
      } = value;

      const collection = Tyr.byId[collectionId];
      const args = JSON.parse(parameters);

      jobdb.updateOne({ _id: value._id }, { $set: { startAt: new Date() } });
      await (collection as any).service[methodName].apply(
        {
          source: 'job',
          user: undefined, // TODO:  figure out some way to pass in the user ?
          req: undefined,
          collection,
          job: jobId,
          async isCanceled() {
            const v = await jobdb.findOne(
              { _id: jobId },
              { fields: { canceled: 1 } }
            );

            return !!v?.canceled;
          },
        },
        args
      );
      jobdb.updateOne({ _id: value._id }, { $set: { endAt: new Date() } });
    } catch (err) {
      console.log(err);
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

export const isJobWorker = (Tyr.isJobWorker = () =>
  process.env.TYR_SERVER_ROLE === 'job');

export const handleJobWorker = (Tyr.handleJobWorker = async () => {
  if (isJobWorker()) {
    await processJobs();
    return true;
  }

  return false;
});

export const spawnJobWorker = (Tyr.spawnJobWorker = () => {
  process.execArgv = _.without(process.execArgv, '--inspect');
  /*const worker = */ cp.fork(process.argv[1], undefined, {
    env: { ...process.env, TYR_SERVER_ROLE: 'job' },
  });

  // TODO:  what, if anything, do we need to do with this worker?
});
