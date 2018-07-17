import Tyr from '../../src/tyranid';

import './job';

const { Job } = Tyr.collections;

export const Application = new Tyr.Collection({
  id: 'a00',
  name: 'application',
  fields: {
    _id: { is: 'integer' },
    job: { link: 'job' },
    languages: {
      is: 'string',
      if: { job: { $in: [Job.SOFTWARE_ENGINEER._id, Job.SOFTWARE_LEAD._id] } }
    }
  }
});
