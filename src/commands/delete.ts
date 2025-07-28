import { Command } from 'commander';
import { deleteTransaction } from '../data';
import { Config } from '../config';

/**
 * Creates the 'delete' command for deleting transactions.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createDeleteCommand(config: Config): Command {
  const deleteCommand = new Command();

  deleteCommand
    .name('delete')
    .description('Delete a transaction by its ID')
    .argument('<id>', 'The ID of the transaction to delete')
    .action((id) => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      deleteTransaction(dbPath, id);
    });

  return deleteCommand;
}