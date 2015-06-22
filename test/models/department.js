'use strict';

var tyr = require('../../tyranid');

var Department = new tyr.Collection({
  id: 't05',
  name: 'department',
  fields: {
    _id:         { is: 'integer' },
    name:        { is: 'string' },
    tags:        { is: 'array', of: 'string' },
    creator:     { link: 'person' },
    head:        { link: 'person' },
    permissions: { is: 'object', fields: {
      members:   { is: 'array', of: { link: 'person' } }
    }},
  }
});

module.exports = Department;
