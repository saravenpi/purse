import { Command } from 'commander';
import { plot } from 'asciichart';
import chalk from 'chalk';
import { getTransactions } from '../../data';
import { loadConfig } from '../../config';

/**
 * Creates the 'balance' subcommand for the graph command.
 * @returns {Command} The Commander command object.
 */
export function createGraphBalanceCommand(): Command {
  const balanceCommand = new Command();

  balanceCommand
    .name('balance')
    .alias('b')
    .description('Show balance evolution over time')
    .action((options, command) => {
      const { config } = loadConfig(command.parent.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';
      const dateFormat = config.display?.dateFormat || 'en-US';

      const transactions = getTransactions(dbPath);

      if (transactions.length === 0) {
        console.log('No transactions found.');
        return;
      }

      const sortedTransactions = transactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let runningBalance = 0;
      const balanceData = sortedTransactions.map((tx) => {
        runningBalance += tx.amount;
        return runningBalance;
      });

      console.log('\n📈 Balance Evolution Over Time\n');
      const maxBalance = Math.max(...balanceData.map(Math.abs));
      const maxLength = `${currencySymbol}${maxBalance.toFixed(2)}`.length;

      console.log(
        plot(balanceData, {
          height: 15,
          format: (x: number) =>
            `${currencySymbol}${x.toFixed(2)}`.padStart(maxLength),
        })
      );

      const formatBalance = (amount: number) => {
        const formatted = ` ${currencySymbol}${amount.toFixed(2)} `;
        return amount >= 0
          ? chalk.black.bgGreen(formatted)
          : chalk.white.bgRed(formatted);
      };

      console.log(
        `\nDate Range: ${new Date(sortedTransactions[0]?.date ?? Date.now()).toLocaleDateString(dateFormat)} - ${new Date(sortedTransactions[sortedTransactions.length - 1]?.date ?? Date.now()).toLocaleDateString(dateFormat)}`
      );
      console.log(
        `Starting Balance: ${formatBalance(sortedTransactions[0]?.amount ?? 0)}`
      );
      console.log(`Current Balance: ${formatBalance(runningBalance)}`);
      console.log(`Total Transactions: ${transactions.length}`);
    });

  return balanceCommand;
}
