import * as yargs from 'yargs';

import { connect, exit, fail, query } from '..';

yargs.command({
  command: 'extract-string [collection] [field]',
  describe: 'extracts a string out of the database',
  builder: yargs =>
    yargs
      .positional('collection', {
        type: 'string',
        describe: 'The collection to extract from'
      })
      .positional('field', {
        type: 'string',
        describe: 'The field to extract'
      }),
  async handler(argv) {
    const { collection, field } = argv;
    if (!collection) fail('A collection name is required');

    const db = await connect();

    const q = query();

    let val = await db.collection(collection as string).findOne(q);

    if (field) {
      if (!val)
        fail('Query: ' + JSON.stringify(q) + ' did not match any documents');
      val = (val as any)[field as string];
    }

    console.info(JSON.stringify(val, undefined, 2));
    exit();
  }
});
