import { Tyr } from 'tyranid';
import * as fs from 'fs';
import * as path from 'path';
import { generateFile } from '../';

generate().catch(console.error);

async function generate() {
  await Tyr.config({
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
