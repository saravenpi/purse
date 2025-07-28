#!/usr/bin/env bun

import { Command } from 'commander';

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

// This is a placeholder for future commands
program
    .command('add', 'Add a new transaction', { executableFile: 'src/commands/add.ts' })
    .command('list', 'List all transactions', { executableFile: 'src/commands/list.ts' });


program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
