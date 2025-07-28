#!/usr/bin/env bun

import { Command } from 'commander';
import { getAllCommands } from './src/commands';

const program = new Command();

program
  .name('purse')
  .description('A simple CLI tool to track your finances.')
  .version('0.0.1')
  .usage('[command] [options]')
  .option('-c, --config <path>', 'Path to the configuration file (default: ~/.purse.yml)');

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ purse add --amount 50 --description "Groceries"');
  console.log('  $ purse list');
});

// Add all commands without passing config initially
getAllCommands().forEach(command => program.addCommand(command));

// Parse arguments once, after all commands are defined
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
