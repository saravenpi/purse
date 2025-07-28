import { Command } from 'commander';
import { getTransactions } from '../data';

/**
 * Creates the 'balance' command for displaying the current balance.
 * @param {object} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createBalanceCommand(config: any): Command {
  const balanceCommand = new Command();

  balanceCommand
    .name('balance')
    .description('Display the current balance')
    .action(() => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      const transactions = getTransactions(dbPath);
      const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      console.log(`Current Balance: ${balance.toFixed(2)}`);
    });

  return balanceCommand;
}
