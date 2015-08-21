'use strict';

var tyr = require('../../index.js'),
  Person = require('./person');

var Task = new tyr.Collection({
  id: 'tsk',
  name: 'task',
  fields: {
    _id: { is: 'integer' },

    name: { is: 'string' },
    assigneeUid: {
      is: 'uid',
      of: [ Person, 'Department' ]
    }
  }
});

module.exports = Task;
