const fs = require('fs');
const path = require('path');

const { generateFile } = require('tyranid-tdgen');
const { Tyr } = require('../');

main().catch(err => {
  console.log(err);
  process.exit(1);
});

const TYPE_DEFINITION_FOLDER = path.join(__dirname, '../builtin');

async function main() {
  await Tyr.config({
    validate: true
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
