import { Command } from 'commander';
import inquirer from 'inquirer';
import { addTransaction, getTransactions } from '../data';
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
            choices: ['Add Transaction', 'List Transactions', 'Check Balance', 'Exit'],
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
                console.log(`  Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}`);
              });
            }
            break;
          case 'Check Balance':
            const balance = getTransactions(dbPath).reduce((sum, tx) => sum + tx.amount, 0);
            console.log(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`);
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