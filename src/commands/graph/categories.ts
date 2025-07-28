import { Command } from 'commander';
import chalk from 'chalk';
import { getTransactions } from '../../data';
import { loadConfig } from '../../config';

/**
 * Creates the 'categories' subcommand for the graph command.
 * @returns {Command} The Commander command object.
 */
export function createGraphCategoriesCommand(): Command {
  const categoriesCommand = new Command();

  categoriesCommand
    .name('categories')
    .alias('c')
    .description('Show category distribution and summary')
    .action((options, command) => {
      const { config } = loadConfig(command.parent.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';

      const transactions = getTransactions(dbPath);
      
      if (transactions.length === 0) {
        console.log('No transactions found.');
        return;
      }

      const categoryStats: { [key: string]: { total: number; count: number; income: number; expenses: number } } = {};

      transactions.forEach(tx => {
        const category = tx.category || 'Uncategorized';
        if (!categoryStats[category]) {
          categoryStats[category] = { total: 0, count: 0, income: 0, expenses: 0 };
        }
        categoryStats[category].total += tx.amount;
        categoryStats[category].count += 1;
        if (tx.amount > 0) {
          categoryStats[category].income += tx.amount;
        } else {
          categoryStats[category].expenses += Math.abs(tx.amount);
        }
      });

      const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => Math.abs(b.total) - Math.abs(a.total));

      console.log('\n📊 Category Distribution & Summary\n');

      const maxCategoryLength = Math.max(...sortedCategories.map(([cat]) => cat.length));
      const totalAmount = Object.values(categoryStats).reduce((sum, stat) => sum + Math.abs(stat.total), 0);

      const formatAmount = (amount: number) => {
        const formatted = ` ${amount >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(amount).toFixed(2)} `;
        return amount >= 0 ? chalk.black.bgGreen(formatted) : chalk.white.bgRed(formatted);
      };

      sortedCategories.forEach(([category, stats]) => {
        const percentage = totalAmount > 0 ? (Math.abs(stats.total) / totalAmount * 100) : 0;
        const barLength = Math.round(percentage / 2);
        const bar = stats.total >= 0 ? chalk.green('█'.repeat(Math.max(1, barLength))) : chalk.red('█'.repeat(Math.max(1, barLength)));
        
        console.log(`${category.padEnd(maxCategoryLength)} ${bar.padEnd(60)} ${formatAmount(stats.total)} (${percentage.toFixed(1)}%)`);
      });

      console.log('\n📋 Summary by Category:\n');
      
      sortedCategories.forEach(([category, stats]) => {
        console.log(`${category}:`);
        console.log(`  Total: ${formatAmount(stats.total)}`);
        console.log(`  Transactions: ${stats.count}`);
        console.log(`  Income: ${chalk.green(`${currencySymbol}${stats.income.toFixed(2)}`)}`);
        console.log(`  Expenses: ${chalk.red(`${currencySymbol}${stats.expenses.toFixed(2)}`)}`);
        console.log(`  Average: ${formatAmount(stats.total / stats.count)}`);
      });

      const totalTransactions = transactions.length;
      const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpenses = Math.abs(transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));
      const netAmount = totalIncome - totalExpenses;

      console.log('🎯 Overall Summary:');
      console.log(`Total Categories: ${Object.keys(categoryStats).length}`);
      console.log(`Total Transactions: ${totalTransactions}`);
      console.log(`Total Income: ${chalk.green(`${currencySymbol}${totalIncome.toFixed(2)}`)}`);
      console.log(`Total Expenses: ${chalk.red(`${currencySymbol}${totalExpenses.toFixed(2)}`)}`);
      console.log(`Net Amount: ${formatAmount(netAmount)}`);
    });

  return categoriesCommand;
}