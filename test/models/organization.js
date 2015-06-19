'use strict';

var tyr = require('../../tyranid');

var Organization = new tyr.Collection({
  id: 't04',
  name: 'organization',
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string' }
  }
});

module.exports = Organization;
