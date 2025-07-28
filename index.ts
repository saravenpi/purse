#!/usr/bin/env bun

import { Command } from 'commander';

import { Command } from 'commander';
import { getAllCommands } from './src/commands';

const program = new Command();

program
  .name('purse')
  .description('A simple CLI tool to track your finances.')
  .version('0.0.1')
  .usage('[command] [options]');

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ purse add --amount 50 --description "Groceries"');
  console.log('  $ purse list');
});

getAllCommands().forEach(command => program.addCommand(command));

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
