import { Command } from 'commander';
import inquirer from 'inquirer';

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
    .action(async () => {
      console.log('Starting interactive session...');
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What do you want to do?',
          choices: ['Add Transaction', 'List Transactions', 'Exit'],
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
          console.log(`Adding transaction: Amount - ${addAnswers.amount}, Description - ${addAnswers.description}`);
          // Here you would call the actual add transaction logic
          break;
        case 'List Transactions':
          console.log('Listing transactions...');
          // Here you would call the actual list transactions logic
          break;
        case 'Exit':
          console.log('Exiting interactive session.');
          break;
      }
    });

  return interactiveCommand;
}
