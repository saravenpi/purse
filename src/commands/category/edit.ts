import { Command } from 'commander';
import { loadConfig, saveConfig, Config } from '../../config';

/**
 * Handles the action for editing an existing category.
 * @param {string} oldName - The current name of the category.
 * @param {string} newName - The new name for the category.
 * @param {string} configPath - The path to the configuration file.
 */
export function handleCategoryEditAction(oldName: string, newName: string, configPath: string) {
  const { config, filePath } = loadConfig(configPath);

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
}

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
      const globalOptions = command.parent.parent.opts();
      handleCategoryEditAction(oldName, newName, globalOptions.config);
    });

  return categoryEditCommand;
}