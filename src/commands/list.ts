import { Command } from 'commander';

/**
 * Creates the 'list' command for listing all transactions.
 * @returns {Command} The Commander command object.
 */
export function createListCommand(): Command {
  const listCommand = new Command();

  listCommand
    .name('list')
    .description('List all transactions')
    .action(() => {
      console.log('Listing all transactions:');
    });

  return listCommand;
}
