import { Command } from 'commander';
import { editTransaction } from '../data';
import { loadConfig } from '../config';

/**
 * Creates the 'edit' command for editing transactions.
 * @returns {Command} The Commander command object.
 */
export function createEditCommand(): Command {
  const editCommand = new Command();

  editCommand
    .name('edit')
    .description('Edit an existing transaction by its ID')
    .argument('<id>', 'The ID of the transaction to edit')
    .option('-a, --amount <amount>', 'New amount for the transaction')
    .option('-d, --description <description>', 'New description for the transaction')
    .option('-c, --category <category>', 'New category for the transaction')
    .action((id, options, command) => {
      const { config } = loadConfig(command.parent.opts().config);
      const dbPath = config.database?.path || '~/.purse_data.json';

      const updates: { [key: string]: any } = {};
      if (options.amount !== undefined) updates.amount = parseFloat(options.amount);
      if (options.description !== undefined) updates.description = options.description;
      if (options.category !== undefined) updates.category = options.category;

      if (Object.keys(updates).length === 0) {
        console.log('No updates provided. Use --amount, --description, or --category.');
        return;
      }

      editTransaction(dbPath, id, updates);
    });

  return editCommand;
}
