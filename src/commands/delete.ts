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
      const { config } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      deleteTransaction(dbPath, id);
    });

  return deleteCommand;
}
