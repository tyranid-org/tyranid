import * as program from 'commander';
import * as mongodb from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import { generateStream } from './index';

const ROOT = __dirname;
const config = require(path.join(ROOT, '../../package.json'));
const CWD = process.cwd();
const { Tyr } = require(path.join(
  CWD,
  './node_modules/tyranid/dist/src/tyranid.js'
));
let fileGlob: string | undefined;

program
  .version(config.version)
  .usage('[options] <glob>')
  .option(
    '-o, --out-file [outFileName]',
    'File to output declaration into, defaults to stdout'
  )
  .option(
    '-t, --type [outputType]',
    'type of definitions to output (client|server|isomorphic)'
  )
  .action(glob => {
    fileGlob = glob;
  })
  .parse(process.argv);

/**
 * Run command
 */
(async () => {
  if (!fileGlob) return program.help();
  const root = process.cwd();
  const outFile = program['outFile'];

  const globToUse =
    path.resolve(fileGlob) === fileGlob ? fileGlob : path.join(CWD, fileGlob);

  const log = console.log;
  if (!outFile) (console as any).log = () => {};
  await Tyr.config({ validate: [{ glob: globToUse }] });
  if (!outFile) console.log = log;

  const stream = generateStream(Tyr.collections, {
    type: program.type || 'isomorphic'
  });

  if (outFile) {
    const filename = path.join(root, outFile);
    stream.pipe(
      fs.createWriteStream(filename).on('finish', () => {
        process.exit(0);
      })
    );
  } else {
    stream.pipe(process.stdout);
    stream.on('end', () => {
      process.exit(0);
    });
  }
})().catch(err => {
  console.log(err.stack);
  process.exit(1);
});
