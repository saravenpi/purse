#!/usr/bin/env bun

import { Command } from 'commander';

const program = new Command();

program
  .name('list')
  .description('List all transactions')
  .action(() => {
    console.log('Listing all transactions:');
  });

program.parse(process.argv);
