import * as fs from 'fs';
import * as path from 'path';
import { generateFile } from 'tyranid-tdgen';
import { Tyr } from '../';

main().catch(err => {
  console.log(err);
  process.exit(1);
});

const TYPE_DEFINITION_FOLDER = path.join(__dirname, '../test/typings');

async function main() {
  await Tyr.config({
    validate: [{ glob: path.join(__dirname, '../dist/test/models/**/*.js') }]
  });

  if (!fs.existsSync(TYPE_DEFINITION_FOLDER))
    fs.mkdirSync(TYPE_DEFINITION_FOLDER);

  const makeTypes = type => {
    console.log(`generating ${type} types...`);
    generateFile(
      Tyr.collections,
      path.join(TYPE_DEFINITION_FOLDER, type + '.d.ts'),
      { type }
    );
  };

  makeTypes('isomorphic');
  makeTypes('client');
  makeTypes('server');
}
