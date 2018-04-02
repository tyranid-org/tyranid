import { Tyr } from 'tyranid';

export const Blog = new Tyr.Collection({
  id: 'b00',
  name: 'blog',
  dbName: 'blogs',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: { link: 'organization' }
  }
});

export const Chart = new Tyr.Collection({
  id: 'c00',
  name: 'chart',
  dbName: 'charts',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization'
    },
    blogId: {
      link: 'blog'
    },
    postIds: {
      is: 'array',
      of: { link: 'post' }
    },
    teamIds: {
      is: 'array',
      of: { link: 'team' }
    },
    userIds: {
      is: 'array',
      of: { link: 'user' }
    }
  }
});

export const Comment = new Tyr.Collection({
  id: 'c0m',
  name: 'comment',
  dbName: 'comments',
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' },
    postId: { link: 'post' },
    blogId: { link: 'blog' }
  }
});

export const Inventory = new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: { is: 'string' } },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy'
    }
  }
});

export const Organization = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' }
  }
});

export const Post = new Tyr.Collection({
  id: 'p00',
  name: 'post',
  dbName: 'posts',
  fields: {
    _id: { is: 'mongoid' },
    title: { is: 'string' },
    text: { is: 'string' },
    blogId: { link: 'blog' }
  }
});

export const Team = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: { link: 'organization' }
  }
});

export const Usage = new Tyr.Collection({
  id: 'ul0',
  name: 'usagelog',
  dbName: 'usagelogs',
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' }
  }
});

export const User = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    computed: {
      is: 'string',
      get(this: Tyr.Document & { name: string }) {
        return `Hello ${this.name} from a computed property!`;
      }
    },
    teamIds: {
      is: 'array',
      of: {
        link: 'team'
      }
    },
    nested: {
      is: 'object',
      fields: {
        inner: { is: 'integer' },
        innerIllDefined: {
          is: 'object'
        }
      }
    },
    illDefined: {
      is: 'object'
    },
    noValidFields: {
      is: 'object',
      fields: {
        invalidField: { is: 'object' }
      }
    },
    status: { link: 'userStatus' },
    organizationId: { link: 'organization' }
  }
});

export const UserStatus = new Tyr.Collection({
  id: 'u01',
  name: 'userStatus',
  enum: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true }
  },
  values: [['_id', 'name'], [1, 'Active'], [2, 'Deleted']]
});
