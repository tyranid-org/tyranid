'use strict';

var tyr = require('../../tyranid'),
  Person = require('./person');

var Department = {
  is: 'object',

  fields: {
    secondName: { is: 'string'},
    department: { link: 'department'}
  }
};

var Task = new tyr.Collection({
  id: 'tsk',
  name: 'task',
  fields: {
    _id: { is: 'integer' },

    name: { is: 'string' },
    assigneeUid: {
      is: 'uid',
      of: [ Person, 'Department' ]
    },
    departments: { is : 'array', of: Department }
  }
});

module.exports = Task;

