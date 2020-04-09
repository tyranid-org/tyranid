import Tyr from './tyr';

Tyr.catalog = {
  FindOpts: Object.freeze({
    is: 'object',
    fields: {
      query: {
        is: 'query',
      },
      skip: {
        is: 'integer',
      },
      limit: {
        is: 'integer',
      },
      sort: {
        is: 'object',
        keys: 'string',
        of: 'integer',
      },
      count: {
        is: 'boolean',
      },
    },
  }),
};
