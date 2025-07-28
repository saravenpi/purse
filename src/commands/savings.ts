import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadConfig,
  saveConfig,
  setSavingsGoal,
  removeSavingsGoal,
} from '../config';
import { getSavingsStats, addTransaction } from '../data';

/**
 * Creates the 'savings' command for managing savings goals and transactions.
 */
export function createSavingsCommand(): Command {
  const savingsCommand = new Command();

  savingsCommand
    .name('savings')
    .description('Manage savings goals and track savings progress')
    .option('-a, --add <amount>', 'Add a savings transaction', parseFloat)
    .option('-d, --description <desc>', 'Description for the savings transaction')
    .option('-g, --goal <name:target:priority>', 'Set a savings goal (e.g., "Emergency Fund:10000:high")')
    .option('-r, --remove-goal <name>', 'Remove a savings goal')
    .option('-l, --list-goals', 'List all savings goals')
    .action((options, command) => {
      const { config, filePath } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '

  return savingsCommand;
};

      if (options.add) {
        if (options.add <= 0) {
          console.log(chalk.red('Savings amount must be positive'));
          return;
        }
        const description = options.description || 'Savings';
        addTransaction(dbPath, options.add, description, 'Savings', true);
        console.log(chalk.green(`💰 Added ${currencySymbol}${options.add.toFixed(2)} to savings`));
        return;
      }

      if (options.goal) {
        const parts = options.goal.split(':');
        if (parts.length < 2 || parts.length > 3) {
          console.log(chalk.red('Invalid format. Use: "goalName:target:priority" (e.g., "Emergency Fund:10000:high")'));
          return;
        }
        
        const [name, targetStr, priority = 'medium'] = parts;
        const target = parseFloat(targetStr);
        
        if (isNaN(target) || target <= 0) {
          console.log(chalk.red('Target must be a positive number'));
          return;
        }
        
        if (!['low', 'medium', 'high'].includes(priority)) {
          console.log(chalk.red('Priority must be: low, medium, or high'));
          return;
        }

        setSavingsGoal(config, name.trim(), target, priority as 'low' | 'medium' | 'high');
        saveConfig(config, filePath);
        console.log(chalk.green(`🎯 Goal '${name}' set to ${currencySymbol}${target.toFixed(2)} (${priority} priority)`));
        return;
      }

      if (options.removeGoal) {
        const removed = removeSavingsGoal(config, options.removeGoal);
        if (removed) {
          saveConfig(config, filePath);
          console.log(chalk.green(`🗑️ Removed savings goal '${options.removeGoal}'`));
        } else {
          console.log(chalk.yellow(`Goal '${options.removeGoal}' not found`));
        }
        return;
      }

      if (options.listGoals) {
        const goals = config.savings?.goals || [];
        if (goals.length === 0) {
          console.log(chalk.yellow('No savings goals configured'));
          return;
        }

        console.log(chalk.bold('\n🎯 Savings Goals\n'));
        const stats = getSavingsStats(dbPath);
        
        goals.forEach((goal) => {
          const progress = stats.totalSavings;
          const percentage = goal.target > 0 ? (progress / goal.target) * 100 : 0;
          const remaining = Math.max(0, goal.target - progress);
          
          const priorityColor = goal.priority === 'high' ? chalk.red : 
                               goal.priority === 'medium' ? chalk.yellow : chalk.blue;
          const progressColor = percentage >= 100 ? chalk.green : 
                               percentage >= 75 ? chalk.yellow : chalk.red;
          
          console.log(`${goal.name} ${priorityColor(`[${goal.priority.toUpperCase()}]`)}`);
          console.log(`  Target: ${currencySymbol}${goal.target.toFixed(2)}`);
          console.log(`  Progress: ${progressColor(`${currencySymbol}${progress.toFixed(2)} (${percentage.toFixed(1)}%)`)}`);
          console.log(`  Remaining: ${currencySymbol}${remaining.toFixed(2)}`);
          if (goal.deadline) {
            console.log(`  Deadline: ${goal.deadline}`);
          }
          console.log();
        });
        return;
      }

      // If no options are provided, show savings status by default
      const stats = getSavingsStats(dbPath);
      const goals = config.savings?.goals || [];

      console.log(chalk.bold('\n💰 Savings Overview\n'));
      
      console.log(`Total Savings: ${chalk.green(`${currencySymbol}${stats.totalSavings.toFixed(2)}`)}`);
      console.log(`This Month: ${currencySymbol}${stats.thisMonthSavings.toFixed(2)}`);
      console.log(`Last Month: ${currencySymbol}${stats.lastMonthSavings.toFixed(2)}`);
      console.log(`Growth Rate: ${stats.savingsGrowthRate >= 0 ? chalk.green(`+${stats.savingsGrowthRate.toFixed(1)}%`) : chalk.red(`${stats.savingsGrowthRate.toFixed(1)}%`)}`);
      console.log(`Transactions: ${stats.savingsTransactionCount}`);
      console.log(`Average: ${currencySymbol}${stats.averageSavingsTransaction.toFixed(2)}`);

      if (goals.length > 0) {
        console.log(chalk.bold('\n🎯 Goals Progress\n'));
        goals.forEach((goal) => {
          const percentage = goal.target > 0 ? (stats.totalSavings / goal.target) * 100 : 0;
          const progressBar = '█'.repeat(Math.min(Math.round(percentage / 5), 20));
          const emptyBar = '░'.repeat(Math.max(0, 20 - Math.round(percentage / 5)));
          const statusColor = percentage >= 100 ? chalk.green : percentage >= 75 ? chalk.yellow : chalk.red;
          
          console.log(`${goal.name.padEnd(20)} ${statusColor(progressBar)}${chalk.gray(emptyBar)} ${percentage.toFixed(1)}%`);
        });
      }
    });

  return savingsCommand;
}