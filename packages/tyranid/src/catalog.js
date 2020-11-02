import Tyr from './tyr';

Tyr.catalog = {
  get FindOpts() {
    return {
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
    };
  },
};
