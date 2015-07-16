'use strict';

var tyr = require('../../tyranid');


var Friend = {
  is : 'object',
  fields: {
    person: { 'link' : 'person' },
    birthDate : { is : 'date' }
  }
};

var Sibling = {
  is : 'object',
  fields: {
    name:    { is: 'string' },
    bestFriend: { link : 'person' },
    friends: { is: 'array',  of: Friend }
  }
};

Sibling.Friend = Friend;

var Person = new tyr.Collection({
  id: 't03',
  name: 'person',
  fields: {
    _id: { is: 'integer' },

    fullName: { is: 'string', client: true, get: function() { return this.name.first + ' ' + this.name.last; } },

    name: {
      is: 'object',
      required: true,
      fields: {
        first: { is: 'string', as: 'First Name', required: true },
        last:  { is: 'string', as: 'Last Name'  }
      }
    },

    birthDate: { is: 'date' },
    job:       { 'link' : 'job' },
    age:       { is: 'integer' },

    siblings: { is: 'array', of: Sibling },

    title: { is: 'string', defaultValue: 'Employee' },
    organization: { link: 'organization' },
    department: { link: 'department' },
    homepage: { is: 'url' },
    goldStars: { is: 'integer', defaultValue: 0 }
  }
});

Person.Sibling = Sibling;

module.exports = Person;
