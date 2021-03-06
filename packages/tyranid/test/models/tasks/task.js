import tyr from '../../../src/tyranid';
import User from '../user';

var Department = {
  is: 'object',

  fields: {
    secondName: { is: 'string' },
    department: {
      link: 'department',
      denormal: { name: 1, 'permissions.members': 1 },
    },
  },
};

var Task = new tyr.Collection({
  id: 'tsk',
  name: 'task',
  label: 'Issue',
  preserveInitialValues: user => user.name === 'Preservation',
  fields: {
    _id: { is: 'integer' },

    name: { is: 'string' },
    assigneeUid: {
      is: 'uid',
      label: 'Assignee UID',
      of: [User, 'department'],
    },
    departments: {
      is: 'array',
      of: Department,
      pathLabel: '',
      numbering: 'ordinal',
    },
    manual: { link: 'book' },
  },
});

export default Task;
