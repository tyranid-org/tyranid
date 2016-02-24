var tyr = require('../../src/tyranid'),
    User = require('./user');

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
  label: 'Issue',
  fields: {
    _id: { is: 'integer' },

    name: { is: 'string' },
    assigneeUid: {
      is: 'uid',
      label: 'Assignee UID',
      of: [ User, 'department' ]
    },
    departments: { is : 'array', of: Department },
    manual: { link: 'book' }
  }
});

module.exports = Task;
