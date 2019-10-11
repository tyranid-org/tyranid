import 'mocha';
import * as chai from 'chai';

import { Tyr } from 'tyranid';

const { $all } = Tyr;

const { expect } = chai;

const { NamePath } = Tyr;

export function add() {
  describe('namePath.js (NamePath)', () => {
    let User: Tyr.UserCollection,
      Department: Tyr.DepartmentCollection,
      Task: Tyr.TaskCollection,
      Global: Tyr.GlobalCollection;

    before(() => {
      User = Tyr.byName.user;
      Department = Tyr.byName.department;
      Task = Tyr.byName.task;
      Global = Tyr.byName.global;
    });

    it('should parse arrays', () => {
      let np = new NamePath(User, 'roles._');
      expect(np.fields.length).to.eql(2);
      expect(np.fields[0].type.def.name).to.eql('array');
      expect(np.fields[1].type.def.name).to.eql('object');

      np = new NamePath(User, 'roles', true);
      expect(np.fields.length).to.eql(1);
      expect(np.fields[0].type.def.name).to.eql('object');

      np = new NamePath(User, 'roles');
      expect(np.fields.length).to.eql(1);
      expect(np.fields[0].type.def.name).to.eql('array');

      np = new NamePath(User, 'roles._.role');
      expect(np.fields.length).to.eql(3);
      expect(np.fields[0].type.def.name).to.eql('array');
      expect(np.fields[1].type.def.name).to.eql('object');
      expect(np.fields[2].type.def.name).to.eql('link');

      np = new NamePath(User, 'roles.role');
      expect(np.fields.length).to.eql(2);
      expect(np.fields[0].type.def.name).to.eql('array');
      expect(np.fields[1].type.def.name).to.eql('link');

      np = User.paths['roles._.role'].namePath;
      expect(np.fields.length).to.eql(3);
      expect(np.fields[0].type.def.name).to.eql('array');
      expect(np.fields[1].type.def.name).to.eql('object');
      expect(np.fields[2].type.def.name).to.eql('link');

      const obj = new Department({ tags: ['red', 'tiny'] });

      np = Department.paths.tags.namePath;
      expect(np.get(obj)).to.eql(['red', 'tiny']);

      np = Department.parsePath('tags.1');
      expect(np.get(obj)).to.eql('tiny');
    });

    it('should parse maps', () => {
      let np = Department.paths['checkouts._'].namePath;
      expect(np.fields.length).to.eql(2);
      expect(np.fields[0].type.def.name).to.eql('object');
      expect(np.fields[1].type.def.name).to.eql('double');

      const obj = new Department({
        checkouts: {
          u002: 1.0,
          u001: 2.0
        },
        cubicles: {
          1: { name: 'West', size: 100 },
          3: { name: 'East', size: 200 },
          old3: { name: 'Old East', size: 170 }
        }
      });

      expect(np.get(obj)).to.eql([1.0, 2.0]);

      np = Department.paths['cubicles._.size'].namePath;
      expect(np.get(obj)).to.eql([100, 200, 170]);

      np = Department.parsePath('cubicles.3.size');
      expect(np.get(obj)).to.eql(200);

      np = Department.parsePath('cubicles.old3.size');
      expect(np.get(obj)).to.eql(170);
    });

    it('should support set', async () => {
      const u = await User.byId(3),
        np = u!.$model.paths['name.first'].namePath;

      np.set(u!, 'Molly');

      expect(u!.name!.first).to.eql('Molly');
    });

    it('should support set with array globs', async () => {
      const u = new User({
        name: {
          first: 'Joseph',
          suffices: ['Dr.', 'Mr.', 'Crazy']
        },
        siblings: [
          { name: 'Tom Doe' },
          { name: 'Mia Doe' },
          { name: 'George Doe' }
        ]
      });

      let np = u.$model.paths['name.suffices._'].namePath;
      np.set(u, 'Super');
      expect(u.name!.suffices).to.eql(['Super', 'Super', 'Super']);

      np = u.$model.paths['name.suffices'].namePath;
      np.set(u, 'Super');
      expect(u.name!.suffices).to.eql('Super');

      np = u.$model.paths['siblings._.name'].namePath;
      np.set(u, 'Thor');
      expect(u.siblings).to.eql([
        { name: 'Thor' },
        { name: 'Thor' },
        { name: 'Thor' }
      ]);
    });

    it('should support set with array indices', async () => {
      const u = new User({
        name: {
          first: 'Joseph',
          suffices: ['Dr.', 'Mr.', 'Crazy']
        },
        siblings: [
          { name: 'Tom Doe' },
          { name: 'Mia Doe' },
          { name: 'George Doe' }
        ]
      });

      const np = u.$model.parsePath('name.suffices.0');
      np.set(u, 'Super');
      expect(u.name!.suffices).to.eql(['Super', 'Mr.', 'Crazy']);
    });

    it('should support relative NamePaths', async () => {
      const u = await User.byId(3);

      const nameNp = User.paths.name.namePath,
        firstNp = nameNp.parsePath('first');
      expect(firstNp.toString()).to.eql('user:name/first');

      const name = nameNp.get(u);
      expect(name.first).to.eql('Jane');

      const first = firstNp.get(name);
      expect(first).to.eql('Jane');

      firstNp.set(name, 'Janet');
      expect(nameNp.get(u).first).to.eql('Janet');
    });

    it('should support simple population pathing', () => {
      const np = new NamePath(User, 'organization$.name'),
        field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.organization);
      expect(field.name).to.be.eql('name');
    });

    it('should support complex population pathing', () => {
      const np = new NamePath(User, 'organization$.owner$.name.first'),
        field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.user);
      expect(field.name).to.be.eql('first');
      expect(np.pathLabel).to.be.eql('Organization Owner Name First Name');
    });

    it('should support simple denormalize pathing', () => {
      const np = new NamePath(User, 'organization_.name'),
        field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.organization);
      expect(field.name).to.be.eql('name');
    });

    it('should support walk', () => {
      const np = User.parsePath('name');
      const np2 = np.walk('first');

      const user = new User({});
      np2.set(user, 'Jane', { create: true });
      expect(np2.get(user)).to.eql('Jane');
    });

    it('should support resolve', () => {
      const np = User.parsePath('name');
      const np2 = NamePath.resolve(User, np, 'first');

      const user = new User({});
      np2.set(user, 'Jane', { create: true });
      expect(np2.get(user)).to.eql('Jane');
    });

    it('should support complex denormalize pathing', () => {
      let np = new NamePath(User, 'organization_.owner_.name.first'),
        field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.user);
      expect(field.name).to.be.eql('first');
      expect(np.pathLabel).to.be.eql('Organization Owner Name First Name');

      np = new NamePath(
        Task,
        'departments.1.department_.permissions.members.0.name.first'
      );
      field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.user);
      expect(field.name).to.be.eql('first');
    });

    it('should support a mix of denormalization and population pathing', () => {
      for (const path of [
        'organization_.owner$.name.first',
        'organization$.owner_.name.first'
      ]) {
        const np = new NamePath(User, path),
          field = np.detail;
        expect(field.collection).to.be.eql(Tyr.byName.user);
        expect(field.name).to.be.eql('first');
        expect(np.pathLabel).to.be.eql('Organization Owner Name First Name');
      }
    });

    it('should support create option', () => {
      const np = User.parsePath('name.first');
      const user = new User({});

      np.set(user, 'Jane', { create: true });

      expect(np.get(user)).to.eql('Jane');
    });

    it('should support ignore option', () => {
      const np = User.parsePath('name.first');
      const user = new User({});

      np.set(user, 'Jane', { ignore: true });

      expect(np.get(user)).to.eql(undefined);
    });

    it('should used populated or denormalized values when dereferencing a link', async () => {
      const np = new NamePath(User, 'organization.owner.name.first'),
        field = np.detail;
      expect(field.collection).to.be.eql(Tyr.byName.user);
      expect(field.name).to.be.eql('first');
      expect(np.pathLabel).to.be.eql('Organization Owner Name First Name');

      const u = await User.byId(3, {
        populate: {
          organization: {
            $all,
            owner: {
              name: 1
            }
          }
        }
      });

      expect(np.get(u)).to.eql('Jane');
    });

    it('should support $get()', async () => {
      const u = await User.byId(3, {
        populate: {
          organization: {
            $all,
            owner: {
              name: 1
            }
          }
        }
      });

      expect(u!.$get('organization.owner.name.first')).to.eql('Jane');
    });

    it('should support tagged-template get', async () => {
      const u = await User.byId(3, {
        populate: {
          organization: {
            $all,
            owner: {
              name: 1
            }
          }
        }
      });

      expect(u!.$`organization.owner.name.first`).to.eql('Jane');
      expect(u!.$`organization.${'owner.name'}.first`).to.eql('Jane');
    });

    it('should support collection: syntax', () => {
      const np = User.parsePath('global:count');
      expect(np.fields.length).to.eql(1);
      expect(np.fields[0].collection.name).to.eql('Global');

      const user = new User({});

      np.set(user, 3);

      expect(Global.values[0].count).to.eql(3);

      expect(np.get(user)).to.eql(3);
    });
  });
}
