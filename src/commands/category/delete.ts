import { Command } from 'commander';
import { loadConfig, saveConfig, Config } from '../../config';

/**
 * Handles the action for deleting a category.
 * @param {string} name - The name of the category to delete.
 * @param {string} configPath - The path to the configuration file.
 */
export function handleCategoryDeleteAction(name: string, configPath: string) {
  const { config, filePath } = loadConfig(configPath);

  if (!config.categories) {
    console.log('No categories defined.');
    return;
  }

  const initialLength = config.categories.length;
  config.categories = config.categories.filter(cat => cat !== name);

  if (config.categories.length < initialLength) {
    saveConfig(config, filePath);
    console.log(`Category '${name}' deleted.`);
  } else {
    console.log(`Category '${name}' not found.`);
  }
}

/**
 * Creates the 'category delete' command for deleting a category.
 * @returns {Command} The Commander command object.
 */
export function createCategoryDeleteCommand(): Command {
  const categoryDeleteCommand = new Command();

  categoryDeleteCommand
    .name('delete')
    .description('Delete a category')
    .argument('<name>', 'The name of the category to delete')
    .action((name, command) => {
      const globalOptions = command.parent.parent.opts();
      handleCategoryDeleteAction(name, globalOptions.config);
    });

  return categoryDeleteCommand;
}