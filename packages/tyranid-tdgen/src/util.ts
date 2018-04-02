import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { Tyr } from 'tyranid';

export const { version } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);

export interface InterfaceGenerationOptions {
  // write date to file
  date?: boolean;
  // string to write at top of generated file
  header?: string;
  // length of comment lines
  commentLineWidth?: number;
  // generate base interfaces?
  isomorphic?: boolean;
}

/**
 * add indentation to string for emit
 */
export function pad(str: string, n: number) {
  let indent = '';
  let curr = '  ';
  while (true) {
    if (n & 1) indent += curr;
    n >>>= 1;
    if (n <= 0) break;
    curr += curr;
  }

  return indent + str;
}

/**
 * create a tagged union type from an array of primatives
 */
export function unionType(arr: any[], prop?: string): string {
  return _.chain(arr)
    .map(el => (prop ? _.get(el, prop) : el))
    .sortBy()
    .map(v => (typeof v === 'string' ? `'${v}'` : v))
    .join('|')
    .value();
}

export function wrappedUnionType(arr: any[], prop: string, indent: number) {
  const idType = unionType(arr, prop);

  return idType.split('|').join('\n' + pad(' |', indent - 1));
}

/**
 *
 * split a string into lines of a certain width
 *
 */
export function wordWrap(
  str: string,
  opts:
    | number
    | {
        width?: number;
        split?: RegExp;
        join?: string;
        breakWords?: boolean;
      } = {}
): string[] {
  let { width = 80, split = /\s+/g, join = ' ', breakWords = true } =
    typeof opts === 'number' ? { width: opts } : opts;

  const lines: string[] = [];
  const words = str.trim().split(split);
  const HYPHEN = '-';

  let line = '';
  let word: string | undefined;

  while ((word = words.shift())) {
    if (line.length + join.length + word.length <= width) {
      line += join + word;
    } else if (line.length < width) {
      const remainingChars = width - line.length;

      if (remainingChars > 1) {
        if (!breakWords || word.length < width) {
          lines.push(line.trim());
          line = word;
        } else {
          const substringLength = remainingChars - join.length - HYPHEN.length;
          line += join + word.substring(0, substringLength) + HYPHEN;
          lines.push(line.trim());

          word = word.substring(substringLength);

          while (word.length >= width) {
            line = word.substring(0, width - HYPHEN.length) + HYPHEN;
            lines.push(line);
            word = word.substring(width - HYPHEN.length);
          }

          line = word;
        }
      } else {
        lines.push(line.trim());
        line = word;
      }
    } else {
      lines.push(line.trim());
      line = word;
    }
  }

  if (line) lines.push(line);

  return lines.map(l => (l.startsWith(join) ? l.replace(join, '') : l));
}
