import { Command } from 'commander';
import inquirer from 'inquirer';
import { addTransaction, getTransactions, deleteTransaction, editTransaction } from '../data';
import { Config } from '../config';

/**
 * Creates the 'interactive' command for an interactive CLI interface.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createInteractiveCommand(config: Config): Command {
  const interactiveCommand = new Command();

  interactiveCommand
    .name('interactive')
    .alias('i')
    .description('Start an interactive CLI session')
    .action(async () => {
      const dbPath = config.database?.path || '~/.purse_data.json';
      const currencySymbol = config.display?.currencySymbol || '$';
      const dateFormat = config.display?.dateFormat || 'en-US';
      const categories = config.categories || [];

      console.log('Starting interactive session...');

      let running = true;
      while (running) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What do you want to do?',
            choices: ['Add Transaction', 'List Transactions', 'Check Balance', 'Edit Transaction', 'Delete Transaction', 'Exit'],
          },
        ]);

        switch (answers.action) {
          case 'Add Transaction':
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
            break;
          case 'List Transactions':
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
          case 'Check Balance':
            const balance = getTransactions(dbPath).reduce((sum, tx) => sum + tx.amount, 0);
            console.log(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`);
            break;
          case 'Edit Transaction':
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
            break;
          case 'Delete Transaction':
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
            break;
          case 'Exit':
            console.log('Exiting interactive session.');
            running = false;
            break;
        }
      }
    });

  return interactiveCommand;
}
