# GraphQL frontend for Tyranid

[![npm version](https://badge.fury.io/js/tyranid-graphql.svg)](https://badge.fury.io/js/tyranid-graphql)
[![Build Status](https://travis-ci.org/tyranid-org/tyranid-graphql.svg?branch=master)](https://travis-ci.org/tyranid-org/tyranid-graphql)
[![codecov](https://codecov.io/gh/tyranid-org/tyranid-graphql/branch/master/graph/badge.svg)](https://codecov.io/gh/tyranid-org/tyranid-graphql)

This library adds a graphql query interpreter for the [`tyranid`](https://github.com/tyranid-org/tyranid)
mongodb ORM. The graphql schema is created from tyranid collection schemas using [`graphql-js`](https://github.com/graphql/graphql-js).

## Quick Example

After calling `graphqlize(Tyr)` on tyranid, use graphql queries for complex populations...

```javascript
import { Tyr } from 'tyranid';
import { graphqlize } from 'tyranid-graphql';

// ...
graphqlize(Tyr); // (synchronous)
// ...

// template tag syntax
const results = await Tyr.graphql`
  query userTeams {
    users {
      name
      teamIds {
        name,
        organizationId {
          name
        }
      }
    }
  }
`;

console.log(users[1].teamIds[2].organizationId.name); // => "Chipotle"
```

## Interactive graphql server Example

![Apollo server example](/test/example/example.gif)

To see an example of `apollo-server` (http://dev.apollodata.com/core/)
being used with a generated schema from tyranid, clone the repo, install deps...

```shell
npm install
```

and run the example server

```shell
npm start
```


## Detailed Code Example

Say we have the following tyranid collections...

```javascript
import { Tyr } from 'tyranid';

export const User = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    teamIds: {
      is: 'array',
      of: {
        link: 'team'
      }
    },
    organizationId: { link: 'organization' }
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

export const Organization = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' }
  }
});
```

We then can add graphql functionality to tyranid as follows

```javascript
import { Tyr } from 'tyranid';
import { graphqlize } from 'tyranid-graphql';


(async() => {
  const db = await mongodb
    .MongoClient
    .connect('mongodb://127.0.0.1:27017/tyranid_gracl_test');

  Tyr.config({
    db: db,
    validate: [
      { dir: __dirname,
        fileMatch: 'models.js' }
    ]
  });

  graphqlize(Tyr);
})();
```

Then, elsewhere in the app, we can use graphql queries
for complex population of linked collections.

Additionally, if a `Tyr.secure` plugin like `tyranid-gracl` is being utilized,
we can provide `auth` and `perm` parameters to have
properties / documents filtered by user permissions.

```javascript

const results = await Tyr.graphql({
  query: `
    query userTeams {
      users {
        name
        teamIds {
          name,
          organizationId {
            name
          }
        }
      }
    }
  `
  auth: req.user,
  perm: 'view'
});


// result === {
//     'data': {
//       'users': [
//         {
//           'name': 'ben',
//           'teamIds': [
//             {
//               'name': 'burritoMakers',
//               'organizationId': {
//                 'name': 'Chipotle'
//               }
//             },
//             {
//               'name': 'chipotleMarketing',
//               'organizationId': {
//                 'name': 'Chipotle'
//               }
//             }
//           ]
//         },
//         {
//           'name': 'ted',
//           'teamIds': [
//             {
//               'name': 'cavaEngineers',
//               'organizationId': {
//                 'name': 'Cava'
//               }
//             }
//           ]
//         },
//         {
//           'name': 'noTeams',
//           'teamIds': []
//         }
//       ]
//     }
//   };
```

## Installation

```bash
npm install tyranid-graphql
```

## License

MIT