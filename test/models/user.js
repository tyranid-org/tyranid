import tyr from '../../src/tyranid';

var Friend = {
  is: 'object',
  fields: {
    user: { link: 'user' },
    birthDate: { is: 'date' },
    age: { is: 'integer' }
  }
};

var Sibling = {
  is: 'object',
  fields: {
    name:       { is: 'string' },
    bestFriend: { link: 'user' },
    friends:    { is: 'array',  of: Friend },
    scores:     { is: 'array', of: 'double' }
  }
};

var RoleStatus = {
  is: 'object',
  fields: {
    role:       { link: 'role' },
    active:     { is: 'boolean' },
    duration:   { is: 'integer' }
  }
};

Sibling.Friend = Friend;

var User = new tyr.Collection({
  id: 'u00',
  name: 'user',
  historical: true,
  timestamps: true,
  indexes: [
    {
      key: { 'name.first': 1, 'name.last': 1 },
      name: 'firstLastName'
    }
  ],
  express: {
    rest: true
  },
  fields: {
    _id: { is: 'integer' },

    fullName: { is: 'string', client: true, labelField: true, get: function() { return this.name.first + ' ' + this.name.last; } },

    name: {
      is: 'object',
      required: true,
      client: 'default',
      fields: {
        first:    { is: 'string', label: 'First Name', required: true },
        last:     { is: 'string', label: 'Last Name', pathLabel: 'Last' },
        suffices: { is: 'array', of: 'string' }
      }
    },

    address: {
      is: 'object',
      historical: true,
      fields: {
        street: { is: 'string' },
        zip:    { is: 'integer' },
        notes:  { is: 'array', of: 'string' }
      }
    },

    oldName:   { is: 'string', deprecated: 'use name.first and name.last' },

    birthDate: { is: 'date', label: () => 'Dyn Birth Date' },
    job:       { link: 'job' },
    age:       { is: 'integer', in: 'year', historical: true },
    roles:     { is: 'array', of: RoleStatus },

    bag:       { is: 'object' },

    ssn:       { is: 'string', client: 'conditional' },

    favoriteColor: { is: 'string', client: (value, opts, proj) => proj && proj.favoriteColor },

    ageAppropriateSecret: { is: 'string', client: function() { return this.age > 30; } },

    siblings: { is: 'array', of: Sibling },

    title: { is: 'string', defaultValue: 'Employee' },
    organization: { link: 'organization', denormal: { name: 1, owner: { name: 1 } } },
    department: { link: 'department' },
    homepage: { is: 'url' },
    goldStars: { is: 'integer', defaultValue: function() { return 0; } },
    createdAt: { is: 'date' },

    other: { is: 'object' },

    lochNess: { link: 'lochNess?' }
  },
  methods: {
    canDrink: { is: 'boolean', fn: function() { return this.age >= 21; } }
  },
  projections: {
    nameAndAge: {
      name: 1,
      age: 1
    }
  },
  toClient: function() {
    if (this.foo) {
      delete this.foo;
    }
  }
});

User.Sibling = Sibling;

export default User;
