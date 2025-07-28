import { Command } from 'commander';

/**
 * Creates the 'add' command for adding new transactions.
 * @returns {Command} The Commander command object.
 */
/**
 * Creates the 'add' command for adding new transactions.
 * @param {object} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createAddCommand(config: object): Command {
  const addCommand = new Command();

  addCommand
    .name('add')
    .description('Add a new transaction')
    .option('-a, --amount <amount>', 'The amount of the transaction')
    .option('-d, --description <description>', 'The description of the transaction')
    .action((options) => {
      console.log('Adding a new transaction:');
      console.log(`  Amount: ${options.amount}`);
      console.log(`  Description: ${options.description}`);
    });

  return addCommand;
}
