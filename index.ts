#!/usr/bin/env bun

import { Command } from 'commander';
import { getAllCommands } from './src/commands';
import { loadConfig, Config } from './src/config';

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

// Parse only the known options (global ones) to get the config path early
// This is a common pattern for global options that affect command setup
program.parse(process.argv);
const options = program.opts(); // Get options from the initial parse
const config: Config = loadConfig(options.config);

// Add all commands, passing the loaded config
getAllCommands(config).forEach(command => program.addCommand(command));

// Now, parse the full arguments, including subcommands and their options
// This second parse is crucial for subcommands to be recognized
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
