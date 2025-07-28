import { Command } from 'commander';
import { getTransactions } from '../data';

/**
 * Creates the 'list' command for listing all transactions.
 * @param {object} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createListCommand(config: any): Command {
  const listCommand = new Command();

  listCommand
    .name('list')
    .description('List all transactions')
    .action(() => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      const transactions = getTransactions(dbPath);
      if (transactions.length === 0) {
        console.log('No transactions found.');
      } else {
        console.log('Transactions:');
        transactions.forEach((tx) => {
          console.log(`  Date: ${new Date(tx.date).toLocaleString()}, Amount: ${tx.amount}, Description: ${tx.description}`);
        });
      }
    });

  return listCommand;
}
