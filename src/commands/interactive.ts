import { Command } from 'commander';
import inquirer from 'inquirer';
import { plot } from 'asciichart';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  addTransaction,
  getTransactions,
  deleteTransaction,
  editTransaction,
  clearTransactions,
  getBudgetUsage,
  getSavingsStats,
  getSavingsTransactions,
  type Transaction,
} from '../data';
import {
  loadConfig,
  saveConfig,
  type Config,
  getCategoryBudget,
  setCategoryBudget,
  getCurrentBudgetCycleStart,
  getCurrentBudgetCycleEnd,
  setSavingsGoal,
  removeSavingsGoal,
} from '../config';

/**
 * Manages transaction-related interactive operations (both incomes and expenses).
 * @param {Config} config - The configuration object.
 * @param {string} configFilePath - The path to the configuration file.
 * @returns {Promise<void>} Promise that resolves when transaction management is complete.
 */
async function manageTransactions(config: Config, configFilePath: string) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';
  const dateFormat = config.display?.dateFormat || 'en-US';
  const categories = config.categories || [];

  let managingTransactions = true;
  while (managingTransactions) {
    try {
      const transactions = getTransactions(dbPath);
      const transactionChoices = transactions.map((tx) => ({
        name: `ID: ${tx.id}, Date: ${new Date(tx.date).toLocaleString(dateFormat)}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${tx.category ? ` (Category: ${tx.category})` : ''}${tx.isSavings ? ' 🏦' : ''}`,
        value: tx.id,
      }));

      const choices = [
        '➕ Add New Transaction',
        new inquirer.Separator(),
        ...(transactions.length === 0
          ? [
              {
                name: chalk.gray(
                  'No transactions yet. Add your first transaction!'
                ),
                value: 'no-transactions',
              },
            ]
          : transactionChoices),
        new inquirer.Separator(),
        '↩️ Back to Main Menu',
      ];

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Manage Transactions: (Press Esc or Ctrl+C to go back)',
        choices: choices as any,
        loop: false,
        pageSize: 10,
      });

      if (action === '➕ Add New Transaction') {
        try {
          const addAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'amount',
              message:
                'Enter amount (positive for income, negative for expense):',
              validate: (value) =>
                !isNaN(parseFloat(value)) || 'Please enter a valid number',
            },
            {
              type: 'input',
              name: 'description',
              message: 'Enter description:',
            },
            {
              type: categories.length > 0 ? 'list' : 'input',
              name: 'category',
              message: 'Enter category (optional):',
              choices:
                categories.length > 0 ? [...categories, 'Other'] : undefined,
            },
            {
              type: 'confirm',
              name: 'isSavings',
              message: 'Is this a savings transaction?',
              default: false,
              when: (answers) => parseFloat(answers.amount) > 0,
            },
          ]);
          let finalCategory = addAnswers.category;
          if (addAnswers.category === 'Other') {
            const { newCategory } = await inquirer.prompt({
              type: 'input',
              name: 'newCategory',
              message: 'Enter new category:',
            });
            finalCategory = newCategory;
            if (newCategory && !categories.includes(newCategory)) {
              categories.push(newCategory);
              config.categories = categories;
              saveConfig(config, configFilePath);
              console.log(`Category '${newCategory}' added to your config.`);
            }
          }
          addTransaction(
            dbPath,
            parseFloat(addAnswers.amount),
            addAnswers.description,
            finalCategory,
            addAnswers.isSavings
          );
          console.log('Transaction added successfully!');
        } catch (_) {
          console.log('Operation cancelled.');
        }
      } else if (action === '↩️ Back to Main Menu') {
        managingTransactions = false;
      } else if (action === 'no-transactions') {
        // Do nothing, this is just a display message
      } else {
        const selectedTransactionId = action;
        const transaction = transactions.find(
          (tx) => tx.id === selectedTransactionId
        );

        if (transaction) {
          let managingSpecificTransaction = true;
          while (managingSpecificTransaction) {
            try {
              const { specificAction } = await inquirer.prompt({
                type: 'list',
                name: 'specificAction',
                message: `Manage Transaction (ID: ${transaction.id}):`,
                choices: [
                  '✏️ Edit',
                  '🗑️ Delete',
                  '↩️ Back to Transaction List',
                ],
                loop: false,
                pageSize: 10,
              });

              switch (specificAction) {
                case '✏️ Edit':
                  try {
                    const editAnswers = await inquirer.prompt([
                      {
                        type: 'input',
                        name: 'amount',
                        message: 'New amount:',
                        default: transaction.amount.toString(),
                        validate: (value) =>
                          !isNaN(parseFloat(value)) ||
                          'Please enter a valid number',
                      },
                      {
                        type: 'input',
                        name: 'description',
                        message: 'New description:',
                        default: transaction.description,
                      },
                      {
                        type: categories.length > 0 ? 'list' : 'input',
                        name: 'category',
                        message: 'New category (optional):',
                        default: transaction.category,
                        choices:
                          categories.length > 0
                            ? [...categories, 'Other']
                            : undefined,
                      },
                      {
                        type: 'confirm',
                        name: 'isSavings',
                        message: 'Is this a savings transaction?',
                        default: transaction.isSavings || false,
                        when: (answers) => parseFloat(answers.amount) > 0,
                      },
                    ]);
                    let updatedCategory = editAnswers.category;
                    if (editAnswers.category === 'Other') {
                      const { newCategory } = await inquirer.prompt({
                        type: 'input',
                        name: 'newCategory',
                        message: 'Enter new category:',
                      });
                      updatedCategory = newCategory;
                      if (newCategory && !categories.includes(newCategory)) {
                        categories.push(newCategory);
                        config.categories = categories;
                        saveConfig(config, configFilePath);
                        console.log(
                          `Category '${newCategory}' added to your config.`
                        );
                      }
                    }
                    editTransaction(dbPath, selectedTransactionId, {
                      amount: parseFloat(editAnswers.amount),
                      description: editAnswers.description,
                      category: updatedCategory,
                      isSavings: editAnswers.isSavings,
                    });
                  } catch (_) {
                    console.log('Operation cancelled.');
                  }
                  break;
                case '🗑️ Delete':
                  try {
                    deleteTransaction(dbPath, selectedTransactionId);
                    managingSpecificTransaction = false;
                  } catch (_) {
                    console.log('Operation cancelled.');
                  }
                  break;
                case '↩️ Back to Transaction List':
                  managingSpecificTransaction = false;
                  break;
              }
            } catch (_) {
              console.log('Operation cancelled.');
              managingSpecificTransaction = false;
            }
          }
        }
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingTransactions = false;
    }
  }
}

/**
 * Manages balance-related interactive operations.
 * @param {Config} config - The configuration object.
 * @param {string} configFilePath - The path to the configuration file.
 * @returns {Promise<void>} Promise that resolves when balance management is complete.
 */
async function manageBalance(config: Config, configFilePath: string) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';

  let managingBalance = true;
  while (managingBalance) {
    try {
      const currentBalance = getTransactions(dbPath).reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
      const formattedBalance = ` ${currencySymbol}${currentBalance.toFixed(2)} `;
      const balanceWithBackground =
        currentBalance === 0
          ? chalk.black.bgWhite(formattedBalance)
          : currentBalance > 0
            ? chalk.black.bgGreen(formattedBalance)
            : chalk.white.bgRed(formattedBalance);
      console.log(`\nCurrent Balance: ${balanceWithBackground}\n`);

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Manage Balance: (Press Esc or Ctrl+C to go back)',
        choices: [
          '⚖️ Set Balance',
          '💱 Update Balance',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '⚖️ Set Balance':
          try {
            const { amount } = await inquirer.prompt({
              type: 'input',
              name: 'amount',
              message: 'Enter new balance amount:',
              validate: (value) =>
                !isNaN(parseFloat(value)) || 'Please enter a valid number',
            });
            clearTransactions(dbPath);
            addTransaction(
              dbPath,
              parseFloat(amount),
              'Initial Balance',
              'System',
              false
            );
            console.log(`Balance set to ${parseFloat(amount).toFixed(2)}.`);
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;
        case '💱 Update Balance':
          try {
            const { amount, description, category } = await inquirer.prompt([
              {
                type: 'input',
                name: 'amount',
                message:
                  'Enter amount to adjust by (positive for income, negative for expense):',
                validate: (value) =>
                  !isNaN(parseFloat(value)) || 'Please enter a valid number',
              },
              {
                type: 'input',
                name: 'description',
                message: 'Enter description:',
                default: 'Balance Adjustment',
              },
              {
                type:
                  config.categories && config.categories.length > 0
                    ? 'list'
                    : 'input',
                name: 'category',
                message: 'Enter category (optional):',
                default: 'System',
                choices:
                  config.categories && config.categories.length > 0
                    ? [...config.categories, 'Other']
                    : undefined,
              },
            ]);
            let updatedCategory = category;
            if (category === 'Other') {
              const { newCategory } = await inquirer.prompt({
                type: 'input',
                name: 'newCategory',
                message: 'Enter new category:',
              });
              updatedCategory = newCategory;
              if (newCategory && !config.categories?.includes(newCategory)) {
                config.categories = config.categories || [];
                config.categories.push(newCategory);
                saveConfig(config, configFilePath);
                console.log(`Category '${newCategory}' added to your config.`);
              }
            }
            addTransaction(
              dbPath,
              parseFloat(amount),
              description,
              updatedCategory,
              false
            );
            console.log(
              `Balance adjusted by ${parseFloat(amount).toFixed(2)}.`
            );
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;
        case '↩️ Back to Main Menu':
          managingBalance = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingBalance = false;
    }
  }
}

/**
 * Generates a markdown financial report from transactions
 */
function generateMarkdownReport(transactions: Transaction[], config: Config): string {
  const currencySymbol = config.display?.currencySymbol || '$';
  const dateFormat = config.display?.dateFormat || 'en-US';
  const reportDate = new Date().toLocaleDateString(dateFormat);

  const sortedTransactions = transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate category statistics
  const categoryStats: {
    [key: string]: {
      total: number;
      count: number;
      income: number;
      expenses: number;
    };
  } = {};
  transactions.forEach((tx) => {
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

  const totalIncome = transactions
    .filter((tx) => tx.amount > 0 && !tx.isSavings)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = Math.abs(
    transactions
      .filter((tx) => tx.amount < 0 && !tx.isSavings)
      .reduce((sum, tx) => sum + tx.amount, 0)
  );
  const totalSavings = transactions
    .filter((tx) => tx.isSavings && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const sortedCategories = Object.entries(categoryStats).sort(
    ([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total)
  );

  let markdown = `# Financial Report

**Generated:** ${reportDate}  
**Report Period:** ${new Date(sortedTransactions[sortedTransactions.length - 1]?.date || Date.now()).toLocaleDateString(dateFormat)} - ${new Date(sortedTransactions[0]?.date || Date.now()).toLocaleDateString(dateFormat)}

## 💰 Financial Summary

| Metric | Amount |
|--------|--------|
| **Current Balance** | ${currencySymbol}${balance.toFixed(2)} |
| **Total Income** | ${currencySymbol}${totalIncome.toFixed(2)} |
| **Total Expenses** | ${currencySymbol}${totalExpenses.toFixed(2)} |
| **Total Savings** | ${currencySymbol}${totalSavings.toFixed(2)} |
| **Net Amount** | ${currencySymbol}${(totalIncome - totalExpenses).toFixed(2)} |
| **Total Transactions** | ${transactions.length} |
| **Categories** | ${Object.keys(categoryStats).length} |

## 📊 Categories Overview

| Category | Total | Transactions | Income | Expenses | Average |
|----------|-------|--------------|--------|----------|---------|
`;

  sortedCategories.forEach(([category, stats]) => {
    const avg = stats.total / stats.count;
    markdown += `| ${category} | ${currencySymbol}${stats.total.toFixed(2)} | ${stats.count} | ${currencySymbol}${stats.income.toFixed(2)} | ${currencySymbol}${stats.expenses.toFixed(2)} | ${currencySymbol}${avg.toFixed(2)} |\n`;
  });

  markdown += `
## 📝 Recent Transactions

| Date | Amount | Description | Category |
|------|--------|-------------|----------|
`;

  sortedTransactions.slice(0, 20).forEach((tx) => {
    const date = new Date(tx.date).toLocaleDateString(dateFormat);
    const amount = `${tx.amount >= 0 ? '+' : ''}${currencySymbol}${tx.amount.toFixed(2)}`;
    const category = tx.category || 'Uncategorized';
    markdown += `| ${date} | ${amount} | ${tx.description} | ${category} |\n`;
  });

  if (transactions.length > 20) {
    markdown += `\n*Showing latest 20 transactions out of ${transactions.length} total.*\n`;
  }

  if (totalSavings > 0) {
    const savingsTransactions = transactions.filter(tx => tx.isSavings);
    markdown += `
## 🏦 Savings Summary

| Metric | Value |
|--------|-------|
| **Total Savings** | ${currencySymbol}${totalSavings.toFixed(2)} |
| **Savings Transactions** | ${savingsTransactions.length} |
| **Average Savings** | ${currencySymbol}${(totalSavings / savingsTransactions.length).toFixed(2)} |
| **Savings Rate** | ${totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0}% |

### Recent Savings Transactions

| Date | Amount | Description |
|------|--------|-------------|
`;

    savingsTransactions.slice(0, 10).forEach((tx) => {
      const date = new Date(tx.date).toLocaleDateString(dateFormat);
      markdown += `| ${date} | +${currencySymbol}${tx.amount.toFixed(2)} | ${tx.description} |\n`;
    });

    if (savingsTransactions.length > 10) {
      markdown += `\n*Showing latest 10 savings transactions out of ${savingsTransactions.length} total.*\n`;
    }
  }

  markdown += `
## 📈 Financial Health Indicators

- **Income/Expense Ratio:** ${totalExpenses > 0 ? (totalIncome / totalExpenses).toFixed(2) : 'N/A'}
- **Savings Rate:** ${totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0}%
- **Average Transaction:** ${currencySymbol}${(transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / transactions.length).toFixed(2)}
- **Largest Income:** ${currencySymbol}${Math.max(...transactions.filter((tx) => tx.amount > 0 && !tx.isSavings).map((tx) => tx.amount), 0).toFixed(2)}
- **Largest Expense:** ${currencySymbol}${Math.max(...transactions.filter((tx) => tx.amount < 0).map((tx) => Math.abs(tx.amount)), 0).toFixed(2)}
- **Largest Savings:** ${currencySymbol}${Math.max(...transactions.filter((tx) => tx.isSavings && tx.amount > 0).map((tx) => tx.amount), 0).toFixed(2)}

---
*Report generated by Purse CLI*
`;

  return markdown;
}

/**
 * Manages savings-related interactive operations.
 */
async function manageSavings(config: Config, configFilePath: string) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '

/**
 * Manages budget-related interactive operations.
 */
async function manageBudget(config: Config, configFilePath: string) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';
  const categories = config.categories || [];

  let managingBudget = true;
  while (managingBudget) {
    try {
      const cycleStartDay = config.budget?.cycleStartDay || 1;
      const cycleStart = getCurrentBudgetCycleStart(cycleStartDay);
      const cycleEnd = getCurrentBudgetCycleEnd(cycleStartDay);
      const budgets = config.budget?.categoryBudgets || [];

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Budget Management:',
        choices: [
          '📊 View Budget Status',
          '💸 Set Category Budget',
          '📅 Set Budget Cycle Start Day',
          '📋 List All Budgets',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '📊 View Budget Status':
          if (budgets.length === 0) {
            console.log(chalk.yellow('No budgets configured yet.'));
            break;
          }

          const budgetUsage = getBudgetUsage(dbPath, cycleStart, cycleEnd, budgets);
          const categoriesWithBudget = budgets.map(b => b.category);
          const allCategories = categories;
          const categoriesWithoutBudget = allCategories.filter(cat => !categoriesWithBudget.includes(cat));
          
          console.log(chalk.bold(`\n💸 Budget Status (${cycleStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()})\n`));

          budgetUsage.forEach((usage) => {
            const isOverBudget = usage.percentage > 100;
            const isNearBudget = usage.percentage > 80;
            
            let statusColor = chalk.green;
            let statusIcon = '✅';
            
            if (isOverBudget) {
              statusColor = chalk.red;
              statusIcon = '🚨';
            } else if (isNearBudget) {
              statusColor = chalk.yellow;
              statusIcon = '⚠️';
            }

            const percentageBar = '█'.repeat(Math.min(Math.round(usage.percentage / 5), 20));
            const emptyBar = '░'.repeat(Math.max(0, 20 - Math.round(usage.percentage / 5)));
            
            console.log(`${statusIcon} ${usage.category.padEnd(20)}`);
            console.log(`   ${statusColor(percentageBar)}${chalk.gray(emptyBar)} ${usage.percentage.toFixed(1)}%`);
            console.log(`   Budget: ${currencySymbol}${usage.budget.toFixed(2)} | Spent: ${statusColor(`${currencySymbol}${usage.spent.toFixed(2)}`)} | Remaining: ${usage.remaining > 0 ? chalk.green(`${currencySymbol}${usage.remaining.toFixed(2)}`) : chalk.red('Over budget!')}`);
            
            if (isOverBudget) {
              console.log(`   ${chalk.red(`⚠️  Over budget by ${currencySymbol}${(usage.spent - usage.budget).toFixed(2)}`)}`);
            }
            console.log();
          });

          if (categoriesWithoutBudget.length > 0) {
            console.log(chalk.gray('\n📝 Categories without budget:'));
            categoriesWithoutBudget.forEach(category => {
              console.log(chalk.gray(`   ${category} (no budget set)`));
            });
            console.log();
          }
          break;

        case '💸 Set Category Budget':
          if (categories.length === 0) {
            console.log(chalk.yellow('No categories available. Add categories first.'));
            break;
          }

          try {
            const { category } = await inquirer.prompt({
              type: 'list',
              name: 'category',
              message: 'Select category to set budget:',
              choices: categories,
            });

            const currentBudget = getCategoryBudget(config, category);
            const { budget } = await inquirer.prompt({
              type: 'input',
              name: 'budget',
              message: `Enter monthly budget for '${category}':`,
              default: currentBudget > 0 ? currentBudget.toString() : '',
              validate: (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
              },
            });

            setCategoryBudget(config, category, parseFloat(budget));
            saveConfig(config, configFilePath);
            console.log(chalk.green(`✅ Budget for '${category}' set to ${currencySymbol}${parseFloat(budget).toFixed(2)}`));
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;

        case '📅 Set Budget Cycle Start Day':
          try {
            const currentDay = config.budget?.cycleStartDay || 1;
            const { cycleDay } = await inquirer.prompt({
              type: 'input',
              name: 'cycleDay',
              message: 'Enter budget cycle start day (1-31):',
              default: currentDay.toString(),
              validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 1 && num <= 31 || 'Please enter a number between 1 and 31';
              },
            });

            if (!config.budget) {
              config.budget = {};
            }
            config.budget.cycleStartDay = parseInt(cycleDay);
            saveConfig(config, configFilePath);
            console.log(chalk.green(`✅ Budget cycle start day set to ${cycleDay}`));
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;

        case '📋 List All Budgets':
          if (budgets.length === 0) {
            console.log(chalk.yellow('No budgets configured yet.'));
            break;
          }

          console.log(chalk.bold('\n💸 Category Budgets\n'));
          budgets.forEach((budget) => {
            console.log(`${budget.category.padEnd(20)} ${currencySymbol}${budget.monthlyBudget.toFixed(2)}`);
          });
          console.log(`\nBudget cycle starts on day ${config.budget?.cycleStartDay || 1} of each month`);
          break;

        case '↩️ Back to Main Menu':
          managingBudget = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingBudget = false;
    }
  }
}

/**
 * Manages graph-related interactive operations.
 * @param {Config} config - The configuration object.
 * @returns {Promise<void>} Promise that resolves when graph management is complete.
 */
async function manageGraphs(config: Config) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';
  const dateFormat = config.display?.dateFormat || 'en-US';

  let managingGraphs = true;
  while (managingGraphs) {
    try {
      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Reports & Analytics: (Press Esc or Ctrl+C to go back)',
        choices: [
          '📈 Balance Evolution',
          '📊 Category Distribution',
          '📊 Category Bar Chart',
          '🏦 Savings Progress',
          '📋 Export Financial Report (MD)',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '📈 Balance Evolution':
          const transactions = getTransactions(dbPath);

          if (transactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const sortedTransactions = transactions.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          let runningBalance = 0;
          const balanceData = sortedTransactions.map((tx) => {
            runningBalance += tx.amount;
            return runningBalance;
          });

          const formatBalance = (amount: number) => {
            const formatted = ` ${currencySymbol}${amount.toFixed(2)} `;
            return amount === 0
              ? chalk.black.bgWhite(formatted)
              : amount > 0
                ? chalk.black.bgGreen(formatted)
                : chalk.white.bgRed(formatted);
          };

          console.log('\n📈 Balance Evolution Over Time\n');
          
          const maxBalance = Math.max(...balanceData.map(Math.abs));
          const minBalance = Math.min(...balanceData);
          const maxValue = maxBalance;
          const minValue = Math.min(0, minBalance);
          
          const maxLength = Math.max(
            `${currencySymbol}${maxValue.toFixed(2)}`.length,
            `${currencySymbol}${Math.abs(minValue).toFixed(2)}`.length + (minValue < 0 ? 1 : 0)
          );
          
          console.log(
            plot(balanceData, {
              height: 15,
              format: (x: number) => {
                const formatted = x < 0 
                  ? `-${currencySymbol}${Math.abs(x).toFixed(2)}`
                  : `${currencySymbol}${x.toFixed(2)}`;
                return formatted.padStart(maxLength);
              },
            })
          );

          console.log(
            `\nDate Range: ${new Date(sortedTransactions[0]?.date ?? Date.now()).toLocaleDateString(dateFormat)} - ${new Date(sortedTransactions[sortedTransactions.length - 1]?.date ?? Date.now()).toLocaleDateString(dateFormat)}`
          );
          console.log(
            `Starting Balance: ${formatBalance(sortedTransactions[0]?.amount ?? 0)}`
          );
          console.log(`Current Balance: ${formatBalance(runningBalance)}`);
          console.log(`Total Transactions: ${transactions.length}`);
          break;

        case '📊 Category Distribution':
          const categoryTransactions = getTransactions(dbPath);

          if (categoryTransactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const categoryStats: {
            [key: string]: {
              total: number;
              count: number;
              income: number;
              expenses: number;
            };
          } = {};

          categoryTransactions.forEach((tx) => {
            const category = tx.category || 'Uncategorized';
            if (!categoryStats[category]) {
              categoryStats[category] = {
                total: 0,
                count: 0,
                income: 0,
                expenses: 0,
              };
            }
            categoryStats[category].total += tx.amount;
            categoryStats[category].count += 1;
            if (tx.amount > 0) {
              categoryStats[category].income += tx.amount;
            } else {
              categoryStats[category].expenses += Math.abs(tx.amount);
            }
          });

          const sortedCategories = Object.entries(categoryStats).sort(
            ([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total)
          );

          console.log('\n📊 Category Distribution & Summary\n');

          const maxCategoryLength = Math.max(
            ...sortedCategories.map(([cat]) => cat.length)
          );
          const totalAmount = Object.values(categoryStats).reduce(
            (sum, stat) => sum + Math.abs(stat.total),
            0
          );

          const formatAmount = (amount: number) => {
            const formatted = ` ${amount >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(amount).toFixed(2)} `;
            return amount === 0
              ? chalk.black.bgWhite(formatted)
              : amount > 0
                ? chalk.black.bgGreen(formatted)
                : chalk.white.bgRed(formatted);
          };

          sortedCategories.forEach(([category, stats]) => {
            const percentage =
              totalAmount > 0 ? (Math.abs(stats.total) / totalAmount) * 100 : 0;
            const barLength = Math.round(percentage / 2);
            const bar =
              stats.total >= 0
                ? chalk.green('█'.repeat(Math.max(1, barLength)))
                : chalk.red('█'.repeat(Math.max(1, barLength)));

            console.log(
              `${category.padEnd(maxCategoryLength)} ${bar.padEnd(60)} ${formatAmount(stats.total)} (${percentage.toFixed(1)}%)`
            );
          });

          console.log('\n📋 Summary by Category:\n');

          sortedCategories.forEach(([category, stats]) => {
            console.log(`${category}:`);
            console.log(`  Total: ${formatAmount(stats.total)}`);
            console.log(`  Transactions: ${stats.count}`);
            console.log(
              `  Income: ${chalk.green(`${currencySymbol}${stats.income.toFixed(2)}`)}`
            );
            console.log(
              `  Expenses: ${chalk.red(`${currencySymbol}${stats.expenses.toFixed(2)}`)}`
            );
            console.log(
              `  Average: ${formatAmount(stats.total / stats.count)}`
            );
            console.log('');
          });

          const totalTransactions = categoryTransactions.length;
          const totalIncome = categoryTransactions
            .filter((tx) => tx.amount > 0)
            .reduce((sum, tx) => sum + tx.amount, 0);
          const totalExpenses = Math.abs(
            categoryTransactions
              .filter((tx) => tx.amount < 0)
              .reduce((sum, tx) => sum + tx.amount, 0)
          );
          const netAmount = totalIncome - totalExpenses;

          console.log('🎯 Overall Summary:');
          console.log(`Total Categories: ${Object.keys(categoryStats).length}`);
          console.log(`Total Transactions: ${totalTransactions}`);
          console.log(
            `Total Income: ${chalk.green(`${currencySymbol}${totalIncome.toFixed(2)}`)}`
          );
          console.log(
            `Total Expenses: ${chalk.red(`${currencySymbol}${totalExpenses.toFixed(2)}`)}`
          );
          console.log(`Net Amount: ${formatAmount(netAmount)}`);
          break;

        case '📊 Category Bar Chart':
          const barChartTransactions = getTransactions(dbPath);

          if (barChartTransactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const barCategoryStats: {
            [key: string]: { total: number; count: number };
          } = {};
          barChartTransactions.forEach((tx) => {
            const category = tx.category || 'Uncategorized';
            if (!barCategoryStats[category]) {
              barCategoryStats[category] = { total: 0, count: 0 };
            }
            barCategoryStats[category].total += Math.abs(tx.amount);
            barCategoryStats[category].count += 1;
          });

          const barSortedCategories = Object.entries(barCategoryStats).sort(
            ([, a], [, b]) => b.total - a.total
          );

          console.log('\n📊 Category Bar Chart (by Total Amount)\n');

          const maxBarCategoryLength = Math.max(
            ...barSortedCategories.map(([cat]) => cat.length)
          );
          const maxBarAmount = Math.max(
            ...barSortedCategories.map(([, stats]) => stats.total)
          );

          barSortedCategories.forEach(([category, stats]) => {
            const percentage =
              maxBarAmount > 0 ? (stats.total / maxBarAmount) * 100 : 0;
            const barLength = Math.round(percentage / 2);
            const bar = '█'.repeat(Math.max(1, barLength));
            const amount = `${currencySymbol}${stats.total.toFixed(2)}`;

            console.log(
              `${category.padEnd(maxBarCategoryLength)} ${chalk.blue(bar.padEnd(50))} ${amount} (${stats.count} transactions)`
            );
          });

          const barTotalAmount = Object.values(barCategoryStats).reduce(
            (sum, stat) => sum + stat.total,
            0
          );
          const barTotalTransactions = Object.values(barCategoryStats).reduce(
            (sum, stat) => sum + stat.count,
            0
          );

          console.log(`\n📋 Bar Chart Summary:`);
          console.log(
            `Total Categories: ${Object.keys(barCategoryStats).length}`
          );
          console.log(
            `Total Amount: ${currencySymbol}${barTotalAmount.toFixed(2)}`
          );
          console.log(`Total Transactions: ${barTotalTransactions}`);
          break;

        case '🏦 Savings Progress':
          const savingsStats = getSavingsStats(dbPath);
          const goals = config.savings?.goals || [];

          if (savingsStats.totalSavings === 0) {
            console.log(chalk.yellow('No savings transactions found.'));
            break;
          }

          console.log(chalk.bold('\n🏦 Savings Progress Overview\n'));
          
          console.log(`Total Savings: ${chalk.green(`${currencySymbol}${savingsStats.totalSavings.toFixed(2)}`)}`);
          console.log(`This Month: ${currencySymbol}${savingsStats.thisMonthSavings.toFixed(2)}`);
          console.log(`Last Month: ${currencySymbol}${savingsStats.lastMonthSavings.toFixed(2)}`);
          console.log(`Growth Rate: ${savingsStats.savingsGrowthRate >= 0 ? chalk.green(`+${savingsStats.savingsGrowthRate.toFixed(1)}%`) : chalk.red(`${savingsStats.savingsGrowthRate.toFixed(1)}%`)}`);
          console.log(`Transactions: ${savingsStats.savingsTransactionCount}`);
          console.log(`Average: ${currencySymbol}${savingsStats.averageSavingsTransaction.toFixed(2)}`);

          if (goals.length > 0) {
            console.log(chalk.bold('\n🎯 Goals Progress\n'));
            goals.forEach((goal) => {
              const percentage = goal.target > 0 ? (savingsStats.totalSavings / goal.target) * 100 : 0;
              const progressBar = '█'.repeat(Math.min(Math.round(percentage / 5), 20));
              const emptyBar = '░'.repeat(Math.max(0, 20 - Math.round(percentage / 5)));
              const statusColor = percentage >= 100 ? chalk.green : percentage >= 75 ? chalk.yellow : chalk.red;
              const priorityColor = goal.priority === 'high' ? chalk.red : 
                                   goal.priority === 'medium' ? chalk.yellow : chalk.blue;
              
              console.log(`${goal.name.padEnd(20)} ${priorityColor(`[${goal.priority.toUpperCase()}]`)}`);
              console.log(`  ${statusColor(progressBar)}${chalk.gray(emptyBar)} ${percentage.toFixed(1)}%`);
              console.log(`  Target: ${currencySymbol}${goal.target.toFixed(2)} | Progress: ${currencySymbol}${savingsStats.totalSavings.toFixed(2)} | Remaining: ${currencySymbol}${Math.max(0, goal.target - savingsStats.totalSavings).toFixed(2)}`);
              if (goal.deadline) {
                const deadlineDate = new Date(goal.deadline);
                const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const deadlineColor = daysUntil < 30 ? chalk.red : daysUntil < 90 ? chalk.yellow : chalk.green;
                console.log(`  Deadline: ${deadlineColor(goal.deadline)} (${daysUntil} days)`);
              }
              console.log();
            });
          }

          const savingsTransactions = getSavingsTransactions(dbPath);
          if (savingsTransactions.length > 0) {
            console.log(chalk.bold('\n📈 Savings Timeline (Last 10 Transactions)\n'));
            savingsTransactions.slice(0, 10).forEach((tx) => {
              const date = new Date(tx.date).toLocaleDateString(dateFormat);
              console.log(`${date.padEnd(12)} ${chalk.green(`+${currencySymbol}${tx.amount.toFixed(2)}`).padEnd(20)} ${tx.description}`);
            });
          }
          break;

        case '📋 Export Financial Report (MD)':
          try {
            const exportTransactions = getTransactions(dbPath);

            if (exportTransactions.length === 0) {
              console.log(chalk.yellow('No transactions found to export.'));
              break;
            }

            const reportDate = new Date().toISOString().split('T')[0];
            const fileName = `financial-report-${reportDate}.md`;

            const { exportPath } = await inquirer.prompt({
              type: 'input',
              name: 'exportPath',
              message:
                'Enter export path (or press Enter for current directory):',
              default: `./${fileName}`,
            });

            const fullPath = path.resolve(exportPath);
            const reportContent = generateMarkdownReport(
              exportTransactions,
              config
            );

            fs.writeFileSync(fullPath, reportContent, 'utf8');
            console.log(
              chalk.green(
                `✅ Financial report exported successfully to: ${fullPath}`
              )
            );
          } catch (error) {
            console.log(
              chalk.red(
                `❌ Error exporting report: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            );
          }
          break;

        case '↩️ Back to Main Menu':
          managingGraphs = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingGraphs = false;
    }
  }
}

/**
 * Creates the 'interactive' command for an interactive CLI interface.
 * @returns {Command} The Commander command object.
 */
export function createInteractiveCommand(): Command {
  const interactiveCommand = new Command();

  interactiveCommand
    .name('interactive')
    .alias('i')
    .description('Start an interactive CLI session')
    .action(async (options, command) => {
      const { config, filePath: configFilePath } = loadConfig(
        command.parent.opts().config
      );

      // Set up global escape key handling
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      
      // Add keypress listener for escape key
      process.stdin.on('keypress', (_chunk: any, key: any) => {
        if (key && key.name === 'escape') {
          // Emit SIGINT to simulate Ctrl+C
          process.emit('SIGINT' as any);
        }
      });

      console.log('Starting interactive session...');
      console.log(chalk.gray('(Tip: Press Escape or Ctrl+C to go back at any time)\n'));

      let running = true;
      while (running) {
        try {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What do you want to do? (Press Esc or Ctrl+C to exit)',
              choices: [
                '📝 Transactions',
                '💰 Balance',
                '📂 Categories',
                '💸 Budget',
                '🏦 Savings',
                '📊 Reports & Analytics',
                '🚪 Exit',
              ],
              loop: false,
              pageSize: 10,
            },
          ]);

          switch (answers.action) {
            case '📝 Transactions':
              await manageTransactions(config, configFilePath);
              break;
            case '💰 Balance':
              await manageBalance(config, configFilePath);
              break;
            case '📂 Categories':
              let categories = config.categories || [];
              let managingCategories = true;
              while (managingCategories) {
                try {
                  const categoryChoices = [
                    '➕ Add Category',
                    new inquirer.Separator(),
                    ...(categories.length === 0
                      ? [
                          chalk.gray(
                            'No categories yet. Add your first category!'
                          ),
                        ]
                      : categories),
                    new inquirer.Separator(),
                    '↩️ Back to Main Menu',
                  ];
                  const { categoryAction } = await inquirer.prompt({
                    type: 'list',
                    name: 'categoryAction',
                    message: 'Category Management:',
                    choices: categoryChoices,
                    loop: false,
                    pageSize: 10,
                  });

                  if (categoryAction === '➕ Add Category') {
                    try {
                      const { newCategoryName } = await inquirer.prompt({
                        type: 'input',
                        name: 'newCategoryName',
                        message: 'Enter new category name:',
                        validate: (value) =>
                          value.trim() !== '' ||
                          'Category name cannot be empty.',
                      });
                      if (!categories.includes(newCategoryName)) {
                        categories.push(newCategoryName);
                        config.categories = categories;
                        saveConfig(config, configFilePath);
                        console.log(`Category '${newCategoryName}' added.`);
                      } else {
                        console.log(
                          `Category '${newCategoryName}' already exists.`
                        );
                      }
                    } catch (_) {
                      console.log('Operation cancelled.');
                    }
                  } else if (categoryAction === '↩️ Back to Main Menu') {
                    managingCategories = false;
                  } else {
                    let managingSpecificCategory = true;
                    while (managingSpecificCategory) {
                      try {
                        const { specificCategoryAction } =
                          await inquirer.prompt({
                            type: 'list',
                            name: 'specificCategoryAction',
                            message: `Manage Category '${categoryAction}':`,
                            choices: [
                              '✏️ Edit',
                              '💸 Set Budget',
                              '🗑️ Delete',
                              '↩️ Back to Category List',
                            ],
                            loop: false,
                            pageSize: 10,
                          });

                        switch (specificCategoryAction) {
                          case '✏️ Edit':
                            try {
                              const { updatedCategoryName } =
                                await inquirer.prompt({
                                  type: 'input',
                                  name: 'updatedCategoryName',
                                  message: `Enter new name for '${categoryAction}':`,
                                  default: categoryAction,
                                  validate: (value) =>
                                    value.trim() !== '' ||
                                    'Category name cannot be empty.',
                                });
                              if (
                                categoryAction !== updatedCategoryName &&
                                categories.includes(updatedCategoryName)
                              ) {
                                console.log(
                                  `Category '${updatedCategoryName}' already exists. Cannot rename.`
                                );
                              } else {
                                const index =
                                  categories.indexOf(categoryAction);
                                if (index !== -1) {
                                  categories[index] = updatedCategoryName;
                                  config.categories = categories;
                                  saveConfig(config, configFilePath);
                                  console.log(
                                    `Category '${categoryAction}' renamed to '${updatedCategoryName}'.`
                                  );
                                  managingSpecificCategory = false;
                                }
                              }
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '💸 Set Budget':
                            try {
                              const currentBudget = getCategoryBudget(config, categoryAction);
                              const { budget } = await inquirer.prompt({
                                type: 'input',
                                name: 'budget',
                                message: `Enter monthly budget for '${categoryAction}':`,
                                default: currentBudget > 0 ? currentBudget.toString() : '',
                                validate: (value) => {
                                  const num = parseFloat(value);
                                  return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
                                },
                              });

                              setCategoryBudget(config, categoryAction, parseFloat(budget));
                              saveConfig(config, configFilePath);
                              console.log(chalk.green(`✅ Budget for '${categoryAction}' set to ${config.display?.currencySymbol || '$'}${parseFloat(budget).toFixed(2)}`));
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '🗑️ Delete':
                            try {
                              categories = categories.filter(
                                (cat) => cat !== categoryAction
                              );
                              config.categories = categories;
                              saveConfig(config, configFilePath);
                              console.log(
                                `Category '${categoryAction}' deleted.`
                              );
                              managingSpecificCategory = false;
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '↩️ Back to Category List':
                            managingSpecificCategory = false;
                            break;
                        }
                      } catch (_) {
                        console.log('Operation cancelled.');
                        managingSpecificCategory = false;
                      }
                    }
                  }
                } catch (_) {
                  console.log('Operation cancelled.');
                  managingCategories = false;
                }
              }
              break;
            case '💸 Budget':
              await manageBudget(config, configFilePath);
              break;
            case '🏦 Savings':
              await manageSavings(config, configFilePath);
              break;
            case '📊 Reports & Analytics':
              await manageGraphs(config);
              break;
            case '🚪 Exit':
              console.log('Exiting interactive session.');
              if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
              }
              running = false;
              break;
          }
        } catch (_) {
          console.log('Exiting interactive session.');
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          running = false;
        }
      }
    });

  return interactiveCommand;
}
;

  let managingSavings = true;
  while (managingSavings) {
    try {
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
          console.log(`  Target: ${currencySymbol}${goal.target.toFixed(2)} | Progress: ${currencySymbol}${stats.totalSavings.toFixed(2)} | Remaining: ${currencySymbol}${Math.max(0, goal.target - stats.totalSavings).toFixed(2)}`);
          if (goal.deadline) {
            console.log(`  Deadline: ${goal.deadline}`);
          }
          console.log();
        });
      }

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Savings Management:',
        choices: [
          '💰 Add Savings Transaction',
          '🎯 Manage Savings Goals',
          '📝 List Savings Transactions',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '💰 Add Savings Transaction':
          try {
            const { amount, description } = await inquirer.prompt([
              {
                type: 'input',
                name: 'amount',
                message: 'Enter savings amount:',
                validate: (value) => {
                  const num = parseFloat(value);
                  return !isNaN(num) && num > 0 || 'Please enter a positive number';
                },
              },
              {
                type: 'input',
                name: 'description',
                message: 'Enter description:',
                default: 'Savings',
              },
            ]);

            addTransaction(dbPath, parseFloat(amount), description, 'Savings', true);
            console.log(chalk.green(`💰 Added ${currencySymbol}${parseFloat(amount).toFixed(2)} to savings`));
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;

        case '🎯 Manage Savings Goals':
          let managingGoals = true;
          while (managingGoals) {
            try {
              const currentGoals = config.savings?.goals || [];
              const goalChoices = [
                '➕ Add New Goal',
                new inquirer.Separator(),
                ...(currentGoals.length === 0
                  ? [chalk.gray('No goals yet. Add your first goal!')]
                  : currentGoals.map(goal => ({
                      name: `${goal.name} (${currencySymbol}${goal.target.toFixed(2)}) [${goal.priority.toUpperCase()}]`,
                      value: goal.name,
                    }))),
                new inquirer.Separator(),
                '↩️ Back to Savings Menu',
              ];

              const { goalAction } = await inquirer.prompt({
                type: 'list',
                name: 'goalAction',
                message: 'Goal Management:',
                choices: goalChoices as any,
                loop: false,
                pageSize: 10,
              });

              if (goalAction === '➕ Add New Goal') {
                try {
                  const goalAnswers = await inquirer.prompt([
                    {
                      type: 'input',
                      name: 'name',
                      message: 'Enter goal name:',
                      validate: (value) => value.trim() !== '' || 'Goal name cannot be empty',
                    },
                    {
                      type: 'input',
                      name: 'target',
                      message: 'Enter target amount:',
                      validate: (value) => {
                        const num = parseFloat(value);
                        return !isNaN(num) && num > 0 || 'Please enter a positive number';
                      },
                    },
                    {
                      type: 'list',
                      name: 'priority',
                      message: 'Select priority:',
                      choices: ['low', 'medium', 'high'],
                      default: 'medium',
                    },
                    {
                      type: 'input',
                      name: 'deadline',
                      message: 'Enter deadline (optional, YYYY-MM-DD):',
                      validate: (value) => {
                        if (!value) return true;
                        const date = new Date(value);
                        return !isNaN(date.getTime()) || 'Please enter a valid date (YYYY-MM-DD)';
                      },
                    },
                  ]);

                  setSavingsGoal(
                    config,
                    goalAnswers.name,
                    parseFloat(goalAnswers.target),
                    goalAnswers.priority,
                    goalAnswers.deadline || undefined
                  );
                  saveConfig(config, configFilePath);
                  console.log(chalk.green(`🎯 Goal '${goalAnswers.name}' created successfully`));
                } catch (_) {
                  console.log('Operation cancelled.');
                }
              } else if (goalAction === '↩️ Back to Savings Menu') {
                managingGoals = false;
              } else if (goalAction && typeof goalAction === 'string') {
                const selectedGoal = currentGoals.find(g => g.name === goalAction);
                if (selectedGoal) {
                  try {
                    const { goalOperation } = await inquirer.prompt({
                      type: 'list',
                      name: 'goalOperation',
                      message: `Manage Goal '${selectedGoal.name}':`,
                      choices: [
                        '✏️ Edit Goal',
                        '🗑️ Delete Goal',
                        '↩️ Back to Goals List',
                      ],
                    });

                    if (goalOperation === '✏️ Edit Goal') {
                      const editAnswers = await inquirer.prompt([
                        {
                          type: 'input',
                          name: 'target',
                          message: 'Enter new target amount:',
                          default: selectedGoal.target.toString(),
                          validate: (value) => {
                            const num = parseFloat(value);
                            return !isNaN(num) && num > 0 || 'Please enter a positive number';
                          },
                        },
                        {
                          type: 'list',
                          name: 'priority',
                          message: 'Select priority:',
                          choices: ['low', 'medium', 'high'],
                          default: selectedGoal.priority,
                        },
                        {
                          type: 'input',
                          name: 'deadline',
                          message: 'Enter deadline (optional, YYYY-MM-DD):',
                          default: selectedGoal.deadline || '',
                          validate: (value) => {
                            if (!value) return true;
                            const date = new Date(value);
                            return !isNaN(date.getTime()) || 'Please enter a valid date (YYYY-MM-DD)';
                          },
                        },
                      ]);

                      setSavingsGoal(
                        config,
                        selectedGoal.name,
                        parseFloat(editAnswers.target),
                        editAnswers.priority,
                        editAnswers.deadline || undefined
                      );
                      saveConfig(config, configFilePath);
                      console.log(chalk.green(`✅ Goal '${selectedGoal.name}' updated successfully`));
                    } else if (goalOperation === '🗑️ Delete Goal') {
                      const { confirmDelete } = await inquirer.prompt({
                        type: 'confirm',
                        name: 'confirmDelete',
                        message: `Are you sure you want to delete goal '${selectedGoal.name}'?`,
                        default: false,
                      });

                      if (confirmDelete) {
                        removeSavingsGoal(config, selectedGoal.name);
                        saveConfig(config, configFilePath);
                        console.log(chalk.green(`🗑️ Goal '${selectedGoal.name}' deleted successfully`));
                      }
                    }
                  } catch (_) {
                    console.log('Operation cancelled.');
                  }
                }
              }
            } catch (_) {
              console.log('Operation cancelled.');
              managingGoals = false;
            }
          }
          break;

        case '📝 List Savings Transactions':
          const savingsTransactions = getSavingsTransactions(dbPath);
          if (savingsTransactions.length === 0) {
            console.log(chalk.yellow('No savings transactions found.'));
          } else {
            console.log(chalk.bold('\n💰 Savings Transactions\n'));
            savingsTransactions.slice(0, 10).forEach((tx) => {
              const date = new Date(tx.date).toLocaleDateString(config.display?.dateFormat || 'en-US');
              console.log(`${date.padEnd(12)} ${chalk.green(`${currencySymbol}${tx.amount.toFixed(2)}`).padEnd(20)} ${tx.description}`);
            });
            if (savingsTransactions.length > 10) {
              console.log(chalk.gray(`\n... and ${savingsTransactions.length - 10} more transactions`));
            }
          }
          break;

        case '↩️ Back to Main Menu':
          managingSavings = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingSavings = false;
    }
  }
}

/**
 * Manages budget-related interactive operations.
 */
async function manageBudget(config: Config, configFilePath: string) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';
  const categories = config.categories || [];

  let managingBudget = true;
  while (managingBudget) {
    try {
      const cycleStartDay = config.budget?.cycleStartDay || 1;
      const cycleStart = getCurrentBudgetCycleStart(cycleStartDay);
      const cycleEnd = getCurrentBudgetCycleEnd(cycleStartDay);
      const budgets = config.budget?.categoryBudgets || [];

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Budget Management:',
        choices: [
          '📊 View Budget Status',
          '💸 Set Category Budget',
          '📅 Set Budget Cycle Start Day',
          '📋 List All Budgets',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '📊 View Budget Status':
          if (budgets.length === 0) {
            console.log(chalk.yellow('No budgets configured yet.'));
            break;
          }

          const budgetUsage = getBudgetUsage(dbPath, cycleStart, cycleEnd, budgets);
          const categoriesWithBudget = budgets.map(b => b.category);
          const allCategories = categories;
          const categoriesWithoutBudget = allCategories.filter(cat => !categoriesWithBudget.includes(cat));
          
          console.log(chalk.bold(`\n💸 Budget Status (${cycleStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()})\n`));

          budgetUsage.forEach((usage) => {
            const isOverBudget = usage.percentage > 100;
            const isNearBudget = usage.percentage > 80;
            
            let statusColor = chalk.green;
            let statusIcon = '✅';
            
            if (isOverBudget) {
              statusColor = chalk.red;
              statusIcon = '🚨';
            } else if (isNearBudget) {
              statusColor = chalk.yellow;
              statusIcon = '⚠️';
            }

            const percentageBar = '█'.repeat(Math.min(Math.round(usage.percentage / 5), 20));
            const emptyBar = '░'.repeat(Math.max(0, 20 - Math.round(usage.percentage / 5)));
            
            console.log(`${statusIcon} ${usage.category.padEnd(20)}`);
            console.log(`   ${statusColor(percentageBar)}${chalk.gray(emptyBar)} ${usage.percentage.toFixed(1)}%`);
            console.log(`   Budget: ${currencySymbol}${usage.budget.toFixed(2)} | Spent: ${statusColor(`${currencySymbol}${usage.spent.toFixed(2)}`)} | Remaining: ${usage.remaining > 0 ? chalk.green(`${currencySymbol}${usage.remaining.toFixed(2)}`) : chalk.red('Over budget!')}`);
            
            if (isOverBudget) {
              console.log(`   ${chalk.red(`⚠️  Over budget by ${currencySymbol}${(usage.spent - usage.budget).toFixed(2)}`)}`);
            }
            console.log();
          });

          if (categoriesWithoutBudget.length > 0) {
            console.log(chalk.gray('\n📝 Categories without budget:'));
            categoriesWithoutBudget.forEach(category => {
              console.log(chalk.gray(`   ${category} (no budget set)`));
            });
            console.log();
          }
          break;

        case '💸 Set Category Budget':
          if (categories.length === 0) {
            console.log(chalk.yellow('No categories available. Add categories first.'));
            break;
          }

          try {
            const { category } = await inquirer.prompt({
              type: 'list',
              name: 'category',
              message: 'Select category to set budget:',
              choices: categories,
            });

            const currentBudget = getCategoryBudget(config, category);
            const { budget } = await inquirer.prompt({
              type: 'input',
              name: 'budget',
              message: `Enter monthly budget for '${category}':`,
              default: currentBudget > 0 ? currentBudget.toString() : '',
              validate: (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
              },
            });

            setCategoryBudget(config, category, parseFloat(budget));
            saveConfig(config, configFilePath);
            console.log(chalk.green(`✅ Budget for '${category}' set to ${currencySymbol}${parseFloat(budget).toFixed(2)}`));
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;

        case '📅 Set Budget Cycle Start Day':
          try {
            const currentDay = config.budget?.cycleStartDay || 1;
            const { cycleDay } = await inquirer.prompt({
              type: 'input',
              name: 'cycleDay',
              message: 'Enter budget cycle start day (1-31):',
              default: currentDay.toString(),
              validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 1 && num <= 31 || 'Please enter a number between 1 and 31';
              },
            });

            if (!config.budget) {
              config.budget = {};
            }
            config.budget.cycleStartDay = parseInt(cycleDay);
            saveConfig(config, configFilePath);
            console.log(chalk.green(`✅ Budget cycle start day set to ${cycleDay}`));
          } catch (_) {
            console.log('Operation cancelled.');
          }
          break;

        case '📋 List All Budgets':
          if (budgets.length === 0) {
            console.log(chalk.yellow('No budgets configured yet.'));
            break;
          }

          console.log(chalk.bold('\n💸 Category Budgets\n'));
          budgets.forEach((budget) => {
            console.log(`${budget.category.padEnd(20)} ${currencySymbol}${budget.monthlyBudget.toFixed(2)}`);
          });
          console.log(`\nBudget cycle starts on day ${config.budget?.cycleStartDay || 1} of each month`);
          break;

        case '↩️ Back to Main Menu':
          managingBudget = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingBudget = false;
    }
  }
}

/**
 * Manages graph-related interactive operations.
 * @param {Config} config - The configuration object.
 * @returns {Promise<void>} Promise that resolves when graph management is complete.
 */
async function manageGraphs(config: Config) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';
  const dateFormat = config.display?.dateFormat || 'en-US';

  let managingGraphs = true;
  while (managingGraphs) {
    try {
      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Reports & Analytics: (Press Esc or Ctrl+C to go back)',
        choices: [
          '📈 Balance Evolution',
          '📊 Category Distribution',
          '📊 Category Bar Chart',
          '🏦 Savings Progress',
          '📋 Export Financial Report (MD)',
          '↩️ Back to Main Menu',
        ],
        loop: false,
        pageSize: 10,
      });

      switch (action) {
        case '📈 Balance Evolution':
          const transactions = getTransactions(dbPath);

          if (transactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const sortedTransactions = transactions.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          let runningBalance = 0;
          const balanceData = sortedTransactions.map((tx) => {
            runningBalance += tx.amount;
            return runningBalance;
          });

          const formatBalance = (amount: number) => {
            const formatted = ` ${currencySymbol}${amount.toFixed(2)} `;
            return amount === 0
              ? chalk.black.bgWhite(formatted)
              : amount > 0
                ? chalk.black.bgGreen(formatted)
                : chalk.white.bgRed(formatted);
          };

          console.log('\n📈 Balance Evolution Over Time\n');
          
          const maxBalance = Math.max(...balanceData.map(Math.abs));
          const minBalance = Math.min(...balanceData);
          const maxValue = maxBalance;
          const minValue = Math.min(0, minBalance);
          
          const maxLength = Math.max(
            `${currencySymbol}${maxValue.toFixed(2)}`.length,
            `${currencySymbol}${Math.abs(minValue).toFixed(2)}`.length + (minValue < 0 ? 1 : 0)
          );
          
          console.log(
            plot(balanceData, {
              height: 15,
              format: (x: number) => {
                const formatted = x < 0 
                  ? `-${currencySymbol}${Math.abs(x).toFixed(2)}`
                  : `${currencySymbol}${x.toFixed(2)}`;
                return formatted.padStart(maxLength);
              },
            })
          );

          console.log(
            `\nDate Range: ${new Date(sortedTransactions[0]?.date ?? Date.now()).toLocaleDateString(dateFormat)} - ${new Date(sortedTransactions[sortedTransactions.length - 1]?.date ?? Date.now()).toLocaleDateString(dateFormat)}`
          );
          console.log(
            `Starting Balance: ${formatBalance(sortedTransactions[0]?.amount ?? 0)}`
          );
          console.log(`Current Balance: ${formatBalance(runningBalance)}`);
          console.log(`Total Transactions: ${transactions.length}`);
          break;

        case '📊 Category Distribution':
          const categoryTransactions = getTransactions(dbPath);

          if (categoryTransactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const categoryStats: {
            [key: string]: {
              total: number;
              count: number;
              income: number;
              expenses: number;
            };
          } = {};

          categoryTransactions.forEach((tx) => {
            const category = tx.category || 'Uncategorized';
            if (!categoryStats[category]) {
              categoryStats[category] = {
                total: 0,
                count: 0,
                income: 0,
                expenses: 0,
              };
            }
            categoryStats[category].total += tx.amount;
            categoryStats[category].count += 1;
            if (tx.amount > 0) {
              categoryStats[category].income += tx.amount;
            } else {
              categoryStats[category].expenses += Math.abs(tx.amount);
            }
          });

          const sortedCategories = Object.entries(categoryStats).sort(
            ([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total)
          );

          console.log('\n📊 Category Distribution & Summary\n');

          const maxCategoryLength = Math.max(
            ...sortedCategories.map(([cat]) => cat.length)
          );
          const totalAmount = Object.values(categoryStats).reduce(
            (sum, stat) => sum + Math.abs(stat.total),
            0
          );

          const formatAmount = (amount: number) => {
            const formatted = ` ${amount >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(amount).toFixed(2)} `;
            return amount === 0
              ? chalk.black.bgWhite(formatted)
              : amount > 0
                ? chalk.black.bgGreen(formatted)
                : chalk.white.bgRed(formatted);
          };

          sortedCategories.forEach(([category, stats]) => {
            const percentage =
              totalAmount > 0 ? (Math.abs(stats.total) / totalAmount) * 100 : 0;
            const barLength = Math.round(percentage / 2);
            const bar =
              stats.total >= 0
                ? chalk.green('█'.repeat(Math.max(1, barLength)))
                : chalk.red('█'.repeat(Math.max(1, barLength)));

            console.log(
              `${category.padEnd(maxCategoryLength)} ${bar.padEnd(60)} ${formatAmount(stats.total)} (${percentage.toFixed(1)}%)`
            );
          });

          console.log('\n📋 Summary by Category:\n');

          sortedCategories.forEach(([category, stats]) => {
            console.log(`${category}:`);
            console.log(`  Total: ${formatAmount(stats.total)}`);
            console.log(`  Transactions: ${stats.count}`);
            console.log(
              `  Income: ${chalk.green(`${currencySymbol}${stats.income.toFixed(2)}`)}`
            );
            console.log(
              `  Expenses: ${chalk.red(`${currencySymbol}${stats.expenses.toFixed(2)}`)}`
            );
            console.log(
              `  Average: ${formatAmount(stats.total / stats.count)}`
            );
            console.log('');
          });

          const totalTransactions = categoryTransactions.length;
          const totalIncome = categoryTransactions
            .filter((tx) => tx.amount > 0)
            .reduce((sum, tx) => sum + tx.amount, 0);
          const totalExpenses = Math.abs(
            categoryTransactions
              .filter((tx) => tx.amount < 0)
              .reduce((sum, tx) => sum + tx.amount, 0)
          );
          const netAmount = totalIncome - totalExpenses;

          console.log('🎯 Overall Summary:');
          console.log(`Total Categories: ${Object.keys(categoryStats).length}`);
          console.log(`Total Transactions: ${totalTransactions}`);
          console.log(
            `Total Income: ${chalk.green(`${currencySymbol}${totalIncome.toFixed(2)}`)}`
          );
          console.log(
            `Total Expenses: ${chalk.red(`${currencySymbol}${totalExpenses.toFixed(2)}`)}`
          );
          console.log(`Net Amount: ${formatAmount(netAmount)}`);
          break;

        case '📊 Category Bar Chart':
          const barChartTransactions = getTransactions(dbPath);

          if (barChartTransactions.length === 0) {
            console.log('No transactions found.');
            break;
          }

          const barCategoryStats: {
            [key: string]: { total: number; count: number };
          } = {};
          barChartTransactions.forEach((tx) => {
            const category = tx.category || 'Uncategorized';
            if (!barCategoryStats[category]) {
              barCategoryStats[category] = { total: 0, count: 0 };
            }
            barCategoryStats[category].total += Math.abs(tx.amount);
            barCategoryStats[category].count += 1;
          });

          const barSortedCategories = Object.entries(barCategoryStats).sort(
            ([, a], [, b]) => b.total - a.total
          );

          console.log('\n📊 Category Bar Chart (by Total Amount)\n');

          const maxBarCategoryLength = Math.max(
            ...barSortedCategories.map(([cat]) => cat.length)
          );
          const maxBarAmount = Math.max(
            ...barSortedCategories.map(([, stats]) => stats.total)
          );

          barSortedCategories.forEach(([category, stats]) => {
            const percentage =
              maxBarAmount > 0 ? (stats.total / maxBarAmount) * 100 : 0;
            const barLength = Math.round(percentage / 2);
            const bar = '█'.repeat(Math.max(1, barLength));
            const amount = `${currencySymbol}${stats.total.toFixed(2)}`;

            console.log(
              `${category.padEnd(maxBarCategoryLength)} ${chalk.blue(bar.padEnd(50))} ${amount} (${stats.count} transactions)`
            );
          });

          const barTotalAmount = Object.values(barCategoryStats).reduce(
            (sum, stat) => sum + stat.total,
            0
          );
          const barTotalTransactions = Object.values(barCategoryStats).reduce(
            (sum, stat) => sum + stat.count,
            0
          );

          console.log(`\n📋 Bar Chart Summary:`);
          console.log(
            `Total Categories: ${Object.keys(barCategoryStats).length}`
          );
          console.log(
            `Total Amount: ${currencySymbol}${barTotalAmount.toFixed(2)}`
          );
          console.log(`Total Transactions: ${barTotalTransactions}`);
          break;

        case '🏦 Savings Progress':
          const savingsStats = getSavingsStats(dbPath);
          const goals = config.savings?.goals || [];

          if (savingsStats.totalSavings === 0) {
            console.log(chalk.yellow('No savings transactions found.'));
            break;
          }

          console.log(chalk.bold('\n🏦 Savings Progress Overview\n'));
          
          console.log(`Total Savings: ${chalk.green(`${currencySymbol}${savingsStats.totalSavings.toFixed(2)}`)}`);
          console.log(`This Month: ${currencySymbol}${savingsStats.thisMonthSavings.toFixed(2)}`);
          console.log(`Last Month: ${currencySymbol}${savingsStats.lastMonthSavings.toFixed(2)}`);
          console.log(`Growth Rate: ${savingsStats.savingsGrowthRate >= 0 ? chalk.green(`+${savingsStats.savingsGrowthRate.toFixed(1)}%`) : chalk.red(`${savingsStats.savingsGrowthRate.toFixed(1)}%`)}`);
          console.log(`Transactions: ${savingsStats.savingsTransactionCount}`);
          console.log(`Average: ${currencySymbol}${savingsStats.averageSavingsTransaction.toFixed(2)}`);

          if (goals.length > 0) {
            console.log(chalk.bold('\n🎯 Goals Progress\n'));
            goals.forEach((goal) => {
              const percentage = goal.target > 0 ? (savingsStats.totalSavings / goal.target) * 100 : 0;
              const progressBar = '█'.repeat(Math.min(Math.round(percentage / 5), 20));
              const emptyBar = '░'.repeat(Math.max(0, 20 - Math.round(percentage / 5)));
              const statusColor = percentage >= 100 ? chalk.green : percentage >= 75 ? chalk.yellow : chalk.red;
              const priorityColor = goal.priority === 'high' ? chalk.red : 
                                   goal.priority === 'medium' ? chalk.yellow : chalk.blue;
              
              console.log(`${goal.name.padEnd(20)} ${priorityColor(`[${goal.priority.toUpperCase()}]`)}`);
              console.log(`  ${statusColor(progressBar)}${chalk.gray(emptyBar)} ${percentage.toFixed(1)}%`);
              console.log(`  Target: ${currencySymbol}${goal.target.toFixed(2)} | Progress: ${currencySymbol}${savingsStats.totalSavings.toFixed(2)} | Remaining: ${currencySymbol}${Math.max(0, goal.target - savingsStats.totalSavings).toFixed(2)}`);
              if (goal.deadline) {
                const deadlineDate = new Date(goal.deadline);
                const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const deadlineColor = daysUntil < 30 ? chalk.red : daysUntil < 90 ? chalk.yellow : chalk.green;
                console.log(`  Deadline: ${deadlineColor(goal.deadline)} (${daysUntil} days)`);
              }
              console.log();
            });
          }

          const savingsTransactions = getSavingsTransactions(dbPath);
          if (savingsTransactions.length > 0) {
            console.log(chalk.bold('\n📈 Savings Timeline (Last 10 Transactions)\n'));
            savingsTransactions.slice(0, 10).forEach((tx) => {
              const date = new Date(tx.date).toLocaleDateString(dateFormat);
              console.log(`${date.padEnd(12)} ${chalk.green(`+${currencySymbol}${tx.amount.toFixed(2)}`).padEnd(20)} ${tx.description}`);
            });
          }
          break;

        case '📋 Export Financial Report (MD)':
          try {
            const exportTransactions = getTransactions(dbPath);

            if (exportTransactions.length === 0) {
              console.log(chalk.yellow('No transactions found to export.'));
              break;
            }

            const reportDate = new Date().toISOString().split('T')[0];
            const fileName = `financial-report-${reportDate}.md`;

            const { exportPath } = await inquirer.prompt({
              type: 'input',
              name: 'exportPath',
              message:
                'Enter export path (or press Enter for current directory):',
              default: `./${fileName}`,
            });

            const fullPath = path.resolve(exportPath);
            const reportContent = generateMarkdownReport(
              exportTransactions,
              config
            );

            fs.writeFileSync(fullPath, reportContent, 'utf8');
            console.log(
              chalk.green(
                `✅ Financial report exported successfully to: ${fullPath}`
              )
            );
          } catch (error) {
            console.log(
              chalk.red(
                `❌ Error exporting report: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            );
          }
          break;

        case '↩️ Back to Main Menu':
          managingGraphs = false;
          break;
      }
    } catch (_) {
      console.log('Operation cancelled.');
      managingGraphs = false;
    }
  }
}

/**
 * Creates the 'interactive' command for an interactive CLI interface.
 * @returns {Command} The Commander command object.
 */
export function createInteractiveCommand(): Command {
  const interactiveCommand = new Command();

  interactiveCommand
    .name('interactive')
    .alias('i')
    .description('Start an interactive CLI session')
    .action(async (options, command) => {
      const { config, filePath: configFilePath } = loadConfig(
        command.parent.opts().config
      );

      // Set up global escape key handling
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      
      // Add keypress listener for escape key
      process.stdin.on('keypress', (_chunk: any, key: any) => {
        if (key && key.name === 'escape') {
          // Emit SIGINT to simulate Ctrl+C
          process.emit('SIGINT' as any);
        }
      });

      console.log('Starting interactive session...');
      console.log(chalk.gray('(Tip: Press Escape or Ctrl+C to go back at any time)\n'));

      let running = true;
      while (running) {
        try {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What do you want to do? (Press Esc or Ctrl+C to exit)',
              choices: [
                '📝 Transactions',
                '💰 Balance',
                '📂 Categories',
                '💸 Budget',
                '🏦 Savings',
                '📊 Reports & Analytics',
                '🚪 Exit',
              ],
              loop: false,
              pageSize: 10,
            },
          ]);

          switch (answers.action) {
            case '📝 Transactions':
              await manageTransactions(config, configFilePath);
              break;
            case '💰 Balance':
              await manageBalance(config, configFilePath);
              break;
            case '📂 Categories':
              let categories = config.categories || [];
              let managingCategories = true;
              while (managingCategories) {
                try {
                  const categoryChoices = [
                    '➕ Add Category',
                    new inquirer.Separator(),
                    ...(categories.length === 0
                      ? [
                          chalk.gray(
                            'No categories yet. Add your first category!'
                          ),
                        ]
                      : categories),
                    new inquirer.Separator(),
                    '↩️ Back to Main Menu',
                  ];
                  const { categoryAction } = await inquirer.prompt({
                    type: 'list',
                    name: 'categoryAction',
                    message: 'Category Management:',
                    choices: categoryChoices,
                    loop: false,
                    pageSize: 10,
                  });

                  if (categoryAction === '➕ Add Category') {
                    try {
                      const { newCategoryName } = await inquirer.prompt({
                        type: 'input',
                        name: 'newCategoryName',
                        message: 'Enter new category name:',
                        validate: (value) =>
                          value.trim() !== '' ||
                          'Category name cannot be empty.',
                      });
                      if (!categories.includes(newCategoryName)) {
                        categories.push(newCategoryName);
                        config.categories = categories;
                        saveConfig(config, configFilePath);
                        console.log(`Category '${newCategoryName}' added.`);
                      } else {
                        console.log(
                          `Category '${newCategoryName}' already exists.`
                        );
                      }
                    } catch (_) {
                      console.log('Operation cancelled.');
                    }
                  } else if (categoryAction === '↩️ Back to Main Menu') {
                    managingCategories = false;
                  } else {
                    let managingSpecificCategory = true;
                    while (managingSpecificCategory) {
                      try {
                        const { specificCategoryAction } =
                          await inquirer.prompt({
                            type: 'list',
                            name: 'specificCategoryAction',
                            message: `Manage Category '${categoryAction}':`,
                            choices: [
                              '✏️ Edit',
                              '💸 Set Budget',
                              '🗑️ Delete',
                              '↩️ Back to Category List',
                            ],
                            loop: false,
                            pageSize: 10,
                          });

                        switch (specificCategoryAction) {
                          case '✏️ Edit':
                            try {
                              const { updatedCategoryName } =
                                await inquirer.prompt({
                                  type: 'input',
                                  name: 'updatedCategoryName',
                                  message: `Enter new name for '${categoryAction}':`,
                                  default: categoryAction,
                                  validate: (value) =>
                                    value.trim() !== '' ||
                                    'Category name cannot be empty.',
                                });
                              if (
                                categoryAction !== updatedCategoryName &&
                                categories.includes(updatedCategoryName)
                              ) {
                                console.log(
                                  `Category '${updatedCategoryName}' already exists. Cannot rename.`
                                );
                              } else {
                                const index =
                                  categories.indexOf(categoryAction);
                                if (index !== -1) {
                                  categories[index] = updatedCategoryName;
                                  config.categories = categories;
                                  saveConfig(config, configFilePath);
                                  console.log(
                                    `Category '${categoryAction}' renamed to '${updatedCategoryName}'.`
                                  );
                                  managingSpecificCategory = false;
                                }
                              }
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '💸 Set Budget':
                            try {
                              const currentBudget = getCategoryBudget(config, categoryAction);
                              const { budget } = await inquirer.prompt({
                                type: 'input',
                                name: 'budget',
                                message: `Enter monthly budget for '${categoryAction}':`,
                                default: currentBudget > 0 ? currentBudget.toString() : '',
                                validate: (value) => {
                                  const num = parseFloat(value);
                                  return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
                                },
                              });

                              setCategoryBudget(config, categoryAction, parseFloat(budget));
                              saveConfig(config, configFilePath);
                              console.log(chalk.green(`✅ Budget for '${categoryAction}' set to ${config.display?.currencySymbol || '$'}${parseFloat(budget).toFixed(2)}`));
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '🗑️ Delete':
                            try {
                              categories = categories.filter(
                                (cat) => cat !== categoryAction
                              );
                              config.categories = categories;
                              saveConfig(config, configFilePath);
                              console.log(
                                `Category '${categoryAction}' deleted.`
                              );
                              managingSpecificCategory = false;
                            } catch (_) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '↩️ Back to Category List':
                            managingSpecificCategory = false;
                            break;
                        }
                      } catch (_) {
                        console.log('Operation cancelled.');
                        managingSpecificCategory = false;
                      }
                    }
                  }
                } catch (_) {
                  console.log('Operation cancelled.');
                  managingCategories = false;
                }
              }
              break;
            case '💸 Budget':
              await manageBudget(config, configFilePath);
              break;
            case '🏦 Savings':
              await manageSavings(config, configFilePath);
              break;
            case '📊 Reports & Analytics':
              await manageGraphs(config);
              break;
            case '🚪 Exit':
              console.log('Exiting interactive session.');
              if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
              }
              running = false;
              break;
          }
        } catch (_) {
          console.log('Exiting interactive session.');
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          running = false;
        }
      }
    });

  return interactiveCommand;
}
