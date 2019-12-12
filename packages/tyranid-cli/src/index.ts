#!/usr/bin/env node

import * as fs from 'fs';

import * as chalk from 'chalk';
import * as boxen from 'boxen';
import * as yargs from 'yargs';

import * as mongodb from 'mongodb';

import { Tyr } from 'tyranid';

import { version } from '../package.json';

const orange = chalk.keyword('orange');

export const fail = (msg: string): never => {
  console.log(msg);
  process.exit(-1);
  throw new Error('make typescript happy');
};

export const exit = (): never => {
  process.exit(0);
  throw new Error('make typescript happy');
};

export const connect = async () => {
  const url = yargs.argv.db as string | undefined;
  if (!url) fail('expected --db option');

  let dbUrl, dbName;
  const lastSlash = url!.lastIndexOf('/');
  if (lastSlash === -1) {
    // if there is no slash, assume it is a database name and we want to access localhost
    dbUrl = 'mongodb://localhost:27017/';
    dbName = url;
  } else {
    dbUrl = url!.substring(0, lastSlash);
    dbName = url!.substring(lastSlash + 1);
  }

  const client = new mongodb.MongoClient(dbUrl, { useNewUrlParser: true });

  await client.connect();

  return client.db(dbName);
};

export const parseDirtyJson = (json: string) =>
  require('dirty-json').parse(json);

// TODO:  once we can connect to the model, use fromClient()/fromClientQuery() when able
export const idify = (val: any): any => {
  switch (typeof val) {
    case 'object':
      if (Array.isArray(val)) {
        return val.map(idify);
      } else {
        for (const name in val) {
          val[name] = idify(val[name]);
        }
        return val;
      }
    case 'string':
      return Tyr.isValidObjectIdStr(val) ? new mongodb.ObjectID(val) : val;
    default:
      return val;
  }
};

export const query = () => idify(parseDirtyJson(yargs.argv.query as string));

yargs
  .scriptName('tyr')
  .option('db', {
    type: 'string',
    describe: 'a MongoDB connection URL or a database name (will use localhost)'
  })
  .option('query', {
    alias: 'q',
    type: 'string',
    describe: 'a MongoDB query'
  });

const commandDir = __dirname + '/commands';

// note, not using commandDir here because commands as modules doesn't work well with typescript
fs.readdirSync(commandDir).forEach(file => {
  if (file.endsWith('.cmd.js')) {
    const fileName = commandDir + '/' + file;

    if (!fs.lstatSync(fileName).isDirectory()) {
      require(fileName);
    }
  }
});

yargs
  .usage(
    boxen(`${orange.bold('tyranid')} command line tool v${version}`, {
      padding: 1,
      margin: 1,
      borderStyle: 'single' as any
    }) + '$0 <cmd> [args]'
  )
  .demandCommand()
  .help().argv;
