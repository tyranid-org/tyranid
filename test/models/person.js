'use strict';

var tyr = require('../../tyranid');

var Person = new tyr.Collection({
  id: 't03',
  name: 'person',
  fields: {
    _id: { is: 'integer' },

    name: {
      is: 'object',
      fields: {
        first: { is: 'string', as: 'First Name' },
        last:  { is: 'string', as: 'Last Name'  }
      }
    },

    birthDate: { is: 'date' },
    job:       { 'link' : 'job' },

    siblings: {
      is: 'array',
      of: {
        is: 'object',
        fields: {
          name: { is: 'string' }
        }
      }
    },

    title: { is: 'string' },
    organization: { link: 'organization' },
    department: { link: 'department' },
    homepage: { is: 'url' }
  }
});

module.exports = Person;

