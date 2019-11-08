import tyr from '../../src/tyranid';

import Job from './job';

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
    name: { is: 'string' },
    bestFriend: { link: 'user' },
    friends: { is: 'array', of: Friend },
    scores: { is: 'array', of: 'double' }
  }
};

var RoleStatus = {
  is: 'object',
  fields: {
    role: { link: 'role' },
    active: { is: 'boolean' },
    duration: { is: 'integer' }
  }
};

Sibling.Friend = Friend;

var User = new tyr.Collection({
  id: 'u00',
  name: 'user',
  historical: 'patch',
  timestamps: true,
  client: true,
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

    fullName: {
      is: 'string',
      client: true,
      labelField: true,
      db: true,
      get: function() {
        return this.name ? this.name.first + ' ' + this.name.last : undefined;
      }
    },

    name: {
      is: 'object',
      required: true,
      client: 'default',
      fields: {
        first: { is: 'string', label: 'First Name', required: true },
        last: { is: 'string', label: 'Last Name', pathLabel: 'Last' },
        suffices: { is: 'array', of: 'string' }
      }
    },

    address: {
      is: 'object',
      historical: true,
      fields: {
        street: { is: 'string' },
        zip: { is: 'integer' },
        notes: { is: 'array', of: 'string' }
      }
    },

    birthDate: { is: 'date', label: () => 'Dyn Birth Date' },
    job: Job, // equivalent to { is: { link: 'job' } }
    backupJobs: { is: 'array', of: Job }, // equivalent to { is: 'array', of: { link: 'job' } }
    age: { is: 'integer', in: 'year', historical: true },
    roles: { is: 'array', of: RoleStatus },

    bag: { is: 'object' },

    bitmaskedJobs: { is: 'bitmask', link: 'job' },

    $strings: {
      $base: { is: 'string' },

      oldName: { deprecated: 'use name.first and name.last' },
      ssn: { client: 'conditional' }
    },

    favoriteColor: {
      is: 'string',
      client: (value, opts, proj) => proj && proj.favoriteColor
    },

    ageAppropriateSecret: {
      is: 'string',
      client: function() {
        return this.age > 30;
      }
    },

    siblings: { is: 'array', of: Sibling },

    title: { is: 'string', defaultValue: 'Employee' },
    organization: {
      link: 'organization',
      denormal: { name: 1, owner: { name: 1 } }
    },
    department: { link: 'department' },
    homepage: { is: 'url' },
    goldStars: {
      is: 'integer',
      defaultValue: function() {
        return 0;
      }
    },
    createdAt: { is: 'datetime' },
    secretCodes: { is: 'array', of: 'mongoid' },

    other: { is: 'object' },

    lochNess: { link: 'lochNess?' },

    custom: { is: 'object', custom: true }
  },
  methods: {
    canDrink: {
      return: { is: 'boolean' },
      fn() {
        return this.age >= 21;
      }
    }
  },
  service: {
    canServe: {
      params: {
        user: {
          required: true,
          link: 'user'
        }
      },
      return: 'boolean'
    },
    canServeArray: {
      params: {
        users: {
          is: 'array',
          required: true,
          of: {
            link: 'user'
          }
        }
      },
      return: 'integer'
    }
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
  },
  customMeta1: { name: 'foo' },
  customMeta2: { name: 'bar' }
});

User.service = {
  async canServe(id) {
    const user = await User.byId(id);
    return user.age >= 21;
  },

  async canServeArray(ids) {
    const users = await User.byIds(ids);
    return users.filter(user => user.age >= 21).length;
  }
};

User.Sibling = Sibling;

export default User;
