import * as chai from 'chai';

import { Tyr } from 'tyranid';

const { expect } = chai;

export function add() {
  const { Location, User, Trip } = Tyr.collections;

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
        filename: 'foo.csv',
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
          filename: 'trip.csv',
          save: true,
        };

        await Tyr.csv.toCsv(csvDef);

        const readTrips = await Tyr.csv.fromCsv(csvDef);
        console.log('got out');

        expect(readTrips.length).to.eql(trips.length);

        //await Trip.remove({ query: { name: 'Lake Superior' } });
        //await Location.remove({ query: { name: 'Duluth' } });
        //await Location.remove({ query: { name: 'Thunder Bay' } });

        for (let i = 0; i < trips.length; i++) {
          const trip = trips[i],
            readTrip = readTrips[i];

          const origin = await Location.byId(readTrip.origin!);
          const destination = await Location.byId(readTrip.destination!);

          expect(trip.$`origin.name`).to.eql(origin?.name);
          expect(trip.$`destination.name`).to.eql(destination?.name);
        }
      } finally {
        await Trip.remove({ query: { name: 'Lake Superior' } });
        await Location.remove({ query: { name: 'Duluth' } });
        await Location.remove({ query: { name: 'Thunder Bay' } });
      }
    });
  });
}
