import { Command } from 'commander';
import inquirer from 'inquirer';
import { addTransaction, getTransactions } from '../data';

/**
 * Creates the 'interactive' command for an interactive CLI interface.
 * @param {object} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createInteractiveCommand(config: any): Command {
  const interactiveCommand = new Command();

  interactiveCommand
    .name('interactive')
    .alias('i')
    .description('Start an interactive CLI session')
    .action(async () => {
      const dbPath = config.database?.path || '~/.purse_data.json';
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
            ]);
            addTransaction(dbPath, parseFloat(addAnswers.amount), addAnswers.description);
            break;
          case 'List Transactions':
            const transactions = getTransactions(dbPath);
            if (transactions.length === 0) {
              console.log('No transactions found.');
            } else {
              console.log('Transactions:');
              transactions.forEach((tx) => {
                console.log(`  Date: ${new Date(tx.date).toLocaleString()}, Amount: ${tx.amount}, Description: ${tx.description}`);
              });
            }
            break;
          break;
          case 'Check Balance':
            const balance = getTransactions(dbPath).reduce((sum, tx) => sum + tx.amount, 0);
            console.log(`Current Balance: ${balance.toFixed(2)}`);
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
