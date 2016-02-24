var tyr = require('../../src/tyranid');

var Organization = new tyr.Collection({
  id: 't04',
  name: 'organization',
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true },
    owner: { link: 'user' }
  }
});

module.exports = Organization;
