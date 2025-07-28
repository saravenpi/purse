import { Command } from 'commander';
import { addTransaction } from '../data';
import { loadConfig } from '../config';

/**
 * Creates the 'add' command for adding new transactions.
 * @returns {Command} The Commander command object.
 */
export function createAddCommand(): Command {
  const addCommand = new Command();

  addCommand
    .name('add')
    .description('Add a new transaction')
    .option('-a, --amount <amount>', 'The amount of the transaction')
    .option(
      '-d, --description <description>',
      'The description of the transaction'
    )
    .option('-c, --category <category>', 'The category of the transaction')
    .action((options, command) => {
      const { config } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';
      const categories = config.categories || [];

      if (options.category && !categories.includes(options.category)) {
        console.warn(
          `Warning: Category '${options.category}' is not defined in your config file. Consider adding it.`
        );
      }

      addTransaction(
        dbPath,
        parseFloat(options.amount),
        options.description,
        options.category
      );
    });

  return addCommand;
}
