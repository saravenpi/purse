import { Command } from 'commander';
import { loadConfig, saveConfig } from '../../config';

/**
 * Creates the 'category edit' command for editing an existing category.
 * @returns {Command} The Commander command object.
 */
export function createCategoryEditCommand(): Command {
  const categoryEditCommand = new Command();

  categoryEditCommand
    .name('edit')
    .description('Edit an existing category')
    .argument('<oldName>', 'The current name of the category')
    .argument('<newName>', 'The new name for the category')
    .action((oldName, newName, command) => {
      const { config, filePath } = loadConfig(
        command.parent.parent.opts().config
      );

      if (!config.categories) {
        console.log('No categories defined.');
        return;
      }

      const index = config.categories.indexOf(oldName);
      if (index === -1) {
        console.log(`Category '${oldName}' not found.`);
      } else if (config.categories.includes(newName)) {
        console.log(`Category '${newName}' already exists. Cannot rename.`);
      } else {
        config.categories[index] = newName;
        saveConfig(config, filePath);
        console.log(`Category '${oldName}' renamed to '${newName}'.`);
      }
    });

  return categoryEditCommand;
}
