# tyranid-tdgen

[![npm version](https://badge.fury.io/js/tyranid-tdgen.svg)](https://badge.fury.io/js/tyranid-tdgen)
[![Build Status](https://travis-ci.org/tyranid-org/tyranid-tdgen.svg?branch=master)](https://travis-ci.org/tyranid-org/tyranid-tdgen)
[![codecov](https://codecov.io/gh/tyranid-org/tyranid-tdgen/branch/master/graph/badge.svg)](https://codecov.io/gh/tyranid-org/tyranid-tdgen)

Generate typescript `.d.ts` files from your tyranid schema definitions. The generated type definition files extend tyranids own type definitions through [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)


### Example Usage - Command Line

Pass your model directory to `tyranid-tdgen`

```bash
npm install -g tyranid-tdgen
tyranid-tdgen "./dist/example/models/*.js" > isomorphic.d.ts
```

For help...

```bash
tyranid-tdgen --help
```

### Example Usage - Module

(see `/example` for the code and output shown below)

Say we have a user tyranid collection, `User.ts`...

```typescript
import { Tyr } from 'tyranid';

export default new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    email: { is: 'email' },
    teamId: { is: 'mongoid' },
    skills: {
      is: 'array',
      of: {
        is: 'object',
        fields: {
          years: { is: 'integer' },
          name: { is: 'string' }
        }
      }
    }
  }
});
```

In a separate typescript/javascript file, after initializing tyranid, we can generate a type definition file like so...

```javascript
import { Tyr } from 'tyranid';
import * as fs from 'fs';
import * as mongodb from 'mongodb';
import * as path from 'path';
import { generateFile } from '../';

generate().catch(console.error);

async function generate() {
  const db = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/tyranid_tdgen'
  );

  await Tyr.config({
    db: db,
    validate: [
      {
        dir: path.resolve(__dirname, `./models/`),
        fileMatch: '.*.ts'
      }
    ]
  });

  await Promise.all([
    generateFile(
      Tyr.collections,
      path.resolve(__dirname, './output/isomorphic.d.ts')
    ),
    generateFile(
      Tyr.collections,
      path.resolve(__dirname, './output/server.d.ts'),
      { type: 'server' }
    ),
    generateFile(
      Tyr.collections,
      path.resolve(__dirname, './output/client.d.ts'),
      { type: 'client' }
    )
  ]);

  process.exit(0);
}
```

See `./example/output` for the resulting generated type definition files.