import { Command } from 'commander';
import { loadConfig, saveConfig } from '../../config';

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
      const { config, filePath } = loadConfig(globalOptions.config);

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
    });

  return categoryDeleteCommand;
}
