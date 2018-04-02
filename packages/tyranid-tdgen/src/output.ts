import { Tyr } from 'tyranid';
import * as fs from 'fs';
import { Readable } from 'stream';
import { InterfaceGenerationOptions } from './util';
import { generateServerDefinitionFile } from './server';
import { generateClientDefinitionFile } from './client';
import { generateIsomorphicDefinitionFile } from './isomorphic';

export type CodeType = 'client' | 'server' | 'isomorphic';

export interface DefinitionGenerationOptions
  extends InterfaceGenerationOptions {
  /**
   *
   * generate client side definitions instead of server
   *
   */
  type: CodeType;
}

function resolveGenerationMethod(type: CodeType) {
  switch (type) {
    case 'client':
      return generateClientDefinitionFile;
    case 'isomorphic':
      return generateIsomorphicDefinitionFile;
    case 'server':
      return generateServerDefinitionFile;
    default:
      throw new Error(`Invalid generation type = ${type}`);
  }
}

/**
 *
 * generate Tyranid collection interfaces
 * and pipe to nodejs writeable stream
 *
 */
export function generateStream(
  collections: Tyr.CollectionInstance[],
  opts: DefinitionGenerationOptions = { type: 'isomorphic' }
) {
  const stream = new Readable();
  const td = resolveGenerationMethod(opts.type)(collections, opts);
  stream.push(td);
  stream.push(null);
  return stream;
}

/**
 *
 * generate Tyranid collection interfaces
 * and write results to file synchronously
 *
 */
export function generateFileSync(
  collections: Tyr.CollectionInstance[],
  filename: string,
  opts: DefinitionGenerationOptions = { type: 'isomorphic' }
): string {
  const td = resolveGenerationMethod(opts.type)(collections, opts);
  fs.writeFileSync(filename, td);
  return td;
}

/**
 *
 * generate Tyranid collection interfaces
 * and write results to file
 *
 */
export function generateFile(
  collections: Tyr.CollectionInstance[],
  filename: string,
  opts: DefinitionGenerationOptions = { type: 'isomorphic' }
): Promise<string> {
  return new Promise((res, rej) => {
    const td = resolveGenerationMethod(opts.type)(collections, opts);
    fs.writeFile(filename, td, err => {
      if (err) rej(err);
      res(td);
    });
  });
}
