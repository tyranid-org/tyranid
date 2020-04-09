import * as fs from 'fs';

import * as yargs from 'yargs';
import { exit } from '..';

yargs.command({
  command: 'pretty-json [file]',
  describe: 'pretty-prints JSON',
  builder: yargs =>
    yargs.positional('file', { type: 'string', describe: 'The input file' }),
  handler(argv) {
    const contents = fs.readFileSync(argv.file as string, 'utf-8');
    console.info(JSON.stringify(JSON.parse(contents), undefined, 2));
    exit();
  },
});
