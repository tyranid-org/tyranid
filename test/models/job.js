'use strict';

var tyr = require('../../index.js');

var Job = new tyr.Collection({
  id: 'j00',
  name: 'job',
  enum: true,
  fields: {
    _id:     { is: 'integer' },
    name:    { is: 'string', label: true },
    manager: { is: 'boolean' }
  },
  values: [
    [ '_id', 'name',              'manager' ],

    [    1,  'Software Engineer', false     ],
    [    2,  'Software Lead',     true      ],
    [    3,  'Designer',          false     ]
  ]
});

Job.prototype.isSoftware = function() {
  return this.name.substring(0, 8) === 'Software';
};

module.exports = Job;
