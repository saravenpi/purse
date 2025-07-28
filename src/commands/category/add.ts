import { Command } from 'commander';
import { loadConfig, saveConfig, Config } from '../../config';

/**
 * Handles the action for adding a new category.
 * @param {string} name - The name of the category to add.
 * @param {string} configPath - The path to the configuration file.
 */
export function handleCategoryAddAction(name: string, configPath: string) {
  const { config, filePath } = loadConfig(configPath);

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
}

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
      const globalOptions = command.parent.parent.opts(); // Access global options from the main program
      handleCategoryAddAction(name, globalOptions.config);
    });

  return categoryAddCommand;
}