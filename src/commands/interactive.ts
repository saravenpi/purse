import { Command } from 'commander';
import inquirer from 'inquirer';
import { addTransaction, getTransactions, deleteTransaction, editTransaction } from '../data';
import { loadConfig, saveConfig, Config } from '../config';

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
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';
      let categories = config.categories || [];
      const dateFormat = config.display?.dateFormat || 'en-US';

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
                '➕ Add Transaction',
                '📜 List Transactions',
                '📊 Check Balance',
                '✏️ Edit Transaction',
                '🗑️ Delete Transaction',
                '📂 Manage Categories',
                '🚪 Exit',
              ],
            },
          ]);

        switch (answers.action) {
          case '➕ Add Transaction':
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
            break;
          case '📜 List Transactions':
            const transactions = getTransactions(dbPath);
            if (transactions.length === 0) {
              console.log('No transactions found.');
            } else {
              console.log('Transactions:');
              transactions.forEach((tx) => {
                const date = new Date(tx.date).toLocaleString(dateFormat);
                const category = tx.category ? ` (Category: ${tx.category})` : '';
                console.log(`  ID: ${tx.id}, Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}`);
              });
            }
            break;
          case '📊 Check Balance':
            const balance = getTransactions(dbPath).reduce((sum, tx) => sum + tx.amount, 0);
            console.log(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`);
            break;
          case '✏️ Edit Transaction':
            try {
              const transactionsToEdit = getTransactions(dbPath);
              if (transactionsToEdit.length === 0) {
                console.log('No transactions to edit.');
                break;
              }
              const { transactionIdToEdit } = await inquirer.prompt({
                type: 'list',
                name: 'transactionIdToEdit',
                message: 'Select transaction to edit:',
                choices: transactionsToEdit.map(tx => ({ name: `${new Date(tx.date).toLocaleString(dateFormat)} - ${currencySymbol}${tx.amount.toFixed(2)} - ${tx.description}`, value: tx.id })),
              });
              const transactionToEdit = transactionsToEdit.find(tx => tx.id === transactionIdToEdit);
              if (transactionToEdit) {
                const editAnswers = await inquirer.prompt([
                  {
                    type: 'input',
                    name: 'amount',
                    message: 'New amount:',
                    default: transactionToEdit.amount.toString(),
                    validate: (value) => !isNaN(parseFloat(value)) || 'Please enter a valid number',
                  },
                  {
                    type: 'input',
                    name: 'description',
                    message: 'New description:',
                    default: transactionToEdit.description,
                  },
                  {
                    type: categories.length > 0 ? 'list' : 'input',
                    name: 'category',
                    message: 'New category (optional):',
                    default: transactionToEdit.category,
                    choices: categories.length > 0 ? [...categories, 'Other'] : undefined,
                  },
                ]);
                const updatedCategory = editAnswers.category === 'Other' ? await inquirer.prompt({ type: 'input', name: 'newCategory', message: 'Enter new category:' }).then(a => a.newCategory) : editAnswers.category;
                editTransaction(dbPath, transactionIdToEdit, {
                  amount: parseFloat(editAnswers.amount),
                  description: editAnswers.description,
                  category: updatedCategory,
                });
              }
            } catch (e) {
              console.log('Operation cancelled.');
            }
            break;
          case '🗑️ Delete Transaction':
            try {
              const transactionsToDelete = getTransactions(dbPath);
              if (transactionsToDelete.length === 0) {
                console.log('No transactions to delete.');
                break;
              }
              const { transactionIdToDelete } = await inquirer.prompt({
                type: 'list',
                name: 'transactionIdToDelete',
                message: 'Select transaction to delete:',
                choices: transactionsToDelete.map(tx => ({ name: `${new Date(tx.date).toLocaleString(dateFormat)} - ${currencySymbol}${tx.amount.toFixed(2)} - ${tx.description}`, value: tx.id })),
              });
              deleteTransaction(dbPath, transactionIdToDelete);
            } catch (e) {
              console.log('Operation cancelled.');
            }
            break;
          case '📂 Manage Categories':
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
                                // Update categoryAction to reflect the new name for the current session
                                categoryAction = updatedCategoryName; // This line will cause an error as categoryAction is const
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
      }
    });

  return interactiveCommand;
}
