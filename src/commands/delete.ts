import { Command } from 'commander';
import { deleteTransaction } from '../data';
import { loadConfig } from '../config';

/**
 * Creates the 'delete' command for deleting transactions.
 * @returns {Command} The Commander command object.
 */
export function createDeleteCommand(): Command {
  const deleteCommand = new Command();

  deleteCommand
    .name('delete')
    .description('Delete a transaction by its ID')
    .argument('<id>', 'The ID of the transaction to delete')
    .action((id, command) => {
      const globalOptions = command.parent.opts();
      const config = loadConfig(globalOptions.config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      deleteTransaction(dbPath, id);
    });

  return deleteCommand;
}
