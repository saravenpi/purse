#!/usr/bin/env bun

import { Command } from 'commander';
import { getAllCommands } from './src/commands';
// import { loadConfig, type Config } from './src/config';

const program = new Command();

program
  .name('purse')
  .description('A simple CLI tool to track your finances.')
  .version('0.0.7')
  .usage('[command] [options]')
  .option(
    '-c, --config <path>',
    'Path to the configuration file (default: ~/.purse.yml)'
  );

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ purse add --amount 50 --description "Groceries"');
  console.log('  $ purse list');
  console.log(
    '  $ purse interactive           # Start interactive mode with Reports & Analytics'
  );
  console.log('  $ purse balance              # View current balance');
});

// Add all commands
getAllCommands().forEach((command) => program.addCommand(command));

// Handle Ctrl+C (SIGINT) for graceful exit
process.on('SIGINT', () => {
  console.log('\nGoodbye! 👋');
  process.exit(0);
});

// Parse arguments
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
