#!/usr/bin/env bun

import { Command } from 'commander';

const program = new Command();

program
  .name('add')
  .description('Add a new transaction')
  .option('-a, --amount <amount>', 'The amount of the transaction')
  .option('-d, --description <description>', 'The description of the transaction')
  .action((options) => {
    console.log('Adding a new transaction:');
    console.log(`  Amount: ${options.amount}`);
    console.log(`  Description: ${options.description}`);
  });

program.parse(process.argv);
