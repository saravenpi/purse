import { Command } from 'commander';
import { addTransaction } from '../data';
import { Config } from '../config';

/**
 * Creates the 'update-balance' command to adjust the current balance.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createUpdateBalanceCommand(config: Config): Command {
  const updateBalanceCommand = new Command();

  updateBalanceCommand
    .name('update-balance')
    .description('Adjust the current balance by adding a transaction')
    .argument('<amount>', 'The amount to adjust the balance by (positive for income, negative for expense)')
    .option('-d, --description <description>', 'Description for the balance adjustment', 'Balance Adjustment')
    .option('-c, --category <category>', 'Category for the balance adjustment', 'System')
    .action((amount, options) => {
      const dbPath = config.database?.path || '~/.purse_data.json';

      addTransaction(dbPath, parseFloat(amount), options.description, options.category);
      console.log(`Balance adjusted by ${parseFloat(amount).toFixed(2)}.`);
    });

  return updateBalanceCommand;
}