import { Command } from 'commander';
import { loadConfig, saveConfig } from '../../config';

/**
 * Creates the 'category add' command for adding a new category.
 * @returns {Command} The Commander command object.
 */
export function createCategoryAddCommand(): Command {
  const categoryAddCommand = new Command();

  categoryAddCommand
    .name('add')
    .description('Add a new category')
    .argument('<name>', 'The name of the category to add')
    .action((name, command) => {
      const { config, filePath } = loadConfig(command.parent.parent.opts().config);

      if (!config.categories) {
        config.categories = [];
      }

      if (config.categories.includes(name)) {
        console.log(`Category '${name}' already exists.`);
      } else {
        config.categories.push(name);
        saveConfig(config, filePath);
        console.log(`Category '${name}' added.`);
      }
    });

  return categoryAddCommand;
}
