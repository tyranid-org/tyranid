import * as chai from 'chai';

import { Tyr } from 'tyranid';

const { expect } = chai;

export function add() {
  const { Location, User, Trip } = Tyr.collections;

  const clearTestData = async () => {
    await Trip.remove({ query: { name: /Lake/ } });
    await Location.remove({ query: { name: /Thunder Bay|Duluth/ } });
  };

  describe('csv.js', () => {
    it('should create and parse a csv file', async () => {
      const users = await User.findAll({ query: { name: { $exists: true } } });

      const csvDef: Tyr.CsvDef<Tyr.User> & { documents: Tyr.User[] } = {
        collection: User,
        documents: users,
        columns: [
          { path: 'name.first' },
          { path: 'name.last' },
          {
            path: 'name',
            get(doc) {
              const { name } = doc;
              return name ? name.first + ' ' + name.last : 'Unnamed';
            },
          },
          { path: 'job' },
          { path: 'age' },
        ],
        filename: 'test1.csv',
      };

      await Tyr.csv.toCsv(csvDef);

      const readUsers = await Tyr.csv.fromCsv(csvDef);

      expect(readUsers.length).to.eql(users.length);

      for (let i = 0; i < users.length; i++) {
        const user = users[i],
          readUser = readUsers[i];

        expect(user.name?.first).to.eql(readUser.name?.first);
        expect(user.age).to.eql(readUser.age);
      }
    });

    it('should parse a nested csv file', async () => {
      try {
        const trips = [
          new Trip({
            name: 'Lake Superior',
            origin: {
              name: 'Duluth',
            },
            destination: {
              name: 'Thunder Bay',
            },
          }),
        ];

        const csvDef: Tyr.CsvDef<Tyr.Trip> & { documents: Tyr.Trip[] } = {
          collection: Trip,
          documents: trips,
          columns: [
            { path: 'name' },
            { path: 'origin.name' },
            { path: 'destination.name' },
          ],
          filename: 'trip1.csv',
          save: true,
        };

        await Tyr.csv.toCsv(csvDef);

        // TODO:  toCsv() is sometimes exiting before the file is completely written
        await Tyr.sleep(250);

        const readTrips = await Tyr.csv.fromCsv(csvDef);

        expect(readTrips.length).to.eql(trips.length);

        for (let i = 0; i < trips.length; i++) {
          const trip = trips[i],
            readTrip = readTrips[i];

          const origin = await Location.byId(readTrip.origin!);
          const destination = await Location.byId(readTrip.destination!);

          expect(trip.$`origin.name`).to.eql(origin?.name);
          expect(trip.$`destination.name`).to.eql(destination?.name);
        }
      } finally {
        await clearTestData();
      }
    });

    it('should parse a nested csv file with an existing unique field', async () => {
      try {
        const duluth = await Location.save({ name: 'Duluth' });
        const thunderBay = await Location.save({ name: 'Thunder Bay' });
        await Trip.save({
          name: 'Lake Erie',
          tripCode: 'ALPHA',
          origin: duluth.$id,
          destination: thunderBay.$id,
        });

        const trips = [
          new Trip({
            name: 'Lake Superior',
            tripCode: 'ALPHA',
            origin: {
              name: 'Duluth',
            },
            destination: {
              name: 'Thunder Bay',
            },
          }),
        ];

        const csvDef: Tyr.CsvDef<Tyr.Trip> & { documents: Tyr.Trip[] } = {
          collection: Trip,
          documents: trips,
          columns: [
            { path: 'name' },
            { path: 'tripCode' },
            { path: 'origin.name' },
            { path: 'destination.name' },
          ],
          filename: 'trip2.csv',
          save: true,
        };

        await Tyr.csv.toCsv(csvDef);

        // TODO:  toCsv() is sometimes exiting before the file is completely written
        await Tyr.sleep(250);

        await Tyr.csv.fromCsv(csvDef);

        expect(await Location.count()).to.eql(2);
        expect(await Trip.count()).to.eql(1);

        const updatedTrip = (await Trip.findOne())!;
        expect(updatedTrip.tripCode).to.eql('ALPHA');
        expect(updatedTrip.name).to.eql('Lake Superior');
      } finally {
        await clearTestData();
      }
    });
  });
}
