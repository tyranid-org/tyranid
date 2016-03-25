import tyr from '../../src/tyranid';

var Friend = {
  is: 'object',
  fields: {
    user: { link: 'user' },
    birthDate: { is: 'date' }
  }
};

var Sibling = {
  is: 'object',
  fields: {
    name:       { is: 'string' },
    bestFriend: { link: 'user' },
    friends:    { is: 'array',  of: Friend }
  }
};

var RoleStatus = {
  is: 'object',
  fields: {
    role:       { link: 'role' },
    active:     { is: 'boolean' }
  }
};

Sibling.Friend = Friend;

var User = new tyr.Collection({
  id: 'u00',
  name: 'user',
  fields: {
    _id: { is: 'integer' },

    fullName: { is: 'string', client: true, labelField: true, get: function() { return this.name.first + ' ' + this.name.last; } },

    name: {
      is: 'object',
      required: true,
      fields: {
        first: { is: 'string', label: 'First Name', required: true },
        last:  { is: 'string', label: 'Last Name', pathLabel: 'Last' }
      }
    },

    birthDate: { is: 'date', label: () => 'Dyn Birth Date' },
    job:       { link: 'job' },
    age:       { is: 'integer', in: 'year' },
    roles:     { is: 'array', of: RoleStatus },

    bag:       { is: 'object' },

    ageAppropriateSecret: { is: 'string', client: function() { return this.age > 30; } },

    siblings: { is: 'array', of: Sibling },

    title: { is: 'string', defaultValue: 'Employee' },
    organization: { link: 'organization', denormal: { name: 1, owner: { name: 1 } } },
    department: { link: 'department' },
    homepage: { is: 'url' },
    goldStars: { is: 'integer', defaultValue: function() { return 0; } }
  },
  methods: {
    canDrink: { is: 'boolean', fn: function() { return this.age >= 21; } }
  }
});

User.Sibling = Sibling;

export default User;
