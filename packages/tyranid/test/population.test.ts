import * as chai from 'chai';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

import { Population } from '../src/core/population';

const { ObjectId } = mongodb;

const { expect } = chai;

export function add() {
  describe('population.js', () => {
    let Book: Tyr.BookCollection,
      User: Tyr.UserCollection,
      Department: Tyr.DepartmentCollection,
      Organization: Tyr.OrganizationCollection,
      Task: Tyr.TaskCollection;
    const BookIsbn = new ObjectId('5567f2a8387fa974fc6f3a5a');

    before(() => {
      Book = Tyr.byName.book;
      User = Tyr.byName.user;
      Department = Tyr.byName.department;
      Organization = Tyr.byName.organization;
      Task = Tyr.byName.task;
    });

    const { $all, $label } = Tyr;

    describe('population', () => {
      function verifyPeople(users: Tyr.User[]) {
        expect(users.length).to.eql(4);
        const user1 = _.find(users, { _id: 1 });
        const user3 = _.find(users, { _id: 3 });
        expect(user1).to.be.an.instanceof(User);
        expect(user1!.organization$!).to.be.an.instanceof(Organization);
        expect(user1!.organization$!.name).to.be.eql('Acme Unlimited');
        expect(user3!.organization$!.name).to.be.eql('123 Construction');
      }

      it('should work curried', () => {
        return User.findAll({ query: {} })
          .then(User.populate('organization'))
          .then(users => {
            verifyPeople(users);
          });
      });

      it('should work uncurried', () => {
        return User.findAll({ query: {} }).then(users => {
          return User.populate('organization', users).then(users => {
            verifyPeople(users);
          });
        });
      });

      it('should work with findOne() populate in options', async () => {
        const user = await User.findOne({
          query: { 'name.first': 'John' },
          populate: 'organization',
        });
        expect(user).to.be.an.instanceof(User);
        expect(user!.organization$).to.be.an.instanceof(Organization);
        expect(user!.organization$!.name).to.be.eql('Acme Unlimited');
      });

      it('should work with findAll() populate in options', async () => {
        const users = await User.findAll({
          query: {},
          populate: 'organization',
        });
        verifyPeople(users);
      });

      it('should work with custom primaryKey', () => {
        return Task.findOne({ query: { _id: 1 } })
          .then(Task.populate('manual'))
          .then(task => {
            expect(task!.manual$).to.be.an.instanceof(Book);
            expect(task!.manual$!._id).to.be.eql(1);
            expect(task!.manual$!.isbn).to.be.eql(BookIsbn);
          });
      });

      it('should skip fields with no value using array format', () => {
        return User.findAll({ query: {} }).then(users => {
          return User.populate(['organization', 'department'], users).then(
            users => {
              verifyPeople(users);
            }
          );
        });
      });

      it('should deep populate array links', async () => {
        const users = await User.db.find().sort({ _id: 1 }).toArray();
        await User.populate(['organization', 'siblings.friends.user'], users);
        expect(users[1].siblings[0].friends[0].user$._id).to.be.eql(3);
        expect(users[1].siblings[0].friends[1].user$._id).to.be.eql(1);
        expect(users[1].siblings[1].friends[0].user$._id).to.be.eql(1);
        expect(users[1].siblings[1].friends[1].user$._id).to.be.eql(3);
        expect(users[2].siblings[0].friends[0].user$._id).to.be.eql(1);
        expect(users[2].siblings[0].friends[1].user$._id).to.be.eql(2);
        expect(users[2].siblings[1].friends[0].user$._id).to.be.eql(2);
        expect(users[2].siblings[1].friends[1].user$._id).to.be.eql(3);
      });

      it('should deep populate array link links', () => {
        return User.findAll({ query: { _id: 2 } })
          .then(
            User.populate({
              organization: $all,
              'siblings.bestFriend': { $all: 1, organization: $label },
            })
          )
          .then(users => {
            expect(
              users[0]!.siblings![0]!.bestFriend$!.organization$!.name
            ).to.be.eql('Acme Unlimited');
          });
      });

      it('should populate paths and arrays using array format', async () => {
        const department = (await Department.byId(1))!;
        await department.$populate(['creator', 'permissions.members']);

        const members$ = department.permissions!.members$!;

        expect(members$.length).to.be.eql(2);
        expect(members$[0]).to.be.an.instanceof(User);
        expect(members$[0].name.first).to.be.eql('John');
        expect(members$[1]).to.be.an.instanceof(User);
        expect(members$[1].name.first).to.be.eql('Jane');
      });

      it('should populate paths and arrays using object format', async () => {
        const department = (await Department.byId(1))!;
        await department.$populate({ 'permissions.members': $all });

        const members$ = department.permissions!.members$!;

        expect(members$!.length).to.be.eql(2);
        expect(members$![0]).to.be.an.instanceof(User);
        expect(members$![0].name.first).to.be.eql('John');
        expect(members$![1]).to.be.an.instanceof(User);
        expect(members$![1].name.first).to.be.eql('Jane');
      });

      it('should do nested population, 1', () => {
        return Department.byId(1).then(department => {
          return department!
            .$populate({
              'permissions.members': { $all: 1, organization: $all },
            })
            .then(() => {
              const members$ = department!.permissions!.members$!;

              expect(members$[0].organization$!.name).to.be.eql(
                'Acme Unlimited'
              );
              expect(members$[1].organization$!.name).to.be.eql(
                '123 Construction'
              );
            });
        });
      });

      it('should do nested population, 2', () => {
        return Department.byId(1).then(department => {
          return department!
            .$populate({
              creator: { $all: 1, organization: $all },
              head: { $all: 1, organization: $all },
            })
            .then(() => {
              expect(department!.creator$!._id).to.be.eql(2);
              expect(department!.creator$!.organization$!._id).to.be.eql(1);
              expect(department!.head$!._id).to.be.eql(3);
              expect(department!.head$!.organization$!._id).to.be.eql(2);
            });
        });
      });

      it('should do restricted projection', async () => {
        let department = (await Department.byId(1))!;
        await department.$populate({ creator: { name: 1 } });
        expect(_.keys(department.creator$).length).to.be.eql(2);
        expect(department.creator$!._id).to.eql(2);
        expect(department.creator$!.name).to.not.be.undefined;

        department = (await Department.byId(1))!;
        await department.$populate({ creator: { age: 1, name: 1 } });
        expect(_.keys(department.creator$)).to.eql(['_id', 'name', 'age']);
      });

      it('should support predefined projections', async () => {
        let department = (await Department.byId(1))!;
        await department.$populate({ creator: 'nameAndAge' });
        expect(_.keys(department.creator$).length).to.be.eql(3);
        expect(department.creator$!._id).to.eql(2);
        expect(department.creator$!.name).to.not.be.undefined;
        expect(department.creator$!.age).to.not.be.undefined;

        department = (await Department.byId(1))!;
        await department.$populate({
          creator: ['nameAndAge', { homepage: 1 }],
        });
        expect(_.keys(department.creator$)).to.eql([
          '_id',
          'name',
          'age',
          'homepage',
        ]);
      });
    });

    describe('denormalization', () => {
      it('should support denormalized links inside objects and arrays', async () => {
        const task = await Task.insert({
          _id: 2,
          name: 'denormalized task',
          departments: [
            {
              secondName: 'some second name',
              department: 1,
            },
          ],
        });
        expect((task!.departments![0] as any).department_!.name).to.eql(
          'Engineering'
        );
      });
    });

    describe('fromClient()', () => {
      it('should convert client data', () => {
        const tests = [
          [{ organization: '1' }, { organization: 1 }],
          [
            { organization: { name: '1', $all } },
            { organization: { name: 1, $all } },
          ],
        ];

        for (const test of tests) {
          expect(Population.fromClient(test[0])).to.eql(test[1]);
        }
      });
    });
  });
}
