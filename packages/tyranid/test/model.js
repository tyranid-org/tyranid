import * as mongodb from 'mongodb';

import Tyr from '../src/tyranid';

import Role from './models/role'; // require to get extra link in prototype chain

import './models/application';
import './models/book';
import './models/department';
import './models/global';
import './models/location';
import './models/organization';
import './models/tasks/task';
import './models/trip';
import './models/user';
import './models/widget';

const { ObjectId } = mongodb;

let Organization,
  Department,
  User,
  Phantom,
  Task,
  Book,
  TyrSchema,
  TyrSchemaType,
  Widget;
const AdministratorRoleId = new ObjectId('55bb8ecff71d45b995ff8c83');
const UserRoleId = new ObjectId('55bb7ecfe71d45b923ff8c83');
const BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');
const Book2Isbn = new ObjectId('aaa7f2a8387fa9abdc6f3ced');

export default async function initModel() {
  // Test validate load models and byName
  Tyr._validateCalled = false;
  Tyr.validate({
    glob: __dirname + '/models/**/*.js',
    //dir: __dirname + '/models',
    // note, we want fileMatch to match the "subdir" directory to test that tyranid ignores directories
    //fileMatch: '[a-z].*'
  });

  Organization = Tyr.byName.organization;
  Department = Tyr.byName.department;
  User = Tyr.byName.user;
  Task = Tyr.byName.task;
  Book = Tyr.byName.book;
  TyrSchema = Tyr.byName.tyrSchema;
  TyrSchemaType = Tyr.byName.tyrSchemaType;
  Phantom = Tyr.byName.phantom;
  Widget = Tyr.byName.widget;

  await Organization.db.deleteMany({});
  await Organization.db.insertMany([
    { _id: 1, name: 'Acme Unlimited' },
    { _id: 2, name: '123 Construction', owner: 3 },
  ]);
  await Department.db.deleteMany({});
  await Department.db.insertMany([
    {
      _id: 1,
      name: 'Engineering',
      creator: 2,
      head: 3,
      permissions: { members: [2, 3] },
    },
  ]);
  await Role.db.deleteMany({});
  await Role.db.insertMany([
    { _id: AdministratorRoleId, name: 'Administrator' },
    { _id: UserRoleId, name: 'User' },
  ]);
  await User.db.deleteMany({});
  await User.insert([
    {
      _id: 1,
      organization: 1,
      department: 1,
      name: { first: 'An', last: 'Anon' },
      title: 'Developer',
      job: 1,
      backupJobs: [3],
    },
    {
      _id: 2,
      organization: 1,
      name: { first: 'John', last: 'Doe' },
      homepage: 'https://www.tyranid.org',
      siblings: [
        { name: 'Tom Doe', bestFriend: 1, friends: [{ user: 3 }, { user: 1 }] },
        { name: 'George Doe', friends: [{ user: 1 }, { user: 3 }] },
      ],
      age: 35,
      ageAppropriateSecret: 'Eats at Chipotle way to much...',
      roles: [
        { role: AdministratorRoleId, active: true },
        { role: UserRoleId, active: true },
      ],
    },
    {
      _id: 3,
      organization: 2,
      name: { first: 'Jane', last: 'Doe' },
      siblings: [
        { name: 'Jill Doe', friends: [{ user: 1 }, { user: 2 }] },
        { name: 'Bill Doe', friends: [{ user: 2 }, { user: 3 }] },
      ],
      age: 20,
      ageAppropriateSecret: 'Not a fan of construction companies...',
    },
    { _id: 4, organization: 2, name: { first: 'Jill', last: 'Doe' }, age: 20 },
  ]);
  await Book.db.deleteMany({});
  await Book.db.insertMany([
    { _id: 1, isbn: BookIsbn, title: 'Tyranid User Guide' },
  ]);
  await Book.db.insertMany([
    { _id: 2, isbn: Book2Isbn, title: 'Home Gardening 101' },
  ]);
  await Task.db.deleteMany({});
  await Task.db.insertMany([
    {
      _id: 1,
      title: 'Write instance validation tests',
      assigneeUid: User.idToUid(1),
      manual: BookIsbn,
    },
  ]);
  await Widget.db.deleteMany({});
  await Widget.db.insertMany([
    {
      name: 'Toxulin',
      creator: 1,
      tags: ['toxic'],
    },
    {
      name: 'Sundae',
      creator: 1,
      tags: ['food'],
    },
  ]);
  await TyrSchema.db.deleteMany({});
  await TyrSchema.db.insertMany([
    {
      collection: User.id,
      match: {
        organization: 1,
      },
      type: TyrSchemaType.PARTIAL._id,
      def: {
        fields: {
          acmeX: { is: 'integer' },
          acmeY: { is: 'integer', custom: true },
          custom: {
            is: 'object',
            custom: true,
            fields: {
              nested1: { is: 'integer', label: 'Nested 1' },
            },
          },
        },
      },
    },
  ]);
  await TyrSchema.db.insertMany([
    {
      collection: User.id,
      match: {
        organization: 1,
      },
      type: TyrSchemaType.PARTIAL._id,
      def: {
        fields: {
          custom: {
            is: 'object',
            custom: true,
            fields: {
              nested2: { is: 'integer', label: 'Nested 2' },
            },
          },
        },
      },
    },
  ]);
  Tyr.invalidateSchemaCache();
  await Tyr.Log.remove({});
}
