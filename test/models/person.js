'use strict';

var tyr = require('../../tyranid');

var Person = new tyr.Collection({
  id: 't03',
  name: 'person',
  fields: {
    _id: { is: 'integer' },

    name: {
      is: 'object',
      required: true,
      fields: {
        first: { is: 'string', as: 'First Name', required: true },
        last:  { is: 'string', as: 'Last Name'  }
      }
    },

    birthDate: { is: 'date' },
    job:       { 'link' : 'job' },
    age:       { is: 'integer' },

    siblings: {
      is: 'array',
      of: {
        is: 'object',
        fields: {
          name: { is: 'string' }
        }
      }
    },

    title: { is: 'string', defaultValue: 'Employee' },
    organization: { link: 'organization' },
    department: { link: 'department' },
    homepage: { is: 'url' },
    goldStars: { is: 'integer', defaultValue: 0 }
  }
});

module.exports = Person;

