import * as _ from 'lodash';
import * as chai from 'chai';
import * as mongodb from 'mongodb';

import Tyr from '../src/tyranid';
import Population from '../src/core/population';

const { ObjectId } = mongodb;

const { expect, assert } = chai;

export function add() {
  describe('population.js', () => {
    let Book, User, Department, Organization, Task;
    const BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');

    before(() => {
      Book = Tyr.byName.book;
      User = Tyr.byName.user;
      Department = Tyr.byName.department;
      Organization = Tyr.byName.organization;
      Task = Tyr.byName.task;
    });

    const { $all } = Tyr;

    describe('population', () => {
      function verifyPeople(users) {
        expect(users.length).to.eql(4);
        var user1 = _.find(users, { _id: 1 });
        var user3 = _.find(users, { _id: 3 });
        expect(user1).to.be.an.instanceof(User);
        expect(user1.organization$).to.be.an.instanceof(Organization);
        expect(user1.organization$.name).to.be.eql('Acme Unlimited');
        expect(user3.organization$.name).to.be.eql('123 Construction');
      }

      it('should work curried', function() {
        return User.findAll()
          .then(User.populate('organization'))
          .then(function(users) {
            verifyPeople(users);
          });
      });

      it('should work uncurried', function() {
        return User.findAll().then(function(users) {
          return User.populate('organization', users).then(function(users) {
            verifyPeople(users);
          });
        });
      });

      it('should work with findOne() populate in options', async function() {
        const user = await User.findOne({
          query: { 'name.first': 'John' },
          populate: 'organization'
        });
        expect(user).to.be.an.instanceof(User);
        expect(user.organization$).to.be.an.instanceof(Organization);
        expect(user.organization$.name).to.be.eql('Acme Unlimited');
      });

      it('should work with findAll() populate in options', async function() {
        const users = await User.findAll({ populate: 'organization' });
        verifyPeople(users);
      });

      it('should work with custom primaryKey', function() {
        return Task.findOne({ _id: 1 })
          .then(Task.populate('manual'))
          .then(function(task) {
            expect(task.manual$).to.be.an.instanceof(Book);
            expect(task.manual$._id).to.be.eql(1);
            expect(task.manual$.isbn).to.be.eql(BookIsbn);
          });
      });

      it('should skip fields with no value using array format', function() {
        return User.findAll().then(function(users) {
          return User.populate(['organization', 'department'], users).then(
            function(users) {
              verifyPeople(users);
            }
          );
        });
      });

      it('should deep populate array links', async function() {
        return (await User.db.find())
          .sort({ _id: 1 })
          .toArray()
          .then(User.populate(['organization', 'siblings.friends.user']))
          .then(function(users) {
            expect(users[1].siblings[0].friends[0].user$._id).to.be.eql(3);
            expect(users[1].siblings[0].friends[1].user$._id).to.be.eql(1);
            expect(users[1].siblings[1].friends[0].user$._id).to.be.eql(1);
            expect(users[1].siblings[1].friends[1].user$._id).to.be.eql(3);
            expect(users[2].siblings[0].friends[0].user$._id).to.be.eql(1);
            expect(users[2].siblings[0].friends[1].user$._id).to.be.eql(2);
            expect(users[2].siblings[1].friends[0].user$._id).to.be.eql(2);
            expect(users[2].siblings[1].friends[1].user$._id).to.be.eql(3);
          });
      });

      it('should deep populate array link links', function() {
        return User.findAll({ query: { _id: 2 } })
          .then(
            User.populate({
              organization: $all,
              'siblings.bestFriend': { $all: 1, organization: $all }
            })
          )
          .then(function(users) {
            expect(
              users[0].siblings[0].bestFriend$.organization$.name
            ).to.be.eql('Acme Unlimited');
          });
      });

      it('should populate paths and arrays using array format', function() {
        return Department.byId(1).then(function(department) {
          return department
            .$populate(['creator', 'permissions.members'])
            .then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(
                User
              );
              expect(department.permissions.members$[0].name.first).to.be.eql(
                'John'
              );
              expect(department.permissions.members$[1]).to.be.an.instanceof(
                User
              );
              expect(department.permissions.members$[1].name.first).to.be.eql(
                'Jane'
              );
            });
        });
      });

      it('should populate paths and arrays using object format', function() {
        return Department.byId(1).then(function(department) {
          return department
            .$populate({ 'permissions.members': $all })
            .then(function() {
              expect(department.permissions.members$.length).to.be.eql(2);
              expect(department.permissions.members$[0]).to.be.an.instanceof(
                User
              );
              expect(department.permissions.members$[0].name.first).to.be.eql(
                'John'
              );
              expect(department.permissions.members$[1]).to.be.an.instanceof(
                User
              );
              expect(department.permissions.members$[1].name.first).to.be.eql(
                'Jane'
              );
            });
        });
      });

      it('should do nested population, 1', function() {
        return Department.byId(1).then(function(department) {
          return department
            .$populate({
              'permissions.members': { $all: 1, organization: $all }
            })
            .then(function() {
              var members = department.permissions.members$;
              expect(members[0].organization$.name).to.be.eql('Acme Unlimited');
              expect(members[1].organization$.name).to.be.eql(
                '123 Construction'
              );
            });
        });
      });

      it('should do nested population, 2', function() {
        return Department.byId(1).then(function(department) {
          return department
            .$populate({
              creator: { $all: 1, organization: $all },
              head: { $all: 1, organization: $all }
            })
            .then(function() {
              expect(department.creator$._id).to.be.eql(2);
              expect(department.creator$.organization$._id).to.be.eql(1);
              expect(department.head$._id).to.be.eql(3);
              expect(department.head$.organization$._id).to.be.eql(2);
            });
        });
      });

      it('should do restricted projection', async () => {
        let department = await Department.byId(1);
        await department.$populate({ creator: { name: 1 } });
        expect(_.keys(department.creator$).length).to.be.eql(2);
        expect(department.creator$._id).to.eql(2);
        expect(department.creator$.name).to.not.be.undefined;

        department = await Department.byId(1);
        await department.$populate({ creator: { age: 1, name: 1 } });
        expect(_.keys(department.creator$)).to.eql(['_id', 'name', 'age']);
      });

      it('should support predefined projections', async () => {
        let department = await Department.byId(1);
        await department.$populate({ creator: 'nameAndAge' });
        expect(_.keys(department.creator$).length).to.be.eql(3);
        expect(department.creator$._id).to.eql(2);
        expect(department.creator$.name).to.not.be.undefined;
        expect(department.creator$.age).to.not.be.undefined;

        department = await Department.byId(1);
        await department.$populate({
          creator: ['nameAndAge', { homepage: 1 }]
        });
        expect(_.keys(department.creator$)).to.eql([
          '_id',
          'name',
          'homepage',
          'age'
        ]);
      });
    });

    describe('fromClient()', () => {
      it('should convert client data', () => {
        const tests = [
          [{ organization: '1' }, { organization: 1 }],
          [
            { organization: { name: '1', $all } },
            { organization: { name: 1, $all } }
          ]
        ];

        for (const test of tests) {
          expect(Population.fromClient(test[0])).to.eql(test[1]);
        }
      });
    });
  });
}
