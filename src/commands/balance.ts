import { Command } from 'commander';
import { getTransactions } from '../data';
import { loadConfig } from '../config';

/**
 * Creates the 'balance' command for displaying the current balance.
 * @returns {Command} The Commander command object.
 */
export function createBalanceCommand(): Command {
  const balanceCommand = new Command();

  balanceCommand
    .name('balance')
    .description('Display the current balance')
    .action((options, command) => {
      const { config } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';
      const transactions = getTransactions(dbPath);
      const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      console.log(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`);
    });

  return balanceCommand;
}
