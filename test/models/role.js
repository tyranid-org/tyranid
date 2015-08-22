'use strict';

var tyr = require('../../index');

var Role = new tyr.Collection({
  id: 'r00',
  name: 'role',
  fields: {
    _id:     { is: 'mongoid' },
    name:    { is: 'string', label: true },
  }
});

module.exports = Role;
