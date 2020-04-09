import { Tyr } from 'tyranid';

export default new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    email: { is: 'email' },
    skills: {
      is: 'array',
      note:
        'In sunt enim nulla cillum ipsum laboris excepteur exercitation sit laborum. Enim aliqua veniam tempor do nostrud ad id. Reprehenderit ad adipisicing minim anim et ea non dolore deserunt nostrud eu. Labore dolor veniam cupidatat deserunt incididunt amet ea voluptate voluptate occaecat deserunt duis consequat. Ea aliqua consectetur laboris sit excepteur aliqua occaecat et sit excepteur ut. Consectetur laboris ad veniam esse laborum enim nisi anim ex.',
      of: {
        is: 'object',
        note: 'A sub document comment',
        fields: {
          years: {
            is: 'integer',
          },
          name: {
            is: 'string',
            note: 'The name of a skill that the user has.',
          },
        },
      },
    },
    linkedId: { link: 'linked?' },
  },
  service: {
    myMethod1: {
      help: 'myMethod1 help comment.',
      note: 'myMethod1 developer comment.',
      params: {
        name: {
          help:
            'help comment ... this is actually a pretty, sort of very long, actually it is an even longer comment that should, well, no, definitely have to be wrapped.',
          is: 'string',
          required: true,
        },
        structure: {
          is: 'object',
          note: 'developer comment.',
          fields: {
            a: 'integer',
            b: { is: 'array', of: 'string' },
          },
        },
        friend: { link: 'user' },
      },
      return: {
        help: 'This returns a special string.',
        is: 'string',
      },
    },
    myMethod2: {
      return: { is: 'array', of: 'string' },
    },
    myMethod3: {},
  },
});
