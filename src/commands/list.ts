import { Command } from 'commander';
import { getTransactions } from '../data';
import { loadConfig } from '../config';

/**
 * Creates the 'list' command for listing all transactions.
 * @returns {Command} The Commander command object.
 */
export function createListCommand(): Command {
  const listCommand = new Command();

  listCommand
    .name('list')
    .description('List all transactions')
    .action((options, command) => {
      const { config } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const transactions = getTransactions(dbPath);
      const currencySymbol = config.display?.currencySymbol || '$';
      const dateFormat = config.display?.dateFormat || 'en-US';

      if (transactions.length === 0) {
        console.log('No transactions found.');
      } else {
        console.log('Transactions:');
        transactions.forEach((tx) => {
          const date = new Date(tx.date).toLocaleString(dateFormat);
          const category = tx.category ? ` (Category: ${tx.category})` : '';
          console.log(
            `  ID: ${tx.id}, Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}`
          );
        });
      }
    });

  return listCommand;
}
