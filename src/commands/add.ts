import { Command } from 'commander';
import { addTransaction } from '../data';

/**
 * Creates the 'add' command for adding new transactions.
 * @param {object} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createAddCommand(config: any): Command {
  const addCommand = new Command();

  addCommand
    .name('add')
    .description('Add a new transaction')
    .option('-a, --amount <amount>', 'The amount of the transaction')
    .option('-d, --description <description>', 'The description of the transaction')
    .action((options) => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      addTransaction(dbPath, parseFloat(options.amount), options.description);
    });

  return addCommand;
}
