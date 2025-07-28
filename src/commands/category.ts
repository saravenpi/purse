import { Command } from 'commander';
import { createCategoryAddCommand } from './category/add';
import { createCategoryEditCommand } from './category/edit';
import { createCategoryDeleteCommand } from './category/delete';

/**
 * Creates the 'category' command with subcommands for managing categories.
 * @returns {Command} The Commander command object.
 */
export function createCategoryCommand(): Command {
  const categoryCommand = new Command();

  categoryCommand.name('category').description('Manage categories');

  categoryCommand.addCommand(createCategoryAddCommand());
  categoryCommand.addCommand(createCategoryEditCommand());
  categoryCommand.addCommand(createCategoryDeleteCommand());

  return categoryCommand;
}
