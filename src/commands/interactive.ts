import { Command } from 'commander';
import inquirer from 'inquirer';
import { addTransaction, getTransactions, deleteTransaction, editTransaction, clearTransactions } from '../data';
import { loadConfig, saveConfig, Config } from '../config';

/**
 * Manages transaction-related interactive operations.
 * @param {Config} config - The configuration object.
 * @param {string} configFilePath - The path to the configuration file.
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
      const transactionChoices = transactions.map(tx => ({
        name: `ID: ${tx.id}, Date: ${new Date(tx.date).toLocaleString(dateFormat)}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${tx.category ? ` (Category: ${tx.category})` : ''}`,
        value: tx.id,
      }));

      const choices = [
        '➕ Add New Transaction',
        new inquirer.Separator(),
        ...transactionChoices,
        new inquirer.Separator(),
        '↩️ Back to Main Menu',
      ];

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Manage Transactions:',
        choices: choices,
      });

      if (action === '➕ Add New Transaction') {
        try {
          const addAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'amount',
              message: 'Enter amount:',
              validate: (value) => !isNaN(parseFloat(value)) || 'Please enter a valid number',
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
              choices: categories.length > 0 ? [...categories, 'Other'] : undefined,
            },
          ]);
          addTransaction(dbPath, parseFloat(addAnswers.amount), addAnswers.description, addAnswers.category === 'Other' ? await inquirer.prompt({ type: 'input', name: 'newCategory', message: 'Enter new category:' }).then(a => a.newCategory) : addAnswers.category);
        } catch (e) {
          console.log('Operation cancelled.');
        }
      } else if (action === '↩️ Back to Main Menu') {
        managingTransactions = false;
      } else { // A transaction was selected
        const selectedTransactionId = action;
        const transaction = transactions.find(tx => tx.id === selectedTransactionId);

        if (transaction) {
          let managingSpecificTransaction = true;
          while (managingSpecificTransaction) {
            try {
              const { specificAction } = await inquirer.prompt({
                type: 'list',
                name: 'specificAction',
                message: `Manage Transaction (ID: ${transaction.id}):`,
                choices: ['✏️ Edit', '🗑️ Delete', '↩️ Back to Transaction List'],
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
                        validate: (value) => !isNaN(parseFloat(value)) || 'Please enter a valid number',
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
                        choices: categories.length > 0 ? [...categories, 'Other'] : undefined,
                      },
                    ]);
                    const updatedCategory = editAnswers.category === 'Other' ? await inquirer.prompt({ type: 'input', name: 'newCategory', message: 'Enter new category:' }).then(a => a.newCategory) : editAnswers.category;
                    editTransaction(dbPath, selectedTransactionId, { amount: parseFloat(editAnswers.amount), description: editAnswers.description, category: updatedCategory });
                  } catch (e) {
                    console.log('Operation cancelled.');
                  }
                  break;
                case '🗑️ Delete':
                  try {
                    deleteTransaction(dbPath, selectedTransactionId);
                    managingSpecificTransaction = false; // Exit after deletion
                  } catch (e) {
                    console.log('Operation cancelled.');
                  }
                  break;
                case '↩️ Back to Transaction List':
                  managingSpecificTransaction = false;
                  break;
              }
            } catch (e) {
              console.log('Operation cancelled.');
              managingSpecificTransaction = false; // Exit specific transaction management on Ctrl+C
            }
          }
        }
      }
    } catch (e) {
      console.log('Operation cancelled.');
      managingTransactions = false; // Exit transaction management on Ctrl+C
    }
  }
}

/**
 * Manages balance-related interactive operations.
 * @param {Config} config - The configuration object.
 */
async function manageBalance(config: Config) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const currencySymbol = config.display?.currencySymbol || '$';

  let managingBalance = true;
  while (managingBalance) {
    try {
      const currentBalance = getTransactions(dbPath).reduce((sum, tx) => sum + tx.amount, 0);
      console.log(`\nCurrent Balance: ${currencySymbol}${currentBalance.toFixed(2)}\n`);

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Manage Balance:',
        choices: ['Set Balance', 'Update Balance', '↩️ Back to Main Menu'],
      });

      switch (action) {
        case 'Set Balance':
          try {
            const { amount } = await inquirer.prompt({
              type: 'input',
              name: 'amount',
              message: 'Enter new balance amount:',
              validate: (value) => !isNaN(parseFloat(value)) || 'Please enter a valid number',
            });
            clearTransactions(dbPath);
            addTransaction(dbPath, parseFloat(amount), 'Initial Balance', 'System');
            console.log(`Balance set to ${parseFloat(amount).toFixed(2)}.`);
          } catch (e) {
            console.log('Operation cancelled.');
          }
          break;
        case 'Update Balance':
          try {
            const { amount, description, category } = await inquirer.prompt([
              {
                type: 'input',
                name: 'amount',
                message: 'Enter amount to adjust by (positive for income, negative for expense):',
                validate: (value) => !isNaN(parseFloat(value)) || 'Please enter a valid number',
              },
              {
                type: 'input',
                name: 'description',
                message: 'Enter description:',
                default: 'Balance Adjustment',
              },
              {
                type: config.categories && config.categories.length > 0 ? 'list' : 'input',
                name: 'category',
                message: 'Enter category (optional):',
                default: 'System',
                choices: config.categories && config.categories.length > 0 ? [...config.categories, 'Other'] : undefined,
              },
            ]);
            const updatedCategory = category === 'Other' ? await inquirer.prompt({ type: 'input', name: 'newCategory', message: 'Enter new category:' }).then(a => a.newCategory) : category;
            addTransaction(dbPath, parseFloat(amount), description, updatedCategory);
            console.log(`Balance adjusted by ${parseFloat(amount).toFixed(2)}.`);
          } catch (e) {
            console.log('Operation cancelled.');
          }
          break;
        case '↩️ Back to Main Menu':
          managingBalance = false;
          break;
      }
    } catch (e) {
      console.log('Operation cancelled.');
      managingBalance = false; // Exit balance management on Ctrl+C
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
      const { config, filePath: configFilePath } = loadConfig(command.parent.opts().config);

      console.log('Starting interactive session...');

      let running = true;
      while (running) {
        try {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What do you want to do?',
              choices: [
                '📝 Manage Transactions',
                '💰 Manage Balance',
                '📂 Manage Categories',
                '🚪 Exit',
              ],
            },
          ]);

          switch (answers.action) {
            case '📝 Manage Transactions':
              await manageTransactions(config, configFilePath);
              break;
            case '💰 Manage Balance':
              await manageBalance(config);
              break;
            case '📂 Manage Categories':
              let categories = config.categories || []; // Reload categories to reflect external changes
              let managingCategories = true;
              while (managingCategories) {
                try {
                  const categoryChoices = ['➕ Add Category', ...categories, '↩️ Back to Main Menu'];
                  const { categoryAction } = await inquirer.prompt({
                    type: 'list',
                    name: 'categoryAction',
                    message: 'Category Management:',
                    choices: categoryChoices,
                  });

                  if (categoryAction === '➕ Add Category') {
                    try {
                      const { newCategoryName } = await inquirer.prompt({
                        type: 'input',
                        name: 'newCategoryName',
                        message: 'Enter new category name:',
                        validate: (value) => value.trim() !== '' || 'Category name cannot be empty.',
                      });
                      if (!categories.includes(newCategoryName)) {
                        categories.push(newCategoryName);
                        config.categories = categories;
                        saveConfig(config, configFilePath);
                        console.log(`Category '${newCategoryName}' added.`);
                      } else {
                        console.log(`Category '${newCategoryName}' already exists.`);
                      }
                    } catch (e) {
                      console.log('Operation cancelled.');
                    }
                  } else if (categoryAction === '↩️ Back to Main Menu') {
                    managingCategories = false;
                  } else { // A category was selected
                    let managingSpecificCategory = true;
                    while (managingSpecificCategory) {
                      try {
                        const { specificCategoryAction } = await inquirer.prompt({
                          type: 'list',
                          name: 'specificCategoryAction',
                          message: `Manage Category '${categoryAction}':`,
                          choices: ['✏️ Edit', '🗑️ Delete', '↩️ Back to Category List'],
                        });

                        switch (specificCategoryAction) {
                          case '✏️ Edit':
                            try {
                              const { updatedCategoryName } = await inquirer.prompt({
                                type: 'input',
                                name: 'updatedCategoryName',
                                message: `Enter new name for '${categoryAction}':`,
                                default: categoryAction,
                                validate: (value) => value.trim() !== '' || 'Category name cannot be empty.',
                              });
                              if (categoryAction !== updatedCategoryName && categories.includes(updatedCategoryName)) {
                                console.log(`Category '${updatedCategoryName}' already exists. Cannot rename.`);
                              } else {
                                const index = categories.indexOf(categoryAction);
                                if (index !== -1) {
                                  categories[index] = updatedCategoryName;
                                  config.categories = categories;
                                  saveConfig(config, configFilePath);
                                  console.log(`Category '${categoryAction}' renamed to '${updatedCategoryName}'.`);
                                  // For now, we'll just break and let the outer loop re-render
                                  managingSpecificCategory = false; // Exit to re-render category list
                                }
                              }
                            } catch (e) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '🗑️ Delete':
                            try {
                              categories = categories.filter(cat => cat !== categoryAction);
                              config.categories = categories;
                              saveConfig(config, configFilePath);
                              console.log(`Category '${categoryAction}' deleted.`);
                              managingSpecificCategory = false; // Exit this loop after deletion
                            } catch (e) {
                              console.log('Operation cancelled.');
                            }
                            break;
                          case '↩️ Back to Category List':
                            managingSpecificCategory = false;
                            break;
                        }
                      } catch (e) {
                        console.log('Operation cancelled.');
                        managingSpecificCategory = false; // Exit specific category management on Ctrl+C
                      }
                    }
                  }
                } catch (e) {
                  console.log('Operation cancelled.');
                  managingCategories = false; // Exit category management on Ctrl+C
                }
              }
              break;
            case '🚪 Exit':
              console.log('Exiting interactive session.');
              running = false;
              break;
          }
        } catch (e) {
          console.log('Exiting interactive session.');
          running = false; // Exit main loop on Ctrl+C
        }
      }
    });

  return interactiveCommand;
}