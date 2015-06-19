'use strict';

var tyr = require('../../tyranid');

var Department = new tyr.Collection({
  id: 't05',
  name: 'department',
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string' }
  }
});

module.exports = Department;
