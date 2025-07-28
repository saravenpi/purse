import { Command } from 'commander';
import { addTransaction } from '../data';
import { Config } from '../config';

/**
 * The action callback for the 'add' command.
 * @param {object} options - The options parsed from the command line.
 * @param {Config} config - The loaded configuration object.
 */
export function handleAddAction(options: any, config: Config) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  const categories = config.categories || [];

  if (options.category && !categories.includes(options.category)) {
    console.warn(`Warning: Category '${options.category}' is not defined in your config file. Consider adding it.`);
  }

  addTransaction(dbPath, parseFloat(options.amount), options.description, options.category);
}

/**
 * Creates the 'add' command for adding new transactions.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createAddCommand(config: Config): Command {
  const addCommand = new Command();

  addCommand
    .name('add')
    .description('Add a new transaction')
    .option('-a, --amount <amount>', 'The amount of the transaction')
    .option('-d, --description <description>', 'The description of the transaction')
    .option('-c, --category <category>', 'The category of the transaction')
    .action((options) => handleAddAction(options, config)); // Pass config to the action

  return addCommand;
}