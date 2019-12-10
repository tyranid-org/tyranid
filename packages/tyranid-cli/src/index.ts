#!/usr/bin/env node

import * as chalk from 'chalk';
import * as boxen from 'boxen';
import * as yargs from 'yargs';

import './cmd-pretty-json';

import { version } from '../package.json';

const orange = chalk.keyword('orange');

yargs
  .scriptName('tyr')

  .usage(
    boxen(`${orange.bold('tyranid')} command line tool v${version}`, {
      padding: 1,
      margin: 1,
      borderStyle: 'single' as any
    }) + '$0 <cmd> [args]'
  )
  .demandCommand()
  .help().argv;
