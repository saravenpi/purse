import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadConfig,
  saveConfig,
  setCategoryBudget,
  getCurrentBudgetCycleStart,
  getCurrentBudgetCycleEnd,
} from '../config';
import { getBudgetUsage } from '../data';

/**
 * Creates the 'budget' command for managing category budgets.
 * @returns {Command} The Commander command object.
 */
export function createBudgetCommand(): Command {
  const budgetCommand = new Command();

  budgetCommand
    .name('budget')
    .description('Manage category budgets and view budget status')
    .option('-s, --set <category:amount>', 'Set budget for a category (e.g., "Food:500")')
    .option('-c, --cycle-day <day>', 'Set the budget cycle start day (1-31)', parseInt)
    .option('-l, --list', 'List all category budgets')
    .option('-t, --status', 'Show current budget status')
    .action((options, command) => {
      const { config, filePath } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';

      if (options.set) {
        const [category, amountStr] = options.set.split(':');
        if (!category || !amountStr) {
          console.log(chalk.red('Invalid format. Use: category:amount (e.g., "Food:500")'));
          return;
        }
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 0) {
          console.log(chalk.red('Amount must be a positive number'));
          return;
        }

        setCategoryBudget(config, category.trim(), amount);
        saveConfig(config, filePath);
        console.log(chalk.green(`Budget for '${category}' set to ${currencySymbol}${amount.toFixed(2)}`));
      } else if (options.cycleDay) {
        if (options.cycleDay < 1 || options.cycleDay > 31) {
          console.log(chalk.red('Cycle day must be between 1 and 31'));
          return;
        }
        if (!config.budget) {
          config.budget = {};
        }
        config.budget.cycleStartDay = options.cycleDay;
        saveConfig(config, filePath);
        console.log(chalk.green(`Budget cycle start day set to ${options.cycleDay}`));
      } else if (options.list) {
        const budgets = config.budget?.categoryBudgets || [];
        if (budgets.length === 0) {
          console.log(chalk.yellow('No budgets configured'));
          return;
        }

        console.log(chalk.bold('\n📊 Category Budgets\n'));
        budgets.forEach((budget) => {
          console.log(`${budget.category.padEnd(20)} ${currencySymbol}${budget.monthlyBudget.toFixed(2)}`);
        });
      } else if (options.status) {
        const budgets = config.budget?.categoryBudgets || [];
        if (budgets.length === 0) {
          console.log(chalk.yellow('No budgets configured'));
          return;
        }

        const cycleStartDay = config.budget?.cycleStartDay || 1;
        const cycleStart = getCurrentBudgetCycleStart(cycleStartDay);
        const cycleEnd = getCurrentBudgetCycleEnd(cycleStartDay);
        const budgetUsage = getBudgetUsage(dbPath, cycleStart, cycleEnd, budgets);
        const categoriesWithBudget = budgets.map(b => b.category);
        const allCategories = config.categories || [];
        const categoriesWithoutBudget = allCategories.filter(cat => !categoriesWithBudget.includes(cat));

        console.log(chalk.bold(`\n📊 Budget Status (${cycleStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()})\n`));

        budgetUsage.forEach((usage) => {
          const isOverBudget = usage.percentage > 100;
          const statusColor = isOverBudget ? chalk.red : usage.percentage > 80 ? chalk.yellow : chalk.green;
          const statusIcon = isOverBudget ? '🚨' : usage.percentage > 80 ? '⚠️' : '✅';
          const percentageBar = '█'.repeat(Math.min(Math.round(usage.percentage / 5), 20));
          
          console.log(`${statusIcon} ${usage.category.padEnd(20)} ${statusColor(percentageBar.padEnd(20))} ${usage.percentage.toFixed(1)}%`);
          console.log(`  Budget: ${currencySymbol}${usage.budget.toFixed(2)} | Spent: ${currencySymbol}${usage.spent.toFixed(2)} | Remaining: ${usage.remaining > 0 ? chalk.green(`${currencySymbol}${usage.remaining.toFixed(2)}`) : chalk.red('Over budget!')}`);
          if (isOverBudget) {
            console.log(`  ${chalk.red(`⚠️  Over budget by ${currencySymbol}${(usage.spent - usage.budget).toFixed(2)}`)}`);
          }
          console.log();
        });

        if (categoriesWithoutBudget.length > 0) {
          console.log(chalk.gray('\n📝 Categories without budget:'));
          categoriesWithoutBudget.forEach(category => {
            console.log(chalk.gray(`   ${category} (no budget set)`));
          });
        }
      } else {
        console.log(chalk.yellow('Use --help to see available options'));
      }
    });

  return budgetCommand;
}