import { Command } from 'commander';
import { getTransactions } from '../data';
import { Config } from '../config';

/**
 * Creates the 'balance' command for displaying the current balance.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createBalanceCommand(config: Config): Command {
  const balanceCommand = new Command();

  balanceCommand
    .name('balance')
    .description('Display the current balance')
    .action(() => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';
      const transactions = getTransactions(dbPath);
      const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      console.log(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`);
    });

  return balanceCommand;
}